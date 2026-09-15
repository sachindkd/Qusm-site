import { getCapabilityCatalog } from './capabilities';

export type VerificationSpec = { capability: string; input: Record<string, unknown> };
export type DynamicPlanStep = { id: string; capability: string; purpose: string; input: Record<string, unknown>; verify?: string; verification?: VerificationSpec };
export type DynamicExecutionPlan = { intent: string; modelClass: 'ai'; steps: DynamicPlanStep[]; uncertainties: string[] };

export function planningPrompt(goal: string, guildId: string, conversation = ''): string {
  const catalog = getCapabilityCatalog().map((c) => `${c.name}: ${c.description}; inputs=${JSON.stringify(c.inputSchema)}; risk=${c.risk}`).join('\n');
  return [
    'You are NEXUS, an autonomous Discord AI agent.',
    'Understand the complete objective and context, then create the smallest useful executable workflow.',
    'Do not use fixed command routing or a fixed server blueprint. Decide dynamically which capabilities are needed.',
    'Use only capabilities from the catalog. Never invent a capability.',
    `The runtime-authoritative guild is ${guildId}. Never target another guild and never rely on an AI-supplied guildId.`,
    'Inspect before consequential changes when appropriate. For server restructuring, inspect the current server before designing changes.',
    'Use outputs from earlier steps through references such as {{stepId.result.id}} when a later step needs an ID.',
    'Do not duplicate resources unnecessarily; inspect and reuse existing resources where appropriate.',
    'Every important mutation must be verified. Prefer an explicit verification object using a real read capability.',
    'Destructive operations require a clear objective, evidence, and a proportionate reason. Do not perform destructive cleanup merely to make a server look tidy.',
    'Return ONLY valid JSON. No markdown and no commentary.',
    'JSON schema: {"intent":string,"modelClass":"ai","steps":[{"id":string,"capability":string,"purpose":string,"input":object,"verify":string?,"verification":{"capability":string,"input":object}?}],"uncertainties":string[]}',
    `Recent conversation and execution context:\n${conversation || '(none)'}`,
    `Current objective: ${goal}`,
    `Available capabilities:\n${catalog}`,
  ].join('\n\n');
}
