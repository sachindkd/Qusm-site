import { neon } from "@neondatabase/serverless";
import { getStaffDatabaseSnapshot } from "@/lib/quota-sheets";

type RequestRow = {
  request_id: string;
  user_id: string;
  username: string;
  amount: number;
  status: string;
  program: string | null;
  reviewer_id: string | null;
  reviewer_username: string | null;
  created_at: string;
};

type StaffMetric = {
  userId: string;
  username: string;
  sheetRank: string;
  sheetMinutes: number;
  sheetTickets: number;
  quotaSubmitted: number;
  quotaApproved: number;
  quotaRejected: number;
  quotaPending: number;
  quotaMinutesSubmitted: number;
  quotaMinutesApproved: number;
  quotaInternshipApproved: number;
  quotaNormalApproved: number;
  ticketsSubmitted: number;
  ticketsApproved: number;
  ticketsRejected: number;
  ticketsPending: number;
  ticketsCompleted: number;
  activeDays: number;
  activityDays: string[];
  firstActivity: string | null;
  lastActivity: string | null;
};

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

function key(value: unknown) { return String(value ?? "").trim().toLowerCase(); }
function day(value: string) { return new Date(value).toISOString().slice(0, 10); }

export function highcomRoleIds() {
  return String(process.env.STAFF_HIGHCOM_ROLE_IDS || process.env.STAFF_HIGHCOM_ROLE_ID || "")
    .split(",").map(v => v.trim()).filter(Boolean);
}

export function isStaffHighcom(interaction: any) {
  const ids = highcomRoleIds();
  const roles = Array.isArray(interaction?.member?.roles) ? interaction.member.roles.map(String) : [];
  return ids.length > 0 && ids.some(id => roles.includes(id));
}

async function getRequestRows(): Promise<{ quota: RequestRow[]; tickets: RequestRow[] }> {
  const q = sql();
  const [quota, tickets] = await Promise.all([
    q`SELECT request_id, user_id, username, minutes AS amount, status, program,
        CASE WHEN status = 'approved' THEN approved_by ELSE rejected_by END AS reviewer_id,
        CASE WHEN status = 'approved' THEN approved_by_username ELSE rejected_by_username END AS reviewer_username,
        created_at::text
       FROM quota_requests ORDER BY created_at ASC`,
    q`SELECT request_id, user_id, username, tickets AS amount, status, program,
        CASE WHEN status = 'approved' THEN approved_by ELSE rejected_by END AS reviewer_id,
        CASE WHEN status = 'approved' THEN approved_by_username ELSE rejected_by_username END AS reviewer_username,
        created_at::text
       FROM ticket_requests ORDER BY created_at ASC`,
  ]);
  return { quota: quota as unknown as RequestRow[], tickets: tickets as unknown as RequestRow[] };
}

export async function collectPerformanceData() {
  const [{ quota, tickets }, sheetRows] = await Promise.all([getRequestRows(), getStaffDatabaseSnapshot()]);
  const byUser = new Map<string, StaffMetric>();

  const ensure = (username: string, userId = "") => {
    const k = key(username || userId);
    if (!k) return null;
    let m = byUser.get(k);
    if (!m) {
      m = {
        userId, username: username || userId, sheetRank: "", sheetMinutes: 0, sheetTickets: 0,
        quotaSubmitted: 0, quotaApproved: 0, quotaRejected: 0, quotaPending: 0,
        quotaMinutesSubmitted: 0, quotaMinutesApproved: 0, quotaInternshipApproved: 0, quotaNormalApproved: 0,
        ticketsSubmitted: 0, ticketsApproved: 0, ticketsRejected: 0, ticketsPending: 0, ticketsCompleted: 0,
        activeDays: 0, activityDays: [], firstActivity: null, lastActivity: null,
      };
      byUser.set(k, m);
    }
    if (userId && !m.userId) m.userId = userId;
    if (username && (!m.username || m.username === m.userId)) m.username = username;
    return m;
  };

  for (const row of sheetRows) {
    const m = ensure(row.username);
    if (m) { m.sheetRank = row.rank; m.sheetMinutes = row.minutes; m.sheetTickets = row.tickets; }
  }

  const activity = new Map<string, Set<string>>();
  for (const row of quota) {
    const m = ensure(row.username, row.user_id);
    if (!m) continue;
    m.quotaSubmitted++;
    m.quotaMinutesSubmitted += Math.max(0, Number(row.amount) || 0);
    if (row.status === "approved") {
      m.quotaApproved++;
      m.quotaMinutesApproved += Math.max(0, Number(row.amount) || 0);
      if (row.program === "internship") m.quotaInternshipApproved += Number(row.amount) || 0;
      else m.quotaNormalApproved += Number(row.amount) || 0;
    } else if (row.status === "rejected") m.quotaRejected++;
    else if (row.status === "pending" || row.status === "processing") m.quotaPending++;
    const d = day(row.created_at);
    const set = activity.get(key(row.username)) || new Set<string>(); set.add(d); activity.set(key(row.username), set);
    if (!m.firstActivity || row.created_at < m.firstActivity) m.firstActivity = row.created_at;
    if (!m.lastActivity || row.created_at > m.lastActivity) m.lastActivity = row.created_at;
  }
  for (const row of tickets) {
    const m = ensure(row.username, row.user_id);
    if (!m) continue;
    m.ticketsSubmitted++;
    if (row.status === "approved") { m.ticketsApproved++; m.ticketsCompleted += Math.max(0, Number(row.amount) || 0); }
    else if (row.status === "rejected") m.ticketsRejected++;
    else if (row.status === "pending" || row.status === "processing") m.ticketsPending++;
    const d = day(row.created_at);
    const set = activity.get(key(row.username)) || new Set<string>(); set.add(d); activity.set(key(row.username), set);
    if (!m.firstActivity || row.created_at < m.firstActivity) m.firstActivity = row.created_at;
    if (!m.lastActivity || row.created_at > m.lastActivity) m.lastActivity = row.created_at;
  }

  for (const m of byUser.values()) {
    m.activityDays = [...(activity.get(key(m.username)) || [])].sort();
    m.activeDays = m.activityDays.length;
  }

  const logistics = new Map<string, any>();
  const addReviewer = (row: RequestRow, type: "quota" | "ticket") => {
    if (!row.reviewer_id) return;
    const k = row.reviewer_id;
    const r = logistics.get(k) || {
      userId: row.reviewer_id, username: row.reviewer_username || row.reviewer_id,
      quotaApprovals: 0, quotaRejections: 0, quotaMinutesApproved: 0,
      internshipQuotaApprovals: 0, normalQuotaApprovals: 0,
      ticketApprovals: 0, ticketRejections: 0, ticketsApproved: 0, reviewed: 0,
      reviewDays: [] as string[],
    };
    const d = day(row.created_at);
    if (!r.reviewDays.includes(d)) r.reviewDays.push(d);
    r.reviewed++;
    if (type === "quota") {
      if (row.status === "approved") { r.quotaApprovals++; r.quotaMinutesApproved += Number(row.amount) || 0; if (row.program === "internship") r.internshipQuotaApprovals++; else r.normalQuotaApprovals++; }
      if (row.status === "rejected") r.quotaRejections++;
    } else {
      if (row.status === "approved") { r.ticketApprovals++; r.ticketsApproved += Number(row.amount) || 0; }
      if (row.status === "rejected") r.ticketRejections++;
    }
    logistics.set(k, r);
  };
  quota.forEach(r => addReviewer(r, "quota")); tickets.forEach(r => addReviewer(r, "ticket"));
  const logisticMetrics = [...logistics.values()].map(r => ({ ...r, reviewDays: r.reviewDays.sort() }));

  return {
    generatedAt: new Date().toISOString(),
    sourceCoverage: {
      staffDatabaseRows: sheetRows.length,
      quotaRequests: quota.length,
      ticketRequests: tickets.length,
      historicalProgramField: "Program is recorded for new submissions; older records may be unknown."
    },
    staff: [...byUser.values()].map(m => ({
      ...m,
      approvalRate: m.quotaSubmitted ? Number((m.quotaApproved / m.quotaSubmitted * 100).toFixed(1)) : null,
      ticketApprovalRate: m.ticketsSubmitted ? Number((m.ticketsApproved / m.ticketsSubmitted * 100).toFixed(1)) : null,
      concentrationWarning: m.activeDays > 0 && m.activityDays.length > 0
        ? (() => {
            const recent = m.activityDays.slice(-3);
            return recent.length === 1 ? "Activity is concentrated on one recorded day." : null;
          })()
        : null,
    })),
    logistics: logisticMetrics,
  };
}

function fallbackStaffReport(data: any) {
  const rows = [...data.staff].sort((a,b) => (b.quotaMinutesApproved + b.ticketsCompleted) - (a.quotaMinutesApproved + a.ticketsCompleted));
  const lines = rows.slice(0, 40).map((m:any) =>
    `• **${m.username}** — ${m.sheetRank || "Rank unknown"} | ${m.quotaMinutesApproved} approved min | ${m.ticketsCompleted} tickets | ${m.activeDays} active days | quota approval ${m.approvalRate ?? 0}%`
  );
  return [
    "**Staff Performance Report — data analysis mode**",
    `Generated: ${new Date(data.generatedAt).toISOString()}`,
    "",
    "**Individual records**",
    ...lines,
    "",
    "**Consistency check**",
    "Activity-day history is based on recorded quota/ticket submissions. The report does not treat a single late burst as proof of misconduct; it flags concentration patterns for Highcom review.",
    "",
    `**Coverage:** ${data.sourceCoverage.staffDatabaseRows} staff database rows, ${data.sourceCoverage.quotaRequests} quota requests, ${data.sourceCoverage.ticketRequests} ticket requests.`,
    "AI analysis is ready to be enabled once the AI API configuration is provided.",
  ].join("\n");
}

function fallbackLogisticsReport(data: any) {
  const lines = data.logistics.map((m:any) =>
    `• **${m.username}** — reviewed ${m.reviewed} | quota: ${m.quotaApprovals} approved / ${m.quotaRejections} rejected | tickets: ${m.ticketApprovals} approved / ${m.ticketRejections} rejected | ${m.reviewDays.length} review days`
  );
  return [
    "**Logistics Performance Report — data analysis mode**",
    "",
    "**Reviewer activity**",
    ...(lines.length ? lines : ["• No reviewer activity has been recorded yet."]),
    "",
    "**Tracked categories:** normal quota, internship quota, ticket approvals/rejections, review volume and review-day coverage.",
    "AI analysis is ready to be enabled once the AI API configuration is provided.",
  ].join("\n");
}

export async function buildPerformanceReport(kind: "staff" | "logistics") {
  const data = await collectPerformanceData();
  const apiUrl = process.env.PERFORMANCE_AI_API_URL?.trim();
  const apiKey = process.env.PERFORMANCE_AI_API_KEY?.trim();
  const model = process.env.PERFORMANCE_AI_MODEL?.trim() || "default";
  if (!apiUrl || !apiKey) return { text: kind === "staff" ? fallbackStaffReport(data) : fallbackLogisticsReport(data), ai: false, data };

  const prompt = kind === "staff"
    ? "Analyze the supplied QUSM staff performance dataset. Produce a detailed factual report for Staff Highcom. Cover every staff member, quota submissions/approvals/rejections/pending, normal vs internship quota, tickets, current sheet totals, activity-day consistency, concentration of activity near promotion periods when the dates support that conclusion, and missing/uncertain data. Flag patterns for human review rather than declaring misconduct. Do not invent facts, scores, rankings, or motives."
    : "Analyze the supplied QUSM logistics performance dataset. Produce a detailed factual report for Staff Highcom. Cover every Logistics reviewer, normal vs internship quota approvals, quota rejections, ticket approvals/rejections, review volume, review-day consistency, and gaps in the records. Flag patterns for human review rather than inventing motives or misconduct. Do not invent facts or scores.";
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: prompt }, { role: "user", content: JSON.stringify(data) }], temperature: 0.1 }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Performance AI API failed (${response.status})`);
  const body = await response.json();
  const text = String(body?.choices?.[0]?.message?.content || body?.output_text || body?.text || "").trim();
  if (!text) throw new Error("Performance AI API returned an empty report.");
  return { text, ai: true, data };
}
