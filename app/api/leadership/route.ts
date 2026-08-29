import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, getAccessLevel, can, type DiscordGuildRole } from "@/lib/discord-roles";
import { readContent, writeContent } from "@/lib/content-store";

async function ok() {
  const raw = (await cookies()).get("fbmrp_discord_user")?.value;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!raw || !token) return false;

  try {
    const session = JSON.parse(raw);
    const headers = { Authorization: `Bot ${token}` };
    const [memberResponse, rolesResponse] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, {
        headers,
        cache: "no-store",
      }),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, {
        headers,
        cache: "no-store",
      }),
    ]);

    if (!memberResponse.ok || !rolesResponse.ok) return false;

    const member = await memberResponse.json();
    const roles = await rolesResponse.json();
    return can(
      getAccessLevel(session.id, member.roles || [], roles as DiscordGuildRole[]),
      "leadership:edit",
    );
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json((await readContent()).leadership || []);
}

export async function PUT(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  if (!body.title?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: "Title and name are required" }, { status: 400 });
  }

  const content = await readContent();
  const id = body.id || crypto.randomUUID();
  const index = (content.leadership || []).findIndex((item) => item.id === id);
  const entry = {
    id,
    title: body.title.trim(),
    name: body.name.trim(),
    discordId: body.discordId?.trim(),
    division: body.division?.trim(),
    rank: body.rank?.trim(),
    description: body.description?.trim(),
    active: body.active !== false,
    order: Number.isFinite(body.order)
      ? body.order
      : index >= 0
        ? content.leadership[index].order
        : content.leadership.length,
  };

  if (index >= 0) content.leadership[index] = entry;
  else content.leadership.push(entry);

  content.leadership.sort((a, b) => a.order - b.order);
  await writeContent(content);
  return NextResponse.json(entry);
}

export async function DELETE(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  const content = await readContent();
  content.leadership = (content.leadership || []).filter((item) => item.id !== id);
  await writeContent(content);
  return NextResponse.json({ ok: true });
}
