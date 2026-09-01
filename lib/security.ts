import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, SPECIAL_OWNER_ID, getAccessLevel, can, type AccessLevel, type Permission, type DiscordGuildRole } from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";

export type AuthContext = { userId: string; username: string; access: AccessLevel; roleIds: string[] };

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = readDiscordSession((await cookies()).get(DISCORD_SESSION_COOKIE)?.value);
  if (!session) return null;
  if (session.id === SPECIAL_OWNER_ID) return { userId: session.id, username: session.username || session.id, access: "owner", roleIds: session.roles || [] };
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  try {
    const headers = { Authorization: `Bot ${token}` };
    const response = await fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers, cache: "no-store" });
    if (!response.ok) return null;
    const member = await response.json() as { roles?: unknown[]; user?: { username?: string } };
    const roleIds = Array.isArray(member.roles) ? member.roles.filter((id): id is string => typeof id === "string") : [];
    return { userId: session.id, username: member.user?.username || session.username || session.id, access: getAccessLevel(session.id, roleIds), roleIds };
  } catch { return null; }
}

export async function requirePermission(permission: Permission): Promise<AuthContext | null> {
  const auth = await getAuthContext();
  return auth && can(auth.access, permission) ? auth : null;
}

export async function requireAnyPermission(permissions: Permission[]): Promise<AuthContext | null> {
  const auth = await getAuthContext();
  return auth && permissions.some(permission => can(auth.access, permission)) ? auth : null;
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

export function requestContentTypeIsJson(request: Request): boolean {
  return (request.headers.get("content-type") || "").toLowerCase().includes("application/json");
}
