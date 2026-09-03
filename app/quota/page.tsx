import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "../../lib/discord-session";

const TESTER_ROLE_ID = "1540499074061439006";
const SHEETS_URL = process.env.QUOTA_GOOGLE_APPS_SCRIPT_URL?.trim();
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim();
const DISCORD_CHANNEL_ID = process.env.QUOTA_DISCORD_CHANNEL_ID?.trim();
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://qusm-sitev1.vercel.app").replace(/\/$/, "");

type QuotaRequest = {
  id: string;
  userId: string;
  username: string;
  quota: number;
  proof: string;
  notes: string;
  createdAt: string;
};

function secret() {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value || value.length < 32) throw new Error("NEXTAUTH_SECRET is not configured");
  return value;
}
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a, "utf8"); const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}
function encodeRequest(request: QuotaRequest) {
  const payload = Buffer.from(JSON.stringify(request), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}
function decodeRequest(value: string | undefined): QuotaRequest | null {
  if (!value) return null;
  try {
    const [payload, signature] = value.split(".");
    if (!payload || !signature || !safeEqual(sign(payload), signature)) return null;
    const request = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as QuotaRequest;
    if (!request?.id || !request.userId || !request.username || !Number.isFinite(request.quota) || !/^https?:\/\//i.test(request.proof)) return null;
    return request;
  } catch { return null; }
}
async function session() {
  const jar = await cookies();
  return readDiscordSession(jar.get(DISCORD_SESSION_COOKIE)?.value);
}
function isTester(s: Awaited<ReturnType<typeof session>>) { return Boolean(s?.roles?.includes(TESTER_ROLE_ID)); }
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

export default async function QuotaPage({ searchParams }: { searchParams: Promise<{ request?: string; sig?: string; submitted?: string; approved?: string; rejected?: string; error?: string }> }) {
  const s = await session();
  if (!s) redirect("/authorize?next=/quota");
  const tester = isTester(s);
  const params = await searchParams;
  const encoded = params.request;
  const request = tester ? decodeRequest(encoded) : null;
  const signedRequest = request && encoded && safeEqual(sign(encoded.split(".")[0]), encoded.split(".")[1] || "") ? request : null;
  return <main className="min-h-screen bg-bg text-white"><header className="sticky top-0 z-40 border-b border-border bg-bg/95"><div className="max-w-5xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between"><div><div className="font-mono text-[8px] tracking-[2px] text-golddim uppercase">FBMRP / QUOTA SYSTEM</div><h1 className="font-serif text-2xl font-bold">Quota Submission</h1></div><a href="/member" className="button button-ghost !py-2">MEMBER PORTAL</a></div></header><div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 space-y-6"><section className="rounded-2xl border border-border bg-panel p-6 sm:p-8"><div className="font-mono text-[8px] tracking-[2px] text-golddim uppercase">01 / SUBMIT</div><h2 className="font-serif text-3xl font-bold mt-2">Submit completed quota</h2><p className="text-textdim text-sm mt-2">Your submission is sent to the dedicated quota-review Discord channel. The Google database is written only after Logistics approval.</p>{params.submitted&&<p className="mt-4 rounded-lg border border-golddim/30 p-3 text-sm">Submission sent for Logistics review.</p>}<form action={submitQuota} className="grid gap-4 mt-6"><label className="grid gap-2"><span className="font-mono text-[9px] uppercase text-textfaint">Quota completed</span><input name="quota" required type="number" min="0" step="1" className="input" placeholder="e.g. 10" /></label><label className="grid gap-2"><span className="font-mono text-[9px] uppercase text-textfaint">Proof / evidence URL</span><input name="proof" required type="url" className="input" placeholder="https://..." /></label><label className="grid gap-2"><span className="font-mono text-[9px] uppercase text-textfaint">Notes</span><textarea name="notes" maxLength={1000} className="input min-h-28" placeholder="Optional details for the reviewer" /></label><button className="button button-primary w-fit" type="submit">SUBMIT FOR REVIEW</button></form></section>{tester&&<section className="rounded-2xl border border-golddim/30 bg-panel p-6 sm:p-8"><div className="font-mono text-[8px] tracking-[2px] text-golddim uppercase">02 / TESTER PANEL</div><h2 className="font-serif text-3xl font-bold mt-2">Quota approval tester</h2><p className="text-textdim text-sm mt-2">Visible only to members holding the configured tester role. Approval writes the finalized record to the external Google database.</p>{signedRequest?.id&&<div className="mt-6 rounded-xl border border-border bg-bg/60 p-5"><div className="font-mono text-[9px] text-golddim">REQUEST {signedRequest.id}</div><pre className="text-xs text-textdim whitespace-pre-wrap mt-3">{JSON.stringify(signedRequest, null, 2)}</pre><div className="flex gap-3 mt-5"><form action={approveQuota}><input type="hidden" name="payload" value={encoded}/><button className="button button-primary" type="submit">APPROVE & LOG</button></form><form action={rejectQuota}><input type="hidden" name="payload" value={encoded}/><button className="button button-ghost" type="submit">REJECT</button></form></div></div>}{!signedRequest?.id&&<p className="mt-6 rounded-xl border border-dashed border-border p-6 text-sm text-textfaint">Open the signed review link from the quota-review Discord message to test approval.</p>}</section>}</div></main>;
}

async function submitQuota(form: FormData) {
  "use server";
  const s = await session(); if (!s) redirect("/authorize?next=/quota");
  const quota = Number(form.get("quota")); const proof = String(form.get("proof") || "").trim(); const notes = String(form.get("notes") || "").trim();
  if (!Number.isFinite(quota) || quota < 0 || quota > 100000 || !/^https?:\/\//i.test(proof)) redirect("/quota?error=invalid");
  const request: QuotaRequest = { id: randomUUID(), userId: s.id, username: s.username || s.id, quota, proof, notes, createdAt: new Date().toISOString() };
  const payload = encodeRequest(request);
  const link = `${SITE_URL}/quota?request=${encodeURIComponent(payload)}`;
  await discordMessage(`**Quota submission — pending review**\nMember: <@${s.id}>\nQuota: **${quota}**\nProof: ${proof}\nNotes: ${notes || "—"}\nReview: ${link}\n\nReact with ✅ to approve or ❌ to reject. If your bot forwards those reactions to the quota approval endpoint, the decision will be logged automatically.`);
  redirect("/quota?submitted=1");
}

async function approveQuota(form: FormData) {
  "use server";
  const s = await session(); if (!s || !isTester(s)) redirect("/member");
  const encoded = String(form.get("payload") || ""); const request = decodeRequest(encoded); if (!request) redirect("/quota?error=invalid_request");
  await sheets({ action: "approve", id: request.id, userId: request.userId, username: request.username, quota: request.quota, proof: request.proof, notes: request.notes, createdAt: request.createdAt, approvedBy: s.id, approvedByUsername: s.username || s.id, approvedAt: new Date().toISOString(), status: "approved" });
  await discordMessage(`**Quota approved**\nRequest: **${request.id}**\nApproved by: <@${s.id}>\nGoogle database: **logged**`);
  redirect(`/quota?approved=1`);
}

async function rejectQuota(form: FormData) {
  "use server";
  const s = await session(); if (!s || !isTester(s)) redirect("/member");
  const encoded = String(form.get("payload") || ""); const request = decodeRequest(encoded); if (!request) redirect("/quota?error=invalid_request");
  await discordMessage(`**Quota rejected**\nRequest: **${request.id}**\nRejected by: <@${s.id}>`);
  redirect(`/quota?rejected=1`);
}
