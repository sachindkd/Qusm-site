import { neon } from "@neondatabase/serverless";

export type QuotaApprovalState = "pending" | "processing" | "approved" | "rejected";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

let initialized = false;
let initializing: Promise<void> | null = null;

async function initQuotaState() {
  if (initialized) return;
  if (initializing) return initializing;
  initializing = (async () => {
    const q = sql();
    await q`CREATE TABLE IF NOT EXISTS quota_requests (
      request_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      signature TEXT NOT NULL,
      message_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      approved_by TEXT,
      approved_by_username TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await q`CREATE INDEX IF NOT EXISTS quota_requests_status_idx ON quota_requests(status)`;
    initialized = true;
  })();
  try { await initializing; } finally { initializing = null; }
}

export async function createQuotaRequest(input: {
  requestId: string;
  userId: string;
  username: string;
  minutes: number;
  signature: string;
}) {
  await initQuotaState();
  const q = sql();
  await q`INSERT INTO quota_requests (request_id, user_id, username, minutes, signature, status)
    VALUES (${input.requestId}, ${input.userId}, ${input.username}, ${input.minutes}, ${input.signature}, 'pending')`;
}

export async function attachQuotaMessage(requestId: string, messageId: string) {
  await initQuotaState();
  const q = sql();
  const rows = await q`UPDATE quota_requests SET message_id = ${messageId}, updated_at = NOW()
    WHERE request_id = ${requestId} AND status = 'pending' RETURNING request_id`;
  if (!rows.length) throw new Error("Quota request is no longer pending while attaching its Discord message.");
}

export async function getQuotaRequestState(requestId: string) {
  await initQuotaState();
  const q = sql();
  const rows = await q`SELECT request_id, user_id, username, minutes, signature, message_id, status, approved_by, approved_by_username
    FROM quota_requests WHERE request_id = ${requestId}`;
  return rows[0] as {
    request_id: string;
    user_id: string;
    username: string;
    minutes: number;
    signature: string;
    message_id: string | null;
    status: QuotaApprovalState;
    approved_by: string | null;
    approved_by_username: string | null;
  } | undefined;
}

// Atomic compare-and-set: only one request handler can move a pending request to processing.
// A duplicate Discord delivery therefore cannot run the Sheets write twice.
export async function claimQuotaApproval(requestId: string, interactionId: string, approvedBy: string, approvedByUsername: string) {
  await initQuotaState();
  const q = sql();
  const rows = await q`UPDATE quota_requests
    SET status = 'processing', approved_by = ${approvedBy}, approved_by_username = ${approvedByUsername}, updated_at = NOW()
    WHERE request_id = ${requestId} AND status = 'pending'
    RETURNING request_id, message_id, user_id, username, minutes, signature`;
  if (!rows.length) return false;
  console.info("[quota] approval claim acquired", { requestId, interactionId, approvedBy });
  return true;
}

export async function markQuotaApproved(requestId: string) {
  await initQuotaState();
  const q = sql();
  await q`UPDATE quota_requests SET status = 'approved', updated_at = NOW()
    WHERE request_id = ${requestId} AND status = 'processing'`;
}

export async function markQuotaRejected(requestId: string) {
  await initQuotaState();
  const q = sql();
  await q`UPDATE quota_requests SET status = 'rejected', updated_at = NOW()
    WHERE request_id = ${requestId} AND status = 'pending'`;
}
