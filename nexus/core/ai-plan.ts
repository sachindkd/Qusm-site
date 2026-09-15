import { getCapabilityCatalog } from './capabilities';
import { chooseModelClass, NexusPlan } from '../core';

export type DynamicPlanStep = {
  id: string;
  capability: string;
  purpose: string;
  input: Record<string, unknown>;
  verify: string;
};

export type DynamicExecutionPlan = {
  intent: string;
  modelClass: 'routine' | 'reasoning';
  steps: DynamicPlanStep[];
  uncertainties: string[];
};

export function planningPrompt(goal: string, guildId: string): string {
  const catalog = getCapabilityCatalog()
    .map((c) => `${c.name}: ${c.description}; inputs=${JSON.stringify(c.inputSchema)}; risk=${c.risk}`)
    .join('\n');

  return [
    'You are NEXUS. Convert the user objective into a dynamic execution plan.',
    'Do not route from fixed user commands. Determine the workflow from the objective and available capabilities.',
    'Use only capabilities from the catalog. The guildId is a hard tenant boundary.',
    'For destructive changes, prefer inspecting and verifying first. Never invent successful execution.',
    `Current guildId: ${guildId}`,
    `User objective: ${goal}`,
    'Available capabilities:',
    catalog,
    'Return strict JSON with: intent, modelClass, steps[], uncertainties[]. Each step must include id, capability, purpose, input, verify.',
  ].join('\n\n');
}

export function fallbackDynamicPlan(goal: string, guildId: string): DynamicExecutionPlan {
  const modelClass = chooseModelClass(goal);
  return {
    intent: goal,
    modelClass,
    steps: [
      { id: 'inspect', capability: 'inspect_server', purpose: 'Understand current server state before making changes.', input: { guildId }, verify: 'A current server snapshot is available.' },
      { id: 'plan', capability: 'send_message', purpose: 'Keep execution deferred until AI planning is configured.', input: { guildId, channelId: '', content: 'NEXUS planning is not configured yet.' }, verify: 'No server mutation is performed by the fallback.' },
    ],
    uncertainties: ['NEXUS_GEMINI_API_KEY is not configured or the AI planner was unavailable.'],
  };
}
