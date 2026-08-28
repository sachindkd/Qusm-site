import { NextResponse } from "next/server";
import { FBMRP_GUILD_ID, getAccessLevel } from "../../../../../lib/discord-roles";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/?auth=missing_code", url.origin));

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!clientId || !clientSecret || !botToken) return NextResponse.redirect(new URL("/?auth=not_configured", url.origin));

  const redirectUri = `${url.origin}/api/auth/callback/discord`;
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  if (!tokenRes.ok) return NextResponse.redirect(new URL("/?auth=token_error", url.origin));
  const token = await tokenRes.json();

  const meRes = await fetch("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!meRes.ok) return NextResponse.redirect(new URL("/?auth=user_error", url.origin));
  const user = await meRes.json();

  const memberRes = await fetch(`https://discord.com/api/guilds/${FBMRP_GUILD_ID}/members/${user.id}`, { headers: { Authorization: `Bot ${botToken}` } });
  if (!memberRes.ok) return NextResponse.redirect(new URL("/?auth=not_a_member", url.origin));
  const member = await memberRes.json();
  const access = getAccessLevel(member.roles || []);

  const response = NextResponse.redirect(new URL(`/staff?access=${encodeURIComponent(access)}`, url.origin));
  response.cookies.set("fbmrp_discord_user", JSON.stringify({ id: user.id, username: user.username, avatar: user.avatar, roles: member.roles || [], access }), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
