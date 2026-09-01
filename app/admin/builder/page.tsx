import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAccessLevel, getPermissions, FBMRP_GUILD_ID, SPECIAL_OWNER_ID, type DiscordGuildRole } from "@/lib/discord-roles";
import { readDiscordSession, DISCORD_SESSION_COOKIE } from "@/lib/discord-session";
import SectionStudio from "./SectionStudio";
export const dynamic="force-dynamic";

async function hasSiteEditAccess(session: { id: string }) {
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
    const member = await memberResponse.json() as { roles?: string[] };
    const roles = await rolesResponse.json() as DiscordGuildRole[];
    const permissions = getPermissions(getAccessLevel(session.id, member.roles ?? [], roles));
    return permissions.includes("site:edit") || permissions.includes("admin:all");
  } catch {
    return false;
  }
}

export default async function BuilderPage(){const session=readDiscordSession((await cookies()).get(DISCORD_SESSION_COOKIE)?.value);if(!session)redirect("/staff");if(!(await hasSiteEditAccess(session)))redirect("/staff");return <SectionStudio/>}
