import { NEXUS_ALLOWED_GUILD_ID } from '../security/access';
import { getCapabilityCatalog } from './capabilities';
import type { DynamicExecutionPlan } from './ai-plan';
import { executeAndVerify } from '../tools/execute-verified';
import { inspectServerForRuntime } from '../tools/runtime';

export type NexusContext = { guildId: string; channelId?: string; userId?: string };
export type AgentTurnResult = { mode: 'conversation' | 'execute'; response: string; plan?: DynamicExecutionPlan; results?: unknown[] };
type ExecutionStatus = 'planned' | 'running' | 'paused' | 'failed' | 'completed' | 'awaiting_input';
type MemoryState = {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  objective?: string;
  plan?: DynamicExecutionPlan;
  results?: any[];
  status?: ExecutionStatus;
  nextStepIndex?: number;
  failure?: { stepId: string; message: string };
};
const memory = new Map<string, MemoryState>();
const MAX_MESSAGES = 24;
const MAX_STEPS = 12;
const STATE_MARKER = 'NEXUS_EXECUTION_STATE:';

function key(c: NexusContext) { return `${c.guildId}:${c.userId || 'unknown'}:${c.channelId || 'unknown'}`; }
function state(c: NexusContext): MemoryState {
  const k = key(c);
  const old = memory.get(k);
  if (old) return old;
  const fresh: MemoryState = { messages: [] };
  memory.set(k, fresh);
  return fresh;
}
function remember(c: NexusContext, role: 'user' | 'assistant', content: string) {
  const s = state(c);
  s.messages = [...s.messages, { role, content }].slice(-MAX_MESSAGES);
}
function history(c: NexusContext) {
  const s = state(c);
  return { messages: s.messages, objective: s.objective, plan: s.plan, results: s.results, status: s.status, nextStepIndex: s.nextStepIndex, failure: s.failure };
}
function parseJson(text: string): any {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}
function safeError(error: unknown): string { return error instanceof Error ? error.message : String(error || 'Unknown execution error'); }
async function groq(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<string> {
  const apiKey = process.env.NEXUS_GROQ_API_KEY;
  if (!apiKey) throw new Error('Configuration error: NEXUS_GROQ_API_KEY is not configured.');
  const compact = messages.map((m) => ({ ...m, content: m.content.length > 18000 ? `${m.content.slice(0, 18000)}\n[context truncated]` : m.content }));
  const body = { model: process.env.NEXUS_AI_MODEL || 'openai/gpt-oss-120b', messages: compact, temperature: 0.2, max_tokens: 1400 };
  let lastError = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body), cache: 'no-store' });
    const raw = await response.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { throw new Error(`Groq error: non-JSON response (HTTP ${response.status}).`); }
    if (response.ok) {
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error('Groq error: empty response.');
      return text;
    }
    lastError = String(data?.error?.message || `HTTP ${response.status}`);
    const limited = response.status === 429 || /rate limit|tokens per minute|TPM/i.test(lastError);
    if (!limited || attempt === 2) break;
    const match = lastError.match(/try again in\s+([0-9.]+)s/i);
    const waitMs = Math.min(30000, Math.max(1000, Math.ceil(Number(match?.[1] || 2) * 1000)));
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  throw new Error(`Groq error: ${lastError}`);
}
async function channelContext(channelId?: string) {
  if (!channelId) return '(no channel context)';
  try {
    const { messages } = await import('../discord/rest');
    const rows = await messages(channelId, 50);
    return Array.isArray(rows) ? rows.reverse().map((m: any) => `${m?.author?.global_name || m?.author?.username || m?.author?.id || 'user'}: ${m?.content || ''}`).filter(Boolean).join('\n').slice(-16000) : '(no channel context)';
  } catch { return '(channel context unavailable)'; }
}
function containsMutation(plan: DynamicExecutionPlan) { return plan.steps.some((s) => ['change', 'destructive'].includes(getCapabilityCatalog().find((c) => c.name === s.capability)?.risk || 'read')); }
function executionStateForPrompt(s: MemoryState): string { return JSON.stringify({ objective: s.objective, status: s.status, nextStepIndex: s.nextStepIndex, plan: s.plan, completedResults: s.results, failure: s.failure }); }
function extractPersistedState(text: string): any | null {
  const matches = [...text.matchAll(/NEXUS_EXECUTION_STATE:\s*(\{[^\n]+\})/g)];
  if (!matches.length) return null;
  const candidate = matches[matches.length - 1]?.[1];
  if (!candidate) return null;
  const parsed = parseJson(candidate);
  return parsed && typeof parsed === 'object' ? parsed : null;
}
function mergePersistedState(s: MemoryState, persisted: any, guildId: string) {
  if (!persisted || persisted.guildId !== guildId) return;
  if (persisted.objective && (!s.objective || !s.plan)) s.objective = String(persisted.objective);
  if (persisted.plan && !s.plan) s.plan = persisted.plan as DynamicExecutionPlan;
  if (Array.isArray(persisted.results) && (!s.results || s.results.length < persisted.results.length)) s.results = persisted.results;
  if (persisted.status) s.status = persisted.status as ExecutionStatus;
  if (Number.isInteger(persisted.nextStepIndex)) s.nextStepIndex = Number(persisted.nextStepIndex);
  if (persisted.failure && typeof persisted.failure === 'object') s.failure = persisted.failure as MemoryState['failure'];
}
function hydrateFromDiscord(c: NexusContext, contextText: string) {
  mergePersistedState(state(c), extractPersistedState(contextText), c.guildId);
}
export async function decide(message: string, context: NexusContext) {
  const recentChannel = await channelContext(context.channelId);
  hydrateFromDiscord(context, recentChannel);
  const prompt = [
    'You are the unified decision layer of NEXUS.',
    'Classify the current message using conversation, prior execution state, and recent Discord context.',
    'Choose conversation for chatting, questions, explanations, or discussing results without requesting an action.',
    'Choose execute when the user asks NEXUS to investigate, inspect, create, modify, moderate, configure, resume, continue, retry, or perform an objective.',
    'Resolve references such as this, that, it, continue, change it, undo that, and what did you change using context.',
    'If there is a paused/failed execution with a valid next step and the user asks to continue/retry/resume, preserve that objective and prior completed results instead of starting over.',
    'Reason from intent; do not use regex or keyword-only routing.',
    'Return ONLY JSON: {"mode":"conversation"|"execute","response":"...","goal":"..."}.',
    `Authoritative guild: ${context.guildId}`,
    `Current execution state: ${executionStateForPrompt(state(context))}`,
    `Discord channel context:\n${recentChannel}`,
    `Current message: ${message}`,
  ].join('\n\n');
  const parsed = parseJson(await groq([{ role: 'system', content: prompt }]));
  if (!parsed || !['conversation', 'execute'].includes(parsed.mode)) return { mode: 'conversation' as const, response: String(parsed?.response || 'I could not determine the request.') };
  if (parsed.mode === 'execute' && !String(parsed.goal || '').trim()) return { mode: 'conversation' as const, response: String(parsed.response || 'Tell me what you want me to do.') };
  return parsed as { mode: 'conversation' | 'execute'; response?: string; goal?: string };
}
export async function converse(message: string, context: NexusContext) {
  const recentChannel = await channelContext(context.channelId);
  hydrateFromDiscord(context, recentChannel);
  const text = await groq([
    { role: 'system', content: 'You are NEXUS. Be natural, concise, and honest. Use supplied context to answer follow-ups. Never claim an action happened unless execution results prove it. If an execution is paused or failed, state that clearly and explain what remains.' },
    { role: 'user', content: `Guild: ${context.guildId}\nMemory: ${JSON.stringify(history(context))}\nDiscord context:\n${recentChannel}\nMessage: ${message}` },
  ]);
  remember(context, 'user', message); remember(context, 'assistant', text); return text;
}
function mergeExecutionResults(previous: any[] | undefined, current: any[]): any[] {
  const byStep = new Map<string, any>();
  for (const item of previous || []) if (item?.stepId) byStep.set(String(item.stepId), item);
  for (const item of current || []) if (item?.stepId) byStep.set(String(item.stepId), item);
  return [...byStep.values()];
}
function isSameObjective(a: string | undefined, b: string): boolean {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}
function wantsContinuation(message: string): boolean {
  return /\b(continue|resume|retry|finish|proceed|carry on|keep going)\b/i.test(message);
}
export async function runAgentTurn(message: string, context: NexusContext, forcedGoal?: string): Promise<AgentTurnResult> {
  if (context.guildId !== NEXUS_ALLOWED_GUILD_ID) throw new Error('Authorization error: NEXUS is disabled outside the authorized guild.');
  const recentChannel = await channelContext(context.channelId);
  hydrateFromDiscord(context, recentChannel);
  const s = state(context);
  const decision = forcedGoal ? { mode: 'execute' as const, goal: forcedGoal } : await decide(message, context);
  if (decision.mode === 'conversation') return { mode: 'conversation', response: await converse(message, context) };
  const requestedGoal = String(decision.goal || message).trim();
  const resumable = Boolean(s.plan && s.objective && ['paused', 'failed', 'running'].includes(s.status || '') && (s.nextStepIndex || 0) < s.plan.steps.length);
  const sameObjective = resumable && (isSameObjective(s.objective, requestedGoal) || wantsContinuation(message));
  const goal = sameObjective ? String(s.objective) : requestedGoal;
  if (!sameObjective) { s.objective = goal; s.plan = undefined; s.results = []; s.failure = undefined; s.nextStepIndex = 0; s.status = 'planned'; }

  const { createDynamicPlan } = await import('./ai-runtime');
  let plan = s.plan;
  if (!plan) {
    plan = await createDynamicPlan(goal, context.guildId, context.userId || '', context.channelId || '');
    if (plan.steps.length > MAX_STEPS) plan.steps = plan.steps.slice(0, MAX_STEPS);
    s.plan = plan;
  }
  s.status = 'running'; s.failure = undefined;
  const results = mergeExecutionResults(s.results, []);
  const completed = new Set(results.filter((r) => r?.ok === true && !String(r.stepId).includes(':plan-verification')).map((r) => String(r.stepId)));
  let startIndex = Math.max(0, Number.isInteger(s.nextStepIndex) ? Number(s.nextStepIndex) : 0);
  while (startIndex < plan.steps.length && completed.has(plan.steps[startIndex].id)) startIndex += 1;
  s.nextStepIndex = startIndex;
  try {
    if (containsMutation(plan) && !plan.steps.some((x) => x.capability === 'inspect_server') && !results.some((x) => x?.stepId === '__safety_inspection')) {
      const inspection = await inspectServerForRuntime(context.guildId);
      results.push({ stepId: '__safety_inspection', capability: 'inspect_server', ok: true, result: inspection, automatic: true });
      s.results = mergeExecutionResults(s.results, results);
    }
    for (let index = startIndex; index < plan.steps.length; index += 1) {
      const step = plan.steps[index];
      s.nextStepIndex = index;
      s.results = mergeExecutionResults(s.results, results);
      const input = resolveReferences(step.input, results);
      let result: any;
      try { result = await executeAndVerify(context, step.capability, { ...input, guildId: context.guildId, channelId: context.channelId }); }
      catch (error) { result = { ok: false, result: null, error: safeError(error) }; }
      const row = { stepId: step.id, capability: step.capability, purpose: step.purpose, ok: result.ok, result: result.result, verification: result.verification, error: result.error };
      results.splice(0, results.length, ...mergeExecutionResults(results, [row]));
      s.results = results.slice();
      s.nextStepIndex = index + (result.ok && !(result.verification && !result.verification.ok) ? 1 : 0);
      if (!result.ok || result.verification && !result.verification.ok) {
        s.status = 'failed';
        s.failure = { stepId: step.id, message: String(result.error || result.verification?.error || 'Step failed or verification failed.') };
        break;
      }
      if (step.verification) {
        let verification: any;
        try { verification = await executeAndVerify(context, step.verification.capability, { ...resolveReferences(step.verification.input, results), guildId: context.guildId, channelId: context.channelId }); }
        catch (error) { verification = { ok: false, result: null, error: safeError(error) }; }
        results.splice(0, results.length, ...mergeExecutionResults(results, [{ stepId: `${step.id}:plan-verification`, capability: step.verification.capability, verification: true, ok: verification.ok, result: verification.result, error: verification.error }]));
        s.results = results.slice();
        if (!verification.ok) {
          s.nextStepIndex = index;
          s.status = 'failed';
          s.failure = { stepId: step.id, message: String(verification.error || 'Plan verification failed.') };
          break;
        }
      }
      s.nextStepIndex = index + 1;
      s.results = results.slice();
    }
    if ((s.nextStepIndex || 0) >= plan.steps.length) { s.status = 'completed'; s.nextStepIndex = plan.steps.length; }
    else if (s.status !== 'failed') s.status = 'paused';
  } catch (error) {
    s.status = 'failed';
    s.failure = { stepId: plan.steps[s.nextStepIndex || 0]?.id || 'runtime', message: safeError(error) };
  }
  s.plan = plan; s.results = mergeExecutionResults(s.results, results);
  const report = await reportExecution(goal, context, plan, s.results, s);
  remember(context, 'user', message); remember(context, 'assistant', report);
  return { mode: 'execute', response: report, plan, results: s.results };
}
function resolveReferences(value: unknown, results: any[]): any {
  if (typeof value === 'string') return value.replace(/\{\{([^}]+)\}\}/g, (_, path) => String(resolvePath(results, String(path)) ?? ''));
  if (Array.isArray(value)) return value.map((v) => resolveReferences(v, results));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveReferences(v, results)]));
  return value;
}
function resolvePath(results: any[], path: string) {
  const [stepId, ...parts] = path.split('.'); const item = results.find((r) => r?.stepId === stepId); let current: any = item;
  for (const part of parts) { if (current == null) return undefined; current = current[part]; }
  return current;
}
function authoritativeStepLines(plan: DynamicExecutionPlan, results: any[]): string[] {
  const byStep = new Map<string, any>();
  for (const result of results) if (result?.stepId && !String(result.stepId).includes(':plan-verification')) byStep.set(String(result.stepId), result);
  return plan.steps.map((step, index) => {
    const result = byStep.get(step.id);
    if (!result) return `${index + 1}. ${step.id} — PENDING — ${step.purpose}`;
    const verification = result.verification ? `; verification=${result.verification.ok === true ? 'passed' : 'failed'}` : '';
    return `${index + 1}. ${step.id} — ${result.ok === true ? 'COMPLETED' : 'FAILED'}${verification} — ${step.purpose}${result.error ? ` — error: ${String(result.error)}` : ''}`;
  });
}
async function reportExecution(goal: string, context: NexusContext, plan: DynamicExecutionPlan, results: unknown[], s: MemoryState) {
  const statePayload = { guildId: context.guildId, status: s.status || 'failed', objective: goal, nextStepIndex: s.nextStepIndex ?? 0, plan, results, failure: s.failure || null };
  const successful = results.filter((r: any) => r?.ok === true && !String(r?.stepId || '').includes(':plan-verification')).length;
  const total = plan.steps.length;
  const failed = results.find((r: any) => r?.ok === false);
  const truth = authoritativeStepLines(plan, results as any[]);
  const header = [
    '**NEXUS Execution Report**',
    `**Objective:** ${goal}`,
    `**Status:** ${s.status === 'completed' ? 'Completed' : s.status === 'failed' ? 'Failed / stopped' : 'Paused'}`,
    `**Progress:** ${successful}/${total} execution steps completed`,
    '',
    '**Authoritative Execution Results**',
    ...truth,
  ].join('\n');
  try {
    const compactResults = JSON.stringify(results).slice(0, 10000);
    const narrative = await groq([
      { role: 'system', content: 'You are NEXUS. Summarize execution evidence. The authoritative step-status list is ground truth. NEVER contradict it: COMPLETED means the runtime returned ok=true; FAILED means it returned ok=false; PENDING means no result exists. Never say a completed action was not performed. Never invent actions. Add only findings supported by the supplied results. Keep the narrative concise.' },
      { role: 'user', content: `Objective: ${goal}\nAuthoritative step status:\n${truth.join('\n')}\nRaw execution results:\n${compactResults}` },
    ]);
    return `${header}\n\n**Findings**\n${narrative}\n\n${s.status !== 'completed' ? `**Next:** Execution stopped at step ${s.nextStepIndex ?? 0}.` : '**Verification:** Completed steps are based on runtime execution results.'}\n${STATE_MARKER} ${JSON.stringify(statePayload)}`;
  } catch (error) {
    const reason = safeError(error);
    return `${header}\n\n${failed ? `**Failure:** ${String((failed as any).stepId || 'unknown')} — ${String((failed as any).error || 'Execution failed.')}` : ''}\n${s.status !== 'completed' ? `**Next:** Execution stopped at step ${s.nextStepIndex ?? 0}.` : '**Verification:** Completed steps are based on runtime execution results.'}\n${STATE_MARKER} ${JSON.stringify(statePayload)}\nReport generation warning: ${reason}`.replace(/\n+/g, '\n');
  }
}