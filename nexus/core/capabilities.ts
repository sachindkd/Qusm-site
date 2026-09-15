export type NexusCapabilityRisk = 'read' | 'change' | 'destructive';

export type NexusCapability = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  risk: NexusCapabilityRisk;
};

export const NEXUS_CAPABILITIES: NexusCapability[] = [
  { name: 'inspect_server', description: 'Inspect the current Discord guild structure, channels, roles and configuration.', inputSchema: { guildId: 'string' }, risk: 'read' },
  { name: 'inspect_members', description: 'Inspect guild members and available public/account metadata.', inputSchema: { guildId: 'string', query: 'string?' }, risk: 'read' },
  { name: 'inspect_audit_log', description: 'Inspect recent Discord audit-log activity for the current guild.', inputSchema: { guildId: 'string', limit: 'number?' }, risk: 'read' },
  { name: 'create_channel', description: 'Create a Discord channel within the current guild.', inputSchema: { guildId: 'string', name: 'string', type: 'number?', parentId: 'string?' }, risk: 'change' },
  { name: 'edit_channel', description: 'Edit a Discord channel within the current guild.', inputSchema: { guildId: 'string', channelId: 'string', changes: 'object' }, risk: 'change' },
  { name: 'delete_channel', description: 'Delete a Discord channel within the current guild.', inputSchema: { guildId: 'string', channelId: 'string' }, risk: 'destructive' },
  { name: 'create_role', description: 'Create a Discord role within the current guild.', inputSchema: { guildId: 'string', name: 'string', options: 'object?' }, risk: 'change' },
  { name: 'edit_role', description: 'Edit a Discord role within the current guild.', inputSchema: { guildId: 'string', roleId: 'string', changes: 'object' }, risk: 'change' },
  { name: 'assign_role', description: 'Assign a role to a member in the current guild.', inputSchema: { guildId: 'string', userId: 'string', roleId: 'string' }, risk: 'change' },
  { name: 'timeout_member', description: 'Timeout a member in the current guild.', inputSchema: { guildId: 'string', userId: 'string', durationSeconds: 'number' }, risk: 'change' },
  { name: 'kick_member', description: 'Kick a member from the current guild.', inputSchema: { guildId: 'string', userId: 'string', reason: 'string?' }, risk: 'destructive' },
  { name: 'ban_member', description: 'Ban a member from the current guild.', inputSchema: { guildId: 'string', userId: 'string', reason: 'string?' }, risk: 'destructive' },
  { name: 'send_message', description: 'Send a message to a channel in the current guild.', inputSchema: { guildId: 'string', channelId: 'string', content: 'string' }, risk: 'change' },
  { name: 'search_server_history', description: 'Search NEXUS-managed history belonging only to the current guild.', inputSchema: { guildId: 'string', query: 'string', limit: 'number?' }, risk: 'read' },
  { name: 'query_public_data', description: 'Query an enabled public-data provider for an investigation.', inputSchema: { guildId: 'string', subject: 'string', provider: 'string' }, risk: 'read' },
];

export function getCapabilityCatalog(): NexusCapability[] {
  return NEXUS_CAPABILITIES;
}
