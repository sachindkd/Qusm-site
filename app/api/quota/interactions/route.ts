import { NextResponse } from "next/server";
import { claimQuotaApproval, editQuotaDiscordMessage, finishQuotaApproval, getQuotaSubmission, rejectQuotaSubmission, writeApprovedQuotaToGoogle, QUOTA_REVIEW_ROLE_ID } from "../../../../lib/quota";

function hexToBytes(value: string) {
  if (!/^[0-9a-f]{128}$/i.test(value)) return null;
  return new Uint8Array(value.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
}

async function verifyDiscordSignature(body: string, signature: string | null, timestamp: string | null) {
  const publicKey = process.env.DISCORD_APPLICATION_PUBLIC_KEY;
  if (!publicKey || !signature || !timestamp) return false;
  const keyBytes = hexToBytes(publicKey);
  const sigBytes = hexToBytes(signature);
  if (!keyBytes || !sigBytes) return false;
  try {
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, key, sigBytes, new TextEncoder().encode(timestamp + body));
  } catch { return false; }
}

export async function POST(request: Request) {
  const body = await request.text();
  if (!await verifyDiscordSignature(body, request.headers.get("x-signature-ed25519"), request.headers.get("x-signature-timestamp"))) {
    return new NextResponse("invalid request signature", { status: 401 });
  }

  try {
    const interaction = JSON.parse(body) as {
      type?: number;
      data?: { custom_id?: string };
      member?: { roles?: string[]; nick?: string | null; user?: { id?: string; username?: string } };
    };
    if (interaction.type !== 3) return NextResponse.json({ type: 1 });

    const customId = interaction.data?.custom_id ?? "";
    const match = /^quota:(approve|reject):([A-Z0-9]+)$/.exec(customId);
    if (!match) return NextResponse.json({ type: 4, data: { content: "Unknown quota action.", flags: 64 } });

    const reviewerId = interaction.member?.user?.id ?? "";
    const reviewerName = interaction.member?.nick || interaction.member?.user?.username || reviewerId;
    if (!(interaction.member?.roles ?? []).includes(QUOTA_REVIEW_ROLE_ID)) {
      return NextResponse.json({ type: 4, data: { content: "You do not have the Logistics reviewer role.", flags: 64 } });
    }

    const [, action, id] = match;
    const submission = await getQuotaSubmission(id);
    if (!submission) return NextResponse.json({ type: 4, data: { content: "Quota submission not found.", flags: 64 } });

    if (action === "reject") {
      const changed = await rejectQuotaSubmission(id, reviewerId, reviewerName);
      if (!changed) return NextResponse.json({ type: 4, data: { content: `This submission is already ${submission.status}.`, flags: 64 } });
      if (submission.discordMessageId) await editQuotaDiscordMessage(submission.discordMessageId, `${(await import("../../../../lib/quota")).makeQuotaDiscordMessage(submission)}\n\n❌ **REJECTED** by ${reviewerName}.`, true);
      return NextResponse.json({ type: 4, data: { content: `Quota ${id} rejected.`, flags: 64 } });
    }

    const changed = await claimQuotaApproval(id, reviewerId, reviewerName);
    if (!changed) return NextResponse.json({ type: 4, data: { content: `This submission is already ${submission.status}.`, flags: 64 } });
    const approved = { ...submission, status: "approved_syncing" as const, reviewerId, reviewerName };
    try {
      await writeApprovedQuotaToGoogle(approved);
      await finishQuotaApproval(id, true);
      if (submission.discordMessageId) await editQuotaDiscordMessage(submission.discordMessageId, `${(await import("../../../../lib/quota")).makeQuotaDiscordMessage(approved)}\n\n✅ **APPROVED & SYNCED TO GOOGLE DATABASE** by ${reviewerName}.`, true);
      return NextResponse.json({ type: 4, data: { content: `Quota ${id} approved and synced to the external Google database.`, flags: 64 } });
    } catch (error) {
      await finishQuotaApproval(id, false);
      if (submission.discordMessageId) await editQuotaDiscordMessage(submission.discordMessageId, `${(await import("../../../../lib/quota")).makeQuotaDiscordMessage(approved)}\n\n⚠️ **APPROVAL NOT SYNCED** — Google database sync failed. The submission remains pending for another approval attempt.`, false);
      console.error("quota google sync", error);
      return NextResponse.json({ type: 4, data: { content: `Approval could not be synced to Google. The submission remains pending.`, flags: 64 } });
    }
  } catch (error) {
    console.error("quota interaction", error);
    return NextResponse.json({ type: 4, data: { content: "Quota action failed. Check the server logs.", flags: 64 } });
  }
}
