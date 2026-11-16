// The one place that says who may do what. Pure TypeScript with no imports: the backend enforces it
// (mod.ts) and web / React Native apps hold a copy to show or hide controls. Hiding is only UX; the API decides.
// Roles are Better Auth's organization roles. To add a role, add it here and give it permissions below.

export const roles = ["owner", "admin", "member"] as const;
export type Role = (typeof roles)[number];

const everyone = roles;
const managers = ["owner", "admin"] as const;

export const permissions = {
  "note:read": everyone,
  "note:create": everyone,
  "note:update": everyone,
  "note:delete": managers,
  "member:invite": managers,
  "audit:read": managers,
  "org:delete": ["owner"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof permissions;

export const can = (role: string, permission: Permission): boolean =>
  (permissions[permission] as readonly string[]).includes(role);

export const permissionsFor = (role: string): Permission[] =>
  (Object.keys(permissions) as Permission[]).filter((p) => can(role, p));
