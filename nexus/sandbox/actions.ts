import type { NexusServerContext } from '../core';
import { NEXUS_ALLOWED_GUILD_ID } from '../security/access';

export type NexusAction = { name: string; guildId: string; input: Record<string, unknown> };
export type ActionExecutor = (action: NexusAction) => Promise<unknown>;
const MAX_INPUT_KEYS = 40;
export function scopedAction(context: NexusServerContext, name: string, input: Record<string, unknown>): NexusAction {
  if (!context.guildId || context.guildId !== NEXUS_ALLOWED_GUILD_ID) throw new Error('Authorization error: invalid NEXUS guild scope.');
  if (!name || input.guildId !== undefined && String(input.guildId) !== context.guildId) throw new Error('Authorization error: action scope mismatch.');
  if (Object.keys(input).length > MAX_INPUT_KEYS) throw new Error('Sandbox error: action input is too large.');
  return { name, guildId: context.guildId, input: { ...input, guildId: context.guildId } };
}
export async function executeScoped(context: NexusServerContext, action: NexusAction, executor: ActionExecutor) {
  if (context.guildId !== NEXUS_ALLOWED_GUILD_ID) throw new Error('Authorization error: runtime guild is not authorized.');
  if (action.guildId !== context.guildId || action.input.guildId !== context.guildId) throw new Error('Sandbox error: cross-guild action rejected.');
  return executor(action);
}
