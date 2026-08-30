import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import "./staff.css";
import { FBMRP_GUILD_ID, SPECIAL_OWNER_ID, getAccessLevel, getPermissions, type DiscordGuildRole } from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";

const cards = [
  ["Website Content", "Edit leadership, divisions, CoC and site information.", "site:edit", "org"],
  ["Announcements", "Manage public announcements and automatic Discord feed.", "announcements:manage", "announcements"],
  ["Calendar", "Create and manage official FBMRP events.", "calendar:manage", "calendar"],
  ["Developer Media", "Publish approved developer images and media.", "developer:publish", "media"],
] as const;

async function getLiveAccess() {
  const session = readDiscordSession((await cookies()).get(DISCORD_SESSION_COOKIE)?.value);
  if (!session) return null;
  if (session.id === SPECIAL_OWNER_ID) return { session, access: "owner" as const, permissions: getPermissions("owner") };

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return { session, access: "member" as const, permissions: getPermissions("member") };

  try {
    const headers = { Authorization: `Bot ${botToken}` };
    const [memberRes, rolesRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers, cache: "no-store" }),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
    ]);
    if (!memberRes.ok || !rolesRes.ok) return { session, access: "member" as const, permissions: getPermissions("member") };
    const member = await memberRes.json() as { roles?: string[] };
    const guildRoles = await rolesRes.json() as DiscordGuildRole[];
    const roleIds = member.roles ?? [];
    const access = getAccessLevel(session.id, roleIds, guildRoles);
    return { session: { ...session, roles: roleIds }, access, permissions: getPermissions(access) };
  } catch {
    return { session, access: "member" as const, permissions: getPermissions("member") };
  }
}

export default async function StaffDashboard() {
  const auth = await getLiveAccess();
  if (!auth) redirect("/api/auth/signin/discord");
  if (auth.access === "member") redirect("/?auth=staff_required");

  const visibleCards = cards.filter(([, , permission]) => auth.permissions.includes(permission));
  return <main className="staff-page"><div className="staff-shell">
    <div className="staff-top">
      <div>
        <span className="eyebrow">FBMRP STAFF PORTAL · DISCORD VERIFIED</span>
        <h1>Command Center</h1>
        <p>Signed in as <strong>{auth.session.username || "Discord user"}</strong></p>
      </div>
      <span className="access-badge">{auth.access.replaceAll("-", " ")}</span>
    </div>
    {visibleCards.length > 0 ? <section className="staff-grid">
      {visibleCards.map(([title, description, , section]) => <article className="staff-card" key={title}>
        <span className="card-arrow">↗</span><h2>{title}</h2><p>{description}</p>
        <a className="staff-button" href={`/admin?section=${section}`}>Open</a>
      </article>)}
    </section> : <section className="staff-card"><h2>Read-only staff access</h2><p>Your Discord role is verified, but it does not include a management permission.</p></section>}
  </div></main>;
}
