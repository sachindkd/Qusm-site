const STAFF_GUILD_ID = "1539736452995350528";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim();
const APPLICATION_ID = (process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID || "").trim();

const activeCommands = [
  {
    name: "quota-submit", description: "Submit staff quota with a proof image", type: 1,
    options: [
      { type: 4, name: "minutes", description: "Quota completed in minutes", required: true, min_value: 1, max_value: 100000 },
      { type: 11, name: "proof", description: "Attach the proof image directly", required: true },
      { type: 3, name: "notes", description: "Optional notes for Logistics", required: false, max_length: 1000 }
    ]
  },
  { name: "quota-leaderboard", description: "Show the live QUSM quota and ticket leaderboard", type: 1, options: [] },
  {
    name: "ticket-log", description: "Submit completed staff tickets with proof for review", type: 1,
    options: [
      { type: 4, name: "tickets", description: "Number of tickets completed", required: true, min_value: 1, max_value: 100000 },
      { type: 11, name: "proof", description: "Attach the ticket proof image directly", required: true },
      { type: 3, name: "notes", description: "Optional notes for Logistics", required: false, max_length: 1000 }
    ]
  },
  { name: "staff-performance", description: "Generate the detailed Staff Highcom performance report", type: 1, options: [] },
  { name: "logistics-performance", description: "Generate the detailed Logistics performance report", type: 1, options: [] },
  {
    name: "ask-ai", description: "Ask Highcom AI about staff reports and performance", type: 1, options: [
      { type: 6, name: "user", description: "Optional staff member to analyze", required: false },
      { type: 3, name: "question", description: "Ask any question about the available QUSM data", required: true, max_length: 1500 }
    ]
  },
  {
    name: "botsecurity", description: "Scan bots and monitor for bot/raid security threats", type: 1, default_member_permissions: "32",
    options: [
      { type: 1, name: "scan", description: "Scan every bot currently in the server", options: [] },
      { type: 1, name: "monitor", description: "Start security monitoring in this channel", options: [] },
      { type: 1, name: "stop", description: "Stop security monitoring", options: [] },
      { type: 1, name: "status", description: "Show security monitoring status", options: [] }
    ]
  }
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
  if (!APPLICATION_ID || !BOT_TOKEN) return Response.json({ success: false, error: "Discord application credentials are not configured" }, { status: 500 });

  const currentResponse = await discordRequest(discordBase);
  const currentText = await currentResponse.text();
  if (!currentResponse.ok) return Response.json({ success: false, error: currentText.slice(0, 500) }, { status: currentResponse.status });

  let currentCommands: Array<{ id?: string; name?: string }> = [];
  try {
    const parsed = JSON.parse(currentText);
    if (Array.isArray(parsed)) currentCommands = parsed;
  } catch {
    return Response.json({ success: false, error: "Discord returned invalid command data" }, { status: 502 });
  }

  const url = new URL(request.url);
  const requestedRemovals = [...new Set(url.searchParams.getAll("remove").map((name) => name.trim()).filter(Boolean))];
  const removed: string[] = [];

  for (const command of currentCommands) {
    if (!command.id || !command.name || !requestedRemovals.includes(command.name)) continue;
    const response = await discordRequest(`${discordBase}/${command.id}`, { method: "DELETE" });
    if (!response.ok) return Response.json({ success: false, error: `Failed to remove ${command.name}: ${(await response.text()).slice(0, 300)}` }, { status: response.status });
    removed.push(command.name);
  }

  const registered: unknown[] = [];
  for (const command of activeCommands) {
    const existing = currentCommands.find((item) => item.name === command.name);
    const response = existing?.id
      ? await discordRequest(`${discordBase}/${existing.id}`, { method: "PATCH", body: JSON.stringify(command) })
      : await discordRequest(discordBase, { method: "POST", body: JSON.stringify(command) });
    const text = await response.text();
    if (!response.ok) return Response.json({ success: false, error: text.slice(0, 500) }, { status: response.status });
    try { registered.push(JSON.parse(text)); } catch { registered.push({ name: command.name }); }
  }

  return Response.json({
    success: true,
    message: "All active QUSM commands were ensured.",
    removed,
    commands: registered
  });
}