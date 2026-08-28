import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, getAccessLevel, can, type Permission, type DiscordGuildRole } from "@/lib/discord-roles";
import { readContent, writeContent } from "@/lib/content-store";

const sectionPermission: Record<string, Permission> = {
  org: "site:edit",
  announcements: "announcements:manage",
  leadership: "leadership:edit",
  divisions: "divisions:edit",
  applications: "applications:manage",
  rules: "site:edit",
  government: "site:edit",
  ranks: "site:edit",
  news: "site:edit",
  media: "site:edit",
};

async function getAccess() {
  const raw = (await cookies()).get("fbmrp_discord_user")?.value;
  if (!raw || !process.env.DISCORD_BOT_TOKEN) return "member" as const;
  try {
    const session = JSON.parse(raw);
    if (!session.id) return "member" as const;
    const headers = { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` };
    const [memberResponse, rolesResponse] = await Promise.all([
      fetch(`https://discord.com/api/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers, cache: "no-store" }),
      fetch(`https://discord.com/api/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
    ]);
    if (!memberResponse.ok || !rolesResponse.ok) return "member" as const;
    const member = await memberResponse.json();
    const guildRoles = (await rolesResponse.json()) as DiscordGuildRole[];
    return getAccessLevel(session.id, member.roles || [], guildRoles);
  } catch {
    return "member" as const;
  }
}

export async function GET() {
  try {
    const content = await readContent();
    const { applications: _privateApplications, ...publicContent } = content;
    return NextResponse.json(publicContent, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Content store unavailable" }, { status: 503 });
  }
}

export async function PUT(req: Request) {
  const access = await getAccess();
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    const section = req.headers.get("x-content-section");
    if (!section || !sectionPermission[section]) {
      return NextResponse.json({ error: "Missing or invalid content section" }, { status: 400 });
    }
    const permission = sectionPermission[section];
    if (!can(access, permission)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const value = body[section];
    const valid = section === "org"
      ? !!value && typeof value === "object" && !Array.isArray(value)
      : Array.isArray(value);
    if (!valid) {
      return NextResponse.json({ error: section === "org" ? "Settings must be an object" : "Section must be an array" }, { status: 400 });
    }

    const current = await readContent();
    await writeContent({ ...current, [section]: value });
    return NextResponse.json({ ok: true, section });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Content persistence unavailable" }, { status: 503 });
  }
}
