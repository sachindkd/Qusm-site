import { createSign } from "node:crypto";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEET_ID = "1qcTc_tbKLENaxDzKBXYwwimFqOfKxRNYh2qAwDlC-gY";
const SHEET_NAME = "QUSM Staff Database";

function base64url(value: string | Buffer) { return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); }
function env(name: string) { return process.env[name]?.trim(); }

async function accessToken() {
  const clientEmail = env("GOOGLE_CLIENT_EMAIL") || env("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = (env("GOOGLE_PRIVATE_KEY") || env("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"))?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) throw new Error("Google Sheets authorization is not configured. Add GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY to Vercel.");
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({ iss: clientEmail, scope: SHEETS_SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256"); signer.update(unsigned); signer.end();
  const assertion = `${unsigned}.${base64url(signer.sign(privateKey))}`;
  const response = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(), cache: "no-store" });
  const data = await response.json().catch(() => null); if (!response.ok || !data?.access_token) throw new Error(`Google authorization failed (${response.status})`); return String(data.access_token);
}

async function sheetsFetch(path: string, init: RequestInit = {}) { const token = await accessToken(); const response = await fetch(`${SHEETS_API}/${encodeURIComponent(SHEET_ID)}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) }, cache: "no-store" }); const text = await response.text(); if (!response.ok) throw new Error(`Google Sheets API ${response.status}: ${text.slice(0, 300)}`); return text ? JSON.parse(text) : {}; }

function normalize(value: unknown) { return String(value ?? "").trim().toLowerCase(); }
function durationToMinutes(value: unknown) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) return 0; return n < 1 ? n * 1440 : n; }
function minutesToDuration(minutes: number) { return minutes / 1440; }

export type QuotaDirectInput = { userId: string; username: string; minutes: number; requestId: string; proof: string; approvedBy: string; approvedByUsername: string };

export async function processQuotaDirect(input: QuotaDirectInput) {
  if (!Number.isFinite(input.minutes) || input.minutes <= 0) throw new Error("Approved quota must be greater than 0 minutes.");
  // Only read the username and quota columns. Approval never writes to Mod Logs or any other column.
  const values = await sheetsFetch(`/values/${encodeURIComponent(SHEET_NAME + "!B:E")}?valueRenderOption=UNFORMATTED_VALUE`);
  const rows: unknown[][] = Array.isArray(values.values) ? values.values : [];
  const wanted = normalize(input.username);
  const matches: { row: number; current: number }[] = [];
  rows.forEach((cells, index) => { if (normalize(cells?.[0]) === wanted) matches.push({ row: index + 1, current: durationToMinutes(cells?.[3]) }); });
  if (!matches.length) throw new Error(`Username "${input.username}" not found in Column B of "${SHEET_NAME}".`);
  if (matches.length > 1) throw new Error(`Username "${input.username}" appears in ${matches.length} rows; update blocked to prevent changing the wrong staff record.`);
  const match = matches[0];
  const newTotal = match.current + input.minutes;
  // Column E is the only cell changed by quota approval.
  await sheetsFetch(`/values/${encodeURIComponent(SHEET_NAME + "!E" + match.row)}?valueInputOption=USER_ENTERED`, { method: "PUT", body: JSON.stringify({ range: `${SHEET_NAME}!E${match.row}`, majorDimension: "ROWS", values: [[minutesToDuration(newTotal)]] }) });
  const verify = await sheetsFetch(`/values/${encodeURIComponent(SHEET_NAME + "!E" + match.row)}?valueRenderOption=UNFORMATTED_VALUE`);
  const verifiedMinutes = durationToMinutes(verify?.values?.[0]?.[0]);
  if (Math.abs(verifiedMinutes - newTotal) > 0.001) throw new Error(`Google Sheets verification failed: expected ${newTotal} minutes, read back ${verifiedMinutes} minutes.`);
  return { success: true, row: match.row, previousMinutes: match.current, addedMinutes: input.minutes, totalMinutes: newTotal };
}
