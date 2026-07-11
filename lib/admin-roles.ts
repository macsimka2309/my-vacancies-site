export const ADMIN_ROLES = ["ADMIN", "MANAGER", "VACANCY_ADMIN"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function getAdminRoleLabel(role: AdminRole) {
  if (role === "ADMIN") {
    return "Администратор";
  }

  if (role === "VACANCY_ADMIN") {
    return "Администратор вакансий";
  }

  return "Менеджер";
}

export function getAdminRolesLabel(roles: AdminRole[]) {
  return roles.map(getAdminRoleLabel).join(", ");
}

export function isAdminRole(value: unknown): value is AdminRole {
  return ADMIN_ROLES.includes(value as AdminRole);
}
