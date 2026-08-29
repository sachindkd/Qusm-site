import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, getAccessLevel, can, type DiscordGuildRole } from "@/lib/discord-roles";
import { readContent, persistSection } from "@/lib/content-store";

async function access() {
  const raw = (await cookies()).get("fbmrp_discord_user")?.value;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!raw || !token) return false;
  try {
    const session = JSON.parse(raw);
    if (!session.id) return false;
    const headers = { Authorization: `Bot ${token}` };
    const [memberResponse, rolesResponse] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers, cache: "no-store" }),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
    ]);
    if (!memberResponse.ok || !rolesResponse.ok) return false;
    const member = await memberResponse.json();
    const roles = await rolesResponse.json() as DiscordGuildRole[];
    return can(getAccessLevel(session.id, member.roles || [], roles), "media:manage");
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    return NextResponse.json((await readContent()).media || [], { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Media unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!(await access())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await req.json();
    if (!body.title || !body.imageUrl) return NextResponse.json({ error: "Title and image URL are required" }, { status: 400 });
    const content = await readContent();
    const item = {
      id: crypto.randomUUID(),
      title: String(body.title).trim(),
      caption: String(body.caption || ""),
      imageUrl: String(body.imageUrl).trim(),
      category: String(body.category || "general"),
      createdAt: new Date().toISOString(),
    };
    await persistSection("media", [...(content.media || []), item]);
    return NextResponse.json(item, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Media persistence failed" }, { status: 503 });
  }
}

export async function PATCH(req: Request) {
  if (!(await access())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const content = await readContent();
    const current = content.media || [];
    const index = current.findIndex((item: any) => item.id === body.id);
    if (index < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const next = [...current];
    next[index] = { ...next[index], ...body, updatedAt: new Date().toISOString() };
    await persistSection("media", next);
    return NextResponse.json(next[index], { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Media persistence failed" }, { status: 503 });
  }
}

export async function DELETE(req: Request) {
  if (!(await access())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const content = await readContent();
    const current = content.media || [];
    const next = current.filter((item: any) => item.id !== id);
    if (next.length === current.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await persistSection("media", next);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Media persistence failed" }, { status: 503 });
  }
}
