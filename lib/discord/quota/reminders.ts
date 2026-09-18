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

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
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

function ageText(createdAt: string, now = Date.now()) {
  const ageMs = Math.max(0, now - new Date(createdAt).getTime());
  const totalMinutes = Math.floor(ageMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days ? `${days}d ` : ""}${hours}h ${minutes}m`;
}

async function sendReminder(request: PendingQuota) {
  if (!request.message_id) {
    console.warn("[quota-reminder] pending request has no Discord message", { requestId: request.request_id });
    return false;
  }

  const age = ageText(request.created_at);
  await discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: `<@&${LOGISTICS_ROLE_ID}>`,
      embeds: [{
        title: "⏰ Quota Review Reminder",
        description: `This quota submission has been **pending for more than 24 hours** and still requires Logistics review.`,
        color: 0xfee75c,
        fields: [
          { name: "Staff Member", value: `<@${request.user_id}> (${request.username})`, inline: true },
          { name: "Quota", value: `${request.minutes} min`, inline: true },
          { name: "Pending Since", value: `<t:${Math.floor(new Date(request.created_at).getTime() / 1000)}:F>`, inline: true },
          { name: "Waiting", value: age, inline: true },
          { name: "Request ID", value: request.request_id },
          { name: "Review Message", value: `https://discord.com/channels/${process.env.DISCORD_GUILD_ID || "@me"}/${QUOTA_CHANNEL_ID}/${request.message_id}` },
        ],
        footer: { text: "QUSM Quota System • 24-hour review reminder" },
        timestamp: new Date().toISOString(),
      }],
      allowed_mentions: { roles: [LOGISTICS_ROLE_ID], users: [request.user_id] },
    }),
  });
  return true;
}

// Vercel redeploy trigger: keep this file intentionally unchanged in behavior.
export async function scanPendingQuotaReminders(reason: "startup" | "periodic") {
  await initReminderState();
  const q = sql();
  const now = Date.now();
  const rows = await q`
    SELECT request_id, user_id, username, minutes, message_id, created_at, updated_at, status, reminder_sent_at
    FROM quota_requests
    WHERE status = 'pending'
      AND created_at <= NOW() - INTERVAL '24 hours'
      AND reminder_sent_at IS NULL
    ORDER BY created_at ASC
  ` as unknown as PendingQuota[];

  let sent = 0;
  for (const row of rows) {
    try {
      const current = await q`
        SELECT status, reminder_sent_at, message_id
        FROM quota_requests
        WHERE request_id = ${row.request_id}
      `;
      const latest = current[0] as { status: string; reminder_sent_at: string | null; message_id: string | null } | undefined;
      if (!latest || latest.status !== "pending" || latest.reminder_sent_at || !latest.message_id) continue;

      const ageMs = now - new Date(row.created_at).getTime();
      if (!Number.isFinite(ageMs) || ageMs < REMINDER_AFTER_MS) continue;

      const claimed = await q`
        UPDATE quota_requests
        SET reminder_sent_at = NOW(), updated_at = NOW()
        WHERE request_id = ${row.request_id}
          AND status = 'pending'
          AND reminder_sent_at IS NULL
          AND message_id IS NOT NULL
        RETURNING request_id
      `;
      if (!claimed.length) continue;

      try {
        await sendReminder(row);
        sent += 1;
      } catch (error) {
        await q`
          UPDATE quota_requests
          SET reminder_sent_at = NULL, updated_at = NOW()
          WHERE request_id = ${row.request_id}
            AND status = 'pending'
        `;
        throw error;
      }
    } catch (error) {
      console.error("[quota-reminder] failed", { reason, requestId: row.request_id, error });
    }
  }

  console.info("[quota-reminder] scan complete", { reason, pendingOver24h: rows.length, remindersSent: sent });
  return { checked: rows.length, sent };
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
