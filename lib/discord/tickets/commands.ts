import { STAFF_GUILD_ID, botToken, applicationId } from "@/lib/discord/quota/config";
import { discordApi } from "@/lib/discord/quota/discord-api";

export async function registerTicketCommands() {
  const base = `/applications/${applicationId()}/guilds/${STAFF_GUILD_ID}/commands`;
  if (!botToken()) throw new Error("DISCORD_BOT_TOKEN is not configured");
  const existing = await discordApi(base);
  const command = {
    name: "ticket-log",
    description: "Submit completed staff tickets with proof for review",
    type: 1,
    default_member_permissions: null,
    options: [
      { type: 4, name: "tickets", description: "Number of tickets completed", required: true, min_value: 1, max_value: 100000 },
      { type: 11, name: "proof", description: "Attach the ticket proof image directly", required: true },
      { type: 3, name: "notes", description: "Optional notes for Logistics", required: false, max_length: 1000 },
    ],
  };
  const current = (Array.isArray(existing) ? existing : []).find((item: any) => item.name === command.name);
  if (current?.id) await discordApi(`${base}/${current.id}`, { method: "PATCH", body: JSON.stringify(command) });
  else await discordApi(base, { method: "POST", body: JSON.stringify(command) });
}
