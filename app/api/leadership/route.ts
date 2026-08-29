import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, SPECIAL_OWNER_ID, getAccessLevel, can, type DiscordGuildRole } from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";
import { readContent, persistSection } from "@/lib/content-store";

async function ok() {
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
    const member = (await memberResponse.json()) as { roles?: string[] };
    const roles = (await rolesResponse.json()) as DiscordGuildRole[];
    return can(getAccessLevel(session.id, member.roles ?? [], roles), "leadership:edit");
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    return NextResponse.json((await readContent()).leadership || [], { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Leadership unavailable" }, { status: 503 });
  }
}

export async function PUT(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await req.json();
    if (!body.title?.trim() || !body.name?.trim()) {
      return NextResponse.json({ error: "Title and name are required" }, { status: 400 });
    }
    const content = await readContent();
    const id = body.id || crypto.randomUUID();
    const current = content.leadership || [];
    const index = current.findIndex((item) => item.id === id);
    const entry = {
      id,
      title: body.title.trim(),
      name: body.name.trim(),
      discordId: body.discordId?.trim(),
      division: body.division?.trim(),
      rank: body.rank?.trim(),
      description: body.description?.trim(),
      active: body.active !== false,
      order: Number.isFinite(body.order) ? body.order : index >= 0 ? current[index].order : current.length,
    };
    const next = [...current];
    if (index >= 0) next[index] = entry;
    else next.push(entry);
    next.sort((a, b) => a.order - b.order);
    await persistSection("leadership", next);
    return NextResponse.json(entry, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Leadership persistence failed" }, { status: 503 });
  }
}

export async function POST(req: Request) { return PUT(req); }
export async function PATCH(req: Request) { return PUT(req); }

export async function DELETE(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const content = await readContent();
    const current = content.leadership || [];
    const next = current.filter((item) => item.id !== id);
    if (next.length === current.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await persistSection("leadership", next);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Leadership persistence failed" }, { status: 503 });
  }
}
