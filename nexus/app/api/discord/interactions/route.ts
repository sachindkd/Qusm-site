import { NextResponse } from 'next/server';
import { verify } from '@noble/ed25519';
import { assertAuthorized } from '../../../security/access';
import { createPlan } from '../../../core';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const publicKey = process.env.NEXUS_DISCORD_PUBLIC_KEY;
  if (!publicKey) return NextResponse.json({ error: 'NEXUS_DISCORD_PUBLIC_KEY is not configured.' }, { status: 503 });
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  if (!signature || !timestamp) return NextResponse.json({ error: 'Missing Discord signature.' }, { status: 401 });
  const raw = await req.text();
  try {
    const ok = await verify(signature, new TextEncoder().encode(timestamp + raw), publicKey);
    if (!ok) return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  } catch { return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 }); }

  const body = JSON.parse(raw);
  if (body.type === 1) return NextResponse.json({ type: 1 });
  if (body.type !== 2) return NextResponse.json({ type: 4, data: { content: 'NEXUS does not recognize this interaction.' } });

  const guildId = String(body.guild_id || '');
  const userId = String(body.member?.user?.id || body.user?.id || '');
  const roleIds = Array.isArray(body.member?.roles) ? body.member.roles.map(String) : [];
  try { assertAuthorized({ guildId, userId, roleIds }); }
  catch (error) { return NextResponse.json({ type: 4, data: { content: `NEXUS access denied: ${error instanceof Error ? error.message : 'unauthorized'}` } }); }

  const goal = String(body.data?.options?.find((x: { name: string }) => x.name === 'goal')?.value || '').trim();
  if (!goal) return NextResponse.json({ type: 4, data: { content: 'Give NEXUS an objective to work on.' } });

  const plan = createPlan({ goal, context: { guildId, userId } });
  return NextResponse.json({ type: 4, data: { content: `**NEXUS accepted the objective.**\nModel class: **${plan.modelClass}**\n\n${plan.steps.map((s, i) => `${i + 1}. ${s.action} — ${s.reason}`).join('\n')}` } });
}
