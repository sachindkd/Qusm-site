export type NexusCapabilityRisk = 'read' | 'change' | 'destructive';
export type NexusCapability = { name: string; description: string; inputSchema: Record<string, unknown>; risk: NexusCapabilityRisk };

export const NEXUS_CAPABILITIES: NexusCapability[] = [
  { name: 'inspect_server', description: 'Inspect the current authorized Discord guild structure, channels, roles and configuration.', inputSchema: { guildId: 'string' }, risk: 'read' },
  { name: 'inspect_members', description: 'Inspect guild members.', inputSchema: { guildId: 'string', query: 'string?', limit: 'number?' }, risk: 'read' },
  { name: 'inspect_audit_log', description: 'Inspect recent Discord audit-log activity.', inputSchema: { guildId: 'string', limit: 'number?' }, risk: 'read' },
  { name: 'inspect_channel', description: 'Fetch and inspect one channel after validating it belongs to the authorized guild.', inputSchema: { guildId: 'string', channelId: 'string' }, risk: 'read' },
  { name: 'inspect_roles', description: 'Inspect all roles in the authorized guild.', inputSchema: { guildId: 'string' }, risk: 'read' },
  { name: 'create_category', description: 'Create a Discord category in the authorized guild.', inputSchema: { guildId: 'string', name: 'string', reason: 'string?' }, risk: 'change' },
  { name: 'create_channel', description: 'Create a text, voice, forum, or other supported Discord channel in the authorized guild.', inputSchema: { guildId: 'string', name: 'string', type: 'number?', parentId: 'string?', topic: 'string?', reason: 'string?' }, risk: 'change' },
  { name: 'edit_channel', description: 'Edit a channel in the authorized guild, including safe permission-overwrite configuration.', inputSchema: { guildId: 'string', channelId: 'string', changes: 'object', reason: 'string?' }, risk: 'change' },
  { name: 'delete_channel', description: 'Delete a channel in the authorized guild.', inputSchema: { guildId: 'string', channelId: 'string', reason: 'string' }, risk: 'destructive' },
  { name: 'create_role', description: 'Create a role in the authorized guild.', inputSchema: { guildId: 'string', name: 'string', options: 'object?', reason: 'string?' }, risk: 'change' },
  { name: 'edit_role', description: 'Edit a role in the authorized guild.', inputSchema: { guildId: 'string', roleId: 'string', changes: 'object', reason: 'string?' }, risk: 'change' },
  { name: 'assign_role', description: 'Assign a role to a member of the authorized guild.', inputSchema: { guildId: 'string', userId: 'string', roleId: 'string', reason: 'string?' }, risk: 'change' },
  { name: 'timeout_member', description: 'Timeout a member in the authorized guild.', inputSchema: { guildId: 'string', userId: 'string', durationSeconds: 'number', reason: 'string?' }, risk: 'change' },
  { name: 'kick_member', description: 'Kick a member from the authorized guild.', inputSchema: { guildId: 'string', userId: 'string', reason: 'string' }, risk: 'destructive' },
  { name: 'ban_member', description: 'Ban a member from the authorized guild.', inputSchema: { guildId: 'string', userId: 'string', reason: 'string' }, risk: 'destructive' },
  { name: 'send_message', description: 'Send a message to a channel belonging to the authorized guild.', inputSchema: { guildId: 'string', channelId: 'string', content: 'string', embeds: 'array?' }, risk: 'change' },
  { name: 'create_embed', description: 'Send a structured Discord embed to a channel in the authorized guild.', inputSchema: { guildId: 'string', channelId: 'string', embed: 'object', reason: 'string?' }, risk: 'change' },
  { name: 'inspect_webhooks', description: 'Inspect webhooks for a channel after validating the channel belongs to the authorized guild.', inputSchema: { guildId: 'string', channelId: 'string' }, risk: 'read' },
  { name: 'create_webhook', description: 'Create a webhook for a channel in the authorized guild when genuinely useful.', inputSchema: { guildId: 'string', channelId: 'string', name: 'string', avatar: 'string?', reason: 'string?' }, risk: 'change' },
  { name: 'search_server_history', description: 'Search recent Discord channel history belonging to the authorized guild.', inputSchema: { guildId: 'string', channelId: 'string?', query: 'string', limit: 'number?' }, risk: 'read' },
  { name: 'query_public_data', description: 'Query an enabled public investigation provider. Currently Roblox public data is supported.', inputSchema: { guildId: 'string', subject: 'string', provider: 'string' }, risk: 'read' },
];
export function getCapabilityCatalog() { return NEXUS_CAPABILITIES; }
