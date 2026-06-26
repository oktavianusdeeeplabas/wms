export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  branch_id?: number | null;
  warehouse_id?: number | null;
  permissions?: string[];
  last_login?: string;
}

export function hasPermission(user: AuthUser | null, permission?: string) {
  if (!permission) return true;
  if (!user) return false;
  return Boolean(user.permissions?.includes(permission));
}

export function hasAnyPermission(user: AuthUser | null, permissions: string[]) {
  if (permissions.length === 0) return true;
  return permissions.some((permission) => hasPermission(user, permission));
}
