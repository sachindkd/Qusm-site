import { discordApi } from "@/lib/discord/quota/discord-api";
import { STAFF_GUILD_ID } from "@/lib/discord/quota/config";

const monitors = new Map<string, { channelId: string; enabled: boolean }>();

export function botSecurityStatus(guildId: string) {
  const state = monitors.get(guildId);
  return { enabled: !!state?.enabled, channel: state?.channelId || null };
}

export function stopBotSecurity(guildId: string) {
  monitors.delete(guildId);
}

export async function scanBotSecurity(guildId: string) {
  if (guildId !== STAFF_GUILD_ID) throw new Error("Unsupported guild");
  const members = await discordApi(`/guilds/${guildId}/members?limit=1000`);
  const bots = (Array.isArray(members) ? members : []).filter((m: any) => m?.user?.bot);
  return bots.map((m: any) => ({ id: m.user.id, username: m.user.username, risk: 0, indicators: [] as string[] }));
}

export async function startBotSecurity(guildId: string, channelId: string) {
  if (guildId !== STAFF_GUILD_ID) throw new Error("Unsupported guild");
  monitors.set(guildId, { enabled: true, channelId });
  return botSecurityStatus(guildId);
}
