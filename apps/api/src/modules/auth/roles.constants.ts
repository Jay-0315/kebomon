export const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;
export const SUPER_ADMIN_ROLES = ["SUPER_ADMIN"] as const;

export function isAdminRole(role: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}
