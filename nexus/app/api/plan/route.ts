import { NextResponse } from 'next/server';
import { planningPrompt } from '../../../core/ai-plan';

export const runtime = 'nodejs';

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

function parseJson(text: string) {
  const fenced = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(fenced); } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
    const guildId = typeof body.guildId === 'string' ? body.guildId.trim() : '';
    if (!goal) return NextResponse.json({ error: 'A goal is required.' }, { status: 400 });
    if (!guildId) return NextResponse.json({ error: 'A guildId is required.' }, { status: 400 });

    const apiKey = process.env.NEXUS_GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'NEXUS_GROQ_API_KEY is not configured.' }, { status: 503 });

    const model = process.env.NEXUS_AI_MODEL || DEFAULT_GROQ_MODEL;
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: planningPrompt(goal, guildId) }],
        temperature: 0.2,
      }),
      cache: 'no-store',
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Groq provider request failed.', details: data?.error?.message || 'Unknown provider error.' }, { status: 502 });
    }

    const text = data?.choices?.[0]?.message?.content?.trim() || '';
    const dynamicPlan = parseJson(text);
    return NextResponse.json({
      model,
      modelClass: 'ai',
      message: text,
      dynamicPlan,
      planParseWarning: dynamicPlan ? undefined : 'AI returned non-JSON output; execution is not authorized from this response.',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid request or server error.' }, { status: 500 });
  }
}
