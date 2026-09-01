import { NextResponse } from "next/server";
import { requirePermission, passesSameOrigin } from "@/lib/authorization";
import { readContent, persistSection } from "@/lib/content-store";
import { rateLimit, requestKey } from "@/lib/rate-limit";

type Announcement = { id: string; title: string; body: string; published: boolean; createdAt: string; updatedAt: string; discordMessageId?: string };
const MAX_TITLE = 200;
const MAX_BODY = 10000;

async function publish(a: Announcement) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channel = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID;
  if (!token || !channel) throw Object.assign(new Error("Discord announcements are not configured"), { status: 503 });
  const response = await fetch(`https://discord.com/api/v10/channels/${channel}/messages`, { method: "POST", headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ content: `**${a.title}**\n\n${a.body}` }) });
  if (response.status === 429) throw Object.assign(new Error("Discord is rate-limited. Try again shortly."), { status: 429 });
  if (response.status === 401) throw Object.assign(new Error("Discord bot authentication failed"), { status: 502 });
  if (response.status === 403) throw Object.assign(new Error("Discord bot lacks permission to post in the announcements channel"), { status: 502 });
  if (response.status === 404) throw Object.assign(new Error("Announcements channel was not found"), { status: 502 });
  if (!response.ok) throw Object.assign(new Error(`Discord publishing failed (${response.status})`), { status: 502 });
  return (await response.json()).id;
}

function validText(value: unknown, max: number): value is string { return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max; }
function writeAllowed(req: Request) { return rateLimit(requestKey(req, "announcements-write"), 20, 60_000); }

export async function GET() { try { return NextResponse.json((await readContent()).announcements || [], { headers: { "Cache-Control": "no-store" } }); } catch { return NextResponse.json({ error: "Announcements unavailable" }, { status: 503 }); } }

export async function POST(req: Request) {
  const limiter = writeAllowed(req); if (!limiter.allowed) return NextResponse.json({ error: "Too many announcement updates. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } });
  if (!passesSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  if (!(await requirePermission("announcements:manage"))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    if (!(req.headers.get("content-type") || "").toLowerCase().includes("application/json")) return NextResponse.json({ error: "JSON body required" }, { status: 415 });
    const body = await req.json();
    if (!validText(body?.title, MAX_TITLE) || !validText(body?.body, MAX_BODY)) return NextResponse.json({ error: `Title must be 1-${MAX_TITLE} characters and body 1-${MAX_BODY} characters.` }, { status: 400 });
    const now = new Date().toISOString(); const announcement: Announcement = { id: crypto.randomUUID(), title: body.title.trim(), body: body.body.trim(), published: Boolean(body.published), createdAt: now, updatedAt: now };
    if (announcement.published) announcement.discordMessageId = await publish(announcement);
    const content = await readContent(); await persistSection("announcements", [...(content.announcements || []), announcement]);
    return NextResponse.json(announcement, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error: any) { return NextResponse.json({ error: error?.message || "Announcement persistence failed" }, { status: error?.status || 503 }); }
}

export async function PATCH(req: Request) {
  const limiter = writeAllowed(req); if (!limiter.allowed) return NextResponse.json({ error: "Too many announcement updates. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } });
  if (!passesSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  if (!(await requirePermission("announcements:manage"))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    if (!(req.headers.get("content-type") || "").toLowerCase().includes("application/json")) return NextResponse.json({ error: "JSON body required" }, { status: 415 });
    const body = await req.json(); if (!body?.id || typeof body.id !== "string" || body.id.length > 100) return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
    const content = await readContent(); const current = content.announcements || []; const index = current.findIndex((item: Announcement) => item.id === body.id); if (index < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const old = current[index]; const title = typeof body.title === "string" ? body.title.trim() : old.title; const text = typeof body.body === "string" ? body.body.trim() : old.body;
    if (!validText(title, MAX_TITLE) || !validText(text, MAX_BODY)) return NextResponse.json({ error: `Title must be 1-${MAX_TITLE} characters and body 1-${MAX_BODY} characters.` }, { status: 400 });
    const next = { ...old, title, body: text, published: typeof body.published === "boolean" ? body.published : old.published, updatedAt: new Date().toISOString() };
    if (next.published && !old.published) next.discordMessageId = await publish(next);
    const updated = [...current]; updated[index] = next; await persistSection("announcements", updated);
    return NextResponse.json(next, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) { return NextResponse.json({ error: error?.message || "Announcement persistence failed" }, { status: error?.status || 503 }); }
}

export async function DELETE(req: Request) {
  const limiter = writeAllowed(req); if (!limiter.allowed) return NextResponse.json({ error: "Too many announcement updates. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } });
  if (!passesSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  if (!(await requirePermission("announcements:manage"))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try { const id = new URL(req.url).searchParams.get("id"); if (!id || id.length > 100) return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 }); const content = await readContent(); const current = content.announcements || []; const next = current.filter((item: Announcement) => item.id !== id); if (next.length === current.length) return NextResponse.json({ error: "Not found" }, { status: 404 }); await persistSection("announcements", next); return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } }); } catch (error: any) { return NextResponse.json({ error: error?.message || "Announcement persistence failed" }, { status: error?.status || 503 }); }
}
