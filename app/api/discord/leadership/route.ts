import { NextResponse } from "next/server";

const ROLE_IDS = {
  owner: "1430245086930669579",
  chairman: "1501042310320881834",
  coOwner: process.env.DISCORD_CO_OWNER_ROLE_ID || "",
  viceChairman: process.env.DISCORD_VICE_CHAIRMAN_ROLE_ID || "",
} as const;

const TTL = 60_000;
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
    const r = await fetch(url, { headers: { Authorization: `Bot ${token}` }, next: { revalidate: 60 } });
    if (!r.ok) throw new Error(`Discord API ${r.status}`);
    const batch = await r.json(); out.push(...batch);
    if (batch.length < 1000) break;
    after = batch[batch.length - 1].user.id;
  }
  return out;
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.data);
    const members = await getGuildMembers();
    const result = Object.fromEntries(Object.entries(ROLE_IDS).map(([key, roleId]) => {
      if (!roleId) return [key, []];
      return [key, members.filter((m: any) => m.roles?.includes(roleId)).map((m: any) => ({
        id: m.user.id,
        username: m.user.username,
        displayName: m.nick || m.user.global_name || m.user.username,
        avatar: m.avatar ? `https://cdn.discordapp.com/guilds/${process.env.DISCORD_GUILD_ID}/users/${m.user.id}/avatars/${m.avatar}.png?size=256` : `https://cdn.discordapp.com/embed/avatars/${parseInt(m.user.id, 10) % 5}.png`,
        roleId,
      }))];
    }));
    cache = { at: Date.now(), data: result };
    return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unable to load Discord leadership" }, { status: 503 });
  }
}
