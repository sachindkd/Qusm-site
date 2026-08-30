import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, SPECIAL_OWNER_ID, ROLE_IDS, getAccessLevel, can, type Permission, type DiscordGuildRole } from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";
import { readContent, persistSection } from "@/lib/content-store";

const sectionPermission: Record<string, Permission> = {
  org: "site:edit", announcements: "announcements:manage", calendar: "calendar:manage",
  cocLeadership: "site:edit", cocStaff: "site:edit", cocRoleplay: "site:edit",
  leadership: "leadership:edit", divisions: "divisions:edit", applications: "applications:manage",
  rules: "site:edit", government: "site:edit", ranks: "site:edit", news: "site:edit", media: "media:manage",
};

async function getIdentity() {
  const raw = (await cookies()).get(DISCORD_SESSION_COOKIE)?.value;
  const session = readDiscordSession(raw);
  if (!session) return { access: "member" as const, userId: "", roleIds: [] as string[] };
  if (session.id === SPECIAL_OWNER_ID) return { access: "owner" as const, userId: session.id, roleIds: session.roles ?? [] };
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { access: "member" as const, userId: session.id, roleIds: session.roles ?? [] };
  try {
    const headers = { Authorization: `Bot ${token}` };
    const [memberResponse, rolesResponse] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers, cache: "no-store" }),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
    ]);
    if (!memberResponse.ok || !rolesResponse.ok) return { access: "member" as const, userId: session.id, roleIds: session.roles ?? [] };
    const member = await memberResponse.json() as { roles?: string[] };
    const roles = await rolesResponse.json() as DiscordGuildRole[];
    return { access: getAccessLevel(session.id, member.roles ?? [], roles), userId: session.id, roleIds: member.roles ?? [] };
  } catch { return { access: "member" as const, userId: session.id, roleIds: session.roles ?? [] }; }
}

export async function GET() {
  try {
    const c = await readContent();
    const { applications: _private, ...publicContent } = c;
    return NextResponse.json(publicContent, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Content store unavailable" }, { status: 503 }); }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    const section = req.headers.get("x-content-section") || "";
    if (section === "shop") {
      const identity = await getIdentity();
      const allowed = identity.userId === SPECIAL_OWNER_ID || identity.roleIds.includes(ROLE_IDS.owner) || identity.roleIds.includes(ROLE_IDS.coOwner);
      if (!allowed) return NextResponse.json({ error: "Shop management is restricted to Owner and Co-Owner." }, { status: 403 });
    } else {
      const permission = sectionPermission[section];
      if (!permission) return NextResponse.json({ error: "Missing or invalid content section" }, { status: 400 });
      const identity = await getIdentity();
      if (!can(identity.access, permission)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const value = body[section];
    const valid = section === "org" ? !!value && typeof value === "object" && !Array.isArray(value) : Array.isArray(value);
    if (!valid) return NextResponse.json({ error: section === "org" ? "Settings must be an object" : "Section must be an array" }, { status: 400 });
    await persistSection(section as keyof import("@/lib/content").Content, value);
    return NextResponse.json({ ok: true, section }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Content persistence unavailable" }, { status: 503 }); }
}
