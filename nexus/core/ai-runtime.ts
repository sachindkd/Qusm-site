import { planningPrompt, DynamicExecutionPlan } from './ai-plan';

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

function modelFor(): string {
  return process.env.NEXUS_AI_MODEL || DEFAULT_GROQ_MODEL;
}

function parseJson(text: string): unknown {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

async function generate(prompt: string): Promise<string> {
  const apiKey = process.env.NEXUS_GROQ_API_KEY;
  if (!apiKey) throw new Error('NEXUS_GROQ_API_KEY is not configured.');

  const model = modelFor();
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
    cache: 'no-store',
  });

  const raw = await response.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`Groq returned a non-JSON response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const message = data?.error?.message || `Groq API request failed with HTTP ${response.status}.`;
    throw new Error(`Groq API: ${message}`);
  }

  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  if (!text) throw new Error('Groq returned no text.');
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
  return generate(prompt) || 'I received your message, but I could not generate a response.';
}

export async function createDynamicPlan(goal: string, guildId: string): Promise<DynamicExecutionPlan> {
  const text = await generate(planningPrompt(goal, guildId));
  const plan = parseJson(text) as DynamicExecutionPlan | null;
  if (!plan || !Array.isArray(plan.steps)) throw new Error('AI did not return a valid execution plan.');
  if (plan.steps.length > 12) plan.steps = plan.steps.slice(0, 12);
  return { ...plan, modelClass: 'reasoning' };
}
