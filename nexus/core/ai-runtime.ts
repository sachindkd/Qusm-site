import { planningPrompt, DynamicExecutionPlan } from './ai-plan';
import * as discord from '../discord/rest';

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const MAX_CONVERSATION_MESSAGES = 12;
const MAX_PLAN_STEPS = 12;
const MAX_PROMPT_CHARS = 14000;
const MAX_GENERATION_TOKENS = 900;
const MAX_RATE_LIMIT_RETRIES = 1;

type ConversationMessage = { role: 'user' | 'assistant'; content: string };
const conversations = new Map<string, ConversationMessage[]>();

function modelFor(): string { return process.env.NEXUS_AI_MODEL || DEFAULT_GROQ_MODEL; }
function key(guildId: string, userId: string): string { return `${guildId}:${userId}`; }
function history(guildId: string, userId: string): ConversationMessage[] { return conversations.get(key(guildId, userId)) || []; }
function remember(guildId: string, userId: string, role: 'user' | 'assistant', content: string) { conversations.set(key(guildId, userId), [...history(guildId, userId), { role, content }].slice(-MAX_CONVERSATION_MESSAGES)); }
function historyText(items: ConversationMessage[]): string { return items.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n').slice(-5000); }
function compactPrompt(prompt: string): string { return prompt.length <= MAX_PROMPT_CHARS ? prompt : `${prompt.slice(0, MAX_PROMPT_CHARS)}\n[context trimmed]`; }
function retryAfterMs(message: string): number { const match = message.match(/try again in\s+([0-9.]+)s/i); const seconds = match ? Number(match[1]) : 5; return Math.min(30000, Math.max(1000, Math.ceil(seconds * 1000))); }
function parseJson(text: string): any { const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim(); try { return JSON.parse(cleaned); } catch { return null; } }

async function generate(prompt: string, options: { json?: boolean; maxTokens?: number } = {}): Promise<string> {
  const apiKey = process.env.NEXUS_GROQ_API_KEY;
  if (!apiKey) throw new Error('NEXUS_GROQ_API_KEY is not configured.');
  const body: Record<string, unknown> = {
    model: modelFor(),
    messages: [{ role: 'user', content: compactPrompt(prompt) }],
    temperature: 0.2,
    max_tokens: options.maxTokens ?? MAX_GENERATION_TOKENS,
  };
  if (options.json) body.response_format = { type: 'json_object' };
  let lastError = '';
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body), cache: 'no-store' });
    const raw = await response.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { throw new Error(`Groq returned a non-JSON response (HTTP ${response.status}).`); }
    if (response.ok) {
      const text = data?.choices?.[0]?.message?.content?.trim() || '';
      if (!text) throw new Error('Groq returned no text.');
      return text;
    }
    const message = String(data?.error?.message || `request failed with HTTP ${response.status}`);
    lastError = message;
    const rateLimited = response.status === 429 || /rate limit|tokens per minute|TPM/i.test(message);
    if (!rateLimited || attempt >= MAX_RATE_LIMIT_RETRIES) break;
    await new Promise((resolve) => setTimeout(resolve, retryAfterMs(message)));
  }
  throw new Error(`Groq API: ${lastError}`);
}

async function discordHistory(channelId: string): Promise<string> {
  if (!channelId) return '';
  try {
    const rows = await discord.messages(channelId, 20);
    if (!Array.isArray(rows)) return '';
    return rows.reverse().slice(-20).map((m: any) => `${String(m?.author?.global_name || m?.author?.username || m?.author?.id || 'user')}: ${String(m?.content || '')}`).filter((x) => !/: $/.test(x)).join('\n').slice(-5000);
  } catch { return ''; }
}

export async function generateNexusReply(message: string, guildId: string, userId: string, channelId: string = ''): Promise<string> {
  const prior = history(guildId, userId);
  const channelContext = await discordHistory(channelId);
  const reply = await generate([
    'You are NEXUS, an autonomous AI assistant inside Discord.',
    'Speak directly and naturally like a helpful ChatGPT-style assistant.',
    'Resolve references from the supplied recent context.',
    'Never describe internal execution, planning, tools, capabilities, verification, status, progress, runtime details, or how you obtained information.',
    'Answer the actual user request and do not produce an execution report.',
    `Recent conversation:\n${historyText(prior) || '(none)'}`,
    `Recent channel context:\n${channelContext || '(none)'}`,
    `User message: ${message}`,
  ].join('\n\n'), { maxTokens: 700 });
  remember(guildId, userId, 'user', message);
  remember(guildId, userId, 'assistant', reply);
  return reply;
}

export type ExecutionResponseContext = { originalMessage: string; goal: string; guildId: string; userId: string; channelId?: string; results: unknown[]; status: string; failure?: { stepId: string; message: string } };
export async function generateExecutionResponse(input: ExecutionResponseContext): Promise<string> {
  const prior = history(input.guildId, input.userId);
  const channelContext = input.channelId ? await discordHistory(input.channelId) : '';
  const evidence = JSON.stringify(input.results).slice(-9000);
  const reply = await generate([
    'You are NEXUS. Answer the user directly after completing or attempting their request.',
    'Your output is the only message the user sees.',
    'Write a natural, useful answer exactly as a normal AI assistant would.',
    'Never mention execution, planning, tools, capabilities, steps, verification, status, progress, runtime, reports, internal state, raw result objects, or how you worked.',
    'Do not narrate your workflow. Do not use an execution-report format, tables, or numbered execution steps.',
    'Use only supported evidence. Never invent success. If something failed or is incomplete, state the user-relevant limitation plainly.',
    'For investigations, give the relevant findings directly. For changes, state what is now true.',
    `Original request: ${input.originalMessage}`,
    `Interpreted request: ${input.goal}`,
    `Outcome: ${input.status}`,
    `Failure: ${JSON.stringify(input.failure || null)}`,
    `Verified evidence: ${evidence}`,
    `Recent conversation:\n${historyText(prior) || '(none)'}`,
    `Recent channel context:\n${channelContext || '(none)'}`,
  ].join('\n\n'), { maxTokens: 900 });
  remember(input.guildId, input.userId, 'assistant', reply);
  return reply;
}

export type AgentDecision = { mode: 'conversation' | 'execute'; response?: string; goal?: string };
export async function decideAgentTurn(message: string, guildId: string, userId: string, channelId: string = ''): Promise<AgentDecision> {
  const prior = history(guildId, userId);
  const channelContext = await discordHistory(channelId);
  const raw = await generate([
    'You are the decision layer of NEXUS.',
    'Classify the user message as conversation or execute.',
    'Execute means the user wants NEXUS to perform, investigate, inspect, create, modify, moderate, configure, continue, resume, retry, or otherwise carry out an objective.',
    'Conversation means chat, questions, explanations, or discussing existing results without requesting an action.',
    'Resolve references such as this, that, it, continue, change it, undo that, and what did you change from context.',
    'Return ONLY JSON: {"mode":"conversation"|"execute","response":"string?","goal":"string?"}',
    `Recent conversation:\n${historyText(prior) || '(none)'}`,
    `Channel context:\n${channelContext || '(none)'}`,
    `Message: ${message}`,
  ].join('\n\n'), { json: true, maxTokens: 350 });
  const parsed = parseJson(raw) as AgentDecision | null;
  if (!parsed || !['conversation', 'execute'].includes(parsed.mode)) return { mode: 'conversation', response: 'I could not determine what you want me to do.' };
  if (parsed.mode === 'execute' && !String(parsed.goal || '').trim()) return { mode: 'conversation', response: String(parsed.response || 'Tell me what you want me to do.') };
  return parsed;
}

function validatePlan(value: any): value is DynamicExecutionPlan {
  return Boolean(value && typeof value === 'object' && typeof value.intent === 'string' && Array.isArray(value.steps) && value.steps.length > 0 && value.steps.every((step: any) => step && typeof step === 'object' && typeof step.id === 'string' && step.id.trim() && typeof step.capability === 'string' && step.capability.trim() && typeof step.purpose === 'string' && step.purpose.trim() && step.input && typeof step.input === 'object' && !Array.isArray(step.input)));
}

export async function createDynamicPlan(goal: string, guildId: string, userId: string = '', channelId: string = ''): Promise<DynamicExecutionPlan> {
  const prior = userId ? history(guildId, userId) : [];
  const channelContext = await discordHistory(channelId);
  const context = `${historyText(prior)}\n${channelContext}`.trim().slice(-6500);
  const prompt = planningPrompt(goal, guildId, context);
  let text = await generate(prompt, { json: true, maxTokens: 1400 });
  let plan = parseJson(text) as DynamicExecutionPlan | null;
  if (!validatePlan(plan)) {
    text = await generate([
      'Repair this NEXUS execution plan into valid JSON.',
      'Return ONLY the JSON schema requested below.',
      'Use only capabilities supplied in the original planner prompt; do not invent any.',
      '{"intent":string,"modelClass":"ai","steps":[{"id":string,"capability":string,"purpose":string,"input":object,"verify":string?,"verification":{"capability":string,"input":object}?}],"uncertainties":string[]}',
      `Objective: ${goal}`,
      `Invalid response: ${text.slice(0, 5000)}`,
    ].join('\n\n'), { json: true, maxTokens: 1000 });
    plan = parseJson(text) as DynamicExecutionPlan | null;
  }
  if (!validatePlan(plan)) throw new Error('AI returned an empty or invalid execution plan.');
  if (!Array.isArray(plan.uncertainties)) plan.uncertainties = [];
  if (plan.steps.length > MAX_PLAN_STEPS) plan.steps = plan.steps.slice(0, MAX_PLAN_STEPS);
  return { ...plan, modelClass: 'ai' };
}
