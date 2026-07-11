import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { type AdminRole } from "@/lib/admin-roles";

export {
  type AdminRole,
  getAdminRoleLabel,
  getAdminRolesLabel,
  isAdminRole,
} from "@/lib/admin-roles";

export const ADMIN_SESSION_COOKIE = "admin_session";

const SESSION_TTL_SECONDS = 60 * 60 * 12;
const PASSWORD_HASH_PREFIX = "scrypt:v1";
const DEFAULT_SCRYPT_COST = {
  N: 16384,
  r: 8,
  p: 1,
};

export type AdminSession = {
  fullName: string | null;
  roles: AdminRole[];
  userId: string;
  username: string;
};

type SessionPayload = {
  exp: number;
  sub: string;
  username: string;
};

export async function getAdminSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return getAdminSessionFromCookie(session);
}

export async function getAdminSessionFromRequest(request: NextRequest) {
  return getAdminSessionFromCookie(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
  );
}

export async function isAdminAuthenticated() {
  return Boolean(await getAdminSession());
}

export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<AdminSession | null> {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || !password) {
    return null;
  }

  const user = await db.adminUser.findUnique({
    where: {
      username: normalizedUsername,
    },
    select: {
      fullName: true,
      id: true,
      isActive: true,
      passwordHash: true,
      roles: true,
      username: true,
    },
  });

  if (!user?.isActive) {
    return null;
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    return null;
  }

  return {
    fullName: user.fullName,
    roles: user.roles as AdminRole[],
    userId: user.id,
    username: user.username,
  };
}

export async function setAdminLastLoginAt(userId: string) {
  await db.adminUser.update({
    where: {
      id: userId,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });
}

export function setAdminSessionCookie(
  response: NextResponse,
  session: AdminSession,
) {
  response.cookies.set(ADMIN_SESSION_COOKIE, createSessionToken(session), {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function canManageAdminUsers(session: AdminSession) {
  return hasAdminRole(session, "ADMIN");
}

export function canManageApplications(session: AdminSession) {
  return session.roles.some((role) =>
    ["ADMIN", "MANAGER", "VACANCY_ADMIN"].includes(role),
  );
}

export function canManageVacancies(session: AdminSession) {
  return session.roles.some((role) =>
    ["ADMIN", "VACANCY_ADMIN"].includes(role),
  );
}

export function canViewAuditLogs(session: AdminSession) {
  return hasAdminRole(session, "ADMIN");
}

export function hasAdminRole(session: AdminSession, role: AdminRole) {
  return session.roles.includes(role);
}

export function getAdminDisplayName(
  user: Pick<AdminSession, "fullName" | "username">,
) {
  return user.fullName?.trim() || user.username;
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const key = await scryptPassword(password, salt, 64, DEFAULT_SCRYPT_COST);

  return [
    PASSWORD_HASH_PREFIX,
    DEFAULT_SCRYPT_COST.N,
    DEFAULT_SCRYPT_COST.r,
    DEFAULT_SCRYPT_COST.p,
    salt,
    Buffer.from(key as Buffer).toString("base64url"),
  ].join(":");
}

export async function verifyPassword(password: string, passwordHash: string) {
  const parts = passwordHash.split(":");

  if (parts.length !== 7 || parts.slice(0, 2).join(":") !== PASSWORD_HASH_PREFIX) {
    return false;
  }

  const [, , cost, blockSize, parallelization, salt, storedKey] = parts;
  const storedKeyBuffer = Buffer.from(storedKey, "base64url");
  const derivedKey = await scryptPassword(password, salt, storedKeyBuffer.length, {
    N: Number(cost),
    p: Number(parallelization),
    r: Number(blockSize),
  });

  return safeEqual(Buffer.from(derivedKey as Buffer), storedKeyBuffer);
}

function scryptPassword(
  password: string,
  salt: string,
  keyLength: number,
  cost: typeof DEFAULT_SCRYPT_COST,
) {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, cost, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

async function getAdminSessionFromCookie(value?: string) {
  const payload = parseSessionToken(value);

  if (!payload) {
    return null;
  }

  const user = await db.adminUser.findUnique({
    where: {
      id: payload.sub,
    },
    select: {
      fullName: true,
      id: true,
      isActive: true,
      roles: true,
      username: true,
    },
  });

  if (!user?.isActive) {
    return null;
  }

  return {
    fullName: user.fullName,
    roles: user.roles as AdminRole[],
    userId: user.id,
    username: user.username,
  };
}

function createSessionToken(session: AdminSession) {
  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    sub: session.userId,
    username: session.username,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = signSessionPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function parseSessionToken(value?: string): SessionPayload | null {
  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  if (!safeEqual(signature, signSessionPayload(encodedPayload))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;

    if (
      !payload.sub ||
      !payload.username ||
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

function signSessionPayload(encodedPayload: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_SESSION_SECRET is not configured.");
    }

    return "dev-admin-session-secret";
  }

  return secret;
}

function safeEqual(left: string | Buffer, right: string | Buffer) {
  const leftBuffer = Buffer.isBuffer(left) ? left : Buffer.from(left);
  const rightBuffer = Buffer.isBuffer(right) ? right : Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}
