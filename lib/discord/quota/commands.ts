import { STAFF_GUILD_ID, botToken, applicationId } from "./config";
import { discordApi } from "./discord-api";

const ALLOWED_COMMANDS = new Set(["quota-submit", "quota-leaderboard", "ticket-log"]);

export async function registerQuotaCommands() {
  const base = `/applications/${applicationId()}/guilds/${STAFF_GUILD_ID}/commands`;
  const wanted = [
    {
      name: "quota-submit",
      description: "Submit staff quota with a proof image",
      type: 1,
      default_member_permissions: null,
      options: [
        { type: 4, name: "minutes", description: "Quota completed in minutes", required: true, min_value: 1, max_value: 100000 },
        { type: 11, name: "proof", description: "Attach the proof image directly", required: true },
        { type: 3, name: "notes", description: "Optional notes for Logistics", required: false, max_length: 1000 },
      ],
    },
    {
      name: "quota-leaderboard",
      description: "Show the live quota leaderboard in Discord",
      type: 1,
      default_member_permissions: null,
      options: [],
    },
  ];

  if (!botToken()) throw new Error("DISCORD_BOT_TOKEN is not configured");
  const existing = await discordApi(base);
  const kept = new Set<string>();
  for (const command of Array.isArray(existing) ? existing : []) {
    const name = String(command.name || "");
    const id = String(command.id || "");
    if (!id || !ALLOWED_COMMANDS.has(name) || kept.has(name)) {
      if (id) await discordApi(`${base}/${id}`, { method: "DELETE" });
      continue;
    }
    kept.add(name);
  }
  for (const command of wanted) {
    const current = (Array.isArray(existing) ? existing : []).find((item: any) => item.name === command.name && kept.has(command.name));
    if (current?.id) await discordApi(`${base}/${current.id}`, { method: "PATCH", body: JSON.stringify(command) });
    else await discordApi(base, { method: "POST", body: JSON.stringify(command) });
  }
}
