import type { NexusServerContext } from '../core';
import { executeCapabilityV2 } from './executor-v2';
import type { ToolExecutionResult } from './executor';
const MUTATIONS = new Set(['create_category', 'create_channel', 'edit_channel', 'delete_channel', 'create_role', 'edit_role', 'assign_role', 'timeout_member', 'kick_member', 'ban_member', 'send_message', 'create_embed', 'create_webhook']);
export async function executeAndVerify(context: NexusServerContext, capability: string, input: Record<string, unknown>): Promise<ToolExecutionResult & { verification?: ToolExecutionResult }> {
  const result = await executeCapabilityV2(context, capability, input); if (!result.ok || !MUTATIONS.has(capability)) return result;
  let verification: ToolExecutionResult;
  if (capability === 'create_category' || capability === 'create_channel') verification = await executeCapabilityV2(context, 'inspect_server', { guildId: context.guildId });
  else if (capability === 'edit_channel' || capability === 'delete_channel') verification = await executeCapabilityV2(context, 'inspect_channel', { guildId: context.guildId, channelId: input.channelId });
  else if (capability === 'create_role' || capability === 'edit_role') verification = await executeCapabilityV2(context, 'inspect_roles', { guildId: context.guildId });
  else if (capability === 'assign_role' || capability === 'timeout_member' || capability === 'kick_member' || capability === 'ban_member') verification = await executeCapabilityV2(context, 'inspect_member', { guildId: context.guildId, userId: input.userId });
  else if (capability === 'create_webhook') verification = await executeCapabilityV2(context, 'inspect_webhooks', { guildId: context.guildId, channelId: input.channelId });
  else verification = await executeCapabilityV2(context, 'inspect_channel', { guildId: context.guildId, channelId: input.channelId });
  return { ...result, verification };
}
