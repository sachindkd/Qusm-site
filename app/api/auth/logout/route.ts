import { NextResponse } from "next/server";
import { DISCORD_SESSION_COOKIE } from "@/lib/discord-session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/authorize", request.url), 303);
  response.cookies.set(DISCORD_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
