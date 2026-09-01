import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";
import { getAccessLevel, can, FBMRP_GUILD_ID, type DiscordGuildRole } from "@/lib/discord-roles";
import { passesSameOrigin } from "@/lib/authorization";
import { rateLimit, requestKey } from "@/lib/rate-limit";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"] as const;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm", "mov"]);

async function getAccess() {
  const raw = (await cookies()).get(DISCORD_SESSION_COOKIE)?.value;
  const session = readDiscordSession(raw);
  if (!session) return "member" as const;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return "member" as const;
  try {
    const headers = { Authorization: `Bot ${token}` };
    const [memberResponse, rolesResponse] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${encodeURIComponent(session.id)}`, { headers, cache: "no-store" }),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, { headers, cache: "no-store" }),
    ]);
    if (!memberResponse.ok || !rolesResponse.ok) return "member" as const;
    const member = await memberResponse.json() as { roles?: string[] };
    const roles = await rolesResponse.json() as DiscordGuildRole[];
    return getAccessLevel(session.id, member.roles ?? [], roles);
  } catch { return "member" as const; }
}

function parsePayload(value: string | null) {
  if (!value) throw new Error("Upload metadata is required.");
  let payload: unknown;
  try { payload = JSON.parse(value); } catch { throw new Error("Invalid upload metadata."); }
  if (!payload || typeof payload !== "object") throw new Error("Invalid upload metadata.");
  const record = payload as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type.toLowerCase() : "";
  const size = typeof record.size === "number" ? record.size : Number(record.size);
  const pathname = typeof record.pathname === "string" ? record.pathname : "";
  const extension = pathname.split(".").pop()?.toLowerCase() ?? "";
  if (!(ALLOWED as readonly string[]).includes(type)) throw new Error("Unsupported media type.");
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) throw new Error("Developer media files must be 8 MB or smaller.");
  if (!ALLOWED_EXTENSIONS.has(extension)) throw new Error("Unsupported file extension.");
  if (pathname.length > 200 || pathname.includes("..") || /[\\\0\r\n]/.test(pathname)) throw new Error("Invalid upload path.");
  return { type, size, pathname };
}

export async function POST(request: Request): Promise<NextResponse> {
  const limiter = rateLimit(requestKey(request, "blob-upload"), 20, 60_000);
  if (!limiter.allowed) return NextResponse.json({ error: "Too many upload attempts. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limiter.retryAfter), "Cache-Control": "no-store" } });
  if (!passesSameOrigin(request)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  const access = await getAccess();
  if (!can(access, "media:manage")) return NextResponse.json({ error: "Developer media access denied" }, { status: 403 });
  try {
    const body = (await request.json()) as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parsePayload(clientPayload);
        if (payload.pathname !== pathname) throw new Error("Upload metadata mismatch.");
        return { allowedContentTypes: [...ALLOWED], maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Upload initialization failed" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
