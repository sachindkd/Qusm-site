import { getContent, saveContent, type Content } from "@/lib/content";
import { FBMRP_GUILD_ID } from "@/lib/discord-roles";

const API = "https://discord.com/api/v10";
const PUBLIC_CHANNEL_HINTS = /^(welcome|start|info|information|rules?|guidelines?|announcements?|news|updates?|recruitment|recruit|apply|applications?|handbook|faq|events?|public|general|about|resources?)([-_ ]|$)/i;
const MAX_MESSAGES_PER_CHANNEL = 100;
const MAX_BLOCK_CHARS = 3500;

function token() {
  const t = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!t) throw new Error("DISCORD_BOT_TOKEN is not configured");
  return t;
}

async function discord(path: string) {
  const r = await fetch(API + path, {
    headers: { Authorization: `Bot ${token()}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Discord API ${r.status}: ${await r.text()}`);
  return r.json();
}

function clean(text: string) {
  return text.replace(/<@!?\d+>/g, "@member").replace(/<@&\d+>/g, "@role").replace(/<#\d+>/g, "#channel").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
}

function dateLabel(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export async function syncQusmWebsiteFromDiscord() {
  const guildId = FBMRP_GUILD_ID;
  const [guild, roles, channels] = await Promise.all([
    discord(`/guilds/${guildId}`),
    discord(`/guilds/${guildId}/roles`),
    discord(`/guilds/${guildId}/channels`),
  ]);

  const textChannels = (Array.isArray(channels) ? channels : [])
    .filter((c: any) => c?.type === 0 && typeof c.name === "string")
    .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0));

  const publicChannels = textChannels.filter((c: any) => PUBLIC_CHANNEL_HINTS.test(c.name));
  const scanned: any[] = [];
  for (const channel of publicChannels) {
    const messages = await discord(`/channels/${channel.id}/messages?limit=${MAX_MESSAGES_PER_CHANNEL}`);
    const useful = (Array.isArray(messages) ? messages : [])
      .filter((m: any) => !m?.author?.bot && typeof m?.content === "string" && clean(m.content).length >= 20)
      .slice(0, 25)
      .map((m: any) => ({ id: String(m.id), content: clean(m.content).slice(0, MAX_BLOCK_CHARS), date: dateLabel(m.timestamp), author: clean(String(m.author?.global_name || m.author?.username || "Member")).slice(0, 80) }));
    scanned.push({ id: String(channel.id), name: channel.name, categoryId: channel.parent_id || null, messages: useful });
  }

  const roleRows = (Array.isArray(roles) ? roles : [])
    .filter((r: any) => !r.managed && String(r.name || "").trim() && String(r.name) !== "@everyone")
    .sort((a: any, b: any) => Number(b.position || 0) - Number(a.position || 0))
    .slice(0, 100)
    .map((r: any) => ({ id: String(r.id), name: String(r.name), position: Number(r.position || 0) }));

  const channelLines = textChannels.slice(0, 100).map((c: any) => {
    const category = textChannels.find((x: any) => x.id === c.parent_id)?.name;
    return `• #${c.name}${category ? ` — ${category}` : ""}`;
  }).join("\n");

  const publicBlocks = scanned.flatMap((channel: any) =>
    channel.messages.slice(0, 25).map((m: any) => ({
      type: "text" as const,
      title: `#${channel.name}${m.date ? ` · ${m.date}` : ""}`,
      body: m.content,
    }))
  ).slice(0, 120);

  const roleBody = roleRows.map((r: any) => `• ${r.name}`).join("\n") || "No public roles discovered.";
  const syncSection = {
    id: "discord-live-sync",
    slug: "discord-live-sync",
    eyebrow: "LIVE DISCORD SYNC",
    title: `${String(guild?.name || "QUSM")} — Current Discord Information`,
    description: `Synchronized from Discord server ${guildId}. This section is generated from accessible public-facing channels and server structure.`,
    layout: "wide" as const,
    accent: "gold" as const,
    published: true,
    order: 999,
    blocks: [
      { id: "discord-structure", type: "text" as const, title: "Current Server Structure", body: channelLines || "No text channels discovered." },
      { id: "discord-roles", type: "text" as const, title: "Current Roles", body: roleBody },
      ...publicBlocks.map((b: any, i: number) => ({ ...b, id: `discord-message-${i}` })),
    ],
  };

  const current = await getContent();
  const customSections = (current.customSections || []).filter((s: any) => s.id !== "discord-live-sync");
  const next: Content = {
    ...current,
    org: { ...current.org, name: "QUSM", fullName: current.org?.fullName || "Quavy's United States Military" },
    customSections: [...customSections, syncSection],
  };
  await saveContent(next);

  return {
    guildId,
    guildName: guild?.name || guildId,
    channelsScanned: textChannels.length,
    publicChannelsScanned: publicChannels.length,
    rolesScanned: roleRows.length,
    messagesImported: publicBlocks.length,
  };
}
