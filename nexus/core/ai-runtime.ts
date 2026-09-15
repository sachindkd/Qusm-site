import { planningPrompt, DynamicExecutionPlan } from './ai-plan';
import * as discord from '../discord/rest';

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const MAX_CONVERSATION_MESSAGES = 20;
const MAX_PLAN_STEPS = 12;
const MAX_PROMPT_CHARS = 24000;
const MAX_GENERATION_TOKENS = 1800;
const MAX_RATE_LIMIT_RETRIES = 2;
type ConversationMessage = { role: 'user' | 'assistant'; content: string };
const conversations = new Map<string, ConversationMessage[]>();

function modelFor(): string { return process.env.NEXUS_AI_MODEL || DEFAULT_GROQ_MODEL; }
function key(guildId: string, userId: string): string { return `${guildId}:${userId}`; }
function history(guildId: string, userId: string): ConversationMessage[] { return conversations.get(key(guildId, userId)) || []; }
function remember(guildId: string, userId: string, role: 'user' | 'assistant', content: string) { conversations.set(key(guildId, userId), [...history(guildId, userId), { role, content }].slice(-MAX_CONVERSATION_MESSAGES)); }
function historyText(items: ConversationMessage[]): string { return items.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n'); }
function compactPrompt(prompt: string): string { return prompt.length <= MAX_PROMPT_CHARS ? prompt : `${prompt.slice(0, MAX_PROMPT_CHARS)}\n\n[Context truncated to protect Groq token budget.]`; }
function retryAfterMs(message: string): number {
  const match = message.match(/try again in\s+([0-9.]+)s/i);
  const seconds = match ? Number(match[1]) : 2;
  return Math.min(30000, Math.max(1000, Math.ceil(seconds * 1000)));
}

function parseJson(text: string): any {
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { /* continue with fenced/prose recovery */ }
  const starts = [...cleaned].map((c, i) => c === '{' ? i : -1).filter((i) => i >= 0);
  for (const start of starts) {
    let depth = 0; let quoted = false; let escaped = false;
    for (let i = start; i < cleaned.length; i += 1) {
      const c = cleaned[i];
      if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; }
      if (c === '"') { quoted = true; continue; }
      if (c === '{') depth += 1; else if (c === '}') { depth -= 1; if (depth === 0) { try { return JSON.parse(cleaned.slice(start, i + 1)); } catch { break; } } }
    }
  }
  return null;
}

async function generate(prompt: string, options: { json?: boolean } = {}): Promise<string> {
  const apiKey = process.env.NEXUS_GROQ_API_KEY;
  if (!apiKey) throw new Error('NEXUS_GROQ_API_KEY is not configured.');
  const body: Record<string, unknown> = { model: modelFor(), messages: [{ role: 'user', content: compactPrompt(prompt) }], temperature: 0.2, max_tokens: MAX_GENERATION_TOKENS };
  if (options.json) body.response_format = { type: 'json_object' };
  let lastError = '';
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body), cache: 'no-store' });
    const raw = await response.text(); let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { throw new Error(`Groq returned a non-JSON response (HTTP ${response.status}).`); }
    if (response.ok) { const text = data?.choices?.[0]?.message?.content?.trim() || ''; if (!text) throw new Error('Groq returned no text.'); return text; }
    const message = String(data?.error?.message || `request failed with HTTP ${response.status}`); lastError = message;
    const rateLimited = response.status === 429 || /rate limit|tokens per minute|TPM/i.test(message);
    if (!rateLimited || attempt >= MAX_RATE_LIMIT_RETRIES) break;
    await new Promise((resolve) => setTimeout(resolve, retryAfterMs(message)));
  }
  throw new Error(`Groq API: ${lastError}`);
}

async function discordHistory(channelId: string): Promise<string> {
  if (!channelId) return '';
  try { const rows = await discord.messages(channelId, 50); if (!Array.isArray(rows)) return ''; return rows.reverse().slice(-50).map((m: any) => `${String(m?.author?.global_name || m?.author?.username || m?.author?.id || 'user')}: ${String(m?.content || '')}`).filter((x) => !/: $/.test(x)).join('\n').slice(-12000); } catch { return ''; }
}

export async function generateNexusReply(message: string, guildId: string, userId: string, channelId: string = ''): Promise<string> {
  const prior = history(guildId, userId); const channelContext = await discordHistory(channelId);
  const reply = await generate(['You are NEXUS, an autonomous AI assistant operating inside a Discord server.', 'Hold a natural ongoing conversation and resolve references using recent context.', 'Never claim an action was performed unless the runtime actually performed it.', `Guild ID: ${guildId}`, `User ID: ${userId}`, `Recent NEXUS context:\n${historyText(prior) || '(none)'}`, `Recent Discord channel conversation:\n${channelContext || '(none)'}`, `Current user message: ${message}`].join('\n\n'));
  remember(guildId, userId, 'user', message); remember(guildId, userId, 'assistant', reply); return reply;
}

export type AgentDecision = { mode: 'conversation' | 'execute'; response?: string; goal?: string };
export async function decideAgentTurn(message: string, guildId: string, userId: string, channelId: string = ''): Promise<AgentDecision> {
  const prior = history(guildId, userId); const channelContext = await discordHistory(channelId);
  const raw = await generate(['You are the decision layer of NEXUS.', 'Decide whether the message is conversation or asks NEXUS to perform an objective.', 'Resolve references from context. For an objective, return a concise self-contained goal. Do not perform actions here.', 'Return ONLY JSON: {"mode":"conversation"|"execute","response":"string?","goal":"string?"}', `Guild: ${guildId}`, `User: ${userId}`, `Recent context:\n${historyText(prior) || '(none)'}`, `Channel context:\n${channelContext || '(none)'}`, `Message: ${message}`].join('\n\n'), { json: true });
  const parsed = parseJson(raw) as AgentDecision | null;
  if (!parsed || !['conversation', 'execute'].includes(parsed.mode)) return { mode: 'conversation', response: raw };
  if (parsed.mode === 'execute' && !String(parsed.goal || '').trim()) return { mode: 'conversation', response: String(parsed.response || 'Tell me what you want me to do.') };
  return parsed;
}

export async function generateExecutionReport(goal: string, guildId: string, userId: string, plan: DynamicExecutionPlan, results: unknown[]): Promise<string> {
  const report = await generate(['You are NEXUS reporting an executed objective.', 'Use ONLY supplied execution results as evidence. Do not invent facts or claim failed steps succeeded.', 'For investigations/public data, summarize verified facts and useful findings. For changes, state exactly what succeeded or failed. If evidence is incomplete, say so. Keep it useful for Discord.', `Guild: ${guildId}`, `User: ${userId}`, `Objective: ${goal}`, `Plan: ${JSON.stringify(plan.steps)}`, `Execution results: ${JSON.stringify(results)}`].join('\n\n'));
  remember(guildId, userId, 'user', goal); remember(guildId, userId, 'assistant', report); return report;
}

function validatePlan(value: any): value is DynamicExecutionPlan {
  return Boolean(value && typeof value === 'object' && typeof value.intent === 'string' && Array.isArray(value.steps) && value.steps.length > 0 && value.steps.every((step: any) => step && typeof step === 'object' && typeof step.id === 'string' && step.id.trim() && typeof step.capability === 'string' && step.capability.trim() && typeof step.purpose === 'string' && step.input && typeof step.input === 'object' && !Array.isArray(step.input)));
}

export async function createDynamicPlan(goal: string, guildId: string, userId: string = '', channelId: string = ''): Promise<DynamicExecutionPlan> {
  const prior = userId ? history(guildId, userId) : []; const channelContext = await discordHistory(channelId);
  const prompt = planningPrompt(goal, guildId, `${historyText(prior)}\n${channelContext}`.trim());
  let text = await generate(prompt, { json: true });
  let plan = parseJson(text) as DynamicExecutionPlan | null;
  if (!validatePlan(plan)) {
    text = await generate(['Repair the following NEXUS execution-plan response.', 'Return ONLY a valid JSON object matching this schema:', '{"intent":string,"modelClass":"ai","steps":[{"id":string,"capability":string,"purpose":string,"input":object,"verify":string?,"verification":{"capability":string,"input":object}?}],"uncertainties":string[]}', 'Do not invent capabilities. Preserve the intended objective and use only the supplied response.', `Objective: ${goal}`, `Invalid planner response:\n${text.slice(0, 8000)}`].join('\n\n'), { json: true });
    plan = parseJson(text) as DynamicExecutionPlan | null;
  }
  if (!validatePlan(plan)) throw new Error('AI returned an empty or invalid execution plan after JSON recovery.');
  if (!Array.isArray(plan.uncertainties)) plan.uncertainties = [];
  if (plan.steps.length > MAX_PLAN_STEPS) plan.steps = plan.steps.slice(0, MAX_PLAN_STEPS);
  return { ...plan, modelClass: 'ai' };
}
