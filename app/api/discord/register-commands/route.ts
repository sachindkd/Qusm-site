const STAFF_GUILD_ID = "1539736452995350528";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim();
const APPLICATION_ID = (process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID || "").trim();

const activeCommands = [
  {
    name: "quota-submit",
    description: "Submit staff quota with a proof image",
    type: 1,
    options: [
      { type: 4, name: "minutes", description: "Quota completed in minutes", required: true, min_value: 1, max_value: 100000 },
      { type: 11, name: "proof", description: "Attach the proof image directly", required: true },
      { type: 3, name: "notes", description: "Optional notes for Logistics", required: false, max_length: 1000 }
    ]
  },
  {
    name: "quota-leaderboard",
    description: "Show the live quota leaderboard in Discord",
    type: 1,
    options: []
  }
];

const discordBase = `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${STAFF_GUILD_ID}/commands`;

async function discordRequest(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    },
    cache: "no-store"
  });
}

export async function GET(request: Request) {
  if (!APPLICATION_ID || !BOT_TOKEN) {
    return Response.json({ success: false, error: "Discord application credentials are not configured" }, { status: 500 });
  }

  // This endpoint is intentionally future-safe: it never bulk-replaces the guild command list.
  // Existing commands not owned by this quota system are preserved, including future commands.
  // To remove a specific stale command, pass ?remove=name (repeatable if needed).
  const currentResponse = await discordRequest(discordBase, { method: "GET" });
  const currentText = await currentResponse.text();
  if (!currentResponse.ok) {
    return Response.json({ success: false, error: currentText.slice(0, 500) }, { status: currentResponse.status });
  }

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

    const deleteResponse = await discordRequest(`${discordBase}/${command.id}`, { method: "DELETE" });
    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      return Response.json({ success: false, error: `Failed to remove ${command.name}: ${errorText.slice(0, 300)}` }, { status: deleteResponse.status });
    }
    removed.push(command.name);
  }

  // Ensure the two active quota commands exist/update without touching unrelated commands.
  const registered: unknown[] = [];
  for (const command of activeCommands) {
    const existing = currentCommands.find((item) => item.name === command.name);
    const response = existing?.id
      ? await discordRequest(`${discordBase}/${existing.id}`, { method: "PATCH", body: JSON.stringify(command) })
      : await discordRequest(discordBase, { method: "POST", body: JSON.stringify(command) });

    const text = await response.text();
    if (!response.ok) {
      return Response.json({ success: false, error: text.slice(0, 500) }, { status: response.status });
    }
    try { registered.push(JSON.parse(text)); } catch { registered.push({ name: command.name }); }
  }

  return Response.json({
    success: true,
    message: "Active QUSM quota commands were ensured without removing unrelated or future commands.",
    removed,
    commands: registered
  });
}
