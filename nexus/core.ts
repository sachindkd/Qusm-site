export type NexusServerContext = { guildId: string; channelId?: string; userId?: string };
export type NexusTask = { goal: string; context: NexusServerContext };
export type NexusPlanStep = { action: string; reason: string };
export type NexusPlan = { steps: NexusPlanStep[]; modelClass: 'ai' };
