import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAccessLevel, getPermissions, SPECIAL_OWNER_ID } from "@/lib/discord-roles";
import { readDiscordSession, DISCORD_SESSION_COOKIE } from "@/lib/discord-session";
import SectionStudio from "./SectionStudio";
export const dynamic="force-dynamic";
export default async function BuilderPage(){const session=readDiscordSession((await cookies()).get(DISCORD_SESSION_COOKIE)?.value);if(!session)redirect("/staff");const access=session.id===SPECIAL_OWNER_ID?"owner":getAccessLevel(session.id,session.roles||[]);const permissions=getPermissions(access);if(!permissions.includes("site:edit")&&!permissions.includes("admin:all"))redirect("/staff");return <SectionStudio/>}
