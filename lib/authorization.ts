import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, SPECIAL_OWNER_ID, getAccessLevel, can, type AccessLevel, type Permission } from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";

export type AuthorizationResult = { userId: string; access: AccessLevel; roleIds: string[]; username: string };

/** Resolve authorization from live Discord membership; cached client roles are never trusted. */
export async function getLiveAuthorization(): Promise<AuthorizationResult | null> {
  const raw = (await cookies()).get(DISCORD_SESSION_COOKIE)?.value;
  const session = readDiscordSession(raw);
  if (!session) return null;
  if (session.id === SPECIAL_OWNER_ID) return { userId: session.id, access: "owner", roleIds: [], username: session.username || session.id };
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${encodeURIComponent(session.id)}`, { headers: { Authorization: `Bot ${token}` }, cache: "no-store" });
    if (!response.ok) return null;
    const member = await response.json() as { roles?: unknown[]; user?: { username?: string } };
    const roleIds = Array.isArray(member.roles) ? member.roles.filter((id): id is string => typeof id === "string") : [];
    return { userId: session.id, access: getAccessLevel(session.id, roleIds), roleIds, username: member.user?.username || session.username || session.id };
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
  // Modern browsers send Origin for state-changing fetches. Reject requests
  // with neither Origin nor Referer so a cookie-only cross-site request cannot mutate CMS data.
  return false;
}
