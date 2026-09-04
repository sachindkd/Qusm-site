import { createHmac, createPublicKey, verify } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { distributedRateLimit } from "@/lib/distributed-rate-limit";

const API_LIMIT = 120;
const AUTH_LIMIT = 20;
const STAFF_GUILD_ID = "1539736452995350528";
const QUOTA_LOG_CHANNEL_ID = "1539785260923879505";

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  return forwarded || real || "unknown";
}

function verifyDiscordSignature(body: string, timestamp: string, signature: string) {
  try {
    const publicKey = process.env.DISCORD_PUBLIC_KEY?.trim();
    if (!publicKey) return false;
    const raw = Buffer.from(publicKey, "hex");
    if (raw.length !== 32) return false;
    const key = createPublicKey({
      key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]),
      format: "der",
      type: "spki",
    });
    return verify(null, new TextEncoder().encode(timestamp + body), key, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

async function logRejectedQuota(body: string, request: NextRequest) {
  if (request.nextUrl.pathname !== "/api/discord/interactions" || request.method !== "POST") return;
  const signature = request.headers.get("x-signature-ed25519") || "";
  const timestamp = request.headers.get("x-signature-timestamp") || "";
  if (!signature || !timestamp || !verifyDiscordSignature(body, timestamp, signature)) return;

  let interaction: any;
  try { interaction = JSON.parse(body); } catch { return; }
  if (interaction?.guild_id !== STAFF_GUILD_ID || interaction?.type !== 5) return;

  const customId = String(interaction?.data?.custom_id || "");
  const match = customId.match(/^quota_reject:([^:]+):([a-f0-9]{24}):([^:]+)$/);
  if (!match) return;

  const reason = String(
    interaction?.data?.components?.flatMap((row: any) => row?.components || [])
      ?.find((component: any) => component?.custom_id === "reason")?.value || "",
  ).trim();
  if (!reason) return;

  const fields = interaction?.message?.embeds?.[0]?.fields;
  if (!Array.isArray(fields)) return;
  const values = Object.fromEntries(fields.map((field: any) => [String(field.name), String(field.value || "")]));
  const requestId = values["Request ID"] || match[1];
  const member = values["Member"] || "Unknown";
  const quota = values["Quota (minutes)"] || "Unknown";
  const proof = values["Proof"] || "—";
  const notes = values["Notes"] || "—";
  const rejectedBy = interaction?.member?.user;
  const rejectedById = String(rejectedBy?.id || "");
  const rejectedByUsername = String(rejectedBy?.username || "Unknown");
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!botToken) return;

  const response = await fetch(`https://discord.com/api/v10/channels/${QUOTA_LOG_CHANNEL_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      embeds: [{
        title: "Quota Rejected",
        description: `<@${member.match(/^<@(\d+)>/)?.[1] || "0"}> quota submission has been rejected by Logistics.`,
        color: 0xed4245,
        fields: [
          { name: "Staff Member", value: member, inline: true },
          { name: "Quota Submitted", value: quota, inline: true },
          { name: "Rejected By", value: rejectedById ? `<@${rejectedById}> (${rejectedByUsername})` : rejectedByUsername, inline: true },
          { name: "Request ID", value: requestId },
          { name: "Reason", value: reason },
          { name: "Proof", value: proof },
          { name: "Notes", value: notes },
        ],
        footer: { text: "QUSM Quota System • Rejection Log" },
        timestamp: new Date().toISOString(),
      }],
      allowed_mentions: { users: rejectedById ? [rejectedById] : [] },
    }),
    cache: "no-store",
  });
  if (!response.ok) console.error("Failed to send quota rejection log", await response.text());
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const isAuthRoute = pathname.startsWith("/api/auth/");
  const key = `${isAuthRoute ? "auth" : "api"}:${getClientKey(request)}`;
  const limit = isAuthRoute ? AUTH_LIMIT : API_LIMIT;

  try {
    const result = await distributedRateLimit(key, limit);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(result.retryAfter), "Cache-Control": "no-store" } },
      );
    }
  } catch {
    // Preserve availability if the external database is temporarily unreachable.
    // Sensitive routes still enforce their own server-side authorization.
  }

  if (pathname === "/api/discord/interactions" && request.method === "POST") {
    try {
      const body = await request.clone().text();
      // Keep Discord's interaction response path independent; rejection logging is best-effort.
      await logRejectedQuota(body, request);
    } catch (error) {
      console.error("Quota rejection logging failed", error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
