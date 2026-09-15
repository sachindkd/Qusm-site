import type { NexusServerContext } from '../core';
import * as discord from '../discord/rest';
import { executeCapability, type ToolExecutionResult } from './executor';
const ADVANCED = new Set(['inspect_channel', 'inspect_roles', 'inspect_member', 'create_category', 'create_embed', 'inspect_webhooks', 'create_webhook']);
export async function executeCapabilityV2(context: NexusServerContext, capability: string, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  if (context.guildId !== (process.env.NEXUS_ALLOWED_GUILD_ID || '1549377442240663572')) return { ok: false, capability, error: 'Authorization error: unauthorized guild.' };
  try {
    if (input.guildId !== undefined && String(input.guildId) !== context.guildId) throw new Error('Authorization error: cross-guild target rejected.');
    if (capability === 'create_channel' && input.parentId) await discord.channel(context.guildId, String(input.parentId));
    if (input.channelId && ['edit_channel', 'delete_channel', 'send_message', 'create_embed', 'inspect_webhooks', 'create_webhook'].includes(capability)) await discord.channel(context.guildId, String(input.channelId));
    if (input.roleId && ['edit_role', 'assign_role'].includes(capability)) { const roles: any[] = await discord.roles(context.guildId) as any[]; if (!roles.some((r) => String(r?.id) === String(input.roleId))) throw new Error('Authorization error: target role does not belong to the authorized guild.'); }
    if (input.userId && ['assign_role', 'timeout_member', 'kick_member', 'ban_member'].includes(capability)) await discord.member(context.guildId, String(input.userId));
    if (!ADVANCED.has(capability)) return executeCapability(context, capability, input);
    let result: unknown;
    switch (capability) {
      case 'inspect_channel': result = await discord.channel(context.guildId, String(input.channelId)); break;
      case 'inspect_roles': result = await discord.roles(context.guildId); break;
      case 'inspect_member': result = await discord.member(context.guildId, String(input.userId)); break;
      case 'create_category': result = await discord.createChannel(context.guildId, { name: String(input.name), type: 4, reason: input.reason ? String(input.reason) : undefined }); break;
      case 'create_embed': result = await discord.createEmbed(context.guildId, String(input.channelId), input.embed, input.reason ? String(input.reason) : undefined); break;
      case 'inspect_webhooks': result = await discord.webhooks(context.guildId, String(input.channelId)); break;
      case 'create_webhook': result = await discord.createWebhook(context.guildId, String(input.channelId), String(input.name), input.avatar ? String(input.avatar) : undefined, input.reason ? String(input.reason) : undefined); break;
      default: throw new Error('Capability error: unsupported advanced capability.');
    }
    return { ok: true, capability, result };
  } catch (error) { return { ok: false, capability, error: error instanceof Error ? error.message : 'Execution failure.' }; }
}
