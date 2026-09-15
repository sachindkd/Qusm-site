import { chooseModelClass } from '../core';
import { planningPrompt, DynamicExecutionPlan } from './ai-plan';

function modelFor(goal: string) {
  return chooseModelClass(goal) === 'reasoning'
    ? (process.env.NEXUS_AI_REASONING_MODEL || 'gemini-2.5-flash')
    : (process.env.NEXUS_AI_ROUTINE_MODEL || 'gemini-2.5-flash');
}

function parseJson(text: string): unknown {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

export async function createDynamicPlan(goal: string, guildId: string): Promise<DynamicExecutionPlan> {
  const apiKey = process.env.NEXUS_GEMINI_API_KEY;
  if (!apiKey) throw new Error('NEXUS_GEMINI_API_KEY is not configured.');

  const model = modelFor(goal);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: planningPrompt(goal, guildId) }] }] }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'AI provider request failed.');
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
  const plan = parseJson(text) as DynamicExecutionPlan | null;
  if (!plan || !Array.isArray(plan.steps)) throw new Error('AI did not return a valid execution plan.');
  if (plan.steps.length > 12) plan.steps = plan.steps.slice(0, 12);
  return { ...plan, modelClass: chooseModelClass(goal) };
}
