import { neon } from "@neondatabase/serverless";
import { getStaffDatabaseSnapshot } from "@/lib/quota-sheets";
import { ensureQuotaState } from "@/lib/quota-state";
import { ensureTicketState } from "@/lib/ticket-state";
import { discordApi } from "@/lib/discord/quota/discord-api";
import { LOGISTICS_ROLE_ID, STAFF_GUILD_ID } from "@/lib/discord/quota/config";

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
  return String(process.env.STAFF_HIGHCOM_ROLE_IDS || process.env.STAFF_HIGHCOM_ROLE_ID || "1539736453016330311")
    .split(",").map(v => v.trim()).filter(Boolean);
}

export function isStaffHighcom(interaction: any) {
  const ids = highcomRoleIds();
  const roles = Array.isArray(interaction?.member?.roles) ? interaction.member.roles.map(String) : [];
  return ids.length > 0 && ids.some(id => roles.includes(id));
}

async function ensureRankHistory() {
  const q = sql();
  await q`CREATE TABLE IF NOT EXISTS staff_rank_history (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    rank TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await q`CREATE INDEX IF NOT EXISTS staff_rank_history_user_idx ON staff_rank_history(username, observed_at DESC)`;
}

async function recordRankSnapshot(sheetRows: any[]) {
  await ensureRankHistory();
  const q = sql();
  for (const row of sheetRows) {
    const username = String(row.username || "").trim();
    const rank = String(row.rank || "").trim();
    if (!username) continue;
    const previous = await q`
      SELECT rank FROM staff_rank_history
      WHERE lower(username) = lower(${username})
      ORDER BY observed_at DESC LIMIT 1
    `;
    if (!previous.length || String(previous[0].rank || "") !== rank) {
      await q`INSERT INTO staff_rank_history (username, rank) VALUES (${username}, ${rank})`;
    }
  }
}

async function getRankHistory() {
  await ensureRankHistory();
  const q = sql();
  const rows = await q`
    SELECT username, rank, observed_at::text
    FROM staff_rank_history
    ORDER BY observed_at ASC
  `;
  const history = new Map<string, { observedAt: string; rank: string }[]>();
  for (const row of rows as any[]) {
    const k = key(row.username);
    const list = history.get(k) || [];
    list.push({ observedAt: String(row.observed_at), rank: String(row.rank || "") });
    history.set(k, list);
  }
  return history;
}

async function getLogisticsMembers() {
  const members: any[] = [];
  let after = "";
  for (let page = 0; page < 10; page++) {
    const query = after ? `?limit=1000&after=${encodeURIComponent(after)}` : "?limit=1000";
    const rows = await discordApi(`/guilds/${STAFF_GUILD_ID}/members${query}`);
    if (!Array.isArray(rows) || !rows.length) break;
    members.push(...rows);
    if (rows.length < 1000) break;
    after = String(rows[rows.length - 1]?.user?.id || "");
    if (!after) break;
  }
  return members.filter(member => Array.isArray(member?.roles) && member.roles.map(String).includes(LOGISTICS_ROLE_ID))
    .map(member => ({ userId: String(member?.user?.id || ""), username: String(member?.user?.global_name || member?.user?.username || member?.user?.id || "Unknown") }))
    .filter(member => member.userId);
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
  await Promise.all([ensureQuotaState(), ensureTicketState()]);
  const [{ quota, tickets }, sheetRows, logisticsMembers] = await Promise.all([getRequestRows(), getStaffDatabaseSnapshot(), getLogisticsMembers()]);
  await recordRankSnapshot(sheetRows);
  const rankHistory = await getRankHistory();
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
  for (const member of logisticsMembers) {
    if (!logistics.has(member.userId)) logistics.set(member.userId, {
      userId: member.userId, username: member.username,
      quotaApprovals: 0, quotaRejections: 0, quotaMinutesApproved: 0,
      internshipQuotaApprovals: 0, normalQuotaApprovals: 0,
      ticketApprovals: 0, ticketRejections: 0, ticketsApproved: 0, reviewed: 0, reviewDays: [],
    });
  }
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
      rankHistory: rankHistory.get(key(m.username)) || [],
      rankChanges: (rankHistory.get(key(m.username)) || []).slice(1),
      approvalRate: m.quotaSubmitted ? Number((m.quotaApproved / m.quotaSubmitted * 100).toFixed(1)) : null,
      ticketApprovalRate: m.ticketsSubmitted ? Number((m.ticketsApproved / m.ticketsSubmitted * 100).toFixed(1)) : null,
      concentrationWarning: m.activeDays === 1 && (m.quotaSubmitted + m.ticketsSubmitted) >= 3
        ? "All recorded activity is concentrated on one day."
        : null,
    })),
    logistics: logisticMetrics,
  };
}

function rankPriority(rank: string) {
  const r = key(rank);
  const order = ["director", "deputy director", "assistant director", "executive director", "highcom", "high command", "lowcom", "low command", "modcom", "moderator command", "senior staff", "staff", "junior staff", "intern", "internship"];
  const exact = order.findIndex(v => r === v || r.includes(v));
  return exact >= 0 ? exact : 100;
}

function addPromotionRecommendation(data: any) {
  for (const m of data.staff) {
    const approved = Number(m.quotaApproved) + Number(m.ticketsApproved);
    const submitted = Number(m.quotaSubmitted) + Number(m.ticketsSubmitted);
    const rate = submitted ? (approved / submitted) * 100 : 0;
    if (!Number(m.activeDays)) {
      m.promotionRecommendation = "Review";
      m.promotionReason = "No recorded quota/ticket activity; additional evidence is needed.";
    } else if (approved >= 10 && rate >= 70 && Number(m.activeDays) >= 3) {
      m.promotionRecommendation = "Yes";
      m.promotionReason = "Sustained recorded activity with at least 10 approved actions, 70% combined approval rate, and activity across 3+ days.";
    } else {
      m.promotionRecommendation = "No";
      m.promotionReason = "Available recorded activity does not meet the report's evidence threshold for promotion.";
    }
  }
  return data;
}
function fallbackStaffReport(data: any) {
  const rows = [...data.staff].sort((a,b) => rankPriority(a.sheetRank) - rankPriority(b.sheetRank) || String(a.sheetRank).localeCompare(String(b.sheetRank)) || String(a.username).localeCompare(String(b.username)));
  const lines = rows.map((m:any) =>
    `• **${m.username}** — ${m.sheetRank || "Rank unknown"} | DB: ${m.sheetMinutes} min / ${m.sheetTickets} tickets | Quota: ${m.quotaSubmitted} submitted, ${m.quotaApproved} approved, ${m.quotaRejected} rejected, ${m.quotaPending} pending | Tickets: ${m.ticketsSubmitted} submitted, ${m.ticketsApproved} approved, ${m.ticketsRejected} rejected, ${m.ticketsPending} pending | Active days: ${m.activeDays} | Promotion: **${m.promotionRecommendation}** — ${m.promotionReason}`
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
  const rows = [...data.logistics].sort((a,b) => String(a.username).localeCompare(String(b.username)));
  const lines = rows.map((m:any) =>
    `• **${m.username}** (${m.userId}) | Reviews: ${m.reviewed} | Quota: ${m.quotaApprovals} approved / ${m.quotaRejections} rejected | Internship quota: ${m.internshipQuotaApprovals} | Normal quota: ${m.normalQuotaApprovals} | Quota minutes approved: ${m.quotaMinutesApproved} | Tickets: ${m.ticketApprovals} approved / ${m.ticketRejections} rejected | Ticket count approved: ${m.ticketsApproved} | Review days: ${m.reviewDays.length}`
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

type AiProvider = "gemini" | "groq" | "cloudflare";

function configuredProviders(): AiProvider[] {
  const requested = String(process.env.PERFORMANCE_AI_PROVIDERS || "gemini,groq,cloudflare")
    .split(",").map(v => v.trim().toLowerCase())
    .filter((v): v is AiProvider => v === "gemini" || v === "groq" || v === "cloudflare");
  return requested.length ? requested : ["gemini", "groq", "cloudflare"];
}

function compactDataForAi(data: any, kind: "staff" | "logistics") {
  if (kind === "staff") {
    return {
      generatedAt: data.generatedAt, sourceCoverage: data.sourceCoverage,
      staff: data.staff.map((m: any) => ({
        username: m.username, rank: m.sheetRank, sheetMinutes: m.sheetMinutes, sheetTickets: m.sheetTickets,
        quotaSubmitted: m.quotaSubmitted, quotaApproved: m.quotaApproved, quotaRejected: m.quotaRejected, quotaPending: m.quotaPending,
        quotaMinutesSubmitted: m.quotaMinutesSubmitted, quotaMinutesApproved: m.quotaMinutesApproved,
        quotaInternshipApproved: m.quotaInternshipApproved, quotaNormalApproved: m.quotaNormalApproved,
        ticketsSubmitted: m.ticketsSubmitted, ticketsApproved: m.ticketsApproved, ticketsRejected: m.ticketsRejected,
        ticketsPending: m.ticketsPending, ticketsCompleted: m.ticketsCompleted, activeDays: m.activeDays,
        activityDays: m.activityDays, firstActivity: m.firstActivity, lastActivity: m.lastActivity,
        rankHistory: m.rankHistory, rankChanges: m.rankChanges, promotionRecommendation: m.promotionRecommendation, promotionReason: m.promotionReason,
        approvalRate: m.approvalRate, ticketApprovalRate: m.ticketApprovalRate, concentrationWarning: m.concentrationWarning,
      })),
    };
  }
  return { generatedAt: data.generatedAt, sourceCoverage: data.sourceCoverage, logistics: data.logistics };
}

function extractOpenAiText(body: any) {
  return String(body?.choices?.[0]?.message?.content || body?.output_text || body?.text || "").trim();
}

async function callGemini(prompt: string, data: any) {
  const apiKey = process.env.PERFORMANCE_GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Gemini API key is not configured");
  const model = process.env.PERFORMANCE_GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) +
    ":generateContent?key=" + encodeURIComponent(apiKey);
  const response = await fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: prompt }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(data) }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8000 },
    }), cache: "no-store",
  });
  if (!response.ok) throw new Error("Gemini " + response.status);
  const body = await response.json();
  const text = String(body?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "").trim();
  if (!text) throw new Error("Gemini returned an empty report");
  return text;
}

async function callGroq(prompt: string, data: any) {
  const apiKey = process.env.PERFORMANCE_GROQ_API_KEY?.trim() || process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error("Groq API key is not configured");
  const model = process.env.PERFORMANCE_GROQ_MODEL?.trim() || "openai/gpt-oss-20b";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      model, messages: [{ role: "system", content: prompt }, { role: "user", content: JSON.stringify(data) }],
      temperature: 0.1, max_tokens: 8000,
    }), cache: "no-store",
  });
  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    throw new Error("Groq " + response.status + (retryAfter ? " retry-after=" + retryAfter : ""));
  }
  const remainingRequests = response.headers.get("x-ratelimit-remaining-requests");
  const remainingTokens = response.headers.get("x-ratelimit-remaining-tokens");
  if (remainingRequests) console.info("[performance-ai] Groq remaining requests: " + remainingRequests);
  if (remainingTokens) console.info("[performance-ai] Groq remaining tokens: " + remainingTokens);
  const text = extractOpenAiText(await response.json());
  if (!text) throw new Error("Groq returned an empty report");
  return text;
}

async function callCloudflare(prompt: string, data: any) {
  const accountId = process.env.PERFORMANCE_CLOUDFLARE_ACCOUNT_ID?.trim() || process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.PERFORMANCE_CLOUDFLARE_API_TOKEN?.trim() || process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) throw new Error("Cloudflare Workers AI credentials are not configured");
  const model = process.env.PERFORMANCE_CLOUDFLARE_MODEL?.trim() || "@cf/meta/llama-3.1-8b-instruct";
  const endpoint = "https://api.cloudflare.com/client/v4/accounts/" + encodeURIComponent(accountId) +
    "/ai/run/" + model.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiToken },
    body: JSON.stringify({
      messages: [{ role: "system", content: prompt }, { role: "user", content: JSON.stringify(data) }],
      max_tokens: 2200, temperature: 0.1,
    }), cache: "no-store",
  });
  if (!response.ok) throw new Error("Cloudflare " + response.status);
  const body = await response.json();
  const text = String(body?.result?.response || body?.result?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("Cloudflare returned an empty report");
  return text;
}

async function callProvider(provider: AiProvider, prompt: string, data: any) {
  if (provider === "gemini") return callGemini(prompt, data);
  if (provider === "groq") return callGroq(prompt, data);
  return callCloudflare(prompt, data);
}

function buildCompleteStaffText(data: any) {
  const rows = [...data.staff].sort((a:any,b:any) => rankPriority(a.sheetRank) - rankPriority(b.sheetRank) || String(a.sheetRank).localeCompare(String(b.sheetRank)) || String(a.username).localeCompare(String(b.username)));
  const sections = rows.map((m:any, i:number) => [
    `### ${i + 1}. ${m.username}`, `Rank: ${m.sheetRank || "Unknown"}`,
    `Database totals: ${m.sheetMinutes} minutes | ${m.sheetTickets} tickets`,
    `Quota: ${m.quotaSubmitted} submitted | ${m.quotaApproved} approved | ${m.quotaRejected} rejected | ${m.quotaPending} pending`,
    `Quota minutes: ${m.quotaMinutesSubmitted} submitted | ${m.quotaMinutesApproved} approved`,
    `Quota programs: Normal ${m.quotaNormalApproved} | Internship ${m.quotaInternshipApproved}`,
    `Tickets: ${m.ticketsSubmitted} submitted | ${m.ticketsApproved} approved | ${m.ticketsRejected} rejected | ${m.ticketsPending} pending | ${m.ticketsCompleted} completed`,
    `Activity: ${m.activeDays} active days | First: ${m.firstActivity || "None"} | Last: ${m.lastActivity || "None"}`,
    `Rank history: ${m.rankHistory?.length ? m.rankHistory.map((x:any) => x.rank + " (" + x.observedAt + ")").join(" -> ") : "No recorded history"}`,
    `Promotion recommendation: ${m.promotionRecommendation} — ${m.promotionReason}`,
    m.concentrationWarning ? `Consistency flag: ${m.concentrationWarning}` : "Consistency flag: None recorded",
  ].join("\n")).join("\n\n");
  return [`# QUSM STAFF PERFORMANCE — COMPLETE ROSTER (${rows.length} MEMBERS)`, `Generated: ${data.generatedAt}`, "", sections].join("\n");
}

function buildCompleteLogisticsText(data: any) {
  const rows = [...data.logistics].sort((a:any,b:any) => String(a.username).localeCompare(String(b.username)));
  const sections = rows.map((m:any, i:number) => [
    `### ${i + 1}. ${m.username}`, `User ID: ${m.userId}`, `Total reviews: ${m.reviewed}`,
    `Quota: ${m.quotaApprovals} approved | ${m.quotaRejections} rejected | ${m.quotaMinutesApproved} minutes approved`,
    `Quota programs: Normal ${m.normalQuotaApprovals} | Internship ${m.internshipQuotaApprovals}`,
    `Tickets: ${m.ticketApprovals} approved | ${m.ticketRejections} rejected | ${m.ticketsApproved} tickets approved`,
    `Review-day coverage: ${m.reviewDays.length} days${m.reviewDays.length ? " | " + m.reviewDays.join(", ") : ""}`,
    m.reviewed === 0 ? "Activity note: No recorded reviews in the available database." : "Activity note: Review activity is present in the available database.",
  ].join("\n")).join("\n\n");
  return [`# QUSM LOGISTICS PERFORMANCE — COMPLETE ROSTER (${rows.length} MEMBERS)`, `Generated: ${data.generatedAt}`, "", sections].join("\n");
}

export async function buildPerformanceReport(kind: "staff" | "logistics") {
  const data = addPromotionRecommendation(await collectPerformanceData());
  const compactData = compactDataForAi(data, kind);
  const prompt = kind === "staff"
    ? "Analyze the supplied QUSM staff performance dataset. Provide a concise factual analysis only. The complete roster is generated separately; do not reproduce the roster. Highlight patterns, missing data, rank-history evidence, and promotion evidence without inventing facts or ranking people."
    : "Analyze the supplied QUSM logistics performance dataset. Provide a concise factual analysis only. The complete roster is generated separately; do not reproduce the roster. Highlight review-volume patterns, gaps, and missing data without inventing facts or ranking people.";
  const errors: string[] = [];
  for (const provider of configuredProviders()) {
    try {
      const aiText = await callProvider(provider, prompt, compactData);
      const rosterText = kind === "staff" ? buildCompleteStaffText(data) : buildCompleteLogisticsText(data);
      return { text: rosterText + "\n\n# AI ANALYSIS\n\n" + aiText, ai: true, provider, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error); errors.push(provider + ": " + message);
      console.warn("[performance-ai] " + provider + " failed; trying next provider", error);
    }
  }
  const rosterText = kind === "staff" ? buildCompleteStaffText(data) : buildCompleteLogisticsText(data);
  return { text: rosterText + "\n\n# ANALYSIS STATUS\n\nAI providers were unavailable or rate-limited. The complete database roster above is still included without truncation.\nProviders tried: " + errors.join(" | "), ai: false, provider: null, data };
}