export const FBMRP_GUILD_ID = process.env.DISCORD_GUILD_ID || "1426271681969655913";
export const SPECIAL_OWNER_ID = "1210317929485181000";
export const MEMBER_ROLE_ID = "1496568955958067400";

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
  viceChairman: "1538516021608972318",
  aides: "1538911108788654160",
  staff: "1496561403501219952",
  seniorManagement: "1531899271614562314",
  headDevelopment: "1478156027244314825",
  developerPosts: "1506466679100801196",
  ofcAdmin: process.env.DISCORD_OFC_ADMIN_ROLE_ID || "",
  member: MEMBER_ROLE_ID,
} as const;

export type AccessLevel = "owner" | "ownership" | "senior-leadership" | "developer" | "aide" | "staff" | "member";
export type Permission = "site:read" | "site:edit" | "leadership:edit" | "divisions:edit" | "announcements:manage" | "audit:read" | "calendar:manage" | "developer:publish" | "applications:manage" | "media:manage" | "shop:manage" | "admin:all";
export type DiscordGuildRole = { id: string; name: string; position: number; managed?: boolean };

const permissions: Record<AccessLevel, Permission[]> = {
  owner: ["site:read", "site:edit", "leadership:edit", "divisions:edit", "announcements:manage", "audit:read", "calendar:manage", "developer:publish", "applications:manage", "media:manage", "shop:manage", "admin:all"],
  ownership: ["site:read", "site:edit", "leadership:edit", "divisions:edit", "announcements:manage", "calendar:manage", "applications:manage", "media:manage"],
  "senior-leadership": ["site:read", "leadership:edit", "announcements:manage", "calendar:manage", "applications:manage"],
  developer: ["site:read", "developer:publish", "media:manage"],
  aide: [],
  staff: ["site:read"],
  member: ["site:read"],
};

const OWNER_ROLE_IDS = new Set([ROLE_IDS.owner, ROLE_IDS.coOwner, ROLE_IDS.chairman, ROLE_IDS.viceChairman, ...(ROLE_IDS.ofcAdmin ? [ROLE_IDS.ofcAdmin] : [])]);
const OWNERSHIP_ROLE_IDS = new Set([ROLE_IDS.headManagement, ROLE_IDS.headOperations, ROLE_IDS.headAdministration, ROLE_IDS.communityAffairs, ROLE_IDS.ceo, ROLE_IDS.headDevelopment, ROLE_IDS.seniorManagement]);
const SENIOR_LEADERSHIP_ROLE_IDS = new Set([ROLE_IDS.generalManager, ROLE_IDS.headDepartment]);
const DEVELOPER_ROLE_IDS = new Set([ROLE_IDS.developerPosts]);
const AIDE_ROLE_IDS = new Set([ROLE_IDS.aides]);
const STAFF_ROLE_IDS = new Set([ROLE_IDS.staff]);

function hasAny(roleIds: Iterable<string>, allowed: Set<string>): boolean { for (const roleId of roleIds) if (allowed.has(roleId)) return true; return false; }

export function getAccessLevel(userId: string, roleIds: string[], _roles: DiscordGuildRole[] = []): AccessLevel {
  if (userId === SPECIAL_OWNER_ID) return "owner";
  if (hasAny(roleIds, OWNER_ROLE_IDS)) return "owner";
  if (hasAny(roleIds, OWNERSHIP_ROLE_IDS)) return "ownership";
  if (hasAny(roleIds, SENIOR_LEADERSHIP_ROLE_IDS)) return "senior-leadership";
  if (hasAny(roleIds, DEVELOPER_ROLE_IDS)) return "developer";
  if (hasAny(roleIds, AIDE_ROLE_IDS)) return "aide";
  if (hasAny(roleIds, STAFF_ROLE_IDS)) return "staff";
  return "member";
}

export function can(access: AccessLevel, permission: Permission): boolean { return permissions[access].includes(permission); }
export function getPermissions(access: AccessLevel): Permission[] { return permissions[access]; }
