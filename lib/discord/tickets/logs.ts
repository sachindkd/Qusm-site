import { TICKET_CHANNEL_ID } from "./config";
import { LOGISTICS_ROLE_ID } from "@/lib/discord/quota/config";
import { discordApi } from "@/lib/discord/quota/discord-api";
import type { TicketRequest } from "./types";

export async function postApprovalLog(request: TicketRequest, approvedBy: string, approvedByUsername: string) {
  const users = [...new Set([request.userId, approvedBy])];
  return discordApi(`/channels/${TICKET_CHANNEL_ID}/messages`, { method: "POST", body: JSON.stringify({ content: `<@&${LOGISTICS_ROLE_ID}>`, embeds: [{ title: "Ticket Log Approved", description: `<@${request.userId}> ticket log has been approved and added to the Google Staff Database.`, color: 0x57f287, fields: [
    { name: "Staff Member", value: `<@${request.userId}> (${request.username})`, inline: true }, { name: "Tickets Added", value: `${request.tickets}`, inline: true }, { name: "Approved By", value: `<@${approvedBy}> (${approvedByUsername})`, inline: true }, { name: "Request ID", value: request.id }, { name: "Proof", value: `[${request.proofName || "View proof image"}](${request.proof})` }, { name: "Notes", value: request.notes || "—" },
  ], image: { url: request.proof }, footer: { text: "QUSM Ticket System • Approval Log" }, timestamp: new Date().toISOString() }], allowed_mentions: { users, roles: [LOGISTICS_ROLE_ID] } }) });
}

export async function postRejectionLog(request: TicketRequest, reason: string, rejectedBy: string, rejectedByUsername: string) {
  const users = [...new Set([request.userId, rejectedBy])];
  return discordApi(`/channels/${TICKET_CHANNEL_ID}/messages`, { method: "POST", body: JSON.stringify({ content: `<@&${LOGISTICS_ROLE_ID}>`, embeds: [{ title: "Ticket Log Rejected", description: `<@${request.userId}> ticket log has been rejected by Logistics.`, color: 0xed4245, fields: [
    { name: "Staff Member", value: `<@${request.userId}> (${request.username})`, inline: true }, { name: "Tickets Submitted", value: `${request.tickets}`, inline: true }, { name: "Rejected By", value: `<@${rejectedBy}> (${rejectedByUsername})`, inline: true }, { name: "Request ID", value: request.id }, { name: "Reason", value: reason }, { name: "Proof", value: `[${request.proofName || "View proof image"}](${request.proof})` }, { name: "Notes", value: request.notes || "—" },
  ], image: { url: request.proof }, footer: { text: "QUSM Ticket System • Rejection Log" }, timestamp: new Date().toISOString() }], allowed_mentions: { users, roles: [LOGISTICS_ROLE_ID] } }) });
}

export async function dmRejection(userId: string, reason: string, tickets: number) {
  const dm = await discordApi("/users/@me/channels", { method: "POST", body: JSON.stringify({ recipient_id: userId }) });
  return discordApi(`/channels/${dm.id}/messages`, { method: "POST", body: JSON.stringify({ content: `❌ Your **${tickets} ticket** log submission has been rejected by Logistics.\n\n**Reason:** ${reason}` }) });
}

export async function getAndValidateReviewMessage(messageId: string, requestId: string, signature: string) {
  const message = await discordApi(`/channels/${TICKET_CHANNEL_ID}/messages/${messageId}`);
  const fields = message?.embeds?.[0]?.fields;
  if (!Array.isArray(fields)) return null;
  const values = Object.fromEntries(fields.map((field: any) => [String(field.name), String(field.value || "")]));
  const member = String(values.Member || "");
  const userId = member.match(/^<@(\d+)>/)?.[1];
  const username = member.match(/^<@\d+>\s*\(([^\n]*)\)$/)?.[1]?.trim() || "";
  const tickets = Number(values.Tickets);
  const proofField = String(values.Proof || "");
  const proof = proofField.match(/\((https?:\/\/[^)]+)\)/i)?.[1] || proofField;
  const proofName = proofField.match(/^\[([^\]]+)\]/)?.[1] || "Proof image";
  const request: TicketRequest = { id: requestId, userId: userId || "", username, tickets, proof, proofName, notes: values.Notes === "—" ? "" : String(values.Notes || ""), createdAt: String(message.timestamp || "") };
  const expected = ticketSignature(request);
  if (values["Request ID"] !== requestId || !userId || !username || !Number.isInteger(tickets) || tickets <= 0 || !/^https?:\/\//i.test(proof) || !expected.startsWith(signature)) return null;
  const pendingApprove = message?.embeds?.[0]?.title === "Ticket Log — Pending Review" && message?.components?.some((row: any) => row?.components?.some((component: any) => component?.custom_id === `ticket:approve:${requestId}:${expected}`));
  const pendingReject = message?.embeds?.[0]?.title === "Ticket Log — Pending Review" && message?.components?.some((row: any) => row?.components?.some((component: any) => component?.custom_id === `ticket:reject:${requestId}:${expected}`));
  if (!pendingApprove && !pendingReject) return null;
  return { message, request };
}
