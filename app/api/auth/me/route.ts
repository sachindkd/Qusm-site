import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, getAccessLevel, getPermissions, type DiscordGuildRole } from "../../../../lib/discord-roles";

export async function GET() {
  const raw = (await cookies()).get("fbmrp_discord_user")?.value;
  if (!raw) return NextResponse.json({ authenticated: false });
  try {
    const session = JSON.parse(raw);
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken || !session.id) return NextResponse.json({ authenticated: false });
    const headers = { Authorization: `Bot ${botToken}` };
    const [memberRes, rolesRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers, cache: "no-store" }),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
    ]);
    if (!memberRes.ok || !rolesRes.ok) return NextResponse.json({ authenticated: false });
    const member = await memberRes.json() as { roles?: string[]; nick?: string | null };
    const guildRoles = await rolesRes.json() as DiscordGuildRole[];
    const roles = member.roles ?? [];
    const access = getAccessLevel(session.id, roles, guildRoles);
    const permissions = getPermissions(access);
    const highestRole = guildRoles
      .filter((role) => roles.includes(role.id) && !role.managed)
      .sort((a, b) => b.position - a.position)[0] ?? null;
    return NextResponse.json({
      authenticated: true,
      user: {
        ...session,
        roles,
        nick: member.nick ?? null,
        access,
        permissions,
        highestRole: highestRole ? { id: highestRole.id, name: highestRole.name, position: highestRole.position } : null,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ authenticated: false }); }
}
