import { NextResponse } from "next/server";

const ROLE_IDS = {
  owner: "1430245086930669579",
  chairman: "1501042310320881834",
  coOwner: "1530961653103853669",
  viceChairman: "1538516021608972318",
} as const;

const TTL = 15_000;
let cache: { at: number; data: any } | null = null;

type DiscordMember = {
  user: {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
    discriminator?: string;
  };
  nick?: string | null;
  avatar?: string | null;
  roles?: string[];
  presence?: { status?: string; activities?: any[] };
};

async function getGuildMembers(): Promise<DiscordMember[]> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guild = process.env.DISCORD_GUILD_ID;
  if (!token || !guild) throw new Error("Discord integration is not configured");

  const out: DiscordMember[] = [];
  for (let after = "0"; ; ) {
    const url = new URL(`https://discord.com/api/v10/guilds/${guild}/members`);
    url.searchParams.set("limit", "1000");
    url.searchParams.set("with_presences", "true");
    if (after !== "0") url.searchParams.set("after", after);

    const r = await fetch(url, {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Discord API ${r.status}`);

    const batch = (await r.json()) as DiscordMember[];
    out.push(...batch);
    if (batch.length < 1000) break;
    after = batch[batch.length - 1].user.id;
  }
  return out;
}

async function lanyardPresence(userId: string) {
  try {
    const r = await fetch(`https://api.lanyard.rest/v1/users/${userId}`, {
      cache: "no-store",
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d?.success || !d?.data) return null;
    return {
      status: d.data.discord_status || "offline",
      activities: Array.isArray(d.data.activities) ? d.data.activities : [],
    };
  } catch {
    return null;
  }
}

function avatarUrl(member: DiscordMember) {
  const guild = process.env.DISCORD_GUILD_ID;
  const userId = member.user.id;

  if (member.avatar && guild) {
    return `https://cdn.discordapp.com/guilds/${guild}/users/${userId}/avatars/${member.avatar}.png?size=256&quality=90`;
  }
  if (member.user.avatar) {
    const ext = member.user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${userId}/${member.user.avatar}.${ext}?size=256&quality=90`;
  }
  const index = Number(BigInt(userId) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function normalizePresence(status: string, activities: any[]) {
  const safe = status || "offline";
  return {
    status: safe,
    statusLabel: safe.charAt(0).toUpperCase() + safe.slice(1),
    activities: Array.isArray(activities) ? activities : [],
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < TTL) {
      return NextResponse.json(cache.data, { headers: { "Cache-Control": "no-store" } });
    }

    const members = await getGuildMembers();
    const leadership = members.filter((member) =>
      Object.values(ROLE_IDS).some((roleId) => member.roles?.includes(roleId)),
    );

    // Discord member presence is preferred. Lanyard is only used for members
    // for whom the REST response has no presence, so one user's data can never
    // overwrite another user's profile or status.
    const fallbackEntries = await Promise.all(
      leadership
        .filter((member) => !member.presence)
        .map(async (member) => [member.user.id, await lanyardPresence(member.user.id)] as const),
    );
    const fallback = new Map(fallbackEntries);

    const result: any = {};
    for (const [key, roleId] of Object.entries(ROLE_IDS)) {
      result[key] = members
        .filter((member) => member.roles?.includes(roleId))
        .map((member) => {
          const p = member.presence;
          const fallbackPresence = fallback.get(member.user.id);
          const presence = p?.status
            ? normalizePresence(p.status, p.activities || [])
            : fallbackPresence
              ? normalizePresence(fallbackPresence.status, fallbackPresence.activities)
              : normalizePresence("offline", []);

          return {
            id: member.user.id,
            username: member.user.username,
            displayName: member.nick || member.user.global_name || member.user.username,
            avatar: avatarUrl(member),
            roleId,
            status: presence.status,
            statusLabel: presence.statusLabel,
            activities: presence.activities,
          };
        });
    }

    cache = { at: Date.now(), data: result };
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Unable to load Discord leadership" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
