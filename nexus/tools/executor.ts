import { NexusServerContext } from '../core';
import { executeScoped, scopedAction } from '../sandbox/actions';
import { getCapabilityCatalog } from '../core/capabilities';
import * as discord from '../discord/rest';
import { investigateRoblox } from '../investigations/providers/roblox';

export type ToolExecutionResult = { ok: boolean; capability: string; result?: unknown; error?: string };

export async function executeCapability(context: NexusServerContext, capability: string, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  if (!getCapabilityCatalog().some((c) => c.name === capability)) return { ok: false, capability, error: `Unknown capability: ${capability}` };
  try {
    const action = scopedAction(context, capability, input);
    const result = await executeScoped(context, action, async () => {
      switch (capability) {
        case 'inspect_server': return Promise.all([discord.guild(context.guildId), discord.channels(context.guildId), discord.roles(context.guildId)]);
        case 'inspect_members': return discord.members(context.guildId, String(input.query || ''), Number(input.limit ?? 50));
        case 'inspect_audit_log': return discord.auditLog(context.guildId, Number(input.limit ?? 50));
        case 'create_channel': return discord.createChannel(context.guildId, { name: String(input.name), type: input.type === undefined ? undefined : Number(input.type), parentId: input.parentId ? String(input.parentId) : undefined, topic: input.topic ? String(input.topic) : undefined });
        case 'edit_channel': return discord.editChannel(context.guildId, String(input.channelId), (input.changes ?? {}) as Record<string, unknown>);
        case 'delete_channel': return discord.deleteChannel(context.guildId, String(input.channelId));
        case 'create_role': return discord.createRole(context.guildId, { name: String(input.name), color: input.color === undefined ? undefined : Number(input.color), hoist: input.hoist === undefined ? undefined : Boolean(input.hoist), mentionable: input.mentionable === undefined ? undefined : Boolean(input.mentionable) });
        case 'edit_role': return discord.editRole(context.guildId, String(input.roleId), (input.changes ?? {}) as Record<string, unknown>);
        case 'assign_role': return discord.assignRole(context.guildId, String(input.userId), String(input.roleId));
        case 'timeout_member': return discord.timeoutMember(context.guildId, String(input.userId), Number(input.durationSeconds));
        case 'kick_member': return discord.kickMember(context.guildId, String(input.userId), input.reason ? String(input.reason) : undefined);
        case 'ban_member': return discord.banMember(context.guildId, String(input.userId), input.reason ? String(input.reason) : undefined);
        case 'send_message': return discord.sendMessage(context.guildId, String(input.channelId), String(input.content));
        case 'search_server_history': {
          const channelId = String(input.channelId || context.channelId || '');
          if (!channelId) throw new Error('A Discord channel is required for conversation history.');
          const query = String(input.query || '').toLowerCase().trim();
          const rows = await discord.messages(channelId, Number(input.limit ?? 50));
          if (!Array.isArray(rows)) return [];
          return rows.filter((m: any) => !query || String(m?.content || '').toLowerCase().includes(query)).slice(0, 25);
        }
        case 'query_public_data':
          if (String(input.provider || '').toLowerCase() !== 'roblox') throw new Error('Only the Roblox public provider is enabled.');
          return investigateRoblox(String(input.subject));
        default: throw new Error(`No executor is registered for '${capability}'.`);
      }
    });
    return { ok: true, capability, result };
  } catch (error) { return { ok: false, capability, error: error instanceof Error ? error.message : 'Unknown execution error.' }; }
}
