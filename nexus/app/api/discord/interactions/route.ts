import { NextResponse, after } from 'next/server';
import { verifyAsync } from '@noble/ed25519';
import { assertAuthorized } from '../../../../security/access';
import { createDynamicPlan, generateExecutionReport, generateNexusReply } from '../../../../core/ai-runtime';
import { executeCapability } from '../../../../tools/executor';

export const runtime = 'nodejs';

async function followup(applicationId: string, token: string, content: string) {
  const response = await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${token}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: content.slice(0, 1900) }) });
  if (!response.ok) throw new Error(`Discord follow-up error: HTTP ${response.status}`);
}
function errorLabel(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  if (/groq/i.test(message)) return `Groq error: ${message}`;
  if (/discord/i.test(message)) return `Discord error: ${message}`;
  if (/unauthorized|access denied|permission/i.test(message)) return `Authorization/permission error: ${message}`;
  return `NEXUS error: ${message}`;
}
function isCasualConversation(text: string): boolean { return /^(hi|hello|hey|yo|hiya|sup|how are you|good morning|good afternoon|good evening|thanks|thank you|ok|okay|cool|nice|great)[!. ]*$/i.test(text.trim()); }

async function runObjective(applicationId: string, token: string, goal: string, guildId: string, userId: string, channelId: string) {
  try {
    const plan = await createDynamicPlan(goal, guildId, userId, channelId);
    const results: unknown[] = [];
    for (const step of plan.steps.slice(0, 12)) {
      try {
        const result = await executeCapability({ guildId, userId, channelId }, step.capability, { ...step.input, guildId, channelId });
        results.push({ capability: step.capability, ok: result.ok, result: result.result, error: result.error });
        if (!result.ok) break;
      } catch (error) { results.push({ capability: step.capability, ok: false, error: errorLabel(error) }); break; }
    }
    await followup(applicationId, token, await generateExecutionReport(goal, guildId, userId, plan, results));
  } catch (error) {
    try { await followup(applicationId, token, errorLabel(error)); } catch (followupError) { console.error('NEXUS follow-up failed:', followupError); }
  }
}
async function runConversation(applicationId: string, token: string, message: string, guildId: string, userId: string, channelId: string) {
  try { await followup(applicationId, token, await generateNexusReply(message, guildId, userId, channelId)); }
  catch (error) { try { await followup(applicationId, token, errorLabel(error)); } catch (followupError) { console.error('NEXUS conversation follow-up failed:', followupError); } }
}

export async function POST(req: Request) {
  const publicKey = process.env.NEXUS_DISCORD_PUBLIC_KEY;
  const applicationId = process.env.NEXUS_DISCORD_CLIENT_ID;
  if (!publicKey || !applicationId) return NextResponse.json({ error: 'NEXUS configuration error: Discord public key or application ID is missing.' }, { status: 503 });
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  if (!signature || !timestamp) return NextResponse.json({ error: 'Discord error: missing interaction signature.' }, { status: 401 });
  const raw = await req.text();
  try { if (!(await verifyAsync(signature, new TextEncoder().encode(timestamp + raw), publicKey))) return NextResponse.json({ error: 'Discord error: invalid interaction signature.' }, { status: 401 }); }
  catch (error) { console.error('NEXUS Discord signature verification failed:', error); return NextResponse.json({ error: 'Discord error: signature verification failed.' }, { status: 401 }); }
  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'NEXUS error: invalid Discord JSON payload.' }, { status: 400 }); }
  if (body.type === 1) return NextResponse.json({ type: 1 });
  if (body.type !== 2) return NextResponse.json({ type: 4, data: { content: 'NEXUS error: unsupported Discord interaction type.' } });
  const guildId = String(body.guild_id || '');
  const channelId = String(body.channel_id || '');
  const userId = String(body.member?.user?.id || body.user?.id || '');
  const roleIds = Array.isArray(body.member?.roles) ? body.member.roles.map(String) : [];
  try { assertAuthorized({ guildId, userId, roleIds }); } catch (error) { return NextResponse.json({ type: 4, data: { content: errorLabel(error) } }); }
  if (String(body.data?.name || '') !== 'nexus') return NextResponse.json({ type: 4, data: { content: 'NEXUS error: unknown command.' } });
  const goal = String(body.data?.options?.find((x: { name: string }) => x.name === 'goal')?.value || '').trim();
  if (!goal) return NextResponse.json({ type: 4, data: { content: 'NEXUS error: give me an objective to work on.' } });
  const token = String(body.token || '');
  if (!token) return NextResponse.json({ type: 4, data: { content: 'NEXUS error: Discord interaction token is missing.' } });
  after(async () => isCasualConversation(goal) ? runConversation(applicationId, token, goal, guildId, userId, channelId) : runObjective(applicationId, token, goal, guildId, userId, channelId));
  return NextResponse.json({ type: 5, data: { content: isCasualConversation(goal) ? 'NEXUS is thinking…' : 'NEXUS is planning and executing the objective…' } });
}
