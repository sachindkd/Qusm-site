import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getLiveAuthorization } from "@/lib/authorization";
import { type Permission, getPermissions } from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";
import { loadContent } from "@/lib/content-store";
import AdminClientV2 from "./AdminClientV2";
import AuditLogButton from "./AuditLogButton";

const EDIT_PERMISSIONS: Permission[] = ["site:edit", "announcements:manage", "calendar:manage", "media:manage", "leadership:edit", "divisions:edit", "admin:all"];

export default async function AdminPage() {
  const raw = (await cookies()).get(DISCORD_SESSION_COOKIE)?.value;
  const session = readDiscordSession(raw);
  if (!session) redirect("/staff");

  // Resolve authorization from live Discord membership; never trust cached client/session roles.
  const identity = await getLiveAuthorization();
  if (!identity) redirect("/staff");

  const access = identity.access;
  const permissions = getPermissions(access);
  if (!permissions.some((permission) => EDIT_PERMISSIONS.includes(permission))) redirect("/staff");

  const auditReadable = permissions.includes("audit:read");
  const shopEditable = access === "owner";
  const content = await loadContent();

  return <><div className="fixed right-4 top-4 z-[80] sm:right-8">{auditReadable ? <AuditLogButton /> : null}</div><AdminClientV2 initialContent={content} email={identity.username ?? session.username ?? "Discord user"} access={access} permissions={permissions} shopEditable={shopEditable} /></>;
}
