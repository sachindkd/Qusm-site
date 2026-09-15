import { planningPrompt, DynamicExecutionPlan } from './ai-plan';
import * as discord from '../discord/rest';

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const MAX_CONVERSATION_MESSAGES = 12;
type ConversationMessage = { role: 'user' | 'assistant'; content: string };
const conversations = new Map<string, ConversationMessage[]>();

function modelFor(): string { return process.env.NEXUS_AI_MODEL || DEFAULT_GROQ_MODEL; }
function key(guildId: string, userId: string): string { return `${guildId}:${userId}`; }
function history(guildId: string, userId: string): ConversationMessage[] { return conversations.get(key(guildId, userId)) || []; }
function remember(guildId: string, userId: string, role: 'user' | 'assistant', content: string) {
  conversations.set(key(guildId, userId), [...history(guildId, userId), { role, content }].slice(-MAX_CONVERSATION_MESSAGES));
}
function historyText(items: ConversationMessage[]): string { return items.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n'); }
function parseJson(text: string): unknown {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

async function generate(prompt: string): Promise<string> {
  const apiKey = process.env.NEXUS_GROQ_API_KEY;
  if (!apiKey) throw new Error('NEXUS_GROQ_API_KEY is not configured.');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: modelFor(), messages: [{ role: 'user', content: prompt }], temperature: 0.2 }), cache: 'no-store',
  });
  const raw = await response.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { throw new Error(`Groq returned a non-JSON response (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(`Groq API: ${data?.error?.message || `request failed with HTTP ${response.status}`}`);
  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  if (!text) throw new Error('Groq returned no text.');
  return text;
}

async function discordHistory(channelId: string): Promise<string> {
  if (!channelId) return '';
  try {
    const rows = await discord.messages(channelId, 50);
    if (!Array.isArray(rows)) return '';
    return rows.reverse().slice(-50).map((m: any) => {
      const name = String(m?.author?.global_name || m?.author?.username || m?.author?.id || 'user');
      return `${name}: ${String(m?.content || '')}`;
    }).filter((x) => !/: $/.test(x)).join('\n');
  } catch { return ''; }
}

export async function generateNexusReply(message: string, guildId: string, userId: string, channelId: string = ''): Promise<string> {
  const prior = history(guildId, userId);
  const channelContext = await discordHistory(channelId);
  const reply = await generate([
    'You are NEXUS, an autonomous AI assistant operating inside a Discord server.',
    'Hold a natural ongoing conversation and resolve references such as it, that, continue, and do the same using recent context.',
    'Never claim an action was performed unless the runtime actually performed it.',
    `Guild ID: ${guildId}`, `User ID: ${userId}`, `Recent NEXUS context:\n${historyText(prior) || '(none)'}`, `Recent Discord channel conversation:\n${channelContext || '(none)'}`, `Current user message: ${message}`,
  ].join('\n\n'));
  remember(guildId, userId, 'user', message); remember(guildId, userId, 'assistant', reply);
  return reply;
}

export async function createDynamicPlan(goal: string, guildId: string, userId: string = '', channelId: string = ''): Promise<DynamicExecutionPlan> {
  const prior = userId ? history(guildId, userId) : [];
  const channelContext = await discordHistory(channelId);
  const text = await generate(planningPrompt(goal, guildId, `${historyText(prior)}\n${channelContext}`.trim()));
  const plan = parseJson(text) as DynamicExecutionPlan | null;
  if (!plan || !Array.isArray(plan.steps) || plan.steps.length === 0) throw new Error('AI returned an empty or invalid execution plan.');
  if (plan.steps.length > 12) plan.steps = plan.steps.slice(0, 12);
  return { ...plan, modelClass: 'ai' };
}
