import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, getAccessLevel, getPermissions } from "../../../../lib/discord-roles";

export async function GET() {
  const raw = (await cookies()).get("fbmrp_discord_user")?.value;
  if (!raw) return NextResponse.json({ authenticated: false });
  try {
    const session = JSON.parse(raw);
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken || !session.id) return NextResponse.json({ authenticated: false });
    const res = await fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, {
      headers: { Authorization: `Bot ${botToken}` }, cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ authenticated: false });
    const member = await res.json() as { roles?: string[]; nick?: string | null };
    const roles = member.roles ?? [];
    const access = getAccessLevel(session.id, roles);
    const permissions = getPermissions(access);
    return NextResponse.json({
      authenticated: true,
      user: { ...session, roles, nick: member.nick ?? null, access, permissions },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ authenticated: false }); }
}
