import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, SPECIAL_OWNER_ID, getAccessLevel, getPermissions, type DiscordGuildRole } from "../../../../lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "../../../../lib/discord-session";

const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };

function specialUserIds() {
  return new Set([SPECIAL_OWNER_ID, ...(process.env.DISCORD_SPECIAL_USER_IDS || "").split(",").map((id) => id.trim()).filter(Boolean)]);
}

export async function GET() {
  const session = readDiscordSession((await cookies()).get(DISCORD_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ authenticated: false }, { headers: noStore });

  if (specialUserIds().has(session.id)) {
    const access = "special-user" as const;
    return NextResponse.json({
      authenticated: true,
      user: {
        ...session,
        roles: [],
        nick: null,
        access,
        permissions: getPermissions(access),
        highestRole: null,
      },
    }, { headers: noStore });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return NextResponse.json({ authenticated: false }, { headers: noStore });

  try {
    const headers = { Authorization: `Bot ${botToken}` };
    const [memberRes, rolesRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${encodeURIComponent(session.id)}`, { headers, cache: "no-store" }),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
    ]);
    if (!memberRes.ok || !rolesRes.ok) return NextResponse.json({ authenticated: false }, { headers: noStore });

    const member = await memberRes.json() as { roles?: string[]; nick?: string | null };
    const guildRoles = await rolesRes.json() as DiscordGuildRole[];
    const roles = member.roles ?? [];
    const access = getAccessLevel(session.id, roles, guildRoles);
    const permissions = getPermissions(access);
    const highestRole = guildRoles.filter((role) => roles.includes(role.id) && !role.managed).sort((a, b) => b.position - a.position)[0] ?? null;

    return NextResponse.json({
      authenticated: true,
      user: { ...session, roles, nick: member.nick ?? null, access, permissions, highestRole: highestRole ? { id: highestRole.id, name: highestRole.name, position: highestRole.position } : null },
    }, { headers: noStore });
  } catch {
    return NextResponse.json({ authenticated: false }, { headers: noStore });
  }
}
