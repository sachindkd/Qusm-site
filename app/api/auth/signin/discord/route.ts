import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { rateLimit, requestKey } from "../../../../../lib/rate-limit";

const OAUTH_STATE_COOKIE = "fbmrp_discord_oauth_state";
const OAUTH_NEXT_COOKIE = "fbmrp_discord_oauth_next";

function redirectUri(request: Request) {
  const configured = process.env.DISCORD_REDIRECT_URI?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) return `${siteUrl.replace(/\/$/, "")}/api/auth/callback/discord`;
  const url = new URL(request.url);
  return `${url.origin}/api/auth/callback/discord`;
}

function safeNext(value: string | null) {
  return value === "/staff" ? "/staff" : "/member";
}

export async function GET(request: Request) {
  const limiter = rateLimit(requestKey(request, "discord-signin"), 10, 60_000);
  if (!limiter.allowed) return NextResponse.json({ error: "Too many sign-in attempts. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limiter.retryAfter), "Cache-Control": "no-store" } });

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "Discord authentication is not configured." }, { status: 500 });

  const redirect = redirectUri(request);
  const state = randomUUID();
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirect,
    scope: "identify guilds",
    prompt: "consent",
    state,
  });

  const response = NextResponse.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 10 * 60,
  });
  response.cookies.set(OAUTH_NEXT_COOKIE, next, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 10 * 60,
  });
  return response;
}
