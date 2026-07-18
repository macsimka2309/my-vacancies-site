import { describe, expect, it } from "vitest";
import {
  getAdminRoleLabel,
  getAdminRolesLabel,
  isAdminRole,
} from "@/lib/admin-roles";

describe("admin-roles", () => {
  it("возвращает человекочитаемые подписи ролей", () => {
    expect(getAdminRoleLabel("ADMIN")).toBe("Администратор");
    expect(getAdminRoleLabel("VACANCY_ADMIN")).toBe("Администратор вакансий");
    expect(getAdminRoleLabel("MANAGER")).toBe("Менеджер");
  });

  it("склеивает подписи нескольких ролей", () => {
    expect(getAdminRolesLabel(["ADMIN", "MANAGER"])).toBe(
      "Администратор, Менеджер",
    );
  });

  it("валидирует значение роли", () => {
    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("MANAGER")).toBe(true);
    expect(isAdminRole("NOPE")).toBe(false);
    expect(isAdminRole(42)).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});
