import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

const OAUTH_STATE_COOKIE = "fbmrp_discord_oauth_state";

function redirectUri(request: Request) {
  const configured = process.env.DISCORD_REDIRECT_URI?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) return `${siteUrl.replace(/\/$/, "")}/api/auth/callback/discord`;
  const url = new URL(request.url);
  return `${url.origin}/api/auth/callback/discord`;
}

export async function GET(request: Request) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "Discord authentication is not configured." }, { status: 500 });

  const redirect = redirectUri(request);
  const state = randomUUID();
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
  return response;
}
