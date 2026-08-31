import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, SPECIAL_OWNER_ID, getAccessLevel, getPermissions, type DiscordGuildRole } from "../../../../lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "../../../../lib/discord-session";

const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 12;

export async function GET(request: Request) {
  const session = readDiscordSession((await cookies()).get(DISCORD_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < MIN_QUERY_LENGTH) return NextResponse.json({ members: [] }, { headers: noStore });

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Discord bot is not configured" }, { status: 503, headers: noStore });

  const headers = { Authorization: `Bot ${token}` };

  try {
    // Verify the requester is still a permitted staff/admin user.
    if (session.id !== SPECIAL_OWNER_ID) {
      const memberRes = await fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers, cache: "no-store" });
      const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" });
      if (!memberRes.ok || !rolesRes.ok) return NextResponse.json({ error: "Unable to verify staff access" }, { status: 403, headers: noStore });
      const member = await memberRes.json() as { roles?: string[] };
      const roles = await rolesRes.json() as DiscordGuildRole[];
      const access = getAccessLevel(session.id, member.roles ?? [], roles);
      const permissions = getPermissions(access);
      if (access === "member" || access === "staff" || access === "aide") return NextResponse.json({ error: "Staff access required" }, { status: 403, headers: noStore });
      void permissions;
    }

    // Discord's guild member search searches username, global name, nickname and similar member fields.
    const response = await fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/search?query=${encodeURIComponent(query)}&limit=${MAX_RESULTS}`, { headers, cache: "no-store" });
    if (!response.ok) {
      const body = await response.text();
      return NextResponse.json({ error: body || "Discord member search failed" }, { status: response.status === 429 ? 429 : 502, headers: noStore });
    }

    const members = await response.json() as Array<{ user?: { id: string; username: string; global_name?: string | null; avatar?: string | null }; nick?: string | null; roles?: string[] }>;
    const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" });
    const roles = rolesResponse.ok ? await rolesResponse.json() as DiscordGuildRole[] : [];
    const roleNames = new Map(roles.map(role => [role.id, role.name]));

    return NextResponse.json({
      members: members.slice(0, MAX_RESULTS).map(member => ({
        id: member.user?.id ?? "",
        username: member.user?.username ?? "Unknown",
        globalName: member.user?.global_name ?? null,
        nick: member.nick ?? null,
        avatar: member.user?.avatar && member.user?.id ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png?size=64` : null,
        rank: (member.roles ?? []).map(id => roleNames.get(id)).filter(Boolean)[0] ?? null,
      })).filter(member => member.id),
    }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Could not reach Discord" }, { status: 502, headers: noStore });
  }
}
