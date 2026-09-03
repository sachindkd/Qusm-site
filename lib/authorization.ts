import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, SPECIAL_OWNER_ID, getAccessLevel, can, type AccessLevel, type Permission, type DiscordGuildRole } from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";

export type AuthorizationResult = { userId: string; access: AccessLevel; roleIds: string[]; username: string };

/** Resolve authorization from live Discord membership and live guild role positions. */
export async function getLiveAuthorization(): Promise<AuthorizationResult | null> {
  const raw = (await cookies()).get(DISCORD_SESSION_COOKIE)?.value;
  const session = readDiscordSession(raw);
  if (!session) return null;
  if (session.id === SPECIAL_OWNER_ID || (process.env.DISCORD_SPECIAL_USER_IDS || "").split(",").map((id) => id.trim()).filter(Boolean).includes(session.id)) {
    return { userId: session.id, access: "special-user", roleIds: [], username: session.username || session.id };
  }
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  try {
    const headers = { Authorization: `Bot ${token}` };
    const [memberResponse, rolesResponse] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${encodeURIComponent(session.id)}`, { headers, cache: "no-store" }),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
    ]);
    if (!memberResponse.ok || !rolesResponse.ok) return null;
    const member = await memberResponse.json() as { roles?: unknown[]; user?: { username?: string } };
    const guildRoles = await rolesResponse.json() as DiscordGuildRole[];
    const roleIds = Array.isArray(member.roles) ? member.roles.filter((id): id is string => typeof id === "string") : [];
    return { userId: session.id, access: getAccessLevel(session.id, roleIds, guildRoles), roleIds, username: member.user?.username || session.username || session.id };
  } catch { return null; }
}

export async function requirePermission(permission: Permission): Promise<AuthorizationResult | null> {
  const identity = await getLiveAuthorization();
  return identity && can(identity.access, permission) ? identity : null;
}

export function isStateChangingMethod(method: string): boolean { return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase()); }

/** Strict CSRF/origin check for state-changing browser requests. */
export function passesSameOrigin(request: Request): boolean {
  const target = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin) {
    try { return new URL(origin).origin === target; } catch { return false; }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try { return new URL(referer).origin === target; } catch { return false; }
  }
  return false;
}
