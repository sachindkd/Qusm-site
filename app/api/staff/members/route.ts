import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, SPECIAL_OWNER_ID, getAccessLevel, can, type DiscordGuildRole } from "../../../../lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "../../../../lib/discord-session";
import { rateLimit, requestKey } from "../../../../lib/rate-limit";

const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 12;

async function getLiveAccess(session: ReturnType<typeof readDiscordSession>) {
  if (!session) return "member" as const;
  if (session.id === SPECIAL_OWNER_ID) return "owner" as const;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return "member" as const;
  try {
    const headers = { Authorization: `Bot ${token}` };
    const [memberRes, rolesRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers, cache: "no-store" }),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
    ]);
    if (!memberRes.ok || !rolesRes.ok) return "member" as const;
    const member = await memberRes.json() as { roles?: string[] };
    const roles = await rolesRes.json() as DiscordGuildRole[];
    return getAccessLevel(session.id, member.roles ?? [], roles);
  } catch {
    return "member" as const;
  }
}

export async function GET(request: Request) {
  const limiter = rateLimit(requestKey(request, "staff-members-search"), 30, 60_000);
  if (!limiter.allowed) return NextResponse.json({ error: "Too many member searches. Try again shortly." }, { status: 429, headers: { ...noStore, "Retry-After": String(limiter.retryAfter) } });

  const session = readDiscordSession((await cookies()).get(DISCORD_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });

  const access = await getLiveAccess(session);
  if (!can(access, "applications:manage") && !can(access, "leadership:edit") && !can(access, "divisions:edit") && access !== "owner") {
    return NextResponse.json({ error: "Staff management access required" }, { status: 403, headers: noStore });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < MIN_QUERY_LENGTH) return NextResponse.json({ members: [] }, { headers: noStore });

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Discord bot is not configured" }, { status: 503, headers: noStore });

  const headers = { Authorization: `Bot ${token}` };
  try {
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
