import { createSign } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEET_ID = "16jQKspnUXHik7BBYkHWKd-wvPShFAyXjW5Cm3MuO470";
const SHEET_NAME = "QUSM Staff Database";
const INTERNSHIP_SHEET_ID = "12KuihiQ0DjnymiqX1cKaY6UzAPZi1OI41SStNQgtct0";
const INTERNSHIP_SHEET_NAME = "QUSM Interns";

function base64url(value: string | Buffer) { return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); }
function env(name: string) { return process.env[name]?.trim(); }
async function accessToken() { const clientEmail = env("GOOGLE_CLIENT_EMAIL") || env("GOOGLE_SERVICE_ACCOUNT_EMAIL"); const privateKey = (env("GOOGLE_PRIVATE_KEY") || env("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"))?.replace(/\\n/g, "\n"); if (!clientEmail || !privateKey) throw new Error("Google Sheets authorization is not configured. Add GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY to Vercel."); const now = Math.floor(Date.now() / 1000); const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" })); const claim = base64url(JSON.stringify({ iss: clientEmail, scope: SHEETS_SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })); const unsigned = `${header}.${claim}`; const signer = createSign("RSA-SHA256"); signer.update(unsigned); signer.end(); const assertion = `${unsigned}.${base64url(signer.sign(privateKey))}`; const response = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(), cache: "no-store" }); const data = await response.json().catch(() => null); if (!response.ok || !data?.access_token) throw new Error(`Google authorization failed (${response.status})`); return String(data.access_token); }
async function sheetsFetch(sheetId: string, path: string, init: RequestInit = {}) { const token = await accessToken(); const response = await fetch(`${SHEETS_API}/${encodeURIComponent(sheetId)}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) }, cache: "no-store" }); const text = await response.text(); if (!response.ok) throw new Error(`Google Sheets API ${response.status}: ${text.slice(0, 300)}`); return text ? JSON.parse(text) : {}; }
function normalize(value: unknown) { return String(value ?? "").trim().toLowerCase(); }
function durationToMinutes(value: unknown) { const raw = String(value ?? "").trim(); if (!raw) return 0; const parts = raw.split(":"); if (parts.length === 2 || parts.length === 3) { const hours = Number(parts[0]); const minutes = Number(parts[1]); const seconds = parts.length === 3 ? Number(parts[2]) : 0; if (Number.isFinite(hours) && Number.isFinite(minutes) && Number.isFinite(seconds) && hours >= 0 && minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60) return hours * 60 + minutes + seconds / 60; } const n = Number(raw); if (!Number.isFinite(n) || n <= 0) return 0; return n < 1 ? n * 1440 : n; }
function minutesToDuration(minutes: number) { return minutes / 1440; }

export type QuotaLeaderboardRow = { username: string; rank: string; minutes: number; tickets: number };
export async function getQuotaLeaderboard(): Promise<QuotaLeaderboardRow[]> { const values = await sheetsFetch(SHEET_ID, `/values/${encodeURIComponent(SHEET_NAME + "!B:G")}?valueRenderOption=UNFORMATTED_VALUE`); const rows: unknown[][] = Array.isArray(values.values) ? values.values : []; return rows.slice(1).map((cells) => ({ username: String(cells?.[0] ?? "").trim(), rank: String(cells?.[1] ?? "").trim(), minutes: Math.round(durationToMinutes(cells?.[3])), tickets: Math.max(0, Math.round(Number(cells?.[5]) || 0)) })).filter((row) => row.username).sort((a, b) => b.minutes - a.minutes || b.tickets - a.tickets || a.username.localeCompare(b.username)); }

export type QuotaDirectInput = { userId: string; username: string; minutes: number; requestId: string; proof: string; approvedBy: string; approvedByUsername: string };
export type LegacyQuotaRequest = { id: string; userId: string; username: string; quota: number; proof: string; proofName: string; notes: string; createdAt: string };

async function processQuotaInSheet(input: QuotaDirectInput | LegacyQuotaRequest, sheetId: string, sheetName: string, usernameColumn: string, quotaColumn: string) { const normalized: QuotaDirectInput = "minutes" in input ? input : { userId: input.userId, username: input.username, minutes: input.quota, requestId: input.id, proof: input.proof, approvedBy: "", approvedByUsername: "" }; if (!Number.isFinite(normalized.minutes) || normalized.minutes <= 0) throw new Error("Approved quota must be greater than 0 minutes."); const values = await sheetsFetch(sheetId, `/values/${encodeURIComponent(sheetName + "!A:G")}?valueRenderOption=UNFORMATTED_VALUE`); const rows: unknown[][] = Array.isArray(values.values) ? values.values : []; const wanted = normalize(normalized.username); const usernameIndex = usernameColumn.charCodeAt(0) - 65; const quotaIndex = quotaColumn.charCodeAt(0) - 65; const matches: { row: number; current: number }[] = []; rows.forEach((cells, index) => { if (normalize(cells?.[usernameIndex]) === wanted) matches.push({ row: index + 1, current: durationToMinutes(cells?.[quotaIndex]) }); }); if (!matches.length) throw new Error(`Username "${normalized.username}" not found in Column ${usernameColumn} of "${sheetName}".`); if (matches.length > 1) throw new Error(`Username "${normalized.username}" appears in ${matches.length} rows; update blocked to prevent changing the wrong record.`); const match = matches[0]; const newTotal = match.current + normalized.minutes; await sheetsFetch(sheetId, `/values/${encodeURIComponent(`${sheetName}!${quotaColumn}${match.row}`)}?valueInputOption=USER_ENTERED`, { method: "PUT", body: JSON.stringify({ range: `${sheetName}!${quotaColumn}${match.row}`, majorDimension: "ROWS", values: [[minutesToDuration(newTotal)]] }) }); const verify = await sheetsFetch(sheetId, `/values/${encodeURIComponent(`${sheetName}!${quotaColumn}${match.row}`)}?valueRenderOption=UNFORMATTED_VALUE`); const verifiedMinutes = durationToMinutes(verify?.values?.[0]?.[0]); if (Math.abs(verifiedMinutes - newTotal) > 0.001) throw new Error(`Google Sheets verification failed: expected ${newTotal} minutes, read back ${verifiedMinutes} minutes.`); return { success: true, row: match.row, previousMinutes: match.current, addedMinutes: normalized.minutes, totalMinutes: newTotal }; }
export async function processQuotaDirect(input: QuotaDirectInput | LegacyQuotaRequest) { return processQuotaInSheet(input, SHEET_ID, SHEET_NAME, "B", "E"); }

export type TicketDirectInput = { userId: string; username: string; tickets: number; requestId: string; proof: string; approvedBy: string; approvedByUsername: string };

function parseCombined(value: unknown) { const raw = String(value ?? "").trim(); const [timePartRaw, ticketsPartRaw] = raw.split("/", 2); let minutes = 0; const timePart = String(timePartRaw || "").trim(); const timeMatch = timePart.match(/^(\d+):(\d{1,2}):(\d{1,2})$/); if (timeMatch) minutes = Number(timeMatch[1]) * 60 + Number(timeMatch[2]) + Number(timeMatch[3]) / 60; else if (/^\d+(?:\.\d+)?$/.test(timePart)) minutes = Number(timePart); let tickets = 0; const ticketText = String(ticketsPartRaw || "").trim(); if (/^\d+$/.test(ticketText)) tickets = Number(ticketText); return { minutes, tickets }; }
function formatCombined(minutes: number, tickets: number) { const totalSeconds = Math.max(0, Math.round(minutes * 60)); const hours = Math.floor(totalSeconds / 3600); const mins = Math.floor((totalSeconds % 3600) / 60); const secs = totalSeconds % 60; return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}/${tickets > 0 ? tickets : "Tickets"}`; }
async function findInternRow(username: string) { const values = await sheetsFetch(INTERNSHIP_SHEET_ID, `/values/${encodeURIComponent(INTERNSHIP_SHEET_NAME + "!A:E")}?valueRenderOption=FORMATTED_VALUE`); const rows: unknown[][] = Array.isArray(values.values) ? values.values : []; const wanted = normalize(username); const matches: { row: number; combined: string }[] = []; rows.forEach((cells, index) => { if (normalize(cells?.[0]) === wanted) matches.push({ row: index + 1, combined: String(cells?.[4] ?? "") }); }); if (!matches.length) throw new Error(`Username "${username}" not found in Column A of "${INTERNSHIP_SHEET_NAME}".`); if (matches.length > 1) throw new Error(`Username "${username}" appears in ${matches.length} rows; update blocked to prevent changing the wrong record.`); return matches[0]; }
async function writeInternCombined(row: number, minutes: number, tickets: number) { const value = formatCombined(minutes, tickets); const range = `${INTERNSHIP_SHEET_NAME}!E${row}`; await sheetsFetch(INTERNSHIP_SHEET_ID, `/values/${encodeURIComponent(range)}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ range, majorDimension: "ROWS", values: [[value]] }) }); const verify = await sheetsFetch(INTERNSHIP_SHEET_ID, `/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`); const verified = String(verify?.values?.[0]?.[0] ?? ""); if (verified !== value) throw new Error(`Google Sheets verification failed: expected "${value}", read back "${verified}".`); return value; }

export async function processInternshipQuotaDirect(input: QuotaDirectInput) { if (!Number.isFinite(input.minutes) || input.minutes <= 0) throw new Error("Approved quota must be greater than 0 minutes."); const match = await findInternRow(input.username); const current = parseCombined(match.combined); const newMinutes = current.minutes + input.minutes; const value = await writeInternCombined(match.row, newMinutes, current.tickets); return { success: true, row: match.row, previousMinutes: current.minutes, addedMinutes: input.minutes, totalMinutes: newMinutes, tickets: current.tickets, value }; }

export async function processInternshipTicketDirect(input: TicketDirectInput) { if (!Number.isInteger(input.tickets) || input.tickets <= 0) throw new Error("Approved tickets must be a positive whole number."); const match = await findInternRow(input.username); const current = parseCombined(match.combined); const newTickets = current.tickets + input.tickets; const value = await writeInternCombined(match.row, current.minutes, newTickets); return { success: true, row: match.row, previousTickets: current.tickets, addedTickets: input.tickets, totalTickets: newTickets, minutes: current.minutes, value }; }

async function processTicketsInSheet(input: TicketDirectInput, sheetId: string, sheetName: string, usernameColumn: string, ticketColumn: string) { if (!Number.isInteger(input.tickets) || input.tickets <= 0) throw new Error("Approved tickets must be a positive whole number."); const values = await sheetsFetch(sheetId, `/values/${encodeURIComponent(sheetName + "!A:G")}?valueRenderOption=UNFORMATTED_VALUE`); const rows: unknown[][] = Array.isArray(values.values) ? values.values : []; const wanted = normalize(input.username); const usernameIndex = usernameColumn.charCodeAt(0) - 65; const ticketIndex = ticketColumn.charCodeAt(0) - 65; const matches: { row: number; current: number }[] = []; rows.forEach((cells, index) => { if (normalize(cells?.[usernameIndex]) === wanted) { const raw = Number(cells?.[ticketIndex]); matches.push({ row: index + 1, current: Number.isFinite(raw) ? raw : 0 }); } }); if (!matches.length) throw new Error(`Username "${input.username}" not found in Column ${usernameColumn} of "${sheetName}".`); if (matches.length > 1) throw new Error(`Username "${input.username}" appears in ${matches.length} rows; update blocked to prevent changing the wrong record.`); const match = matches[0]; const newTotal = match.current + input.tickets; await sheetsFetch(sheetId, `/values/${encodeURIComponent(`${sheetName}!${ticketColumn}${match.row}`)}?valueInputOption=USER_ENTERED`, { method: "PUT", body: JSON.stringify({ range: `${sheetName}!${ticketColumn}${match.row}`, majorDimension: "ROWS", values: [[newTotal]] }) }); const verify = await sheetsFetch(sheetId, `/values/${encodeURIComponent(`${sheetName}!${ticketColumn}${match.row}`)}?valueRenderOption=UNFORMATTED_VALUE`); const verified = Number(verify?.values?.[0]?.[0]); if (!Number.isFinite(verified) || verified !== newTotal) throw new Error(`Google Sheets verification failed: expected ${newTotal} tickets, read back ${verified}.`); return { success: true, row: match.row, previousTickets: match.current, addedTickets: input.tickets, totalTickets: newTotal }; }
export async function processTicketDirect(input: TicketDirectInput) { return processTicketsInSheet(input, SHEET_ID, SHEET_NAME, "B", "G"); }

export type StaffDatabaseSnapshotRow = { username: string; rank: string; minutes: number; tickets: number };

async function syncStaffRanksToProfiles(rows: StaffDatabaseSnapshotRow[]) {
  const databaseUrl = env("DATABASE_URL");
  if (!databaseUrl) return;
  try {
    const q = neon(databaseUrl);
    for (const staff of rows) {
      if (!staff.username || !staff.rank) continue;
      await q`UPDATE staff_profiles SET username=${staff.username},rank=${staff.rank},updated_at=NOW() WHERE LOWER(username)=LOWER(${staff.username})`;
    }
  } catch (error) {
    console.warn("[quota-sheets] Staff profile rank sync skipped:", error);
  }
}

export async function getStaffDatabaseSnapshot(): Promise<StaffDatabaseSnapshotRow[]> {
  const values = await sheetsFetch(SHEET_ID, `/values/${encodeURIComponent(SHEET_NAME + "!B:G")}?valueRenderOption=UNFORMATTED_VALUE`);
  const rows: unknown[][] = Array.isArray(values.values) ? values.values : [];
  const snapshot = rows.slice(1).map(cells => ({
    username: String(cells?.[0] ?? "").trim(),
    rank: String(cells?.[1] ?? "").trim(),
    minutes: Math.round(durationToMinutes(cells?.[3])),
    tickets: Math.max(0, Math.round(Number(cells?.[5]) || 0)),
  })).filter(row => row.username);
  await syncStaffRanksToProfiles(snapshot);
  return snapshot;
}

export async function updateStaffRankInDatabase(username: string, newRank: string) {
  const wanted = normalize(username);
  const rank = String(newRank ?? "").trim();
  if (!wanted) throw new Error("Staff username is required for rank update.");
  if (!rank) throw new Error("New staff rank is required.");
  const values = await sheetsFetch(SHEET_ID, `/values/${encodeURIComponent(SHEET_NAME + "!A:G")}?valueRenderOption=UNFORMATTED_VALUE`);
  const rows: unknown[][] = Array.isArray(values.values) ? values.values : [];
  const matches: { row: number; currentRank: string }[] = [];
  rows.forEach((cells, index) => {
    if (normalize(cells?.[1]) === wanted) matches.push({ row: index + 1, currentRank: String(cells?.[2] ?? "").trim() });
  });
  if (!matches.length) throw new Error(`Username "${username}" not found in Column B of "${SHEET_NAME}".`);
  if (matches.length > 1) throw new Error(`Username "${username}" appears in ${matches.length} rows; rank update blocked to prevent changing the wrong record.`);
  const match = matches[0];
  const range = `${SHEET_NAME}!C${match.row}`;
  await sheetsFetch(SHEET_ID, `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    body: JSON.stringify({ range, majorDimension: "ROWS", values: [[rank]] }),
  });
  const verify = await sheetsFetch(SHEET_ID, `/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`);
  const verified = String(verify?.values?.[0]?.[0] ?? "").trim();
  if (normalize(verified) !== normalize(rank)) throw new Error(`Google Sheets verification failed: expected rank "${rank}", read back "${verified}".`);
  return { success: true, row: match.row, previousRank: match.currentRank, newRank: rank };
}
