import { NextResponse } from "next/server";

// Canonical FBMR command priority/order:
// OWNER → CO-OWNER → CM → VCM
const ROLE_IDS = {
  owner: "1430245086930669579",
  coOwner: "1530961653103853669",
  chairman: "1501042310320881834",
  viceChairman: "716797005753483324",
} as const;

let cache: { at: number; data: any } | null = null;
const TTL = 15_000;

type Member = { user: { id: string; username: string; global_name?: string | null; avatar?: string | null }; nick?: string | null; avatar?: string | null; roles?: string[]; presence?: { status?: string; activities?: any[] } };

async function getMembers(): Promise<Member[]> {
  const token = process.env.DISCORD_BOT_TOKEN, guild = process.env.DISCORD_GUILD_ID;
  if (!token || !guild) throw new Error("Discord integration is not configured");
  const all: Member[] = [];
  for (let after = "0"; ; ) {
    const u = new URL(`https://discord.com/api/v10/guilds/${guild}/members`);
    u.searchParams.set("limit", "1000");
    u.searchParams.set("with_presences", "true");
    if (after !== "0") u.searchParams.set("after", after);
    const r = await fetch(u, { headers: { Authorization: `Bot ${token}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`Discord API ${r.status}`);
    const batch = await r.json() as Member[];
    all.push(...batch);
    if (batch.length < 1000) break;
    after = batch[batch.length - 1].user.id;
  }
  return all;
}

function avatar(member: Member) {
  const id = member.user.id, guild = process.env.DISCORD_GUILD_ID;
  if (member.avatar && guild) return `https://cdn.discordapp.com/guilds/${guild}/users/${id}/avatars/${member.avatar}.png?size=256`;
  if (member.user.avatar) return `https://cdn.discordapp.com/avatars/${id}/${member.user.avatar}.png?size=256`;
  const fallback = Number(id.slice(-1)) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${fallback}.png`;
}

function profile(member: Member, roleId: string) {
  const status = member.presence?.status || "offline";
  return {
    id: member.user.id,
    username: member.user.username,
    displayName: member.nick || member.user.global_name || member.user.username,
    avatar: avatar(member),
    roleId,
    status,
    statusLabel: status === "dnd" ? "Do Not Disturb" : status.charAt(0).toUpperCase() + status.slice(1),
    activities: Array.isArray(member.presence?.activities) ? member.presence!.activities : [],
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.data);
    const members = await getMembers();
    // Object insertion order is intentional: consumers that iterate Object.entries()
    // receive the same canonical command priority as the UI.
    const data: Record<string, any[]> = {};
    for (const [key, roleId] of Object.entries(ROLE_IDS)) {
      data[key] = members.filter(m => m.roles?.includes(roleId)).map(m => profile(m, roleId));
    }
    cache = { at: Date.now(), data };
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unable to load Discord leadership" }, { status: 503 });
  }
}
