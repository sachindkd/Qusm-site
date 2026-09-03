import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "../../lib/discord-session";

const TESTER_ROLE_ID = "1540499074061439006";
const SHEETS_URL = process.env.QUOTA_GOOGLE_APPS_SCRIPT_URL?.trim();
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim();
const DISCORD_CHANNEL_ID = process.env.QUOTA_DISCORD_CHANNEL_ID?.trim();
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://qusm-sitev1.vercel.app").replace(/\/$/, "");

function sign(value: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("NEXTAUTH_SECRET is not configured");
  return createHmac("sha256", secret).update(value).digest("hex");
}
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a, "utf8"); const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}
async function session() {
  const jar = await cookies();
  return readDiscordSession(jar.get(DISCORD_SESSION_COOKIE)?.value);
}
function isTester(s: Awaited<ReturnType<typeof session>>) {
  return Boolean(s?.roles?.includes(TESTER_ROLE_ID));
}
async function sheets(body: Record<string, unknown>) {
  if (!SHEETS_URL) throw new Error("Quota Google database is not configured");
  const response = await fetch(SHEETS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  if (!response.ok) throw new Error("Google database request failed");
  return response.json().catch(() => ({}));
}
async function discordMessage(content: string) {
  if (!DISCORD_TOKEN || !DISCORD_CHANNEL_ID) throw new Error("Quota Discord channel is not configured");
  const response = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`, { method: "POST", headers: { Authorization: `Bot ${DISCORD_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ content, allowed_mentions: { parse: [] } }), cache: "no-store" });
  if (!response.ok) throw new Error("Discord quota notification failed");
  return response.json();
}

export default async function QuotaPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const s = await session();
  if (!s) redirect("/authorize?next=/quota");
  const tester = isTester(s);
  const params = await searchParams;
  let request: any = null;
  if (tester && params.request && SHEETS_URL) {
    try { request = await sheets({ action: "get", id: params.request }); } catch { request = null; }
  }
  return <main className="min-h-screen bg-bg text-white"><header className="sticky top-0 z-40 border-b border-border bg-bg/95"><div className="max-w-5xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between"><div><div className="font-mono text-[8px] tracking-[2px] text-golddim uppercase">FBMRP / QUOTA SYSTEM</div><h1 className="font-serif text-2xl font-bold">Quota Submission</h1></div><a href="/member" className="button button-ghost !py-2">MEMBER PORTAL</a></div></header><div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 space-y-6"><section className="rounded-2xl border border-border bg-panel p-6 sm:p-8"><div className="font-mono text-[8px] tracking-[2px] text-golddim uppercase">01 / SUBMIT</div><h2 className="font-serif text-3xl font-bold mt-2">Submit completed quota</h2><p className="text-textdim text-sm mt-2">Your submission is sent to the dedicated quota-review channel. It is not written to the Google database until approved.</p><form action={submitQuota} className="grid gap-4 mt-6"><label className="grid gap-2"><span className="font-mono text-[9px] uppercase text-textfaint">Quota completed</span><input name="quota" required type="number" min="0" step="1" className="input" placeholder="e.g. 10" /></label><label className="grid gap-2"><span className="font-mono text-[9px] uppercase text-textfaint">Proof / evidence URL</span><input name="proof" required type="url" className="input" placeholder="https://..." /></label><label className="grid gap-2"><span className="font-mono text-[9px] uppercase text-textfaint">Notes</span><textarea name="notes" maxLength={1000} className="input min-h-28" placeholder="Optional details for the reviewer" /></label><button className="button button-primary w-fit" type="submit">SUBMIT FOR REVIEW</button></form></section>{tester&&<section className="rounded-2xl border border-golddim/30 bg-panel p-6 sm:p-8"><div className="font-mono text-[8px] tracking-[2px] text-golddim uppercase">02 / TESTER PANEL</div><h2 className="font-serif text-3xl font-bold mt-2">Quota approval tester</h2><p className="text-textdim text-sm mt-2">Visible only to members holding the configured tester role.</p>{request?.id&&<div className="mt-6 rounded-xl border border-border bg-bg/60 p-5"><div className="font-mono text-[9px] text-golddim">REQUEST {request.id}</div><pre className="text-xs text-textdim whitespace-pre-wrap mt-3">{JSON.stringify(request, null, 2)}</pre><div className="flex gap-3 mt-5"><form action={approveQuota}><input type="hidden" name="id" value={request.id}/><button className="button button-primary" type="submit">APPROVE & LOG</button></form><form action={rejectQuota}><input type="hidden" name="id" value={request.id}/><button className="button button-ghost" type="submit">REJECT</button></form></div></div>}{!request?.id&&<p className="mt-6 rounded-xl border border-dashed border-border p-6 text-sm text-textfaint">Open a request link from the quota-review Discord message to test approval.</p>}</section>}</div></main>;
}

async function submitQuota(form: FormData) {
  "use server";
  const s = await session(); if (!s) redirect("/authorize?next=/quota");
  const quota = Number(form.get("quota")); const proof = String(form.get("proof") || "").trim(); const notes = String(form.get("notes") || "").trim();
  if (!Number.isFinite(quota) || quota < 0 || quota > 100000 || !/^https?:\/\//i.test(proof)) redirect("/quota?error=invalid");
  const payload = await sheets({ action: "create", userId: s.id, username: s.username || s.id, quota, proof, notes, status: "pending", createdAt: new Date().toISOString() });
  const id = String(payload.id || payload.requestId || "");
  if (!id) redirect("/quota?error=database");
  const token = sign(id);
  const link = `${SITE_URL}/quota?request=${encodeURIComponent(id)}&sig=${token}`;
  await discordMessage(`**Quota submission — pending review**\nMember: <@${s.id}>\nQuota: **${quota}**\nProof: ${proof}\nNotes: ${notes || "—"}\nReview: ${link}`);
  redirect("/quota?submitted=1");
}

async function approveQuota(form: FormData) {
  "use server";
  const s = await session(); if (!s || !isTester(s)) redirect("/member");
  const id = String(form.get("id") || ""); if (!id) redirect("/quota?error=missing");
  await sheets({ action: "approve", id, approvedBy: s.id, approvedByUsername: s.username || s.id, approvedAt: new Date().toISOString() });
  await discordMessage(`**Quota approved**\nRequest: **${id}**\nApproved by: <@${s.id}>\nGoogle database: **logged**`);
  redirect(`/quota?request=${encodeURIComponent(id)}&approved=1`);
}

async function rejectQuota(form: FormData) {
  "use server";
  const s = await session(); if (!s || !isTester(s)) redirect("/member");
  const id = String(form.get("id") || ""); if (!id) redirect("/quota?error=missing");
  await sheets({ action: "reject", id, rejectedBy: s.id, rejectedByUsername: s.username || s.id, rejectedAt: new Date().toISOString() });
  await discordMessage(`**Quota rejected**\nRequest: **${id}**\nRejected by: <@${s.id}>`);
  redirect(`/quota?request=${encodeURIComponent(id)}&rejected=1`);
}
