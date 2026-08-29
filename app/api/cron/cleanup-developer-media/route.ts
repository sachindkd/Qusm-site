import { NextResponse } from "next/server";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;
const MAX_PAGES_PER_RUN = 10;

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_DEVELOPER_MEDIA_CHANNEL_ID;

  if (!token || !channelId) {
    return NextResponse.json(
      { error: "Developer media cleanup is not configured" },
      { status: 503 },
    );
  }

  const cutoff = Date.now() - RETENTION_MS;
  const headers = { Authorization: `Bot ${token}` };
  let before: string | undefined;
  let scanned = 0;
  let deleted = 0;

  for (let page = 0; page < MAX_PAGES_PER_RUN; page += 1) {
    const url = new URL(`https://discord.com/api/v10/channels/${channelId}/messages`);
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (before) url.searchParams.set("before", before);

    const response = await fetch(url, { headers, cache: "no-store" });

    if (response.status === 429) {
      return NextResponse.json({ error: "Discord rate limit", scanned, deleted }, { status: 429 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: "Discord cleanup failed", scanned, deleted }, { status: 502 });
    }

    const messages = (await response.json()) as Array<{
      id: string;
      timestamp: string;
      attachments?: Array<{ id: string }>;
    }>;

    if (messages.length === 0) break;
    scanned += messages.length;

    for (const message of messages) {
      const createdAt = Date.parse(message.timestamp);
      if (!Number.isFinite(createdAt)) continue;

      // Only messages with actual uploaded media are eligible for cleanup.
      if (createdAt >= cutoff || !message.attachments?.length) continue;

      const remove = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages/${message.id}`,
        { method: "DELETE", headers },
      );

      if (remove.ok || remove.status === 404) {
        deleted += 1;
        continue;
      }

      if (remove.status === 429) {
        return NextResponse.json({ error: "Discord rate limit", scanned, deleted }, { status: 429 });
      }

      return NextResponse.json({ error: "Failed to delete developer media", scanned, deleted }, { status: 502 });
    }

    before = messages[messages.length - 1].id;

    // Discord returns newest-first; once the page is older than the cutoff,
    // there is no reason to scan further unless the page was full.
    const oldest = Date.parse(messages[messages.length - 1].timestamp);
    if (Number.isFinite(oldest) && oldest < cutoff && messages.length < PAGE_SIZE) break;
  }

  return NextResponse.json({ ok: true, scanned, deleted });
}
