export type AppPermission = "viewer" | "editor" | "admin";

export function parseAppPermission(value: unknown): AppPermission | null {
  if (value === "viewer" || value === "editor" || value === "admin") {
    return value;
  }
  return null;
}

export function canEdit(permission: AppPermission | null | undefined) {
  return permission === "editor" || permission === "admin";
}

export function canAdmin(permission: AppPermission | null | undefined) {
  return permission === "admin";
}
