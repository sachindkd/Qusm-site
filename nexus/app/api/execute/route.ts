import { NextResponse } from 'next/server';
import { executeCapability } from '../../../tools/executor';
import { DynamicExecutionPlan } from '../../../core/ai-plan';
import { assertAuthorized } from '../../../security/access';

export const runtime = 'nodejs';
const MAX_PLAN_STEPS = 12;

function authorized(req: Request) {
  const configured = process.env.NEXUS_CONTROL_KEY;
  if (!configured) return false;
  return req.headers.get('x-nexus-control-key') === configured;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'NEXUS execution control is not configured or authorization failed.' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const guildId = typeof body.guildId === 'string' ? body.guildId.trim() : '';
    const plan = body.plan as DynamicExecutionPlan | undefined;
    if (!guildId || !plan || !Array.isArray(plan.steps)) {
      return NextResponse.json({ error: 'guildId and a dynamic execution plan are required.' }, { status: 400 });
    }
    assertAuthorized({ guildId, roleIds: [process.env.NEXUS_ALLOWED_ROLE_ID || ''] });
    if (plan.steps.length === 0) return NextResponse.json({ error: 'Execution plan contains no steps.' }, { status: 400 });
    if (plan.steps.length > MAX_PLAN_STEPS) return NextResponse.json({ error: `Execution plan exceeds the ${MAX_PLAN_STEPS}-step safety bound.` }, { status: 400 });

    const results = [];
    for (const step of plan.steps) {
      if (!step || typeof step.capability !== 'string' || !step.input || typeof step.input !== 'object') {
        results.push({ ok: false, capability: 'invalid_step', error: 'Invalid plan step.' });
        continue;
      }
      const input = { ...(step.input as Record<string, unknown>), guildId };
      const result = await executeCapability({ guildId }, step.capability, input);
      results.push({ stepId: step.id, purpose: step.purpose, verify: step.verify, ...result, capability: step.capability });
      if (!result.ok) break;
    }
    return NextResponse.json({ ok: results.every((r) => r.ok), guildId, results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Execution failed.' }, { status: 500 });
  }
}
