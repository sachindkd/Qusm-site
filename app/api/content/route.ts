import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, getAccessLevel } from "@/lib/discord-roles";
import { getContent, saveContent } from "@/lib/content";

async function isAdmin() {
  const raw = (await cookies()).get("fbmrp_discord_user")?.value;
  if (!raw || !process.env.DISCORD_BOT_TOKEN) return false;
  try {
    const session = JSON.parse(raw);
    if (!session.id) return false;
    const res = await fetch(`https://discord.com/api/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }, cache: "no-store" });
    if (!res.ok) return false;
    const member = await res.json();
    const access = getAccessLevel(session.id, member.roles || []);
    return access === "owner" || access === "management";
  } catch { return false; }
}

export async function GET() {
  try { return NextResponse.json(await getContent()); }
  catch { return NextResponse.json({ error: "Content store unavailable" }, { status: 500 }); }
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    await saveContent(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Content could not be persisted on this deployment" }, { status: 503 });
  }
}
