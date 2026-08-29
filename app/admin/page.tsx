import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAccessLevel, FBMRP_GUILD_ID, SPECIAL_OWNER_ID, getPermissions, type DiscordGuildRole } from "@/lib/discord-roles";
import { readDiscordSession, DISCORD_SESSION_COOKIE } from "@/lib/discord-session";
import { loadContent } from "@/lib/content-store";
import AdminClient from "./AdminClient";

const EDIT_PERMISSIONS = ["site:edit", "announcements:manage", "calendar:manage", "media:manage", "leadership:edit", "divisions:edit", "admin:all"] as const;

export default async function AdminPage() {
  const raw = (await cookies()).get(DISCORD_SESSION_COOKIE)?.value;
  const session = readDiscordSession(raw);
  if (!session) redirect("/staff");

  // Owner access must not depend on a live Discord bot lookup.
  let access = getAccessLevel(session.id, session.roles ?? []);
  let permissions = getPermissions(access);

  if (session.id !== SPECIAL_OWNER_ID) {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) redirect("/staff");
    try {
      const headers = { Authorization: `Bot ${token}` };
      const [memberResponse, rolesResponse] = await Promise.all([
        fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers, cache: "no-store" }),
        fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
      ]);
      if (!memberResponse.ok || !rolesResponse.ok) redirect("/staff");
      const member = await memberResponse.json() as { roles?: string[] };
      const roles = await rolesResponse.json() as DiscordGuildRole[];
      access = getAccessLevel(session.id, member.roles ?? [], roles);
      permissions = getPermissions(access);
    } catch {
      redirect("/staff");
    }
  }

  if (!permissions.some((permission) => EDIT_PERMISSIONS.includes(permission as typeof EDIT_PERMISSIONS[number]))) redirect("/staff");
  const content = await loadContent();
  return <AdminClient initialContent={content} email={session.username ?? "Discord user"} access={access} permissions={permissions} />;
}
