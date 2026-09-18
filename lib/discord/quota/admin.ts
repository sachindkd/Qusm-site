import { neon } from "@neondatabase/serverless";

type QuotaRow = {
  request_id: string;
  user_id: string;
  username: string;
  minutes: number;
  status: string;
  program: string | null;
  created_at: string;
  updated_at: string;
  approved_by_username: string | null;
  rejected_by_username: string | null;
};

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

async function init() {
  const q = sql();
  await q`CREATE INDEX IF NOT EXISTS quota_requests_user_created_idx ON quota_requests(user_id, created_at DESC)`;
}

function rowsForUser(rows: any[]): QuotaRow[] {
  return rows.map((r: any) => ({
    request_id: String(r.request_id),
    user_id: String(r.user_id),
    username: String(r.username),
    minutes: Number(r.minutes),
    status: String(r.status),
    program: r.program ? String(r.program) : null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
    approved_by_username: r.approved_by_username ? String(r.approved_by_username) : null,
    rejected_by_username: r.rejected_by_username ? String(r.rejected_by_username) : null,
  }));
}

export async function getQuotaStatus(userId: string) {
  await init();
  const q = sql();
  const rows = await q`
    SELECT request_id, user_id, username, minutes, status, program, created_at, updated_at,
           approved_by_username, rejected_by_username
    FROM quota_requests
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 25
  `;
  const data = rowsForUser(rows);
  return {
    userId,
    username: data[0]?.username || null,
    total: data.length,
    pending: data.filter(r => r.status === "pending").length,
    approved: data.filter(r => r.status === "approved").length,
    rejected: data.filter(r => r.status === "rejected").length,
    requests: data,
  };
}

export async function findPossibleQuotaDuplicates(userId: string, minutes: number, program?: string) {
  await init();
  const q = sql();
  const rows = await q`
    SELECT request_id, username, minutes, status, program, created_at
    FROM quota_requests
    WHERE user_id = ${userId}
      AND minutes = ${minutes}
      AND COALESCE(program, '') = COALESCE(${program || null}, '')
      AND created_at >= NOW() - INTERVAL '48 hours'
      AND status IN ('pending', 'approved', 'processing')
    ORDER BY created_at DESC
    LIMIT 5
  `;
  return rows.map((r: any) => ({
    requestId: String(r.request_id),
    username: String(r.username),
    minutes: Number(r.minutes),
    status: String(r.status),
    program: r.program ? String(r.program) : null,
    createdAt: String(r.created_at),
  }));
}

export async function getPendingQuotaSummary() {
  await init();
  const q = sql();
  const rows = await q`
    SELECT request_id, user_id, username, minutes, status, program, created_at, updated_at
    FROM quota_requests
    WHERE status = 'pending'
    ORDER BY created_at ASC
  `;
  return rowsForUser(rows);
}
