import { NextResponse } from "next/server";

const CHANNEL_ID = "1506466679100801196";
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = req.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Discord bot is not configured" }, { status: 503 });
  }

  const cutoff = Date.now() - RETENTION_MS;
  const headers = { Authorization: `Bot ${token}` };
  let before: string | undefined;
  let deleted = 0;
  let scanned = 0;

  for (let page = 0; page < 10; page += 1) {
    const url = new URL(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`);
    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);

    const response = await fetch(url, { headers, cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "Discord cleanup failed", deleted, scanned }, { status: 502 });
    }

    const messages = (await response.json()) as Array<{ id: string; timestamp: string }>;
    if (!messages.length) break;

    scanned += messages.length;
    let reachedCutoff = false;

    for (const message of messages) {
      if (Date.parse(message.timestamp) >= cutoff) continue;
      reachedCutoff = true;

      const remove = await fetch(
        `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages/${message.id}`,
        { method: "DELETE", headers },
      );

      if (remove.ok || remove.status === 404) deleted += 1;
      if (remove.status === 429) {
        return NextResponse.json({ error: "Discord rate limit", deleted, scanned }, { status: 429 });
      }
    }

    before = messages[messages.length - 1].id;
    if (reachedCutoff && messages.length < 100) break;
  }

  return NextResponse.json({ ok: true, deleted, scanned });
}
