export const FBMRP_GUILD_ID = process.env.DISCORD_GUILD_ID || "1426271681969655913";
/** Legacy name retained for compatibility. This identity is a Special User, not a Discord Owner role. */
export const SPECIAL_OWNER_ID = "1210317929485181000";
export const MEMBER_ROLE_ID = "1496568955958067400";

export const ROLE_IDS = {
  owner: "1430245080930669579", coOwner: "1530961653103853669", chairman: "1501042310320881834",
  headManagement: "1431171866680365097", generalManager: "1535569347928658010", headOperations: "1539579714841350235",
  headAdministration: "1540038224431554633", communityAffairs: "1540038203959152650", ceo: "1493982432276385812",
  headDepartment: "1431617140674265129", viceChairman: "1538516021608972318", aides: "1538911108788654160",
  staff: "1496561403501219952", seniorManagement: "1531899271614562314", headDevelopment: "1478156027244314825",
  developerPosts: "1506466679100801196", ofcAdmin: process.env.DISCORD_OFC_ADMIN_ROLE_ID || "", member: MEMBER_ROLE_ID,
} as const;

export type AccessLevel = "special-user" | "owner" | "ownership" | "senior-leadership" | "developer" | "aide" | "staff" | "member";
export type Permission = "site:read" | "site:edit" | "leadership:edit" | "divisions:edit" | "announcements:manage" | "audit:read" | "calendar:manage" | "developer:publish" | "applications:manage" | "media:manage" | "shop:manage" | "admin:all";
export type DiscordGuildRole = { id: string; name: string; position: number; managed?: boolean };

const permissions: Record<AccessLevel, Permission[]> = {
  "special-user": ["site:read","site:edit","leadership:edit","divisions:edit","announcements:manage","audit:read","calendar:manage","developer:publish","applications:manage","media:manage","shop:manage","admin:all"],
  owner: ["site:read","site:edit","leadership:edit","divisions:edit","announcements:manage","audit:read","calendar:manage","developer:publish","applications:manage","media:manage","shop:manage","admin:all"],
  ownership: ["site:read","site:edit","leadership:edit","divisions:edit","announcements:manage","calendar:manage","applications:manage","media:manage"],
  "senior-leadership": ["site:read","leadership:edit","announcements:manage","calendar:manage","applications:manage"],
  developer: ["site:read","developer:publish","media:manage"],
  aide: ["site:read"], staff: ["site:read"], member: ["site:read"],
};

const SPECIAL_USER_IDS = new Set([SPECIAL_OWNER_ID, ...(process.env.DISCORD_SPECIAL_USER_IDS || "").split(",")].map(id => id.trim()).filter(Boolean));
const ROLE_ACCESS: Array<[Set<string>, AccessLevel]> = [
  [new Set([ROLE_IDS.owner, ROLE_IDS.coOwner, ROLE_IDS.chairman, ROLE_IDS.viceChairman, ...(ROLE_IDS.ofcAdmin ? [ROLE_IDS.ofcAdmin] : [])]), "owner"],
  [new Set([ROLE_IDS.headManagement, ROLE_IDS.headOperations, ROLE_IDS.headAdministration, ROLE_IDS.communityAffairs, ROLE_IDS.ceo, ROLE_IDS.headDevelopment]), "ownership"],
  [new Set([ROLE_IDS.generalManager, ROLE_IDS.headDepartment, ROLE_IDS.seniorManagement]), "senior-leadership"],
  [new Set([ROLE_IDS.developerPosts]), "developer"],
  [new Set([ROLE_IDS.aides]), "aide"],
  [new Set([ROLE_IDS.staff]), "staff"],
];

export function isSpecialUser(userId: string): boolean { return SPECIAL_USER_IDS.has(userId); }

/** Resolve the highest recognized Discord role by the guild's actual role position. */
export function getAccessLevel(userId: string, roleIds: string[], roles: DiscordGuildRole[] = []): AccessLevel {
  if (isSpecialUser(userId)) return "special-user";
  const assigned = new Set(roleIds);
  if (roles.length) {
    let best: { access: AccessLevel; position: number } | null = null;
    for (const [ids, access] of ROLE_ACCESS) {
      for (const role of roles) {
        if (!assigned.has(role.id) || role.managed || !ids.has(role.id)) continue;
        if (!best || role.position > best.position) best = { access, position: role.position };
      }
    }
    return best?.access ?? "member";
  }
  for (const [ids, access] of ROLE_ACCESS) if (roleIds.some(roleId => ids.has(roleId))) return access;
  return "member";
}

export function can(access: AccessLevel, permission: Permission): boolean { return permissions[access].includes(permission); }
export function getPermissions(access: AccessLevel): Permission[] { return permissions[access]; }
