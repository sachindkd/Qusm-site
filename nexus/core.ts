export type NexusServerContext = {
  guildId: string;
  channelId?: string;
  userId?: string;
};

export type NexusTask = {
  goal: string;
  context: NexusServerContext;
};

export type NexusPlanStep = {
  action: string;
  reason: string;
};

export type NexusPlan = {
  steps: NexusPlanStep[];
  modelClass: 'routine' | 'reasoning';
};

const COMPLEXITY_HINTS = [
  'investigate',
  'raid',
  'security',
  'revamp',
  'redesign',
  'audit',
  'incident',
  'mass ban',
  'permissions',
];

export function chooseModelClass(goal: string): NexusPlan['modelClass'] {
  const normalized = goal.toLowerCase();
  return COMPLEXITY_HINTS.some((hint) => normalized.includes(hint))
    ? 'reasoning'
    : 'routine';
}

/**
 * Planning boundary only. Tool execution is deliberately separate so every
 * Discord action can be scoped to one guild and verified after execution.
 */
export function createPlan(task: NexusTask): NexusPlan {
  return {
    modelClass: chooseModelClass(task.goal),
    steps: [
      { action: 'inspect_context', reason: 'Understand the current server state.' },
      { action: 'plan', reason: 'Create an execution sequence for the requested goal.' },
      { action: 'execute_tools', reason: 'Run only tools scoped to the current guild.' },
      { action: 'verify', reason: 'Confirm that requested changes succeeded.' },
    ],
  };
}
