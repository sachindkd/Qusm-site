import { NextResponse } from "next/server";

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
  const params = new URLSearchParams({ client_id: clientId, response_type: "code", redirect_uri: redirect, scope: "identify guilds" });
  return NextResponse.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
}
