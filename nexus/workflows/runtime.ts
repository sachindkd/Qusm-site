import { NexusServerContext } from '../core';
import { scopedAction, executeScoped } from '../sandbox/actions';
import { getCapabilityCatalog } from '../core/capabilities';

export type DynamicWorkflowStep = { capability: string; input?: Record<string, unknown>; reason?: string };
export type DynamicWorkflow = { name: string; goal: string; steps: DynamicWorkflowStep[] };

export async function runDynamicWorkflow(
  context: NexusServerContext,
  workflow: DynamicWorkflow,
  executor: (action: ReturnType<typeof scopedAction>) => Promise<unknown>,
) {
  const results: unknown[] = [];
  const capabilityRegistry = getCapabilityCatalog();
  for (const step of workflow.steps) {
    if (!capabilityRegistry.some((capability) => capability.name === step.capability)) {
      throw new Error(`Unknown capability: ${step.capability}`);
    }
    const action = scopedAction(context, step.capability, step.input || {});
    results.push(await executeScoped(context, action, executor));
  }
  return results;
}

export function composeWorkflow(goal: string, capabilities: string[]): DynamicWorkflow {
  return { name: `nexus-${Date.now()}`, goal, steps: capabilities.map((capability) => ({ capability })) };
}
