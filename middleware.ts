import { NextRequest, NextResponse } from "next/server";
import { distributedRateLimit } from "@/lib/distributed-rate-limit";

const API_LIMIT = 120;
const AUTH_LIMIT = 20;

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  return forwarded || real || "unknown";
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
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfter),
            "Cache-Control": "no-store",
          },
        },
      );
    }
  } catch {
    // Preserve availability if the external database is temporarily unreachable.
    // Sensitive routes still enforce their own server-side authorization.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
