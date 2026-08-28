export const FBMRP_GUILD_ID = process.env.DISCORD_GUILD_ID || "1426271681969655913";
export const SPECIAL_OWNER_ID = "1210317929485181000";

export const ROLE_IDS = {
  owner: "1430245086930669579",
  coOwner: "1530961653103853669",
  chairman: "1501042310320881834",
  headManagement: "1431171866680365097",
  generalManager: "1535569347928658010",
  headOperations: "1539579714841350235",
  headAdministration: "1540038224431554633",
  communityAffairs: "1540038203959152650",
  ceo: "1493982432276385812",
  headDepartment: "1431617140674265129",
  viceChairman: "716797005753483324",
  aides: "1538911108788654160",
  staff: "1496561403501219952",
  seniorManagement: "1531899271614562314",
  headDevelopment: "1478156027244314825",
  developerPosts: "1506466679100801196",
} as const;

export type AccessLevel = "owner" | "management" | "senior-leadership" | "developer" | "aide" | "staff" | "member";
export type Permission = "site:read" | "site:edit" | "leadership:edit" | "divisions:edit" | "announcements:manage" | "calendar:manage" | "developer:publish" | "applications:manage" | "admin:all";

export type DiscordGuildRole = { id: string; name: string; position: number; managed?: boolean };

const permissions: Record<AccessLevel, Permission[]> = {
  owner: ["site:read", "site:edit", "leadership:edit", "divisions:edit", "announcements:manage", "calendar:manage", "developer:publish", "applications:manage", "admin:all"],
  management: ["site:read", "site:edit", "leadership:edit", "divisions:edit", "announcements:manage", "calendar:manage", "applications:manage"],
  "senior-leadership": ["site:read", "leadership:edit", "divisions:edit", "announcements:manage", "calendar:manage", "applications:manage"],
  developer: ["site:read", "developer:publish"],
  aide: ["site:read", "announcements:manage", "calendar:manage"],
  staff: ["site:read"],
  member: ["site:read"],
};

function roleAccess(roleId: string, roleName = ""): AccessLevel {
  if (roleId === ROLE_IDS.owner || roleId === ROLE_IDS.coOwner || roleId === ROLE_IDS.chairman) return "owner";
  if (roleId === ROLE_IDS.headManagement) return "management";
  if ([ROLE_IDS.generalManager, ROLE_IDS.headOperations, ROLE_IDS.headAdministration, ROLE_IDS.communityAffairs, ROLE_IDS.ceo, ROLE_IDS.headDepartment, ROLE_IDS.viceChairman].includes(roleId as never)) return "senior-leadership";
  if (roleId === ROLE_IDS.headDevelopment || roleId === ROLE_IDS.developerPosts) return "developer";
  if (roleId === ROLE_IDS.aides) return "aide";
  if (roleId === ROLE_IDS.seniorManagement) return "senior-leadership";
  if (roleId === ROLE_IDS.staff) return "staff";
  // VCM is intentionally recognized by name so its role ID does not have to be hard-coded.
  const normalized = roleName.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (normalized === "vcm" || normalized === "volunteer commanding member") return "management";
  return "member";
}

/**
 * Resolve access from ONLY the member's highest-position Discord role.
 * Lower roles are deliberately ignored, even if they would otherwise grant access.
 */
export function getAccessLevel(userId: string, roleIds: string[], guildRoles?: DiscordGuildRole[]): AccessLevel {
  if (userId === SPECIAL_OWNER_ID) return "owner";

  if (guildRoles?.length) {
    const memberRoles = guildRoles
      .filter((role) => roleIds.includes(role.id) && !role.managed)
      .sort((a, b) => b.position - a.position);
    const highest = memberRoles[0];
    return highest ? roleAccess(highest.id, highest.name) : "member";
  }

  // Safe fallback for callers that only have role IDs. This still considers one role only.
  const known = Object.values(ROLE_IDS).filter((id) => roleIds.includes(id));
  if (!known.length) return "member";
  const ordered = [
    ROLE_IDS.owner, ROLE_IDS.coOwner, ROLE_IDS.chairman, ROLE_IDS.headManagement,
    ROLE_IDS.generalManager, ROLE_IDS.headOperations, ROLE_IDS.headAdministration,
    ROLE_IDS.communityAffairs, ROLE_IDS.ceo, ROLE_IDS.headDepartment, ROLE_IDS.viceChairman,
    ROLE_IDS.headDevelopment, ROLE_IDS.developerPosts, ROLE_IDS.aides, ROLE_IDS.seniorManagement,
    ROLE_IDS.staff,
  ];
  const highestKnown = ordered.find((id) => roleIds.includes(id));
  return highestKnown ? roleAccess(highestKnown) : "member";
}

export function can(access: AccessLevel, permission: Permission) {
  return permissions[access].includes(permission);
}

export function getPermissions(access: AccessLevel) {
  return permissions[access];
}
