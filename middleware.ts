import { NextRequest, NextResponse } from "next/server";

// Lightweight per-instance protection for serverless deployments. Vercel's edge/WAF
// should remain the primary distributed rate limiter for high-volume attacks.
const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const API_LIMIT = 120;
const AUTH_LIMIT = 20;

function getClientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

function isAllowed(key: string, limit: number) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const isAuthRoute = pathname.startsWith("/api/auth/");
  const key = `${isAuthRoute ? "auth" : "api"}:${getClientKey(request)}`;
  const limit = isAuthRoute ? AUTH_LIMIT : API_LIMIT;

  if (!isAllowed(key, limit)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
