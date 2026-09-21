import { verifyDiscordSignature } from "@/lib/discord/quota/security";
import { handleGet, handlePost } from "@/lib/discord/quota/handler";
import { jsonResponse } from "@/lib/discord/quota/discord-api";
import { runQuotaReminderCheck } from "@/lib/discord/quota/reminders";
import { handleTicketPost } from "@/lib/discord/tickets/handler";
import { handleStaffCommand, handleStaffComponent, handleStaffModal, handleStaffApproval, handleProfileSync, handleStaffRoleSelection, handleStaffRankModal } from "@/lib/discord/staff-management";
import { handleStaffAskAi } from "@/lib/discord/staff-ai";

async function interactionResult(value: unknown): Promise<Response> {
  const result = await value;
  if (result instanceof Response) return result;
  if (result == null) return new Response(null, { status: 204 });
  return jsonResponse(result);
}

export async function GET(): Promise<Response> {
  try { await runQuotaReminderCheck("startup"); } catch (error) { console.error("[quota-reminder] startup scan failed", error); }
  return interactionResult(handleGet());
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  const timestamp = request.headers.get("x-signature-timestamp") || "";
  const signature = request.headers.get("x-signature-ed25519") || "";
  if (!verifyDiscordSignature(body, timestamp, signature)) return jsonResponse({ error: "invalid signature" }, 401);
  try {
    const interaction = JSON.parse(body);
    if (interaction?.type === 1) return jsonResponse({ type: 1 });
    const customId = String(interaction?.data?.custom_id || "");
    const commandName = String(interaction?.data?.name || "");
    if (commandName === "staff-panel") return interactionResult(handleStaffCommand(interaction));
    if (commandName === "profile-sync") return interactionResult(handleProfileSync(interaction));
    if (commandName === "ask-ai") return interactionResult(handleStaffAskAi(interaction));
    if (customId.startsWith("staffcase:")) return interactionResult(handleStaffApproval(interaction));
    if (customId.startsWith("staffrankmodal:")) return interactionResult(handleStaffRankModal(interaction));
    if (customId.startsWith("staffrole:")) return interactionResult(handleStaffRoleSelection(interaction));
    if (customId.startsWith("staffmodal:")) return interactionResult(handleStaffModal(interaction));
    if (customId.startsWith("staff:")) return interactionResult(handleStaffComponent(interaction));
    if (commandName === "operations-halt") {
      console.info("[operations-halt] interaction received", { interactionId: interaction.id });
      return interactionResult(handlePost(interaction));
    }
    try { await runQuotaReminderCheck("startup"); } catch (error) { console.error("[quota-reminder] startup scan failed", error); }
    const isTicket = commandName === "ticket-log" || customId.startsWith("ticket:") || customId.startsWith("tac:") || customId.startsWith("trj:");
    console.info(isTicket ? "[ticket] interaction received" : "[quota] interaction received", {
      interactionId: interaction.id,
      interactionType: interaction.type,
      userId: interaction?.member?.user?.id || interaction?.user?.id,
      customId,
    });
    return interactionResult(isTicket ? handleTicketPost(interaction) : handlePost(interaction));
  } catch {
    return jsonResponse({ error: "invalid json" }, 400);
  }
}
