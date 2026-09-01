import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, SPECIAL_OWNER_ID, getAccessLevel, can, type AccessLevel, type DiscordGuildRole, type Permission } from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";

export type AuthorizationResult = {
  userId: string;
  access: AccessLevel;
  roleIds: string[];
  username: string;
};

/**
 * Resolve authorization from the live Discord guild membership.
 * The signed session is identity only; its cached roles/access are never trusted.
 */
export async function getLiveAuthorization(): Promise<AuthorizationResult | null> {
  const raw = (await cookies()).get(DISCORD_SESSION_COOKIE)?.value;
  const session = readDiscordSession(raw);
  if (!session) return null;

  if (session.id === SPECIAL_OWNER_ID) {
    return { userId: session.id, access: "owner", roleIds: [], username: session.username || session.id };
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;

  try {
    const headers = { Authorization: `Bot ${token}` };
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${encodeURIComponent(session.id)}`,
      { headers, cache: "no-store" },
    );
    if (!response.ok) return null;
    const member = await response.json() as { roles?: unknown[]; user?: { username?: string } };
    const roleIds = Array.isArray(member.roles) ? member.roles.filter((id): id is string => typeof id === "string") : [];
    return {
      userId: session.id,
      access: getAccessLevel(session.id, roleIds),
      roleIds,
      username: member.user?.username || session.username || session.id,
    };
  } catch {
    return null;
  }
}

export async function requirePermission(permission: Permission): Promise<AuthorizationResult | null> {
  const identity = await getLiveAuthorization();
  if (!identity || !can(identity.access, permission)) return null;
  return identity;
}

export function isStateChangingMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

/** Same-origin check for browser state-changing requests. */
export function passesSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
