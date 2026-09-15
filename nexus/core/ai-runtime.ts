import { chooseModelClass } from '../core';
import { planningPrompt, DynamicExecutionPlan } from './ai-plan';

const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

function modelFor(goal: string) {
  return chooseModelClass(goal) === 'reasoning'
    ? (process.env.NEXUS_AI_REASONING_MODEL || DEFAULT_GEMINI_MODEL)
    : (process.env.NEXUS_AI_ROUTINE_MODEL || DEFAULT_GEMINI_MODEL);
}

function parseJson(text: string): unknown {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

async function generate(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.NEXUS_GEMINI_API_KEY;
  if (!apiKey) throw new Error('NEXUS_GEMINI_API_KEY is not configured.');

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
      'Api-Revision': '2026-05-20',
    },
    body: JSON.stringify({
      model,
      input: prompt,
    }),
    cache: 'no-store',
  });

  const raw = await response.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`Gemini returned a non-JSON response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.errors?.[0]?.message || `Gemini API request failed with HTTP ${response.status}.`;
    throw new Error(`Gemini API: ${message}`);
  }

  const text = Array.isArray(data?.steps)
    ? data.steps
        .filter((step: any) => step?.type === 'model_output')
        .flatMap((step: any) => Array.isArray(step?.content) ? step.content : [])
        .filter((part: any) => part?.type === 'text' && typeof part?.text === 'string')
        .map((part: any) => part.text)
        .join('')
        .trim()
    : '';

  if (!text) {
    const errorMessage = data?.errors?.[0]?.message;
    if (errorMessage) throw new Error(`Gemini API: ${errorMessage}`);
    throw new Error(`Gemini returned no text${data?.status ? ` (status: ${data.status})` : ''}.`);
  }

  return text;
}

export async function generateNexusReply(message: string, guildId: string, userId: string): Promise<string> {
  const prompt = [
    'You are NEXUS, an autonomous AI assistant operating inside a Discord server.',
    'Reply naturally and concisely to the user. Be useful, direct, and conversational.',
    'You may explain what you can do, but never claim to have performed an action unless the runtime actually performed it.',
    `Guild ID: ${guildId}`,
    `User ID: ${userId}`,
    `User message: ${message}`,
  ].join('\n');
  return generate(modelFor(message), prompt) || 'I received your message, but I could not generate a response.';
}

export async function createDynamicPlan(goal: string, guildId: string): Promise<DynamicExecutionPlan> {
  const model = modelFor(goal);
  const text = await generate(model, planningPrompt(goal, guildId));
  const plan = parseJson(text) as DynamicExecutionPlan | null;
  if (!plan || !Array.isArray(plan.steps)) throw new Error('AI did not return a valid execution plan.');
  if (plan.steps.length > 12) plan.steps = plan.steps.slice(0, 12);
  return { ...plan, modelClass: chooseModelClass(goal) };
}
