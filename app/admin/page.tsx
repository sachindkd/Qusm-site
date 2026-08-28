import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAccessLevel, FBMRP_GUILD_ID, getPermissions, type DiscordGuildRole } from "@/lib/discord-roles";
import { loadContent } from "@/lib/content-store";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const raw = (await cookies()).get("fbmrp_discord_user")?.value;
  if (!raw) redirect("/staff");
  let session: any;
  try { session = JSON.parse(raw); } catch { redirect("/staff"); }
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !session?.id) redirect("/staff");

  const headers = { Authorization: `Bot ${token}` };
  const [memberRes, rolesRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers, cache: "no-store" }),
    fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
  ]);
  if (!memberRes.ok || !rolesRes.ok) redirect("/staff");

  const member = await memberRes.json();
  const guildRoles = await rolesRes.json() as DiscordGuildRole[];
  const access = getAccessLevel(session.id, member.roles || [], guildRoles);
  const permissions = getPermissions(access);
  if (!permissions.includes("site:edit") && !permissions.includes("admin:all")) redirect("/staff");

  const content = await loadContent();
  return <AdminClient initialContent={content} email={session.username ?? "Discord user"} access={access} permissions={permissions} />;
}
