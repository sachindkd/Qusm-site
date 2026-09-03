import { neon } from "@neondatabase/serverless";

export const QUOTA_REVIEW_ROLE_ID = "1540499074061439006";
export const QUOTA_REVIEW_CHANNEL_ID = process.env.QUOTA_REVIEW_CHANNEL_ID || "";
export const QUOTA_GOOGLE_WEBHOOK_URL = process.env.QUOTA_GOOGLE_WEBHOOK_URL || "";
export const QUOTA_GOOGLE_WEBHOOK_SECRET = process.env.QUOTA_GOOGLE_WEBHOOK_SECRET || "";

export type QuotaSubmission = {
  id: string;
  userId: string;
  username: string;
  quota: number;
  unit: string;
  description: string;
  proofUrl: string;
  status: "pending" | "approved_syncing" | "synced" | "sync_failed" | "rejected";
  discordMessageId: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  createdAt: string;
};

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

async function initQuotaDb() {
  const q = sql();
  await q`CREATE TABLE IF NOT EXISTS quota_submissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    quota NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    description TEXT NOT NULL,
    proof_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    discord_message_id TEXT,
    reviewer_id TEXT,
    reviewer_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export async function createQuotaSubmission(input: Omit<QuotaSubmission, "status" | "discordMessageId" | "reviewerId" | "reviewerName" | "createdAt">) {
  await initQuotaDb();
  const q = sql();
  await q`INSERT INTO quota_submissions (id,user_id,username,quota,unit,description,proof_url)
    VALUES (${input.id},${input.userId},${input.username},${input.quota},${input.unit},${input.description},${input.proofUrl})`;
  return input.id;
}

export async function setQuotaMessageId(id: string, messageId: string) {
  await initQuotaDb();
  const q = sql();
  await q`UPDATE quota_submissions SET discord_message_id=${messageId} WHERE id=${id}`;
}

export async function getQuotaSubmission(id: string): Promise<QuotaSubmission | null> {
  await initQuotaDb();
  const q = sql();
  const rows = await q`SELECT id,user_id,username,quota,unit,description,proof_url,status,discord_message_id,reviewer_id,reviewer_name,created_at FROM quota_submissions WHERE id=${id}`;
  const row = rows[0] as any;
  if (!row) return null;
  return { id: row.id, userId: row.user_id, username: row.username, quota: Number(row.quota), unit: row.unit, description: row.description, proofUrl: row.proof_url, status: row.status, discordMessageId: row.discord_message_id, reviewerId: row.reviewer_id, reviewerName: row.reviewer_name, createdAt: new Date(row.created_at).toISOString() };
}

export async function claimQuotaApproval(id: string, reviewerId: string, reviewerName: string) {
  await initQuotaDb();
  const q = sql();
  const rows = await q`UPDATE quota_submissions SET status='approved_syncing', reviewer_id=${reviewerId}, reviewer_name=${reviewerName} WHERE id=${id} AND status='pending' RETURNING id`;
  return rows.length > 0;
}

export async function finishQuotaApproval(id: string, success: boolean) {
  await initQuotaDb();
  const q = sql();
  await q`UPDATE quota_submissions SET status=${success ? "synced" : "sync_failed"} WHERE id=${id}`;
}

export async function rejectQuotaSubmission(id: string, reviewerId: string, reviewerName: string) {
  await initQuotaDb();
  const q = sql();
  const rows = await q`UPDATE quota_submissions SET status='rejected', reviewer_id=${reviewerId}, reviewer_name=${reviewerName} WHERE id=${id} AND status='pending' RETURNING id`;
  return rows.length > 0;
}

export async function writeApprovedQuotaToGoogle(submission: QuotaSubmission) {
  if (!QUOTA_GOOGLE_WEBHOOK_URL) throw new Error("QUOTA_GOOGLE_WEBHOOK_URL is not configured");
  const payload = {
    event: "quota.approved",
    test: false,
    submissionId: submission.id,
    submittedAt: submission.createdAt,
    approvedAt: new Date().toISOString(),
    staff: { id: submission.userId, username: submission.username },
    quota: { amount: submission.quota, unit: submission.unit, description: submission.description },
    proofUrl: submission.proofUrl,
    reviewer: { id: submission.reviewerId, name: submission.reviewerName },
  };
  const response = await fetch(QUOTA_GOOGLE_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, secret: QUOTA_GOOGLE_WEBHOOK_SECRET }),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Google quota sync failed (${response.status}): ${text.slice(0, 300)}`);
  return text;
}

export function makeQuotaDiscordMessage(submission: QuotaSubmission) {
  return `**STAFF QUOTA SUBMISSION**\n**Member:** <@${submission.userId}> (${submission.username})\n**Quota:** ${submission.quota} ${submission.unit}\n**Details:** ${submission.description}\n**Proof:** ${submission.proofUrl}\n**Submission ID:** \`${submission.id}\`\n\nReview the proof above, then use the buttons below. Approved submissions are automatically sent to the external Google quota database.`;
}

export async function sendQuotaDiscordMessage(submission: QuotaSubmission) {
  if (!process.env.DISCORD_BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN is not configured");
  if (!QUOTA_REVIEW_CHANNEL_ID) throw new Error("QUOTA_REVIEW_CHANNEL_ID is not configured");
  const response = await fetch(`https://discord.com/api/v10/channels/${QUOTA_REVIEW_CHANNEL_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      content: makeQuotaDiscordMessage(submission),
      allowed_mentions: { parse: ["users"] },
      components: [{ type: 1, components: [
        { type: 2, style: 3, label: "Approve", custom_id: `quota:approve:${submission.id}` },
        { type: 2, style: 4, label: "Reject", custom_id: `quota:reject:${submission.id}` },
      ] }],
    }),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Discord quota message failed (${response.status}): ${text.slice(0, 300)}`);
  return JSON.parse(text) as { id: string };
}

export async function editQuotaDiscordMessage(messageId: string, content: string, disabled = true) {
  if (!QUOTA_REVIEW_CHANNEL_ID || !process.env.DISCORD_BOT_TOKEN) return;
  await fetch(`https://discord.com/api/v10/channels/${QUOTA_REVIEW_CHANNEL_ID}/messages/${messageId}`, {
    method: "PATCH",
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content, components: [{ type: 1, components: [
      { type: 2, style: 3, label: "Approve", custom_id: "quota:disabled:approve", disabled },
      { type: 2, style: 4, label: "Reject", custom_id: "quota:disabled:reject", disabled },
    ] }] }),
    cache: "no-store",
  });
}
