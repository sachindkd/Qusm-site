import { NextResponse } from 'next/server';
import { chooseModelClass } from '../../../core';
import { fallbackDynamicPlan, planningPrompt } from '../../../core/ai-plan';

export const runtime = 'nodejs';

function modelFor(goal: string) {
  return chooseModelClass(goal) === 'reasoning'
    ? (process.env.NEXUS_AI_REASONING_MODEL || 'gemini-2.5-pro')
    : (process.env.NEXUS_AI_ROUTINE_MODEL || 'gemini-2.5-flash');
}

function parseJson(text: string) {
  const fenced = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(fenced); } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
    const guildId = typeof body.guildId === 'string' ? body.guildId.trim() : 'dashboard';
    if (!goal) return NextResponse.json({ error: 'A goal is required.' }, { status: 400 });

    const apiKey = process.env.NEXUS_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        modelClass: chooseModelClass(goal),
        message: 'NEXUS AI planning is waiting for NEXUS_GEMINI_API_KEY.',
        plan: fallbackDynamicPlan(goal, guildId),
      });
    }

    const model = modelFor(goal);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: planningPrompt(goal, guildId) }] }] }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json({ error: 'AI provider request failed.', details: data?.error?.message || 'Unknown provider error.' }, { status: 502 });
    }

    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
    const dynamicPlan = parseJson(text);
    return NextResponse.json({
      model,
      modelClass: chooseModelClass(goal),
      message: text,
      dynamicPlan,
      planParseWarning: dynamicPlan ? undefined : 'AI returned non-JSON output; execution is not authorized from this response.',
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request or server error.' }, { status: 500 });
  }
}
