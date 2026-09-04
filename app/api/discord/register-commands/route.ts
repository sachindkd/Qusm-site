const STAFF_GUILD_ID = "1539736452995350528";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim();
const APPLICATION_ID = (process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID || "").trim();

const commands = [
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

export async function GET() {
  if (!APPLICATION_ID || !BOT_TOKEN) {
    return Response.json({ success: false, error: "Discord application credentials are not configured" }, { status: 500 });
  }

  const response = await fetch(
    `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${STAFF_GUILD_ID}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(commands),
      cache: "no-store"
    }
  );

  const text = await response.text();
  if (!response.ok) {
    return Response.json({ success: false, error: text.slice(0, 500) }, { status: response.status });
  }

  let registered: unknown = [];
  try { registered = JSON.parse(text); } catch {}

  return Response.json({
    success: true,
    message: "Discord guild commands were replaced with the active QUSM commands only.",
    commands: registered
  });
}
