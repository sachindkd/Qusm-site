const DISCORD_API = 'https://discord.com/api/v10';

type DiscordRequestOptions = {
  method?: string;
  body?: unknown;
};

export class DiscordApiError extends Error {
  status: number;
  details: unknown;
  constructor(status: number, details: unknown) {
    super(`Discord API request failed with status ${status}`);
    this.status = status;
    this.details = details;
  }
}

function token(): string {
  const value = process.env.NEXUS_DISCORD_BOT_TOKEN;
  if (!value) throw new Error('NEXUS_DISCORD_BOT_TOKEN is not configured.');
  return value;
}

export async function discordRequest(path: string, options: DiscordRequestOptions = {}) {
  const response = await fetch(`${DISCORD_API}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bot ${token()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'NEXUS/0.1 (+Discord AI operations)',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });

  const text = await response.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new DiscordApiError(response.status, data);
  return data;
}

export async function guild(guildId: string) {
  return discordRequest(`/guilds/${encodeURIComponent(guildId)}?with_counts=true`);
}

export async function channels(guildId: string) {
  return discordRequest(`/guilds/${encodeURIComponent(guildId)}/channels`);
}

export async function roles(guildId: string) {
  return discordRequest(`/guilds/${encodeURIComponent(guildId)}/roles`);
}

export async function auditLog(guildId: string, limit = 50) {
  return discordRequest(`/guilds/${encodeURIComponent(guildId)}/audit-logs?limit=${Math.min(Math.max(limit, 1), 100)}`);
}

export async function createChannel(guildId: string, input: { name: string; type?: number; parentId?: string; topic?: string }) {
  return discordRequest(`/guilds/${encodeURIComponent(guildId)}/channels`, {
    method: 'POST',
    body: { name: input.name, type: input.type ?? 0, parent_id: input.parentId, topic: input.topic },
  });
}

export async function editChannel(guildId: string, channelId: string, changes: Record<string, unknown>) {
  return discordRequest(`/channels/${encodeURIComponent(channelId)}`, {
    method: 'PATCH',
    body: changes,
  });
}

export async function deleteChannel(guildId: string, channelId: string) {
  void guildId;
  return discordRequest(`/channels/${encodeURIComponent(channelId)}`, { method: 'DELETE' });
}

export async function createRole(guildId: string, input: { name: string; color?: number; hoist?: boolean; mentionable?: boolean }) {
  return discordRequest(`/guilds/${encodeURIComponent(guildId)}/roles`, { method: 'POST', body: input });
}

export async function editRole(guildId: string, roleId: string, changes: Record<string, unknown>) {
  return discordRequest(`/guilds/${encodeURIComponent(guildId)}/roles/${encodeURIComponent(roleId)}`, { method: 'PATCH', body: changes });
}

export async function assignRole(guildId: string, userId: string, roleId: string) {
  return discordRequest(`/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`, { method: 'PUT' });
}

export async function timeoutMember(guildId: string, userId: string, durationSeconds: number) {
  const clamped = Math.min(Math.max(Math.floor(durationSeconds), 1), 2419200);
  return discordRequest(`/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: { communication_disabled_until: new Date(Date.now() + clamped * 1000).toISOString() },
  });
}

export async function kickMember(guildId: string, userId: string, reason?: string) {
  return discordRequest(`/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE', body: undefined });
}

export async function banMember(guildId: string, userId: string, reason?: string) {
  return discordRequest(`/guilds/${encodeURIComponent(guildId)}/bans/${encodeURIComponent(userId)}`, { method: 'PUT', body: reason ? { delete_message_seconds: 0 } : { delete_message_seconds: 0 } });
}

export async function sendMessage(guildId: string, channelId: string, content: string) {
  void guildId;
  return discordRequest(`/channels/${encodeURIComponent(channelId)}/messages`, { method: 'POST', body: { content } });
}
