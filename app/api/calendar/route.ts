import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, SPECIAL_OWNER_ID, getAccessLevel, can, type DiscordGuildRole } from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";
import { readContent, persistSection } from "@/lib/content-store";

async function auth() {
  const raw = (await cookies()).get(DISCORD_SESSION_COOKIE)?.value;
  const session = readDiscordSession(raw);
  if (!session) return false;
  if (session.id === SPECIAL_OWNER_ID) return true;

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return false;
  try {
    const headers = { Authorization: `Bot ${token}` };
    const [memberResponse, rolesResponse] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers, cache: "no-store" }),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
    ]);
    if (!memberResponse.ok || !rolesResponse.ok) return false;
    const member = await memberResponse.json();
    const roles = await rolesResponse.json();
    return can(getAccessLevel(session.id, member.roles || [], roles as DiscordGuildRole[]), "calendar:manage");
  } catch { return false; }
}

function clean(body: any) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";
  const time = typeof body.time === "string" ? body.time.trim() : "";
  if (!title || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (time && !/^\d{2}:\d{2}$/.test(time))) return null;
  return { title, date, time, location: typeof body.location === "string" ? body.location.trim() : "", description: typeof body.description === "string" ? body.description.trim() : "", status: body.status === "published" ? "published" : "draft" };
}

export async function GET() {
  try { return NextResponse.json((await readContent()).calendar || [], { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Calendar unavailable" }, { status: 503 }); }
}

export async function POST(req: Request) {
  if (!(await auth())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const entry = clean(await req.json());
    if (!entry) return NextResponse.json({ error: "Valid title and date are required; time must be HH:MM" }, { status: 400 });
    const content = await readContent(); const now = new Date().toISOString();
    const item = { id: crypto.randomUUID(), ...entry, createdAt: now, updatedAt: now };
    const next = [...(content.calendar || []), item].sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`));
    await persistSection("calendar", next);
    return NextResponse.json(item, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Calendar persistence unavailable" }, { status: 503 }); }
}

export async function PATCH(req: Request) {
  if (!(await auth())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await req.json(); if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const entry = clean(body); if (!entry) return NextResponse.json({ error: "Valid title and date are required; time must be HH:MM" }, { status: 400 });
    const content = await readContent(); const current = content.calendar || []; const index = current.findIndex((item: any) => item.id === body.id);
    if (index < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const next = [...current]; next[index] = { ...next[index], ...entry, updatedAt: new Date().toISOString() };
    next.sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`));
    await persistSection("calendar", next);
    return NextResponse.json(next.find((item) => item.id === body.id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Calendar persistence unavailable" }, { status: 503 }); }
}

export async function DELETE(req: Request) {
  if (!(await auth())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const id = new URL(req.url).searchParams.get("id"); if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const content = await readContent(); const current = content.calendar || []; const next = current.filter((item: any) => item.id !== id);
    if (next.length === current.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await persistSection("calendar", next);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Calendar persistence unavailable" }, { status: 503 }); }
}
