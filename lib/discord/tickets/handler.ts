import { randomUUID } from "node:crypto";
import { hasStaffTicketColumn, processInternshipTicketDirect, processTicketDirect } from "@/lib/quota-sheets";
import { attachTicketMessage, claimTicketApproval, createTicketRequest, getTicketRequestState, markTicketApproved, markTicketRejected, releaseTicketApproval } from "@/lib/ticket-state";
import { INTERNSHIP_ROLE_ID, LOGISTICS_ROLE_ID, STAFF_GUILD_ID, STAFF_ROLE_ID, TESTER_ROLE_ID } from "@/lib/discord/quota/config";
import { discordApi, ephemeral, hasRole, interactionCallback, interactionFollowup, jsonResponse, modalValues, option } from "@/lib/discord/quota/discord-api";
import { TICKET_CHANNEL_ID, TICKET_LOG_CHANNEL_ID } from "./config";
import { approveModal, postReviewMessage, rejectModal } from "./messages";
import { getAndValidateReviewMessage, postApprovalLog, postRejectionLog, dmRejection } from "./logs";
import { interactionDisplayName, interactionUserId, interactionUsername } from "@/lib/discord/quota/types";
import { ticketSignature, type TicketRequest } from "./types";

function canReview(interaction: any) { return hasRole(interaction, LOGISTICS_ROLE_ID) || hasRole(interaction, TESTER_ROLE_ID); }

async function dmMissingTicketColumn(userId: string) {
  const dm = await discordApi("/users/@me/channels", { method: "POST", body: JSON.stringify({ recipient_id: userId }) });
  return discordApi(`/channels/${dm.id}/messages`, { method: "POST", body: JSON.stringify({ content: "⚠️ Your ticket log was cancelled because the **Tickets column has not been added to the Google Staff Database yet**. Please wait until Logistics confirms the column has been added, then submit your ticket log again." }) });
}

async function postMissingTicketColumnLog(request: TicketRequest) {
  const message = await discordApi(`/channels/${TICKET_LOG_CHANNEL_ID}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: `<@&${LOGISTICS_ROLE_ID}>`,
      embeds: [{
        title: "⚠️ Ticket Log Cancelled — Tickets Column Missing",
        description: `<@${request.userId}> submitted **${request.tickets} ticket${request.tickets === 1 ? "" : "s"}**, but the **Tickets** column has not been added to the Google Staff Database.\n\nThe request has been **cancelled** and no ticket count was added.\n\nAfter the Tickets column is added, Logistics should confirm below so the submitter can be notified to submit again.`,
        color: 0xfee75c,
        fields: [
          { name: "Staff Member", value: `<@${request.userId}> (${request.username})`, inline: true },
          { name: "Tickets Requested", value: `${request.tickets}`, inline: true },
          { name: "Request ID", value: request.id },
          { name: "Action Required", value: "Add the **Tickets** column to the Staff Database, then click **☑️ Tickets Column Added**." },
        ],
        image: { url: request.proof },
        footer: { text: "QUSM Ticket System • Missing Ticket Column" },
        timestamp: new Date().toISOString(),
      }],
      components: [{ type: 1, components: [{ type: 2, style: 3, custom_id: `ticket:column-added:${request.id}:${request.userId}`, label: "Tickets Column Added", emoji: { name: "☑️" } }] }],
      allowed_mentions: { users: [request.userId], roles: [LOGISTICS_ROLE_ID] },
    }),
  });
  return message;
}

async function handleSubmit(interaction: any) {
  const internship = hasRole(interaction, INTERNSHIP_ROLE_ID);
  if (!internship && !hasRole(interaction, STAFF_ROLE_ID)) return jsonResponse(ephemeral("You need the Staff Team role or Internship Program role to submit ticket logs."));
  try {
    await interactionCallback(interaction, { type: 5, data: { flags: 64 } });
    const tickets = Number(option(interaction, "tickets")?.value);
    const proofId = String(option(interaction, "proof")?.value || "");
    const notes = String(option(interaction, "notes")?.value || "").trim();
    const attachment = interaction?.data?.resolved?.attachments?.[proofId];
    const proof = String(attachment?.url || "");
    const proofName = String(attachment?.filename || "Proof image");
    const contentType = String(attachment?.content_type || "").toLowerCase();
    if (!Number.isInteger(tickets) || tickets <= 0 || tickets > 100000 || !proof || (contentType && !contentType.startsWith("image/"))) return interactionFollowup(interaction, { content: "Invalid ticket log. Tickets must be a positive whole number and proof must be an image.", flags: 64 });
    const request: TicketRequest = { id: randomUUID(), userId: interactionUserId(interaction), username: interactionUsername(interaction), tickets, proof, proofName, notes, createdAt: new Date().toISOString(), ...(internship ? { program: "internship" as const } : {}) };

    // The Staff Database currently has no Tickets column. Do not create a normal review request that can later fail.
    // Internship requests keep their existing separate-sheet behavior, including its automatic G-column header setup.
    if (!internship && !(await hasStaffTicketColumn())) {
      await createTicketRequest({ requestId: request.id, userId: request.userId, username: request.username, tickets: request.tickets, signature: ticketSignature(request) });
      await markTicketRejected(request.id);
      await postMissingTicketColumnLog(request);
      await dmMissingTicketColumn(request.userId);
      return interactionFollowup(interaction, { content: "⚠️ Your ticket log was cancelled because the Tickets column has not been added to the Staff Database yet. Logistics has been notified.", flags: 64 });
    }

    await createTicketRequest({ requestId: request.id, userId: request.userId, username: request.username, tickets: request.tickets, signature: ticketSignature(request) });
    const message = await postReviewMessage(request, interactionDisplayName(interaction));
    await attachTicketMessage(request.id, String(message.id));
    await interactionFollowup(interaction, { content: internship ? `✅ Your ${request.tickets} Internship Program ticket${request.tickets === 1 ? "" : "s"} were submitted to Logistics for review.` : `✅ Your ${request.tickets} ticket${request.tickets === 1 ? "" : "s"} were submitted to Logistics for review.`, flags: 64 });
  } catch (error) {
    console.error("[ticket] submit failed", { interactionId: interaction.id, error });
    try { await interactionFollowup(interaction, { content: `⚠️ Could not submit your ticket log: ${error instanceof Error ? error.message : "unknown error"}`, flags: 64 }); } catch {}
  }
  return new Response(null, { status: 204 });
}

async function markReviewMessage(messageId: string, originalMessage: any, status: "Approved" | "Rejected", reason?: string) {
  const embed = originalMessage?.embeds?.[0];
  if (!embed) return;
  await discordApi(`/channels/${TICKET_CHANNEL_ID}/messages/${messageId}`, { method: "PATCH", body: JSON.stringify({ components: [], embeds: [{ ...embed, title: `${String(embed.title || "Ticket Log").replace(" — Pending Review", "")} — ${status}`, description: `${String(embed.description || "").split("\n")[0]}\n\n**Status: ${status}**${reason ? `\n**Reason:** ${reason}` : ""}` }] }) });
}

async function handleButton(interaction: any) {
  const customId = String(interaction?.data?.custom_id || "");
  const missingColumn = customId.match(/^ticket:column-added:([0-9a-f-]{36}):(\d+)$/i);
  if (missingColumn) {
    if (!canReview(interaction)) return jsonResponse(ephemeral("Only Logistics or an approved tester can confirm the Tickets column was added."));
    if (String(interaction.channel_id) !== TICKET_LOG_CHANNEL_ID) return jsonResponse(ephemeral("⚠️ Invalid ticket log channel."));
    const requestId = missingColumn[1];
    const userId = missingColumn[2];
    try {
      await interactionCallback(interaction, { type: 5, data: { flags: 64 } });
      await dmMissingTicketColumn(userId);
      await discordApi(`/channels/${TICKET_LOG_CHANNEL_ID}/messages/${String(interaction.message?.id || "")}`, { method: "PATCH", body: JSON.stringify({ components: [], embeds: [{ ...(interaction.message?.embeds?.[0] || {}), title: "✅ Ticket Log Cancelled — Column Confirmation", description: `${String(interaction.message?.embeds?.[0]?.description || "")}\n\n**Logistics confirmed:** The Tickets column has been added. The submitter was DM'd to submit the ticket log again.`, color: 0x57f287 }] }) });
      return interactionFollowup(interaction, { content: `✅ Confirmed. <@${userId}> has been DM'd to submit the ticket log again. Request: ${requestId}`, flags: 64 });
    } catch (error) {
      console.error("[ticket] missing-column confirmation failed", { requestId, userId, error });
      try { await interactionFollowup(interaction, { content: `⚠️ Could not notify the submitter: ${error instanceof Error ? error.message : "unknown error"}`, flags: 64 }); } catch {}
      return new Response(null, { status: 204 });
    }
  }

  const approve = customId.match(/^ticket:approve:([0-9a-f-]{36}):([0-9a-f]{24})$/i);
  const reject = customId.match(/^ticket:reject:([0-9a-f-]{36}):([0-9a-f]{24})$/i);
  const match = approve || reject;
  if (!match) return jsonResponse(ephemeral("Unknown ticket action."));
  if (!canReview(interaction)) return jsonResponse(ephemeral(`Only Logistics or an approved tester can ${approve ? "approve" : "reject"} ticket logs.`));
  const messageId = String(interaction?.message?.id || "");
  if (String(interaction.channel_id) !== TICKET_CHANNEL_ID || !messageId) return jsonResponse(ephemeral("⚠️ Invalid ticket review message."));
  return jsonResponse(approve ? approveModal(match[1], match[2].toLowerCase(), messageId) : rejectModal(match[1], match[2].toLowerCase(), messageId));
}

async function finishApproval(interaction: any, match: RegExpMatchArray) {
  if (!canReview(interaction)) return jsonResponse(ephemeral("Only Logistics or an approved tester can approve ticket logs."));
  if (String(interaction.channel_id) !== TICKET_CHANNEL_ID) return jsonResponse(ephemeral("⚠️ Invalid ticket review channel."));
  if (String(modalValues(interaction).confirm || "") !== "APPROVE") return jsonResponse(ephemeral("Approval cancelled. Type exactly APPROVE to confirm."));
  let claimed = false; let sheetUpdated = false;
  try {
    await interactionCallback(interaction, { type: 5, data: { flags: 64 } });
    const requestId = match[1]; const signature = match[2].toLowerCase(); const messageId = match[3];
    const state = await getTicketRequestState(requestId);
    if (state !== "pending") return interactionFollowup(interaction, { content: `⚠️ This ticket log is no longer pending (status: ${state || "not found"}).`, flags: 64 });
    const original = await getAndValidateReviewMessage(messageId, requestId, signature);
    if (!original) return interactionFollowup(interaction, { content: "⚠️ This ticket approval request is invalid, outdated, or no longer pending.", flags: 64 });
    claimed = await claimTicketApproval(requestId, interaction.id, interactionUserId(interaction), interactionUsername(interaction));
    if (!claimed) return interactionFollowup(interaction, { content: "⚠️ This ticket log is already being processed or has been completed.", flags: 64 });
    const approverId = interactionUserId(interaction); const approverName = interactionDisplayName(interaction) || approverId;
    if (original.request.program === "internship") await processInternshipTicketDirect({ userId: original.request.userId, username: original.request.username, tickets: original.request.tickets, requestId: original.request.id, proof: original.request.proof, approvedBy: approverId, approvedByUsername: approverName });
    else await processTicketDirect({ userId: original.request.userId, username: original.request.username, tickets: original.request.tickets, requestId: original.request.id, proof: original.request.proof, approvedBy: approverId, approvedByUsername: approverName });
    sheetUpdated = true;
    await markTicketApproved(requestId);
    await postApprovalLog(original.request, approverId, approverName);
    await markReviewMessage(messageId, original.message, "Approved");
    await interactionFollowup(interaction, { content: original.request.program === "internship" ? `✅ ${original.request.tickets} Internship Program ticket${original.request.tickets === 1 ? "" : "s"} approved and added to QUSM Interns.` : `✅ ${original.request.tickets} ticket${original.request.tickets === 1 ? "" : "s"} approved and added to the Staff Database.`, flags: 64 });
  } catch (error) {
    console.error("[ticket] approval failed", { interactionId: interaction.id, error });
    if (claimed && !sheetUpdated) { try { await releaseTicketApproval(match[1]); } catch (releaseError) { console.error("[ticket] failed to release approval claim", { requestId: match[1], releaseError }); } }
    try { await interactionFollowup(interaction, { content: `⚠️ Ticket log approval failed: ${error instanceof Error ? error.message : "unknown error"}`, flags: 64 }); } catch {}
  }
  return new Response(null, { status: 204 });
}

async function finishRejection(interaction: any, match: RegExpMatchArray) {
  if (!canReview(interaction)) return jsonResponse(ephemeral("Only Logistics or an approved tester can reject ticket logs."));
  if (String(interaction.channel_id) !== TICKET_CHANNEL_ID) return jsonResponse(ephemeral("⚠️ Invalid ticket review channel."));
  const reason = String(modalValues(interaction).reason || "").trim();
  if (!reason) return jsonResponse(ephemeral("A rejection reason is required."));
  try {
    await interactionCallback(interaction, { type: 5, data: { flags: 64 } });
    const requestId = match[1]; const signature = match[2].toLowerCase(); const messageId = match[3];
    const state = await getTicketRequestState(requestId);
    if (state !== "pending") return interactionFollowup(interaction, { content: `⚠️ This ticket log is no longer pending (status: ${state || "not found"}).`, flags: 64 });
    const original = await getAndValidateReviewMessage(messageId, requestId, signature);
    if (!original) return interactionFollowup(interaction, { content: "⚠️ This ticket rejection request is invalid, outdated, or no longer pending.", flags: 64 });
    if (!await markTicketRejected(requestId)) return interactionFollowup(interaction, { content: "⚠️ This ticket log is already being processed or has been completed.", flags: 64 });
    const rejectedBy = interactionUserId(interaction); const rejectedByUsername = interactionDisplayName(interaction) || rejectedBy;
    await postRejectionLog(original.request, reason, rejectedBy, rejectedByUsername);
    await dmRejection(original.request.userId, reason, original.request.tickets);
    await markReviewMessage(messageId, original.message, "Rejected", reason);
    await interactionFollowup(interaction, { content: original.request.program === "internship" ? `❌ ${original.request.tickets} Internship Program ticket${original.request.tickets === 1 ? "" : "s"} rejected.` : `❌ ${original.request.tickets} ticket${original.request.tickets === 1 ? "" : "s"} rejected.`, flags: 64 });
  } catch (error) {
    console.error("[ticket] rejection failed", { interactionId: interaction.id, error });
    try { await interactionFollowup(interaction, { content: `⚠️ Ticket log rejection failed: ${error instanceof Error ? error.message : "unknown error"}`, flags: 64 }); } catch {}
  }
  return new Response(null, { status: 204 });
}

export async function handleTicketPost(interaction: any) {
  if (interaction.guild_id !== STAFF_GUILD_ID) return jsonResponse(ephemeral("This ticket system is only available in the Staff Team server."));
  if (interaction.type === 2 && interaction.data?.name === "ticket-log") return handleSubmit(interaction);
  if (interaction.type === 3) return handleButton(interaction);
  if (interaction.type === 5) {
    const customId = String(interaction?.data?.custom_id || "");
    const approval = customId.match(/^tac:([0-9a-f-]{36}):([0-9a-f]{24}):(\d+)$/i);
    if (approval) return finishApproval(interaction, approval);
    const rejection = customId.match(/^trj:([0-9a-f-]{36}):([0-9a-f]{24}):(\d+)$/i);
    if (rejection) return finishRejection(interaction, rejection);
  }
  return jsonResponse(ephemeral("Unsupported ticket interaction."));
}
