import { verifyDiscordSignature } from "@/lib/discord/quota/security";
import { handleGet, handlePost } from "@/lib/discord/quota/handler";
import { jsonResponse } from "@/lib/discord/quota/discord-api";
import { runQuotaReminderCheck } from "@/lib/discord/quota/reminders";
import { handleTicketPost } from "@/lib/discord/tickets/handler";
import { developmentCommandUserId } from "@/lib/discord/quota/config";

export async function GET() {
  try {
    await runQuotaReminderCheck("startup");
  } catch (error) {
    console.error("[quota-reminder] startup scan failed", error);
  }
  return handleGet();
}

export async function POST(request: Request) {
  const body = await request.text();
  const timestamp = request.headers.get("x-signature-timestamp") || "";
  const signature = request.headers.get("x-signature-ed25519") || "";
  if (!verifyDiscordSignature(body, timestamp, signature)) return jsonResponse({ error: "invalid signature" }, 401);
  try {
    await runQuotaReminderCheck("startup");
    const interaction = JSON.parse(body);
    const allowedUserId = developmentCommandUserId();
    const interactionUserId = String(interaction?.member?.user?.id || interaction?.user?.id || "");
    if (!allowedUserId || interactionUserId !== allowedUserId) {
      return jsonResponse({ type: 4, data: { content: "⚠️ The QUSM bot is currently in development and cannot be used by anyone except the designated development user.", flags: 64 } });
    }
    const customId = String(interaction?.data?.custom_id || "");
    const commandName = String(interaction?.data?.name || "");
    const isTicket = commandName === "ticket-log" || customId.startsWith("ticket:") || customId.startsWith("tac:") || customId.startsWith("trj:");
    console.info(isTicket ? "[ticket] interaction received" : "[quota] interaction received", { interactionId: interaction.id, interactionType: interaction.type, userId: interaction?.member?.user?.id || interaction?.user?.id, customId });
    return isTicket ? handleTicketPost(interaction) : handlePost(interaction);
  } catch {
    return jsonResponse({ error: "invalid json" }, 400);
  }
}
