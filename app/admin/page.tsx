import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAccessLevel, FBMRP_GUILD_ID, getPermissions } from "@/lib/discord-roles";
import { loadContent } from "@/lib/content-store";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const raw=(await cookies()).get("fbmrp_discord_user")?.value;
  if(!raw) redirect("/staff");
  let session:any; try{session=JSON.parse(raw)}catch{redirect("/staff")}
  const token=process.env.DISCORD_BOT_TOKEN;
  if(!token||!session?.id) redirect("/staff");
  const res=await fetch(`https://discord.com/api/guilds/${FBMRP_GUILD_ID}/members/${session.id}`,{headers:{Authorization:`Bot ${token}`},cache:"no-store"});
  if(!res.ok) redirect("/staff");
  const member=await res.json();
  const access=getAccessLevel(session.id,member.roles||[]);
  const permissions=getPermissions(access);
  if(!permissions.includes("site:edit")&&!permissions.includes("admin:all")) redirect("/staff");
  const content=await loadContent();
  return <AdminClient initialContent={content} email={session.username??"Discord user"} access={access} permissions={permissions}/>;
}
