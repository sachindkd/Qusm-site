import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getLiveAuthorization } from "@/lib/authorization";
import { type Permission, getPermissions } from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";
import { loadContent } from "@/lib/content-store";
import AdminClientV2 from "./AdminClientV2";
import AuditLogButton from "./AuditLogButton";

const EDIT_PERMISSIONS: Permission[] = ["site:edit", "announcements:manage", "calendar:manage", "media:manage", "leadership:edit", "divisions:edit", "admin:all"];
const WEBSITE_STAFF_ROLE_ID = "1496561403501219952";

export default async function AdminPage() {
  const raw = (await cookies()).get(DISCORD_SESSION_COOKIE)?.value;
  const session = readDiscordSession(raw);
  if (!session) redirect("/staff");

  const identity = await getLiveAuthorization();
  if (!identity) redirect("/staff");

  const access = identity.access;
  const permissions = getPermissions(access);
  const readOnlyStaff = identity.roleIds.includes(WEBSITE_STAFF_ROLE_ID);
  if (!readOnlyStaff && !permissions.some((permission) => EDIT_PERMISSIONS.includes(permission))) redirect("/staff");

  const auditReadable = permissions.includes("audit:read");
  const shopEditable = access === "owner" || access === "special-user";
  const content = readOnlyStaff && !permissions.some((permission) => EDIT_PERMISSIONS.includes(permission)) ? {} : await loadContent();

  return <><div className="fixed right-4 top-4 z-[80] sm:right-8">{auditReadable ? <AuditLogButton /> : null}</div><AdminClientV2 initialContent={content} email={identity.username ?? session.username ?? "Discord user"} access={access} permissions={permissions} shopEditable={shopEditable} readOnly={readOnlyStaff && !permissions.some((permission) => EDIT_PERMISSIONS.includes(permission))} /></>;
}
