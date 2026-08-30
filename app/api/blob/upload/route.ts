import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";
import { getAccessLevel, can, FBMRP_GUILD_ID, type DiscordGuildRole } from "@/lib/discord-roles";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"]);

async function getAccess() {
  const raw = (await cookies()).get(DISCORD_SESSION_COOKIE)?.value;
  const session = readDiscordSession(raw);
  if (!session) return "member" as const;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return "member" as const;
  try {
    const headers = { Authorization: `Bot ${token}` };
    const [memberResponse, rolesResponse] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`, { headers, cache: "no-store" }),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
    ]);
    if (!memberResponse.ok || !rolesResponse.ok) return "member" as const;
    const member = await memberResponse.json() as { roles?: string[] };
    const roles = await rolesResponse.json() as DiscordGuildRole[];
    return getAccessLevel(session.id, member.roles ?? [], roles);
  } catch { return "member" as const; }
}

export async function POST(req: Request) {
  const access = await getAccess();
  if (!can(access, "media:manage")) return NextResponse.json({ error: "Developer media access denied" }, { status: 403 });
  try {
    const body = await req.json();
    const pathname = String(body?.pathname || "");
    const type = String(body?.type || "");
    const size = Number(body?.size || 0);
    if (!pathname || !ALLOWED.has(type) || !Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return NextResponse.json({ error: "Only image/video files up to 8 MB are allowed." }, { status: 400 });
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathnameFromClient, clientPayload) => {
        const payload = clientPayload ? JSON.parse(clientPayload) : {};
        if (String(payload.type || type) !== type || Number(payload.size || size) > MAX_BYTES) throw new Error("File exceeds the 8 MB developer media limit.");
        if (!ALLOWED.has(type)) throw new Error("Unsupported media type.");
        return { allowedContentTypes: [...ALLOWED], maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload initialization failed" }, { status: 500 });
  }
}
