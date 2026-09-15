import type { NexusServerContext } from '../core';

export type NexusAction = {
  name: string;
  guildId: string;
  input: Record<string, unknown>;
};

export type ActionExecutor = (action: NexusAction) => Promise<unknown>;

/**
 * Technical sandbox boundary: an action carries its guild scope and cannot be
 * executed against a different guild through this wrapper. It intentionally
 * does not decide what the AI should do; the model creates the plan.
 */
export function scopedAction(context: NexusServerContext, name: string, input: Record<string, unknown>): NexusAction {
  if (!context.guildId) throw new Error('NEXUS action requires a guild scope.');
  return { name, guildId: context.guildId, input };
}

export async function executeScoped(
  context: NexusServerContext,
  action: NexusAction,
  executor: ActionExecutor,
) {
  if (action.guildId !== context.guildId) throw new Error('Cross-guild action rejected by sandbox.');
  return executor(action);
}
