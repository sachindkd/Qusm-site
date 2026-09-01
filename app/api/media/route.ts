import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, SPECIAL_OWNER_ID, getAccessLevel, can, type DiscordGuildRole } from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";
import { readContent, persistSection } from "@/lib/content-store";
import { passesSameOrigin } from "@/lib/authorization";

async function access() {
  const raw = (await cookies()).get(DISCORD_SESSION_COOKIE)?.value;
  const session = readDiscordSession(raw);
  if (!session) return false;
  if (session.id === SPECIAL_OWNER_ID) return true;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return false;
  try {
    const headers = { Authorization: `Bot ${token}` };
    const [memberResponse, rolesResponse] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${encodeURIComponent(session.id)}`, { headers, cache: "no-store" }),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
    ]);
    if (!memberResponse.ok || !rolesResponse.ok) return false;
    const member = await memberResponse.json();
    const roles = await rolesResponse.json() as DiscordGuildRole[];
    return can(getAccessLevel(session.id, member.roles || [], roles), "media:manage");
  } catch { return false; }
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validHttpUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return false;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
}

export async function GET() {
  try { return NextResponse.json((await readContent()).media || [], { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Media unavailable" }, { status: 503 }); }
}

export async function POST(req: Request) {
  if (!passesSameOrigin(req) || !(await access())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await req.json();
    const title = cleanText(body?.title, 160);
    const imageUrl = cleanText(body?.imageUrl, 2048);
    const caption = cleanText(body?.caption, 1000);
    const category = cleanText(body?.category, 80) || "general";
    if (!title || !imageUrl || !validHttpUrl(imageUrl)) return NextResponse.json({ error: "Valid title and image URL are required" }, { status: 400 });
    const content = await readContent();
    const item = { id: crypto.randomUUID(), title, caption, imageUrl, category, createdAt: new Date().toISOString() };
    await persistSection("media", [...(content.media || []), item]);
    return NextResponse.json(item, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Media persistence failed" }, { status: 503 }); }
}

export async function PATCH(req: Request) {
  if (!passesSameOrigin(req) || !(await access())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await req.json();
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id || id.length > 100) return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
    const content = await readContent();
    const current = content.media || [];
    const index = current.findIndex((item: any) => item.id === id);
    if (index < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const next = [...current];
    const existing = next[index];
    // Explicit field allow-list prevents object injection/overposting of id/createdAt/unknown fields.
    const updated = {
      ...existing,
      ...(body.title !== undefined ? { title: cleanText(body.title, 160) } : {}),
      ...(body.caption !== undefined ? { caption: cleanText(body.caption, 1000) } : {}),
      ...(body.category !== undefined ? { category: cleanText(body.category, 80) || "general" } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: cleanText(body.imageUrl, 2048) } : {}),
      updatedAt: new Date().toISOString(),
    };
    if (!updated.title || !validHttpUrl(updated.imageUrl)) return NextResponse.json({ error: "Invalid media fields" }, { status: 400 });
    next[index] = updated;
    await persistSection("media", next);
    return NextResponse.json(updated, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Media persistence failed" }, { status: 503 }); }
}

export async function DELETE(req: Request) {
  if (!passesSameOrigin(req) || !(await access())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const id = new URL(req.url).searchParams.get("id")?.trim() || "";
    if (!id || id.length > 100) return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
    const content = await readContent();
    const current = content.media || [];
    const next = current.filter((item: any) => item.id !== id);
    if (next.length === current.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await persistSection("media", next);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Media persistence failed" }, { status: 503 }); }
}
