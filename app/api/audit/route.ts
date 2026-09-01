import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authorization";
import { readAudit } from "@/lib/audit";
import { rateLimit, requestKey } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const limiter = rateLimit(requestKey(req, "audit-read"), 30, 60_000);
  if (!limiter.allowed) return NextResponse.json({ error: "Too many audit log requests. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } });
  if (!(await requirePermission("announcements:manage"))) return NextResponse.json({ error: "Audit Log is restricted to authorized leadership." }, { status: 403 });
  try {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 100), 1), 200);
    const entries = await readAudit(limit);
    return NextResponse.json({ entries, readOnly: true, limit }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Audit log unavailable" }, { status: 503 }); }
}
