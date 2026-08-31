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
  viceChairman: "1538516021608972318",
  aides: "1538911108788654160",
  staff: "1496561403501219952",
  seniorManagement: "1531899271614562314",
  headDevelopment: "1478156027244314825",
  developerPosts: "1506466679100801196",
  ofcAdmin: process.env.DISCORD_OFC_ADMIN_ROLE_ID || "",
} as const;

export type AccessLevel = "owner" | "ownership" | "senior-leadership" | "developer" | "aide" | "staff" | "member";
export type Permission = "site:read" | "site:edit" | "leadership:edit" | "divisions:edit" | "announcements:manage" | "calendar:manage" | "developer:publish" | "applications:manage" | "media:manage" | "admin:all";
export type DiscordGuildRole = { id: string; name: string; position: number; managed?: boolean };

const permissions: Record<AccessLevel, Permission[]> = {
  owner: ["site:read", "site:edit", "leadership:edit", "divisions:edit", "announcements:manage", "calendar:manage", "developer:publish", "applications:manage", "media:manage", "admin:all"],
  ownership: ["site:read", "site:edit", "leadership:edit", "divisions:edit", "announcements:manage", "calendar:manage", "applications:manage", "media:manage"],
  "senior-leadership": ["site:read", "leadership:edit", "announcements:manage", "calendar:manage", "applications:manage"],
  developer: ["site:read", "developer:publish", "media:manage"],
  aide: [],
  staff: ["site:read"],
  member: ["site:read"],
};

const accessRank: Record<AccessLevel, number> = { member: 0, staff: 1, aide: 2, developer: 2, "senior-leadership": 3, ownership: 4, owner: 5 };

function accessForRole(roleId: string, roleName = ""): AccessLevel {
  const normalizedName = roleName.trim().toLowerCase();
  if (roleId === ROLE_IDS.owner || roleId === ROLE_IDS.coOwner || roleId === ROLE_IDS.chairman || (ROLE_IDS.ofcAdmin && roleId === ROLE_IDS.ofcAdmin) || ["owner", "co-owner", "co owner", "chairman", "special user", "ofc admin", "official admin"].includes(normalizedName)) return "owner";
  if ([ROLE_IDS.headOperations, ROLE_IDS.headAdministration, ROLE_IDS.communityAffairs, ROLE_IDS.ceo, ROLE_IDS.headDevelopment].includes(roleId as never)) return "ownership";
  if (["chief operations officer", "chief logistic officer", "chief logistics officer", "chief relations officer", "head of development"].includes(normalizedName)) return "ownership";
  if (roleId === ROLE_IDS.headManagement || roleId === ROLE_IDS.seniorManagement) return "ownership";
  if ([ROLE_IDS.generalManager, ROLE_IDS.headDepartment, ROLE_IDS.viceChairman].includes(roleId as never)) return "senior-leadership";
  if (["general manager", "director of national intelligence", "staff overseer", "vice chairman", "head of staff", "assistant head of staff", "administrative officer"].includes(normalizedName)) return "senior-leadership";
  if (roleId === ROLE_IDS.developerPosts) return "developer";
  if (roleId === ROLE_IDS.aides || normalizedName === "aide" || normalizedName === "aides") return "aide";
  if (roleId === ROLE_IDS.staff || normalizedName === "staff") return "staff";
  return "member";
}

export function getAccessLevel(userId: string, roleIds: string[], roles: DiscordGuildRole[] = []): AccessLevel {
  if (userId === SPECIAL_OWNER_ID) return "owner";
  return roleIds.map((roleId) => {
    const role = roles.find((item) => item.id === roleId);
    return accessForRole(roleId, role?.name || "");
  }).reduce<AccessLevel>((highest, current) => accessRank[current] > accessRank[highest] ? current : highest, "member");
}

export function can(access: AccessLevel, permission: Permission): boolean { return permissions[access].includes(permission); }
export function getPermissions(access: AccessLevel): Permission[] { return permissions[access]; }
