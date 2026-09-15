import { NextResponse } from 'next/server';
import { verify } from '@noble/ed25519';
import { assertAuthorized } from '../../../security/access';
import { createDynamicPlan } from '../../../core/ai-runtime';
import { executeCapability } from '../../../tools/executor';

export const runtime = 'nodejs';

async function interactionCallback(applicationId: string, token: string, body: unknown) {
  const response = await fetch(`https://discord.com/api/v10/interactions/${applicationId}/${token}/callback`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Discord interaction callback failed: ${response.status}`);
}

async function followup(applicationId: string, token: string, content: string) {
  await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${token}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: content.slice(0, 1900) }) });
}

function summarize(results: Array<{ capability: string; ok: boolean; error?: string }>) {
  const succeeded = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  return `**NEXUS execution complete**\n${succeeded}/${results.length} steps succeeded.${failed.length ? `\nFailed: ${failed.map(r => `${r.capability}: ${r.error || 'error'}`).join('; ')}` : ''}`;
}

export async function POST(req: Request) {
  const publicKey = process.env.NEXUS_DISCORD_PUBLIC_KEY;
  const applicationId = process.env.NEXUS_DISCORD_CLIENT_ID;
  if (!publicKey || !applicationId) return NextResponse.json({ error: 'NEXUS Discord configuration is incomplete.' }, { status: 503 });
  const signature = req.headers.get('x-signature-ed25519'); const timestamp = req.headers.get('x-signature-timestamp');
  if (!signature || !timestamp) return NextResponse.json({ error: 'Missing Discord signature.' }, { status: 401 });
  const raw = await req.text();
  try { if (!(await verify(signature, new TextEncoder().encode(timestamp + raw), publicKey))) return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 }); } catch { return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 }); }

  const body = JSON.parse(raw);
  if (body.type === 1) return NextResponse.json({ type: 1 });
  if (body.type !== 2) return NextResponse.json({ type: 4, data: { content: 'NEXUS does not recognize this interaction.' } });

  const guildId = String(body.guild_id || ''); const userId = String(body.member?.user?.id || body.user?.id || '');
  const roleIds = Array.isArray(body.member?.roles) ? body.member.roles.map(String) : [];
  try { assertAuthorized({ guildId, userId, roleIds }); } catch (error) { return NextResponse.json({ type: 4, data: { content: `NEXUS access denied: ${error instanceof Error ? error.message : 'unauthorized'}` } }); }
  const goal = String(body.data?.options?.find((x: { name: string }) => x.name === 'goal')?.value || '').trim();
  if (!goal) return NextResponse.json({ type: 4, data: { content: 'Give NEXUS an objective to work on.' } });

  try {
    await interactionCallback(applicationId, body.token, { type: 5, data: { content: 'NEXUS is planning and executing the objective…' } });
    const plan = await createDynamicPlan(goal, guildId);
    const results: Array<{ capability: string; ok: boolean; error?: string }> = [];
    for (const step of plan.steps.slice(0, 12)) {
      const result = await executeCapability({ guildId, userId }, step.capability, { ...step.input, guildId });
      results.push({ capability: step.capability, ok: result.ok, error: result.error });
      if (!result.ok) break;
    }
    await followup(applicationId, body.token, `${summarize(results)}\nModel: ${plan.modelClass}.`);
    return new Response(null, { status: 200 });
  } catch (error) {
    try { await followup(applicationId, body.token, `NEXUS could not complete the objective: ${error instanceof Error ? error.message : 'execution error'}`); } catch {}
    return new Response(null, { status: 200 });
  }
}
