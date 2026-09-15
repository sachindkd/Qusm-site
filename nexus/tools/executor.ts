import { NexusServerContext } from '../core';
import { executeScoped, scopedAction } from '../sandbox/actions';
import { getCapabilityCatalog } from '../core/capabilities';
import * as discord from '../discord/rest';

export type ToolExecutionResult = {
  ok: boolean;
  capability: string;
  result?: unknown;
  error?: string;
};

export async function executeCapability(
  context: NexusServerContext,
  capability: string,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  if (!getCapabilityCatalog().some((c) => c.name === capability)) {
    return { ok: false, capability, error: `Unknown capability: ${capability}` };
  }

  try {
    const action = scopedAction(context, capability, input);
    const result = await executeScoped(context, action, async () => {
      switch (capability) {
        case 'inspect_server':
          return Promise.all([discord.guild(context.guildId), discord.channels(context.guildId), discord.roles(context.guildId)]);
        case 'inspect_audit_log':
          return discord.auditLog(context.guildId, Number(input.limit ?? 50));
        case 'create_channel':
          return discord.createChannel(context.guildId, {
            name: String(input.name),
            type: input.type === undefined ? undefined : Number(input.type),
            parentId: input.parentId ? String(input.parentId) : undefined,
            topic: input.topic ? String(input.topic) : undefined,
          });
        case 'edit_channel':
          return discord.editChannel(context.guildId, String(input.channelId), (input.changes ?? {}) as Record<string, unknown>);
        case 'delete_channel':
          return discord.deleteChannel(context.guildId, String(input.channelId));
        case 'create_role':
          return discord.createRole(context.guildId, {
            name: String(input.name),
            color: input.color === undefined ? undefined : Number(input.color),
            hoist: input.hoist === undefined ? undefined : Boolean(input.hoist),
            mentionable: input.mentionable === undefined ? undefined : Boolean(input.mentionable),
          });
        case 'edit_role':
          return discord.editRole(context.guildId, String(input.roleId), (input.changes ?? {}) as Record<string, unknown>);
        case 'assign_role':
          return discord.assignRole(context.guildId, String(input.userId), String(input.roleId));
        case 'timeout_member':
          return discord.timeoutMember(context.guildId, String(input.userId), Number(input.durationSeconds));
        case 'kick_member':
          return discord.kickMember(context.guildId, String(input.userId), input.reason ? String(input.reason) : undefined);
        case 'ban_member':
          return discord.banMember(context.guildId, String(input.userId), input.reason ? String(input.reason) : undefined);
        case 'send_message':
          return discord.sendMessage(context.guildId, String(input.channelId), String(input.content));
        case 'inspect_members':
        case 'search_server_history':
        case 'query_public_data':
          throw new Error(`Capability '${capability}' is registered but its provider is not configured yet.`);
        default:
          throw new Error(`No executor is registered for '${capability}'.`);
      }
    });
    return { ok: true, capability, result };
  } catch (error) {
    return { ok: false, capability, error: error instanceof Error ? error.message : 'Unknown execution error.' };
  }
}
