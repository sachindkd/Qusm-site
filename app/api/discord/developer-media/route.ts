import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";
import { FBMRP_GUILD_ID, getAccessLevel, can, type DiscordGuildRole } from "@/lib/discord-roles";
import { readContent, persistSection } from "@/lib/content-store";

async function getAccess() {
  const session = readDiscordSession((await cookies()).get(DISCORD_SESSION_COOKIE)?.value);
  if (!session) return "member" as const;
  if (session.id === "1210317929485181000") return "owner" as const;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return "member" as const;
  try {
    const headers = { Authorization: `Bot ${token}` };
    const [memberRes, rolesRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers, cache: "no-store" }),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
    ]);
    if (!memberRes.ok || !rolesRes.ok) return "member" as const;
    const member = await memberRes.json() as { roles?: string[] };
    const roles = await rolesRes.json() as DiscordGuildRole[];
    return getAccessLevel(session.id, member.roles ?? [], roles);
  } catch { return "member" as const; }
}

export async function GET() {
  try {
    const content = await readContent();
    return NextResponse.json({ posts: content.media || [] }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch { return NextResponse.json({ posts: [] }, { status: 503 }); }
}

export async function POST(req: Request) {
  const access = await getAccess();
  if (!can(access, "media:manage")) return NextResponse.json({ error: "Developer media access denied" }, { status: 403 });
  try {
    const body = await req.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const type = typeof body.type === "string" ? body.type : "";
    if (!url || !["image", "video"].includes(type)) return NextResponse.json({ error: "Media URL and type are required" }, { status: 400 });
    const content = await readContent();
    const item = { id: crypto.randomUUID(), title: typeof body.title === "string" ? body.title.trim() : "Developer Media", caption: typeof body.caption === "string" ? body.caption.trim() : "", [type === "image" ? "imageUrl" : "videoUrl"]: url, category: "DEVELOPER", order: (content.media || []).length, createdAt: new Date().toISOString() };
    await persistSection("media", [...(content.media || []), item]);
    return NextResponse.json(item, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Media publish failed" }, { status: 400 }); }
}
