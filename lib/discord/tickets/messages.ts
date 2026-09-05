import { TICKET_CHANNEL_ID } from "./config";
import { LOGISTICS_ROLE_ID } from "@/lib/discord/quota/config";
import { discordApi } from "@/lib/discord/quota/discord-api";
import { ticketSignature, type TicketRequest } from "./types";

export function approveModal(requestId: string, signature: string, messageId: string) {
  return { type: 9, data: { custom_id: `tac:${requestId}:${signature}:${messageId}`, title: "Confirm Ticket Approval", components: [{ type: 1, components: [{ type: 4, custom_id: "confirm", label: "Type APPROVE to confirm", style: 1, required: true, min_length: 7, max_length: 7, placeholder: "APPROVE" }] }] } };
}
export function rejectModal(requestId: string, signature: string, messageId: string) {
  return { type: 9, data: { custom_id: `trj:${requestId}:${signature}:${messageId}`, title: "Reject Ticket Log", components: [{ type: 1, components: [{ type: 4, custom_id: "reason", label: "Reason for rejection", style: 2, required: true, min_length: 2, max_length: 1000, placeholder: "Explain why this ticket log is being rejected" }] }] } };
}
export async function postReviewMessage(request: TicketRequest, displayName: string) {
  const signature = ticketSignature(request);
  return discordApi(`/channels/${TICKET_CHANNEL_ID}/messages`, { method: "POST", body: JSON.stringify({
    content: `<@&${LOGISTICS_ROLE_ID}>`,
    embeds: [{ title: "Ticket Log — Pending Review", description: `<@${request.userId}> submitted completed tickets for Logistics review.`, fields: [
      { name: "Request ID", value: request.id }, { name: "Member", value: `<@${request.userId}> (${request.username})`, inline: true }, { name: "Display Name", value: displayName || request.username, inline: true }, { name: "Tickets", value: `${request.tickets}`, inline: true },
      { name: "Proof", value: `[${request.proofName || "View proof image"}](${request.proof})` }, { name: "Notes", value: request.notes || "—" },
    ], image: { url: request.proof }, footer: { text: "QUSM Ticket System • Staff Team" }, timestamp: request.createdAt }],
    components: [{ type: 1, components: [{ type: 2, style: 3, label: "Approve & Add Tickets", custom_id: `ticket:approve:${request.id}:${signature}` }, { type: 2, style: 4, label: "Reject", custom_id: `ticket:reject:${request.id}:${signature}` }] }],
    allowed_mentions: { users: [request.userId], roles: [LOGISTICS_ROLE_ID] },
  }) });
}
