import type { NexusServerContext } from '../core';
import * as discord from '../discord/rest';
import { executeCapabilityV2 } from './executor-v2';
import type { ToolExecutionResult } from './executor';
const MUTATIONS = new Set(['create_category', 'create_channel', 'edit_channel', 'delete_channel', 'create_role', 'edit_role', 'assign_role', 'timeout_member', 'kick_member', 'ban_member', 'send_message', 'create_embed', 'create_webhook']);
function verifiedAbsence(error: unknown): ToolExecutionResult { const status = error instanceof discord.DiscordApiError ? error.status : 0; return { ok: status === 404, capability: 'verification', result: status === 404 ? { absent: true } : undefined, error: status === 404 ? undefined : `Verification failed: ${error instanceof Error ? error.message : 'resource still exists or could not be checked.'}` }; }
async function verifyMutation(context: NexusServerContext, capability: string, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  if (capability === 'delete_channel') { try { await discord.channel(context.guildId, String(input.channelId)); return { ok: false, capability: 'verification', error: 'Verification failed: deleted channel is still accessible.' }; } catch (error) { return verifiedAbsence(error); } }
  if (capability === 'kick_member' || capability === 'ban_member') { try { await discord.member(context.guildId, String(input.userId)); return { ok: false, capability: 'verification', error: 'Verification failed: member is still present.' }; } catch (error) { return verifiedAbsence(error); } }
  if (capability === 'create_category' || capability === 'create_channel') return executeCapabilityV2(context, 'inspect_server', { guildId: context.guildId });
  if (capability === 'edit_channel') return executeCapabilityV2(context, 'inspect_channel', { guildId: context.guildId, channelId: input.channelId });
  if (capability === 'create_role' || capability === 'edit_role') return executeCapabilityV2(context, 'inspect_roles', { guildId: context.guildId });
  if (capability === 'assign_role' || capability === 'timeout_member') return executeCapabilityV2(context, 'inspect_member', { guildId: context.guildId, userId: input.userId });
  if (capability === 'create_webhook') return executeCapabilityV2(context, 'inspect_webhooks', { guildId: context.guildId, channelId: input.channelId });
  return executeCapabilityV2(context, 'inspect_channel', { guildId: context.guildId, channelId: input.channelId });
}
export async function executeAndVerify(context: NexusServerContext, capability: string, input: Record<string, unknown>): Promise<ToolExecutionResult & { verification?: ToolExecutionResult }> {
  const result = await executeCapabilityV2(context, capability, input); if (!result.ok || !MUTATIONS.has(capability)) return result;
  const verification = await verifyMutation(context, capability, input);
  return { ...result, verification };
}
