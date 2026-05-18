import type { User } from "@/context/AuthContext";

export type CompanyRoleScope = "all" | "developer" | "admin" | "unknown";

export function getCompanyRoleScope(user: User | null | undefined): CompanyRoleScope {
  const roleLabel = String(user?.role || "").toUpperCase();
  const userEmail = String(user?.email || "").toLowerCase();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  const isSuperAdmin = user?.role_id === 1 || roleLabel === "SUPER_ADMIN";
  if (isSuperAdmin) return "all";

  const hasDeveloperPermission =
    permissions.includes("developer.view") ||
    permissions.includes("menu.developer");
  const isDeveloperLikeRole =
    roleLabel === "DEVELOPER" ||
    roleLabel === "DEVELOPER_ADMIN" ||
    userEmail === "dev@dev.com" ||
    hasDeveloperPermission;
  if (isDeveloperLikeRole) return "developer";

  const isAdminLikeRole =
    roleLabel === "COMPANY_ADMIN" ||
    roleLabel === "FINANCE_ADMIN" ||
    roleLabel === "SUPPORT_ADMIN" ||
    roleLabel === "STAFF" ||
    roleLabel === "ADMIN";
  if (isAdminLikeRole) return "admin";

  return "unknown";
}

export function hasDeveloperScope(user: User | null | undefined): boolean {
  const scope = getCompanyRoleScope(user);
  return scope === "all" || scope === "developer";
}

