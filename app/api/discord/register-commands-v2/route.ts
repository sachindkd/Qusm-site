import { STAFF_GUILD_ID, botToken, applicationId } from "@/lib/discord/quota/config";
import { jsonResponse } from "@/lib/discord/quota/discord-api";

const activeCommands = [
  {
    name: "quota-submit", description: "Submit staff quota with a proof image", type: 1,
    options: [
      { type: 4, name: "minutes", description: "Quota completed in minutes", required: true, min_value: 1, max_value: 100000 },
      { type: 11, name: "proof", description: "Attach the proof image directly", required: true },
      { type: 3, name: "notes", description: "Optional notes for Logistics", required: false, max_length: 1000 },
    ],
  },
  { name: "quota-leaderboard", description: "Show the live QUSM quota and ticket leaderboard", type: 1, options: [] },
  {
    name: "ticket-log", description: "Submit completed staff tickets with proof for review", type: 1,
    options: [
      { type: 4, name: "tickets", description: "Number of tickets completed", required: true, min_value: 1, max_value: 100000 },
      { type: 11, name: "proof", description: "Attach the ticket proof image directly", required: true },
      { type: 3, name: "notes", description: "Optional notes for Logistics", required: false, max_length: 1000 },
    ],
  },
  {
    name: "staff-panel", description: "Open the COS+/HighCOM Staff Management Panel", type: 1,
    options: [{ type: 3, name: "username", description: "Exact Discord username to open", required: true, min_length: 1, max_length: 100 }],
  },
  { name: "profile-sync", description: "Synchronize the Staff Database with QUSM Staff Profiles", type: 1, options: [] },
  {
    name: "quota-status", description: "View a staff member quota request status", type: 1, options: [{ type: 6, name: "user", description: "Staff member to check", required: true }],
  },
  {
    name: "quota-review", description: "Jump to a quota request and review it", type: 1,
    options: [{ type: 3, name: "request_id", description: "Full quota request ID", required: true, min_length: 8, max_length: 64 }],
  },
  { name: "quota-summary", description: "Show the current daily pending quota review summary", type: 1, options: [] },
  {
    name: "ask-ai", description: "Ask Highcom AI about staff reports and performance", type: 1,
    options: [
      { type: 3, name: "question", description: "Ask any question about the available QUSM staff-management data", required: true, max_length: 6000 },
      { type: 6, name: "user", description: "Optional staff member to analyze", required: false },
    ],
  },
  {
    name: "operations-halt", description: "COS+ control for all staff quota and ticket operations", type: 1,
    options: [
      { type: 1, name: "halt", description: "Halt all staff quota and ticket operations", options: [{ type: 3, name: "reason", description: "Reason for the operational halt", required: false, max_length: 1000 }] },
      { type: 1, name: "resume", description: "Resume all staff quota and ticket operations", options: [] },
      { type: 1, name: "status", description: "View the current operations status", options: [] },
    ],
  },
  {
    name: "botsecurity", description: "Scan bots and monitor for bot/raid security threats", type: 1, default_member_permissions: "32",
    options: [
      { type: 1, name: "scan", description: "Scan every bot currently in the server", options: [] },
      { type: 1, name: "monitor", description: "Start security monitoring in this channel", options: [] },
      { type: 1, name: "stop", description: "Stop security monitoring", options: [] },
      { type: 1, name: "status", description: "Show security monitoring status", options: [] },
    ],
  },
];

const discordBase = `https://discord.com/api/v10/applications/${applicationId()}/guilds/${STAFF_GUILD_ID}/commands`;

async function discordRequest(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    headers: { Authorization: `Bot ${botToken()}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
}

export async function GET(request: Request) {
  try {
    const response = await discordRequest(discordBase, { method: "PUT", body: JSON.stringify(activeCommands) });
    const text = await response.text();
    let details: unknown = text;
    try { details = JSON.parse(text); } catch {}
    if (!response.ok) return jsonResponse({ success: false, status: response.status, error: details }, response.status);

    const url = new URL(request.url);
    const remove = [...new Set(url.searchParams.getAll("remove").map((x) => x.trim()).filter(Boolean))];
    return jsonResponse({
      success: true,
      message: "QUSM guild commands bulk-registered.",
      registered: Array.isArray(details) ? details.map((c: any) => ({ id: c?.id, name: c?.name })) : details,
      removed: remove,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Command registration failed" }, 500);
  }
}