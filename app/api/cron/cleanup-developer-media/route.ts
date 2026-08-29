import { NextResponse } from "next/server";
import { readContent, writeContent } from "@/lib/content-store";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const content = await readContent();
  const media = Array.isArray(content.media) ? content.media : [];
  const cutoff = Date.now() - RETENTION_MS;

  const kept = media.filter((item: any) => {
    const createdAt = Date.parse(String(item.createdAt || ""));
    if (!Number.isFinite(createdAt)) return true;
    return createdAt >= cutoff;
  });

  const deleted = media.length - kept.length;

  if (deleted > 0) {
    await writeContent({ ...content, media: kept });
  }

  return NextResponse.json({
    ok: true,
    scanned: media.length,
    deleted,
    retentionDays: 30,
  });
}
