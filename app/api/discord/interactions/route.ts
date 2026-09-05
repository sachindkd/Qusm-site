import { verifyDiscordSignature } from "@/lib/discord/quota/security";
import { handleGet, handlePost } from "@/lib/discord/quota/handler";
import { jsonResponse } from "@/lib/discord/quota/discord-api";
import { handleTicketPost } from "@/lib/discord/tickets/handler";

export async function GET() {
  return handleGet();
}

export async function POST(request: Request) {
  const body = await request.text();
  const timestamp = request.headers.get("x-signature-timestamp") || "";
  const signature = request.headers.get("x-signature-ed25519") || "";
  if (!verifyDiscordSignature(body, timestamp, signature)) return jsonResponse({ error: "invalid signature" }, 401);
  try {
    const interaction = JSON.parse(body);
    const customId = String(interaction?.data?.custom_id || "");
    const commandName = String(interaction?.data?.name || "");
    const isTicket = commandName === "ticket-log" || customId.startsWith("ticket:") || customId.startsWith("tac:") || customId.startsWith("trj:");
    console.info(isTicket ? "[ticket] interaction received" : "[quota] interaction received", { interactionId: interaction.id, interactionType: interaction.type, userId: interaction?.member?.user?.id || interaction?.user?.id, customId });
    return isTicket ? handleTicketPost(interaction) : handlePost(interaction);
  } catch {
    return jsonResponse({ error: "invalid json" }, 400);
  }
}
