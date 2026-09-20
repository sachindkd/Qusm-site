import { STAFF_GUILD_ID, botToken, applicationId } from "./config";
import { discordApi } from "./discord-api";

const ALLOWED_COMMANDS = new Set(["quota-submit", "quota-leaderboard", "ticket-log", "botsecurity", "staff-performance", "logistics-performance", "ask-ai", "quota-status", "quota-summary", "quota-review", "sync-website", "operations-halt"]);

async function deleteAllCommands(base: string) {
  const existing = await discordApi(base);
  for (const command of Array.isArray(existing) ? existing : []) {
    const id = String(command?.id || "");
    if (id) await discordApi(`${base}/${id}`, { method: "DELETE" });
  }
}

export async function registerQuotaCommands() {
  if (!botToken()) throw new Error("DISCORD_BOT_TOKEN is not configured");
  const guildBase = `/applications/${applicationId()}/guilds/${STAFF_GUILD_ID}/commands`;
  const globalBase = `/applications/${applicationId()}/commands`;
  await deleteAllCommands(globalBase);
  const existing = await discordApi(guildBase);
  const kept = new Set<string>();
  for (const command of Array.isArray(existing) ? existing : []) {
    const name = String(command?.name || "");
    const id = String(command?.id || "");
    if (!id || !ALLOWED_COMMANDS.has(name) || kept.has(name)) {
      if (id) await discordApi(`${guildBase}/${id}`, { method: "DELETE" });
      continue;
    }
    kept.add(name);
  }
  const wanted = [
    { name: "quota-submit", description: "Submit staff quota with a proof image", type: 1, default_member_permissions: null, options: [
      { type: 4, name: "minutes", description: "Quota completed in minutes", required: true, min_value: 1, max_value: 100000 },
      { type: 11, name: "proof", description: "Attach the proof image directly", required: true },
      { type: 3, name: "notes", description: "Optional notes for Logistics", required: false, max_length: 1000 },
    ]},
    { name: "quota-leaderboard", description: "Show the live QUSM quota and ticket leaderboard", type: 1, default_member_permissions: null, options: [] },
    { name: "ticket-log", description: "Submit completed staff tickets with proof for review", type: 1, default_member_permissions: null, options: [
      { type: 4, name: "tickets", description: "Number of tickets completed", required: true, min_value: 1, max_value: 100000 },
      { type: 11, name: "proof", description: "Attach the ticket proof image directly", required: true },
      { type: 3, name: "notes", description: "Optional notes for Logistics", required: false, max_length: 1000 },
    ]},
    { name: "staff-performance", description: "Generate the detailed Staff Highcom performance report", type: 1, default_member_permissions: null, options: [] },
    { name: "logistics-performance", description: "Generate the detailed Logistics performance report", type: 1, default_member_permissions: null, options: [] },
    { name: "quota-status", description: "View a staff member quota request status", type: 1, default_member_permissions: null, options: [
      { type: 6, name: "user", description: "Staff member to check", required: true },
    ]},
    { name: "quota-summary", description: "Show the current daily pending quota review summary", type: 1, default_member_permissions: null, options: [] },
    { name: "quota-review", description: "Jump to a quota request and review it", type: 1, default_member_permissions: null, options: [
      { type: 3, name: "request_id", description: "Full quota request ID", required: true, min_length: 8, max_length: 64 },
    ]},
    { name: "ask-ai", description: "Ask Highcom AI about staff reports and performance", type: 1, default_member_permissions: null, options: [
      { type: 3, name: "question", description: "Ask any question about the available QUSM data", required: true, max_length: 6000 },
      { type: 6, name: "user", description: "Optional staff member to analyze", required: false },
    ]},
    { name: "sync-website", description: "Scan QUSM Discord and synchronize the main QUSM website", type: 1, default_member_permissions: null, options: [] },
    { name: "operations-halt", description: "COS+ control for all staff quota and ticket operations", type: 1, default_member_permissions: null, options: [
      { type: 1, name: "halt", description: "Halt all staff quota and ticket operations", options: [{ type: 3, name: "reason", description: "Reason for the operational halt", required: false, max_length: 1000 }] },
      { type: 1, name: "resume", description: "Resume all staff quota and ticket operations", options: [] },
      { type: 1, name: "status", description: "View the current operations status", options: [] },
    ] },
    { name: "botsecurity", description: "Scan bots and monitor for bot/raid security threats", type: 1, default_member_permissions: "32", options: [
      { type: 1, name: "scan", description: "Scan every bot currently in the server", options: [] },
      { type: 1, name: "monitor", description: "Start security monitoring in this channel", options: [] },
      { type: 1, name: "stop", description: "Stop security monitoring", options: [] },
      { type: 1, name: "status", description: "Show security monitoring status", options: [] },
    ]},
  ];
  for (const command of wanted) {
    const current = (Array.isArray(existing) ? existing : []).find((item: any) => item.name === command.name && kept.has(command.name));
    if (current?.id) await discordApi(`${guildBase}/${current.id}`, { method: "PATCH", body: JSON.stringify(command) });
    else await discordApi(guildBase, { method: "POST", body: JSON.stringify(command) });
  }
}
