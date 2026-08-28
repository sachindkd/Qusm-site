export const ROLE_WEIGHT: Record<string, number> = {
  member: 0,
  moderator: 10,
  staff: 20,
  management: 30,
  director: 40,
  owner: 50,
  admin: 100,
};

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();

/** Return exactly one effective role: the highest role supplied. */
export function getHighestRole(roles: unknown): string {
  const list = Array.isArray(roles) ? roles : [roles];
  return list
    .map(normalize)
    .filter(Boolean)
    .sort((a, b) => (ROLE_WEIGHT[b] ?? -1) - (ROLE_WEIGHT[a] ?? -1))[0] ?? "member";
}

export function hasMinimumRole(roles: unknown, minimum: string): boolean {
  const effective = getHighestRole(roles);
  return (ROLE_WEIGHT[effective] ?? -1) >= (ROLE_WEIGHT[normalize(minimum)] ?? Number.MAX_SAFE_INTEGER);
}

export function isManagementRole(roles: unknown): boolean {
  const effective = getHighestRole(roles);
  return ["management", "director", "owner", "admin"].includes(effective);
}

export function effectiveAccess(roles: unknown) {
  const role = getHighestRole(roles);
  return { role, weight: ROLE_WEIGHT[role] ?? 0, management: isManagementRole([role]) };
}
