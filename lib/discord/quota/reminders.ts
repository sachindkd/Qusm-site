import { neon } from "@neondatabase/serverless";
import { QUOTA_CHANNEL_ID, LOGISTICS_ROLE_ID } from "./config";
import { discordApi } from "./discord-api";

type PendingQuota = {
  request_id: string;
  user_id: string;
  username: string;
  minutes: number;
  message_id: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  reminder_sent_at: string | null;
};

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const REMINDER_AFTER_MS = 24 * 60 * 60 * 1000;
let lastPeriodicCheckAt = 0;
let startupCheckDone = false;

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

async function initReminderState() {
  const q = sql();
  await q`ALTER TABLE quota_requests ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ`;
  await q`CREATE INDEX IF NOT EXISTS quota_requests_pending_created_idx ON quota_requests(status, created_at)`;
  await q`CREATE INDEX IF NOT EXISTS quota_requests_reminder_idx ON quota_requests(status, reminder_sent_at)`;
}

function waitingHours(createdAt: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 3600000));
}

async function sendDailySummary(rows: PendingQuota[]) {
  if (!rows.length) return false;
  const now = Date.now();
  const lines = rows.slice(0, 40).map((r) =>
    `• <@${r.user_id}> — **${r.minutes} min** — waiting **${waitingHours(r.created_at, now)}h** — \`${r.request_id.slice(0, 8)}\``
  ).join("\n");
  const extra = rows.length > 40 ? `\n…and **${rows.length - 40}** more pending requests.` : "";
  await discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: `<@&${LOGISTICS_ROLE_ID}>`,
      embeds: [{
        title: "Daily Quota Review Summary",
        description: `There are **${rows.length} quota request(s)** pending for more than 24 hours. Please review them when required.`,
        color: 0xfee75c,
        fields: [{ name: "Pending Over 24 Hours", value: lines + extra }],
        footer: { text: "QUSM Quota System • Daily Reminder" },
        timestamp: new Date().toISOString(),
      }],
      allowed_mentions: { roles: [LOGISTICS_ROLE_ID], users: rows.slice(0, 40).map(r => r.user_id) },
    }),
  });
  return true;
}

export async function scanPendingQuotaReminders(reason: "startup" | "periodic") {
  await initReminderState();
  const q = sql();
  const now = Date.now();
  const rows = await q`
    SELECT request_id, user_id, username, minutes, message_id, created_at, updated_at, status, reminder_sent_at
    FROM quota_requests
    WHERE status = 'pending'
      AND message_id IS NOT NULL
      AND created_at <= NOW() - INTERVAL '24 hours'
      AND (reminder_sent_at IS NULL OR reminder_sent_at <= NOW() - INTERVAL '24 hours')
    ORDER BY created_at ASC
  ` as unknown as PendingQuota[];

  const eligible = rows.filter((row) => {
    const ageMs = now - new Date(row.created_at).getTime();
    return Number.isFinite(ageMs) && ageMs >= REMINDER_AFTER_MS;
  });
  if (!eligible.length) {
    console.info("[quota-reminder] no overdue quotas", { reason });
    return { checked: rows.length, sent: 0 };
  }

  const ids = eligible.map(r => r.request_id);
  const claimed = await q`
    UPDATE quota_requests
    SET reminder_sent_at = NOW(), updated_at = NOW()
    WHERE request_id = ANY(${ids})
      AND status = 'pending'
      AND message_id IS NOT NULL
      AND (reminder_sent_at IS NULL OR reminder_sent_at <= NOW() - INTERVAL '24 hours')
    RETURNING request_id
  `;
  if (!claimed.length) return { checked: rows.length, sent: 0 };

  const claimedIds = new Set(claimed.map((r: any) => String(r.request_id)));
  const claimedRows = eligible.filter(r => claimedIds.has(r.request_id));
  try {
    await sendDailySummary(claimedRows);
    console.info("[quota-reminder] daily summary sent", { reason, count: claimedRows.length });
    return { checked: rows.length, sent: claimedRows.length };
  } catch (error) {
    await q`
      UPDATE quota_requests
      SET reminder_sent_at = NULL, updated_at = NOW()
      WHERE request_id = ANY(${Array.from(claimedIds)})
        AND status = 'pending'
    `;
    throw error;
  }
}

export async function runQuotaReminderCheck(mode: "startup" | "periodic" = "periodic") {
  if (mode === "startup") {
    if (startupCheckDone) return { checked: 0, sent: 0, skipped: true };
    startupCheckDone = true;
    return scanPendingQuotaReminders("startup");
  }
  const now = Date.now();
  if (now - lastPeriodicCheckAt < CHECK_INTERVAL_MS) return { checked: 0, sent: 0, skipped: true };
  lastPeriodicCheckAt = now;
  return scanPendingQuotaReminders("periodic");
}
