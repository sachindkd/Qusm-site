import { NextResponse } from "next/server";

const ROLE_IDS = {
  owner: "1430245086930669579",
  chairman: "1501042310320881834",
  coOwner: "1530961653103853669",
  viceChairman: "1538516021608972318",
} as const;

const TTL = 15_000;
let cache: { at: number; data: any } | null = null;

async function getGuildMembers() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guild = process.env.DISCORD_GUILD_ID;
  if (!token || !guild) throw new Error("Discord integration is not configured");
  const out: any[] = [];
  for (let after = "0"; ; ) {
    const url = new URL(`https://discord.com/api/v10/guilds/${guild}/members`);
    url.searchParams.set("limit", "1000");
    if (after !== "0") url.searchParams.set("after", after);
    const r = await fetch(url, { headers: { Authorization: `Bot ${token}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`Discord API ${r.status}`);
    const batch = await r.json();
    out.push(...batch);
    if (batch.length < 1000) break;
    after = batch[batch.length - 1].user.id;
  }
  return out;
}

async function getPresence(userId: string) {
  try {
    const r = await fetch(`https://api.lanyard.rest/v1/users/${userId}`, { cache: "no-store" });
    if (!r.ok) return { status: "offline", activities: [] };
    const d = await r.json();
    return { status: d?.data?.discord_status || "offline", activities: d?.data?.activities || [] };
  } catch {
    return { status: "offline", activities: [] };
  }
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.data, { headers: { "Cache-Control": "no-store" } });
    const members = await getGuildMembers();
    const leadershipMembers = new Map<string, any>();
    for (const roleId of Object.values(ROLE_IDS)) {
      for (const member of members.filter((m: any) => m.roles?.includes(roleId))) leadershipMembers.set(member.user.id, member);
    }
    const presenceEntries = await Promise.all([...leadershipMembers.values()].map(async (m: any) => [m.user.id, await getPresence(m.user.id)] as const));
    const presence = new Map(presenceEntries);
    const result: any = {};
    for (const [key, roleId] of Object.entries(ROLE_IDS)) {
      result[key] = members.filter((m: any) => m.roles?.includes(roleId)).map((m: any) => {
        const p = presence.get(m.user.id) || { status: "offline", activities: [] };
        const avatar = m.avatar
          ? `https://cdn.discordapp.com/guilds/${process.env.DISCORD_GUILD_ID}/users/${m.user.id}/avatars/${m.avatar}.png?size=256`
          : `https://cdn.discordapp.com/embed/avatars/${Number(m.user.discriminator || 0) % 5}.png`;
        return { id: m.user.id, username: m.user.username, displayName: m.nick || m.user.global_name || m.user.username, avatar, roleId, status: p.status, statusLabel: p.status.charAt(0).toUpperCase() + p.status.slice(1), activities: p.activities };
      });
    }
    cache = { at: Date.now(), data: result };
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unable to load Discord leadership" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
