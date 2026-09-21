const STAFF_GUILD_ID = "1539736452995350528";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim();
const APPLICATION_ID = (process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID || "").trim();

const activeCommands = [
  { name: "quota-submit", description: "Submit staff quota with a proof image", type: 1, options: [
    { type: 4, name: "minutes", description: "Quota completed in minutes", required: true, min_value: 1, max_value: 100000 },
    { type: 11, name: "proof", description: "Attach the proof image directly", required: true },
    { type: 3, name: "notes", description: "Optional notes for Logistics", required: false, max_length: 1000 }
  ]},
  { name: "quota-leaderboard", description: "Show the live QUSM quota and ticket leaderboard", type: 1, options: [] },
  { name: "ticket-log", description: "Submit completed staff tickets with proof for review", type: 1, options: [
    { type: 4, name: "tickets", description: "Number of tickets completed", required: true, min_value: 1, max_value: 100000 },
    { type: 11, name: "proof", description: "Attach the ticket proof image directly", required: true },
    { type: 3, name: "notes", description: "Optional notes for Logistics", required: false, max_length: 1000 }
  ]},
  { name: "staff-panel", description: "Open the COS+/HighCOM Staff Management Panel", type: 1, options: [
    { type: 3, name: "username", description: "Exact Discord username to open", required: true, min_length: 1, max_length: 100 }
  ]},
  { name: "profile-sync", description: "Synchronize the Staff Database with QUSM Staff Profiles", type: 1, options: [] },
  { name: "quota-status", description: "View a staff member quota request status", type: 1, options: [
    { type: 6, name: "user", description: "Staff member to check", required: true }
  ]},
  { name: "quota-review", description: "Jump to a quota request and review it", type: 1, options: [
    { type: 3, name: "request_id", description: "Full quota request ID", required: true, min_length: 8, max_length: 64 }
  ]},
  { name: "quota-summary", description: "Show the current daily pending quota review summary", type: 1, options: [] },
  { name: "ask-ai", description: "Ask Highcom AI about staff reports and performance", type: 1, options: [
    { type: 3, name: "question", description: "Ask any question about the available QUSM staff-management data", required: true, max_length: 6000 },
    { type: 6, name: "user", description: "Optional staff member to analyze", required: false }
  ]},
  { name: "operations-halt", description: "COS+ control for all staff quota and ticket operations", type: 1, options: [
    { type: 1, name: "halt", description: "Halt all staff quota and ticket operations", options: [{ type: 3, name: "reason", description: "Reason for the operational halt", required: false, max_length: 1000 }] },
    { type: 1, name: "resume", description: "Resume all staff quota and ticket operations", options: [] },
    { type: 1, name: "status", description: "View the current operations status", options: [] }
  ]},
  { name: "botsecurity", description: "Scan bots and monitor for bot/raid security threats", type: 1, default_member_permissions: "32", options: [
    { type: 1, name: "scan", description: "Scan every bot currently in the server", options: [] },
    { type: 1, name: "monitor", description: "Start security monitoring in this channel", options: [] },
    { type: 1, name: "stop", description: "Stop security monitoring", options: [] },
    { type: 1, name: "status", description: "Show security monitoring status", options: [] }
  ]}
];

const discordBase = `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${STAFF_GUILD_ID}/commands`;

async function discordRequest(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store"
  });
}

export async function GET(request: Request) {
  if (!APPLICATION_ID || !BOT_TOKEN) {
    return Response.json(
      { success: false, error: "Discord application credentials are not configured" },
      { status: 500 }
    );
  }

  const response = await discordRequest(discordBase, {
    method: "PUT",
    body: JSON.stringify(activeCommands)
  });

  const responseText = await response.text();

  if (!response.ok) {
    let details: unknown = responseText.slice(0, 1000);
    try {
      details = JSON.parse(responseText);
    } catch {}

    const retryAfter =
      response.headers.get("retry-after") ||
      (typeof details === "object" && details !== null && "retry_after" in details
        ? String((details as { retry_after?: unknown }).retry_after ?? "")
        : "");

    return Response.json(
      {
        success: false,
        status: response.status,
        error: details,
        ...(retryAfter ? { retry_after: retryAfter } : {})
      },
      { status: response.status }
    );
  }

  let commands: unknown = [];
  try {
    commands = JSON.parse(responseText);
  } catch {
    commands = { raw: responseText.slice(0, 1000) };
  }

  const url = new URL(request.url);
  const requestedRemovals = [
    ...new Set(
      url.searchParams
        .getAll("remove")
        .map((name) => name.trim())
        .filter(Boolean)
    )
  ];

  return Response.json({
    success: true,
    message: "All active QUSM guild commands were bulk-registered.",
    registered: Array.isArray(commands) ? commands.map((command) => ({
      id: command?.id,
      name: command?.name
    })) : commands,
    removed: requestedRemovals
  });
}
