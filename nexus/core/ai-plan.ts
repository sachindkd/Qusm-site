import { getCapabilityCatalog } from './capabilities';

export type DynamicPlanStep = {
  id: string;
  capability: string;
  purpose: string;
  input: Record<string, unknown>;
  verify: string;
};

export type DynamicExecutionPlan = {
  intent: string;
  modelClass: 'ai';
  steps: DynamicPlanStep[];
  uncertainties: string[];
};

export function planningPrompt(goal: string, guildId: string, conversation: string = ''): string {
  const catalog = getCapabilityCatalog()
    .map((c) => `${c.name}: ${c.description}; inputs=${JSON.stringify(c.inputSchema)}; risk=${c.risk}`)
    .join('\n');

  return [
    'You are NEXUS, an autonomous Discord AI agent.',
    'Understand the objective and conversation context, then create the best executable workflow using the available capabilities.',
    'Do not use fixed command routing. Decide dynamically which capabilities are needed.',
    'Use only capabilities from the catalog.',
    'The guildId is a hard tenant boundary. Never target another guild.',
    'Inspect before destructive changes when appropriate and include verification steps.',
    'IMPORTANT: Return at least one executable step. Never return an empty steps array.',
    'Every step capability must exactly match a capability name from the catalog.',
    'Return ONLY valid JSON. No markdown and no commentary.',
    'JSON schema: {"intent":string,"modelClass":"ai","steps":[{"id":string,"capability":string,"purpose":string,"input":object,"verify":string}],"uncertainties":string[]}',
    `Current guildId: ${guildId}`,
    `Recent conversation:\n${conversation || '(none)'}`,
    `Current objective: ${goal}`,
    `Available capabilities:\n${catalog}`,
  ].join('\n\n');
}
