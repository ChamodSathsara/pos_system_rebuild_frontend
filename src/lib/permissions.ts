import type { Role } from "@/types";

/** Is this role restricted to only their own assigned branch's data? */
export function isBranchScoped(role?: Role | string | null): boolean {
  return role === "Branch_Manager" || role === "Cashier";
}

/** Can this role see/manage data across all branches (with an optional branch filter)? */
export function isCompanyWide(role?: Role | string | null): boolean {
  return role === "Admin" || role === "Manager";
}

export function isAdmin(role?: Role | string | null): boolean {
  return role === "Admin";
}

export function canManageCatalog(role?: Role | string | null): boolean {
  return role === "Admin" || role === "Manager";
}

export function canManagePurchasing(role?: Role | string | null): boolean {
  return role === "Admin" || role === "Manager" || role === "Branch_Manager";
}

export function canAccessReports(role?: Role | string | null): boolean {
  return role !== "Cashier";
}

export function canOperatePos(role?: Role | string | null): boolean {
  return !!role; // every authenticated role can sell
}

export function canManageAdmin(role?: Role | string | null): boolean {
  return role === "Admin";
}
