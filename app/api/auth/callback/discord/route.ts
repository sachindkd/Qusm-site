import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { FBMRP_GUILD_ID, getAccessLevel } from "../../../../../lib/discord-roles";
import { DISCORD_SESSION_COOKIE, serializeDiscordSession } from "../../../../../lib/discord-session";
import { rateLimit, requestKey } from "../../../../../lib/rate-limit";

const OAUTH_STATE_COOKIE = "fbmrp_discord_oauth_state";
const OAUTH_NEXT_COOKIE = "fbmrp_discord_oauth_next";
const SESSION_MAX_AGE = 8 * 60 * 60;

function redirectUri(request: Request) {
  const configured = process.env.DISCORD_REDIRECT_URI?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) return `${siteUrl.replace(/\/$/, "")}/api/auth/callback/discord`;
  const url = new URL(request.url);
  return `${url.origin}/api/auth/callback/discord`;
}

function validState(expected: string | undefined, received: string | null) {
  if (!expected || !received) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function readCookie(request: Request, name: string) {
  return request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];
}

export async function GET(request: Request) {
  const limiter = rateLimit(requestKey(request, "discord-callback"), 20, 60_000);
  if (!limiter.allowed) return NextResponse.json({ error: "Too many authentication callbacks. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limiter.retryAfter), "Cache-Control": "no-store" } });

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateCookie = readCookie(request, OAUTH_STATE_COOKIE);
  if (!validState(stateCookie ? decodeURIComponent(stateCookie) : undefined, state)) return NextResponse.redirect(new URL("/?auth=invalid_oauth_state", url.origin));
  if (!code) return NextResponse.redirect(new URL("/?auth=missing_code", url.origin));

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const sessionSecret = process.env.NEXTAUTH_SECRET;
  if (!clientId || !clientSecret || !botToken || !sessionSecret || sessionSecret.length < 32) return NextResponse.redirect(new URL("/?auth=not_configured", url.origin));

  const redirect = redirectUri(request);
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", code, redirect_uri: redirect }), cache: "no-store" });
  if (!tokenRes.ok) return NextResponse.redirect(new URL("/?auth=token_error", url.origin));
  const token = await tokenRes.json();
  if (!token?.access_token || typeof token.access_token !== "string") return NextResponse.redirect(new URL("/?auth=token_error", url.origin));

  const meRes = await fetch("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${token.access_token}` }, cache: "no-store" });
  if (!meRes.ok) return NextResponse.redirect(new URL("/?auth=user_error", url.origin));
  const user = await meRes.json();
  if (!user?.id || typeof user.id !== "string") return NextResponse.redirect(new URL("/?auth=user_error", url.origin));

  const memberRes = await fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${user.id}`, { headers: { Authorization: `Bot ${botToken}` }, cache: "no-store" });
  if (!memberRes.ok) return NextResponse.redirect(new URL("/?auth=not_a_member", url.origin));
  const member = await memberRes.json();
  const roles = Array.isArray(member.roles) ? member.roles.filter((id: unknown): id is string => typeof id === "string") : [];
  const access = getAccessLevel(user.id, roles);
  const requested = readCookie(request, OAUTH_NEXT_COOKIE) ? decodeURIComponent(readCookie(request, OAUTH_NEXT_COOKIE)!) : "/member";
  const privileged = access !== "member";
  const destination = privileged && ["/staff", "/admin", "/admin/builder"].includes(requested) ? requested : "/member";
  const response = NextResponse.redirect(new URL(destination, url.origin));
  response.cookies.set(OAUTH_STATE_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth", maxAge: 0 });
  response.cookies.set(OAUTH_NEXT_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth", maxAge: 0 });
  response.cookies.set(DISCORD_SESSION_COOKIE, serializeDiscordSession({ id: user.id, username: typeof user.username === "string" ? user.username.slice(0, 100) : undefined, avatar: typeof user.avatar === "string" ? user.avatar : null, roles, access }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE });
  return response;
}
