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

export type AccessLevel =
  | "owner"
  | "management"
  | "senior-leadership"
  | "developer"
  | "aide"
  | "staff"
  | "member";

export type Permission =
  | "site:read"
  | "site:edit"
  | "leadership:edit"
  | "divisions:edit"
  | "announcements:manage"
  | "calendar:manage"
  | "developer:publish"
  | "applications:manage"
  | "media:manage"
  | "admin:all";

export type DiscordGuildRole = {
  id: string;
  name: string;
  position: number;
  managed?: boolean;
};

const permissions: Record<AccessLevel, Permission[]> = {
  owner: [
    "site:read",
    "site:edit",
    "leadership:edit",
    "divisions:edit",
    "announcements:manage",
    "calendar:manage",
    "developer:publish",
    "applications:manage",
    "media:manage",
    "admin:all",
  ],
  management: [
    "site:read",
    "site:edit",
    "leadership:edit",
    "divisions:edit",
    "announcements:manage",
    "calendar:manage",
    "applications:manage",
    "media:manage",
  ],
  "senior-leadership": [
    "site:read",
    "leadership:edit",
    "divisions:edit",
    "announcements:manage",
    "calendar:manage",
    "applications:manage",
  ],
  developer: ["site:read", "developer:publish", "media:manage"],
  aide: ["site:read", "announcements:manage", "calendar:manage"],
  staff: ["site:read"],
  member: ["site:read"],
};

function accessForRole(roleId: string): AccessLevel {
  if (roleId === ROLE_IDS.owner || roleId === ROLE_IDS.coOwner || roleId === ROLE_IDS.chairman) {
    return "owner";
  }
  if (roleId === ROLE_IDS.headManagement) return "management";
  if (
    [
      ROLE_IDS.generalManager,
      ROLE_IDS.headOperations,
      ROLE_IDS.headAdministration,
      ROLE_IDS.communityAffairs,
      ROLE_IDS.ceo,
      ROLE_IDS.headDepartment,
      ROLE_IDS.viceChairman,
      ROLE_IDS.seniorManagement,
    ].includes(roleId as never)
  ) {
    return "senior-leadership";
  }
  if (roleId === ROLE_IDS.headDevelopment || roleId === ROLE_IDS.developerPosts) {
    return "developer";
  }
  if (roleId === ROLE_IDS.aides) return "aide";
  if (roleId === ROLE_IDS.staff) return "staff";
  return "member";
}

export function getAccessLevel(
  userId: string,
  roleIds: string[],
  roles?: DiscordGuildRole[],
): AccessLevel {
  if (userId === SPECIAL_OWNER_ID) return "owner";

  if (roles?.length) {
    const highestAssignedRole = roles
      .filter((role) => roleIds.includes(role.id) && !role.managed)
      .sort((a, b) => b.position - a.position)[0];

    return highestAssignedRole ? accessForRole(highestAssignedRole.id) : "member";
  }

  const knownRole = Object.values(ROLE_IDS).find((roleId) => roleIds.includes(roleId));
  return knownRole ? accessForRole(knownRole) : "member";
}

export function can(access: AccessLevel, permission: Permission): boolean {
  return permissions[access].includes(permission);
}

export function getPermissions(access: AccessLevel): Permission[] {
  return permissions[access];
}
