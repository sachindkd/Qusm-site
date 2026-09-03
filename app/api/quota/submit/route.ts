import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "../../../../lib/discord-session";
import { createQuotaSubmission, sendQuotaDiscordMessage, setQuotaMessageId } from "../../../../lib/quota";

export async function POST(request: Request) {
  try {
    const session = readDiscordSession((await cookies()).get(DISCORD_SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Discord authorization required." }, { status: 401 });

    const body = await request.json() as { quota?: unknown; unit?: unknown; description?: unknown; proofUrl?: unknown };
    const quota = Number(body.quota);
    const unit = String(body.unit ?? "").trim();
    const description = String(body.description ?? "").trim();
    const proofUrl = String(body.proofUrl ?? "").trim();

    if (!Number.isFinite(quota) || quota <= 0 || quota > 100000) return NextResponse.json({ error: "Enter a valid quota amount." }, { status: 400 });
    if (!unit || unit.length > 40) return NextResponse.json({ error: "Enter a short quota unit." }, { status: 400 });
    if (!description || description.length > 1000) return NextResponse.json({ error: "Enter details (maximum 1000 characters)." }, { status: 400 });
    try { const url = new URL(proofUrl); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); } catch { return NextResponse.json({ error: "Proof must be a valid http(s) link." }, { status: 400 }); }

    const id = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
    await createQuotaSubmission({ id, userId: session.id, username: session.username, quota, unit, description, proofUrl });
    try {
      const message = await sendQuotaDiscordMessage({ id, userId: session.id, username: session.username, quota, unit, description, proofUrl, status: "pending", discordMessageId: null, reviewerId: null, reviewerName: null, createdAt: new Date().toISOString() });
      await setQuotaMessageId(id, message.id);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send the submission to Discord." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("quota submit", error);
    return NextResponse.json({ error: "Could not submit quota." }, { status: 500 });
  }
}
