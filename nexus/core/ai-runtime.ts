import { planningPrompt, DynamicExecutionPlan } from './ai-plan';
import * as discord from '../discord/rest';

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const MAX_CONVERSATION_MESSAGES = 20;
type ConversationMessage = { role: 'user' | 'assistant'; content: string };
const conversations = new Map<string, ConversationMessage[]>();

function modelFor(): string { return process.env.NEXUS_AI_MODEL || DEFAULT_GROQ_MODEL; }
function key(guildId: string, userId: string): string { return `${guildId}:${userId}`; }
function history(guildId: string, userId: string): ConversationMessage[] { return conversations.get(key(guildId, userId)) || []; }
function remember(guildId: string, userId: string, role: 'user' | 'assistant', content: string) { conversations.set(key(guildId, userId), [...history(guildId, userId), { role, content }].slice(-MAX_CONVERSATION_MESSAGES)); }
function historyText(items: ConversationMessage[]): string { return items.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n'); }
function parseJson(text: string): any { const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim(); try { return JSON.parse(cleaned); } catch { return null; } }

async function generate(prompt: string): Promise<string> {
  const apiKey = process.env.NEXUS_GROQ_API_KEY;
  if (!apiKey) throw new Error('NEXUS_GROQ_API_KEY is not configured.');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: modelFor(), messages: [{ role: 'user', content: prompt }], temperature: 0.2 }), cache: 'no-store' });
  const raw = await response.text(); let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { throw new Error(`Groq returned a non-JSON response (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(`Groq API: ${data?.error?.message || `request failed with HTTP ${response.status}`}`);
  const text = data?.choices?.[0]?.message?.content?.trim() || ''; if (!text) throw new Error('Groq returned no text.'); return text;
}

async function discordHistory(channelId: string): Promise<string> {
  if (!channelId) return '';
  try { const rows = await discord.messages(channelId, 50); if (!Array.isArray(rows)) return ''; return rows.reverse().slice(-50).map((m: any) => `${String(m?.author?.global_name || m?.author?.username || m?.author?.id || 'user')}: ${String(m?.content || '')}`).filter((x) => !/: $/.test(x)).join('\n'); } catch { return ''; }
}

export async function generateNexusReply(message: string, guildId: string, userId: string, channelId: string = ''): Promise<string> {
  const prior = history(guildId, userId); const channelContext = await discordHistory(channelId);
  const reply = await generate(['You are NEXUS, an autonomous AI assistant operating inside a Discord server.', 'Hold a natural ongoing conversation and resolve references using recent context.', 'Never claim an action was performed unless the runtime actually performed it.', `Guild ID: ${guildId}`, `User ID: ${userId}`, `Recent NEXUS context:\n${historyText(prior) || '(none)'}`, `Recent Discord channel conversation:\n${channelContext || '(none)'}`, `Current user message: ${message}`].join('\n\n'));
  remember(guildId, userId, 'user', message); remember(guildId, userId, 'assistant', reply); return reply;
}

export type AgentDecision = { mode: 'conversation' | 'execute'; response?: string; goal?: string };
export async function decideAgentTurn(message: string, guildId: string, userId: string, channelId: string = ''): Promise<AgentDecision> {
  const prior = history(guildId, userId); const channelContext = await discordHistory(channelId);
  const raw = await generate(['You are the decision layer of NEXUS.', 'Decide whether the message is conversation or asks NEXUS to perform an objective.', 'Resolve references from context. For an objective, return a concise self-contained goal. Do not perform actions here.', 'Return ONLY JSON: {"mode":"conversation"|"execute","response":"string?","goal":"string?"}', `Guild: ${guildId}`, `User: ${userId}`, `Recent context:\n${historyText(prior) || '(none)'}`, `Channel context:\n${channelContext || '(none)'}`, `Message: ${message}`].join('\n\n'));
  const parsed = parseJson(raw) as AgentDecision | null;
  if (!parsed || !['conversation', 'execute'].includes(parsed.mode)) return { mode: 'conversation', response: raw };
  if (parsed.mode === 'execute' && !String(parsed.goal || '').trim()) return { mode: 'conversation', response: String(parsed.response || 'Tell me what you want me to do.') };
  return parsed;
}

export async function generateExecutionReport(goal: string, guildId: string, userId: string, plan: DynamicExecutionPlan, results: unknown[]): Promise<string> {
  const report = await generate(['You are NEXUS reporting an executed objective.', 'Use ONLY supplied execution results as evidence. Do not invent facts or claim failed steps succeeded.', 'For investigations/public data, summarize verified facts and useful findings. For changes, state exactly what succeeded or failed. If evidence is incomplete, say so. Keep it useful for Discord.', `Guild: ${guildId}`, `User: ${userId}`, `Objective: ${goal}`, `Plan: ${JSON.stringify(plan.steps)}`, `Execution results: ${JSON.stringify(results)}`].join('\n\n'));
  remember(guildId, userId, 'user', goal); remember(guildId, userId, 'assistant', report); return report;
}

export async function createDynamicPlan(goal: string, guildId: string, userId: string = '', channelId: string = ''): Promise<DynamicExecutionPlan> {
  const prior = userId ? history(guildId, userId) : []; const channelContext = await discordHistory(channelId);
  const text = await generate(planningPrompt(goal, guildId, `${historyText(prior)}\n${channelContext}`.trim()));
  const plan = parseJson(text) as DynamicExecutionPlan | null;
  if (!plan || !Array.isArray(plan.steps) || plan.steps.length === 0) throw new Error('AI returned an empty or invalid execution plan.');
  if (plan.steps.length > 12) plan.steps = plan.steps.slice(0, 12);
  return { ...plan, modelClass: 'ai' };
}
