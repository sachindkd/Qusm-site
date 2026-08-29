import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, getAccessLevel, can, type DiscordGuildRole } from "@/lib/discord-roles";
import { readContent, persistSection } from "@/lib/content-store";

type Announcement = { id: string; title: string; body: string; published: boolean; createdAt: string; updatedAt: string; discordMessageId?: string };

async function auth() {
  const raw = (await cookies()).get("fbmrp_discord_user")?.value;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!raw || !token) return false;
  try {
    const session = JSON.parse(raw);
    if (!session.id) return false;
    const headers = { Authorization: `Bot ${token}` };
    const [memberResponse, rolesResponse] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers, cache: "no-store" }),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
    ]);
    if (!memberResponse.ok || !rolesResponse.ok) return false;
    const member = await memberResponse.json();
    const roles = await rolesResponse.json();
    return can(getAccessLevel(session.id, member.roles || [], roles as DiscordGuildRole[]), "announcements:manage");
  } catch {
    return false;
  }
}

async function publish(a: Announcement) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channel = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID;
  if (!token || !channel) throw Object.assign(new Error("Discord announcements are not configured"), { status: 503 });
  const response = await fetch(`https://discord.com/api/v10/channels/${channel}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content: `**${a.title}**\n\n${a.body}` }),
  });
  if (response.status === 429) throw Object.assign(new Error(`Discord is rate-limited. Retry after ${Math.ceil(Number(response.headers.get("retry-after") || "0"))} seconds.`), { status: 429 });
  if (response.status === 401) throw Object.assign(new Error("Discord bot authentication failed"), { status: 502 });
  if (response.status === 403) throw Object.assign(new Error("Discord bot lacks permission to post in the announcements channel"), { status: 502 });
  if (response.status === 404) throw Object.assign(new Error("Announcements channel was not found"), { status: 502 });
  if (!response.ok) throw Object.assign(new Error(`Discord publishing failed (${response.status})`), { status: 502 });
  return (await response.json()).id;
}

export async function GET() {
  try {
    return NextResponse.json((await readContent()).announcements || [], { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Announcements unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!(await auth())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await req.json();
    if (!body || typeof body.title !== "string" || typeof body.body !== "string" || !body.title.trim() || !body.body.trim()) return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    const now = new Date().toISOString();
    const announcement: Announcement = { id: crypto.randomUUID(), title: body.title.trim(), body: body.body.trim(), published: Boolean(body.published), createdAt: now, updatedAt: now };
    if (announcement.published) announcement.discordMessageId = await publish(announcement);
    const content = await readContent();
    await persistSection("announcements", [...(content.announcements || []), announcement]);
    return NextResponse.json(announcement, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Announcement persistence failed" }, { status: error?.status || 503 });
  }
}

export async function PATCH(req: Request) {
  if (!(await auth())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await req.json();
    if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const content = await readContent();
    const current = content.announcements || [];
    const index = current.findIndex((item: Announcement) => item.id === body.id);
    if (index < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const old = current[index];
    const next = { ...old, title: typeof body.title === "string" ? body.title.trim() : old.title, body: typeof body.body === "string" ? body.body.trim() : old.body, published: typeof body.published === "boolean" ? body.published : old.published, updatedAt: new Date().toISOString() };
    if (!next.title || !next.body) return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    if (next.published && !old.published) next.discordMessageId = await publish(next);
    const updated = [...current];
    updated[index] = next;
    await persistSection("announcements", updated);
    return NextResponse.json(next, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Announcement persistence failed" }, { status: error?.status || 503 });
  }
}

export async function DELETE(req: Request) {
  if (!(await auth())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const content = await readContent();
    const current = content.announcements || [];
    const next = current.filter((item: Announcement) => item.id !== id);
    if (next.length === current.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await persistSection("announcements", next);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Announcement persistence failed" }, { status: error?.status || 503 });
  }
}
