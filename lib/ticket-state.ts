import { neon } from "@neondatabase/serverless";

export type TicketApprovalState = "pending" | "processing" | "approved" | "rejected";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

let initialized = false;
let initializing: Promise<void> | null = null;

async function initTicketState() {
  if (initialized) return;
  if (initializing) return initializing;
  initializing = (async () => {
    const q = sql();
    await q`CREATE TABLE IF NOT EXISTS ticket_requests (
      request_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      tickets INTEGER NOT NULL,
      signature TEXT NOT NULL,
      message_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      approved_by TEXT,
      approved_by_username TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await q`CREATE INDEX IF NOT EXISTS ticket_requests_status_idx ON ticket_requests(status)`;
    initialized = true;
  })();
  try { await initializing; } finally { initializing = null; }
}

export async function createTicketRequest(input: { requestId: string; userId: string; username: string; tickets: number; signature: string }) {
  await initTicketState();
  const q = sql();
  await q`INSERT INTO ticket_requests (request_id, user_id, username, tickets, signature, status)
    VALUES (${input.requestId}, ${input.userId}, ${input.username}, ${input.tickets}, ${input.signature}, 'pending')`;
}

export async function attachTicketMessage(requestId: string, messageId: string) {
  await initTicketState();
  const q = sql();
  const rows = await q`UPDATE ticket_requests SET message_id = ${messageId}, updated_at = NOW()
    WHERE request_id = ${requestId} AND status = 'pending' RETURNING request_id`;
  if (!rows.length) throw new Error("Ticket request is no longer pending while attaching its Discord message.");
}

export async function getTicketRequestState(requestId: string): Promise<TicketApprovalState | undefined> {
  await initTicketState();
  const q = sql();
  const rows = await q`SELECT status, updated_at FROM ticket_requests WHERE request_id = ${requestId}`;
  const row = rows[0];
  if (!row) return undefined;
  const status = row.status as TicketApprovalState;
  if (status === "processing") {
    const updatedAt = new Date(String(row.updated_at)).getTime();
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt >= 10 * 60 * 1000) {
      const recovered = await q`UPDATE ticket_requests SET status = 'pending', updated_at = NOW()
        WHERE request_id = ${requestId} AND status = 'processing'
        AND updated_at <= NOW() - INTERVAL '10 minutes' RETURNING request_id`;
      if (recovered.length) {
        console.warn("[ticket] recovered stale processing request", { requestId });
        return "pending";
      }
    }
  }
  return status;
}

export async function claimTicketApproval(requestId: string, interactionId = "unknown", approvedBy = "unknown", approvedByUsername = "unknown") {
  await initTicketState();
  const q = sql();
  const rows = await q`UPDATE ticket_requests
    SET status = 'processing', approved_by = ${approvedBy}, approved_by_username = ${approvedByUsername}, updated_at = NOW()
    WHERE request_id = ${requestId} AND status = 'pending'
    RETURNING request_id`;
  if (!rows.length) return false;
  console.info("[ticket] approval claim acquired", { requestId, interactionId, approvedBy });
  return true;
}

export async function releaseTicketApproval(requestId: string) {
  await initTicketState();
  const q = sql();
  await q`UPDATE ticket_requests SET status = 'pending', updated_at = NOW()
    WHERE request_id = ${requestId} AND status = 'processing'`;
}

export async function markTicketApproved(requestId: string) {
  await initTicketState();
  const q = sql();
  await q`UPDATE ticket_requests SET status = 'approved', updated_at = NOW()
    WHERE request_id = ${requestId} AND status = 'processing'`;
}

export async function markTicketRejected(requestId: string) {
  await initTicketState();
  const q = sql();
  const rows = await q`UPDATE ticket_requests SET status = 'rejected', updated_at = NOW()
    WHERE request_id = ${requestId} AND status = 'pending' RETURNING request_id`;
  return Boolean(rows.length);
}
