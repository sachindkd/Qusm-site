import { createDynamicPlan } from '../core/ai-runtime';
import { executeCapability } from '../tools/executor';

export type SecuritySignal = {
  guildId: string;
  type: string;
  userId?: string;
  channelId?: string;
  data: Record<string, unknown>;
  at: number;
};

export type SecurityAssessment = {
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  confidence: number;
  recommended: string[];
};

export function assessSignals(signals: SecuritySignal[]): SecurityAssessment {
  const counts = new Map<string, number>();
  for (const signal of signals) counts.set(signal.type, (counts.get(signal.type) || 0) + 1);
  const joins = counts.get('guild_member_add') || 0;
  const messages = counts.get('message_create') || 0;
  const permission = counts.get('guild_role_update') || 0;
  if (permission >= 3 || joins >= 10) return { severity: 'critical', reason: 'A burst of high-impact server changes or joins was detected.', confidence: 0.88, recommended: ['inspect_audit_log', 'inspect_server'] };
  if (messages >= 25 || joins >= 6) return { severity: 'high', reason: 'A burst pattern consistent with spam or a coordinated join event was detected.', confidence: 0.78, recommended: ['inspect_audit_log', 'inspect_members'] };
  if (permission >= 1 || joins >= 3 || messages >= 10) return { severity: 'medium', reason: 'An unusual server activity burst was detected.', confidence: 0.64, recommended: ['inspect_audit_log'] };
  return { severity: 'low', reason: 'No strong attack pattern detected.', confidence: 0.5, recommended: [] };
}

export async function investigateAndRespond(guildId: string, signals: SecuritySignal[]) {
  const assessment = assessSignals(signals);
  if (assessment.severity === 'low') return { assessment, results: [], plan: null };

  let plan = null;
  try {
    const goal = `Investigate this ${assessment.severity} security event in guild ${guildId}. Determine whether it is spam, raid activity, or suspicious permission changes. Inspect evidence first and take only proportionate actions if justified. Signals: ${JSON.stringify(signals.slice(-20))}`;
    plan = await createDynamicPlan(goal, guildId);
  } catch {
    plan = null;
  }

  const results = [];
  if (plan) {
    for (const step of plan.steps.slice(0, 8)) {
      const result = await executeCapability({ guildId }, step.capability, { ...step.input, guildId });
      results.push({ capability: step.capability, ok: result.ok, error: result.error });
      if (!result.ok) break;
    }
  }
  return { assessment, plan, results };
}
