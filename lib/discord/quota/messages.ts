import { QUOTA_CHANNEL_ID, QUOTA_LOG_CHANNEL_ID, LOGISTICS_ROLE_ID } from "./config";
import { discordApi } from "./discord-api";
import { quotaSignature } from "./security";
import type { QuotaRequest } from "./types";

export function approveModal(requestId: string, signature: string, messageId: string) {
  return {
    type: 9,
    data: {
      custom_id: `qac:${requestId}:${signature}:${messageId}`,
      title: "Confirm Quota Approval",
      components: [{ type: 1, components: [{ type: 4, custom_id: "confirm", label: "Type APPROVE to confirm", style: 1, required: true, min_length: 7, max_length: 7, placeholder: "APPROVE" }] }],
    },
  };
}

export function rejectModal(requestId: string, signature: string, messageId: string) {
  return {
    type: 9,
    data: {
      custom_id: `qrj:${requestId}:${signature}:${messageId}`,
      title: "Reject Quota",
      components: [{ type: 1, components: [{ type: 4, custom_id: "reason", label: "Reason for rejection", style: 2, required: true, min_length: 2, max_length: 1000, placeholder: "Explain why this quota is being rejected" }] }],
    },
  };
}

export async function postReviewMessage(request: QuotaRequest, displayName: string) {
  const signature = quotaSignature(request);
  return discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: `<@&${LOGISTICS_ROLE_ID}>`,
      embeds: [{
        title: "Quota Submission — Pending Review",
        description: `<@${request.userId}> submitted a quota for Logistics review.`,
        fields: [
          { name: "Request ID", value: request.id },
          { name: "Member", value: `<@${request.userId}> (${request.username})`, inline: true },
          { name: "Display Name", value: displayName || request.username, inline: true },
          { name: "Quota (minutes)", value: `${request.quota} min`, inline: true },
          { name: "Proof", value: `[${request.proofName || "View proof image"}](${request.proof})` },
          { name: "Notes", value: request.notes || "—" },
        ],
        image: { url: request.proof },
        footer: { text: "QUSM Quota System • Staff Team" },
        timestamp: request.createdAt,
      }],
      components: [{ type: 1, components: [
        { type: 2, style: 3, label: "Approve & Add Minutes", custom_id: `quota:approve:${request.id}:${signature}` },
        { type: 2, style: 4, label: "Reject", custom_id: `quota:reject:${request.id}:${signature}` },
      ] }],
      allowed_mentions: { users: [request.userId], roles: [LOGISTICS_ROLE_ID] },
    }),
  });
}

export async function postApprovalLog(request: QuotaRequest, approvedBy: string, approvedByUsername: string) {
  const users = [...new Set([request.userId, approvedBy])];
  return discordApi(`/channels/${QUOTA_LOG_CHANNEL_ID}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: `<@&${LOGISTICS_ROLE_ID}>`,
      embeds: [{
        title: "Quota Approved",
        description: `<@${request.userId}> quota has been approved and added to the Google Staff Database.`,
        color: 0x57f287,
        fields: [
          { name: "Staff Member", value: `<@${request.userId}> (${request.username})`, inline: true },
          { name: "Minutes Added", value: `${request.quota} min`, inline: true },
          { name: "Approved By", value: `<@${approvedBy}> (${approvedByUsername})`, inline: true },
          { name: "Request ID", value: request.id },
          { name: "Proof", value: `[${request.proofName || "View proof image"}](${request.proof})` },
          { name: "Notes", value: request.notes || "—" },
        ],
        image: { url: request.proof },
        footer: { text: "QUSM Quota System • Approval Log" },
        timestamp: new Date().toISOString(),
      }],
      allowed_mentions: { users, roles: [LOGISTICS_ROLE_ID] },
    }),
  });
}

export async function postRejectionLog(request: QuotaRequest, reason: string, rejectedBy: string, rejectedByUsername: string) {
  const users = [...new Set([request.userId, rejectedBy])];
  return discordApi(`/channels/${QUOTA_LOG_CHANNEL_ID}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: `<@&${LOGISTICS_ROLE_ID}>`,
      embeds: [{
        title: "Quota Rejected",
        description: `<@${request.userId}> quota submission has been rejected by Logistics.`,
        color: 0xed4245,
        fields: [
          { name: "Staff Member", value: `<@${request.userId}> (${request.username})`, inline: true },
          { name: "Quota Submitted", value: `${request.quota} min`, inline: true },
          { name: "Rejected By", value: `<@${rejectedBy}> (${rejectedByUsername})`, inline: true },
          { name: "Request ID", value: request.id },
          { name: "Reason", value: reason },
          { name: "Proof", value: `[${request.proofName || "View proof image"}](${request.proof})` },
          { name: "Notes", value: request.notes || "—" },
        ],
        image: { url: request.proof },
        footer: { text: "QUSM Quota System • Rejection Log" },
        timestamp: new Date().toISOString(),
      }],
      allowed_mentions: { users, roles: [LOGISTICS_ROLE_ID] },
    }),
  });
}

export async function dmRejection(userId: string, reason: string, minutes: number) {
  const dm = await discordApi("/users/@me/channels", { method: "POST", body: JSON.stringify({ recipient_id: userId }) });
  await discordApi(`/channels/${dm.id}/messages`, { method: "POST", body: JSON.stringify({ content: `❌ Your **${minutes} minute** quota submission has been rejected by Logistics.\n\n**Reason:** ${reason}` }) });
}

export async function getAndValidateReviewMessage(messageId: string, requestId: string, signature: string) {
  const message = await discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages/${messageId}`);
  const fields = message?.embeds?.[0]?.fields;
  if (!Array.isArray(fields)) return null;
  const values = Object.fromEntries(fields.map((field: any) => [String(field.name), String(field.value || "")]));
  const member = String(values.Member || "");
  const userId = member.match(/^<@(\d+)>/)?.[1];
  const username = member.match(/^<@\d+>\s*\(([^\n]*)\)$/)?.[1]?.trim() || "";
  const quota = Number(String(values["Quota (minutes)"] || "").replace(/\s*min(?:utes?)?\s*$/i, ""));
  const proofField = String(values.Proof || "");
  const proof = proofField.match(/\((https?:\/\/[^)]+)\)/i)?.[1] || proofField;
  const proofName = proofField.match(/^\[([^\]]+)\]/)?.[1] || "Proof image";
  const request: QuotaRequest = {
    id: requestId,
    userId: userId || "",
    username,
    quota,
    proof,
    proofName,
    notes: values.Notes === "—" ? "" : String(values.Notes || ""),
    createdAt: String(message.timestamp || ""),
  };
  const expected = quotaSignature(request);
  if (values["Request ID"] !== requestId || !userId || !username || !Number.isFinite(quota) || quota <= 0 || !/^https?:\/\//i.test(proof) || !expected.startsWith(signature)) return null;
  const pending = message?.embeds?.[0]?.title === "Quota Submission — Pending Review" && message?.components?.some((row: any) => row?.components?.some((component: any) => component?.custom_id === `quota:approve:${requestId}:${expected}`));
  const pendingReject = message?.embeds?.[0]?.title === "Quota Submission — Pending Review" && message?.components?.some((row: any) => row?.components?.some((component: any) => component?.custom_id === `quota:reject:${requestId}:${expected}`));
  if (!pending && !pendingReject) return null;
  return { message, request };
}
