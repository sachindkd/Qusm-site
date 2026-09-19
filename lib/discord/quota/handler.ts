import { after } from "next/server";
import { randomUUID } from "node:crypto";
import { getQuotaLeaderboard, processInternshipQuotaDirect, processQuotaDirect } from "@/lib/quota-sheets";
import { attachQuotaMessage, claimQuotaApproval, createQuotaRequest, getQuotaRequestState, getQuotaReviewById, markQuotaApproved, markQuotaRejected, releaseQuotaApproval } from "@/lib/quota-state";
import { INTERNSHIP_ROLE_ID, LOGISTICS_ROLE_ID, QUOTA_CHANNEL_ID, STAFF_GUILD_ID, STAFF_ROLE_ID, TESTER_ROLE_ID } from "./config";
import { discordApi, ephemeral, getGuildMember, hasMemberRole, hasRole, interactionCallback, interactionFollowup, interactionFollowupFile, jsonResponse, modalValues, option } from "./discord-api";
import { approveModal, dmRejection, getAndValidateReviewMessage, postApprovalLog, postRejectionLog, postReviewMessage, rejectModal } from "./messages";
import { registerQuotaCommands } from "./commands";
import { registerTicketCommands } from "@/lib/discord/tickets/commands";
import { interactionDisplayName, interactionUserId, interactionUsername, type QuotaRequest } from "./types";
import { quotaSignature } from "./security";
import { findPossibleQuotaDuplicates, getQuotaStatus, getPendingQuotaSummary } from "./admin";
import { botSecurityStatus, scanBotSecurity, startBotSecurity, stopBotSecurity } from "@/lib/discord/botsecurity";
import { buildPerformanceReport, checkPerformanceReportLimit, isStaffHighcom } from "@/lib/discord/performance";

export async function handleGet() { try { await registerQuotaCommands(); await registerTicketCommands(); return jsonResponse({ success: true, commands: ["/quota-submit", "/quota-leaderboard", "/ticket-log", "/staff-performance", "/logistics-performance", "/botsecurity"] }); } catch (error) { console.error("[quota] command registration failed", error); return jsonResponse({ success: false, error: error instanceof Error ? error.message : "unknown error" }, 500); } }
async function handleBotSecurity(interaction: any) { if (!hasRole(interaction, STAFF_ROLE_ID) && !hasRole(interaction, TESTER_ROLE_ID)) return jsonResponse(ephemeral("You need Staff Team access to use bot security.")); const sub = String(option(interaction, "subcommand")?.value || interaction?.data?.options?.[0]?.name || ""); try { if (sub === "scan") { const bots = await scanBotSecurity(String(interaction.guild_id)); return jsonResponse(ephemeral(`🛡️ Bot Security Scan\nFound **${bots.length}** bot(s).\n\n${bots.length ? bots.map((b: any) => `🤖 **${b.username}** — Risk **${b.risk}/100**`).join("\n") : "No bots found."}`)); } if (sub === "monitor") { const state = await startBotSecurity(String(interaction.guild_id), String(interaction.channel_id)); return jsonResponse(ephemeral(`🛡️ Bot Security Monitor is **ON**. Alerts will be associated with <#${state.channel}>.`)); } if (sub === "stop") { stopBotSecurity(String(interaction.guild_id)); return jsonResponse(ephemeral("🛡️ Bot Security Monitor is **OFF**.")); } const state = botSecurityStatus(String(interaction.guild_id)); return jsonResponse(ephemeral(`🛡️ Bot Security Status\nMonitoring: **${state.enabled ? "ON" : "OFF"}**\nAlert channel: ${state.channel ? `<#${state.channel}>` : "Not set"}`)); } catch (error) { return jsonResponse(ephemeral(`⚠️ Bot security failed: ${error instanceof Error ? error.message : "unknown error"}`)); } }
async function handleLeaderboard(interaction: any) { if (!hasRole(interaction, STAFF_ROLE_ID)) return jsonResponse(ephemeral("You need the Staff Team server staff role to view the leaderboard.")); try { await interactionCallback(interaction, { type: 5, data: { flags: 64 } }); const rows = await getQuotaLeaderboard(); const embeds: any[] = []; for (let offset = 0; offset < rows.length; offset += 25) { const chunk = rows.slice(offset, offset + 25); embeds.push({ title: offset === 0 ? "QUSM Staff Leaderboard" : "QUSM Staff Leaderboard — Continued", description: chunk.map((row: any, index: number) => `${offset + index + 1}. **${row.username}** — ${row.minutes} min · ${row.tickets} ticket${row.tickets === 1 ? "" : "s"}${row.rank ? ` · ${row.rank}` : ""}`).join("\n"), footer: { text: "Ranking priority: Quota Time first, Tickets second" } }); } await interactionFollowup(interaction, { content: rows.length ? undefined : "No staff records were found in the Google Staff Database.", embeds: embeds.slice(0, 10), flags: 64 }); } catch (error) { console.error("[quota] leaderboard failed", error); try { await interactionFollowup(interaction, { content: "⚠️ Could not load the leaderboard.", flags: 64 }); } catch {} } return new Response(null, { status: 204 }); }
async function handleSubmit(interaction: any) { const internship = hasRole(interaction, INTERNSHIP_ROLE_ID); if (!internship && !hasRole(interaction, STAFF_ROLE_ID)) return jsonResponse(ephemeral("You need the Staff Team role or Internship Program role to submit quota.")); try { await interactionCallback(interaction, { type: 5, data: { flags: 64 } }); const minutes = Number(option(interaction, "minutes")?.value); const proofId = String(option(interaction, "proof")?.value || ""); const notes = String(option(interaction, "notes")?.value || "").trim(); const attachment = interaction?.data?.resolved?.attachments?.[proofId]; const proof = String(attachment?.url || ""); const proofName = String(attachment?.filename || "Proof image"); const contentType = String(attachment?.content_type || "").toLowerCase(); if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 100000 || !proof || (contentType && !contentType.startsWith("image/"))) return interactionFollowup(interaction, { content: "Invalid quota submission. Minutes must be positive and proof must be an image.", flags: 64 }); const request: QuotaRequest = { id: randomUUID(), userId: interactionUserId(interaction), username: interactionUsername(interaction), quota: Math.round(minutes), proof, proofName, notes, createdAt: new Date().toISOString(), ...(internship ? { program: "internship" as const } : {}) }; const duplicates = await findPossibleQuotaDuplicates(request.userId, request.quota, request.program); await createQuotaRequest({ requestId: request.id, userId: request.userId, username: request.username, minutes: request.quota, signature: quotaSignature(request), program: request.program }); const message = await postReviewMessage(request, interactionDisplayName(interaction), duplicates.map(d => ({ requestId: d.requestId, status: d.status }))); await attachQuotaMessage(request.id, String(message.id)); await interactionFollowup(interaction, { content: internship ? `✅ Your ${request.quota} minute Internship Program quota was submitted to Logistics for review.` : `✅ Your ${request.quota} minute quota was submitted to Logistics for review.`, flags: 64 }); } catch (error) { console.error("[quota] submit failed", { interactionId: interaction.id, error }); try { await interactionFollowup(interaction, { content: `⚠️ Could not submit your quota: ${error instanceof Error ? error.message : "unknown error"}`, flags: 64 }); } catch {} } return new Response(null, { status: 204 }); }
function canReview(interaction: any) { return hasRole(interaction, LOGISTICS_ROLE_ID) || hasRole(interaction, TESTER_ROLE_ID); }

function quotaReviewButtons(requestId: string, signature: string, messageId: string) {
  return [{ type: 1, components: [
    { type: 2, style: 3, label: "Approve", custom_id: "quota:approve:" + requestId + ":" + signature + ":" + messageId },
    { type: 2, style: 4, label: "Reject", custom_id: "quota:reject:" + requestId + ":" + signature + ":" + messageId },
    { type: 2, style: 2, label: "Dismiss", custom_id: "quota:dismiss:" + requestId + ":" + messageId },
  ] }];
}
async function markReviewMessage(messageId: string, originalMessage: any, status: "Approved" | "Rejected", reason?: string) { const embed = originalMessage?.embeds?.[0]; if (!embed) return; await discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages/${messageId}`, { method: "PATCH", body: JSON.stringify({ components: [], embeds: [{ ...embed, title: `${String(embed.title || "Quota Submission").replace(" — Pending Review", "")} — ${status}`, description: `${String(embed.description || "").split("\n")[0]}\n\n**Status: ${status}**${reason ? `\n**Reason:** ${reason}` : ""}` }] }) }); }
async function handleButton(interaction: any) {
  const customId = String(interaction?.data?.custom_id || "");
  const approve = customId.match(/^quota:approve:([0-9a-f-]{36}):([0-9a-f]{24})$/i);
  const reject = customId.match(/^quota:reject:([0-9a-f-]{36}):([0-9a-f]{24})$/i);
  const dismiss = customId.match(/^quota:dismiss:([0-9a-f-]{36}):([0-9]{10,25})$/i);
  if (dismiss) {
    if (!hasRole(interaction, LOGISTICS_ROLE_ID)) return jsonResponse(ephemeral("Only Logistics can dismiss quota reviews."));
    return jsonResponse({ type: 7, data: { content: "Review dismissed. The quota remains pending.", components: [] } });
  }
  const match = approve || reject;
  if (!match) return jsonResponse(ephemeral("Unknown quota action."));
  if (!canReview(interaction)) return jsonResponse(ephemeral("Only Logistics or an approved tester can review quota."));
  const messageId = String(interaction?.message?.id || "");\n  if (!messageId) return jsonResponse(ephemeral("⚠️ Could not identify the quota review message."));\n  return jsonResponse(approve ? approveModal(match[1], match[2].toLowerCase(), messageId) : rejectModal(match[1], match[2].toLowerCase(), messageId));
}
async function getLiveProgram(request: QuotaRequest, guildId: string) { const member = await getGuildMember(guildId, request.userId); return hasMemberRole(member, INTERNSHIP_ROLE_ID) ? ("internship" as const) : undefined; }
async function finishApproval(interaction: any, match: RegExpMatchArray) { if (!canReview(interaction)) return jsonResponse(ephemeral("Only Logistics or an approved tester can approve quota.")); if (String(interaction.channel_id) !== QUOTA_CHANNEL_ID) return jsonResponse(ephemeral("⚠️ Invalid quota review channel.")); const values = modalValues(interaction); if (String(values.confirm || "") !== "APPROVE") return jsonResponse(ephemeral("Approval cancelled. Type exactly APPROVE to confirm.")); let claimed = false; let sheetUpdated = false; try { await interactionCallback(interaction, { type: 5, data: { flags: 64 } }); const requestId = match[1]; const signature = match[2].toLowerCase(); const messageId = match[3]; const state = await getQuotaRequestState(requestId); if (state !== "pending") return interactionFollowup(interaction, { content: `⚠️ This quota request is no longer pending (status: ${state || "not found"}).`, flags: 64 }); const original = await getAndValidateReviewMessage(messageId, requestId, signature); if (!original) return interactionFollowup(interaction, { content: "⚠️ This quota approval request is invalid, outdated, or no longer pending.", flags: 64 }); claimed = await claimQuotaApproval(requestId, interaction.id, interactionUserId(interaction), interactionUsername(interaction)); if (!claimed) return interactionFollowup(interaction, { content: "⚠️ This quota request is already being processed or has been completed.", flags: 64 }); const approverId = interactionUserId(interaction); const approverName = interactionDisplayName(interaction) || approverId; const liveProgram = await getLiveProgram(original.request, STAFF_GUILD_ID); const effectiveRequest: QuotaRequest = { ...original.request, ...(liveProgram ? { program: liveProgram } : {}) }; if (liveProgram === "internship") { await processInternshipQuotaDirect({ userId: effectiveRequest.userId, username: effectiveRequest.username, minutes: effectiveRequest.quota, requestId: effectiveRequest.id, proof: effectiveRequest.proof, approvedBy: approverId, approvedByUsername: approverName }); } else { await processQuotaDirect({ userId: effectiveRequest.userId, username: effectiveRequest.username, minutes: effectiveRequest.quota, requestId: effectiveRequest.id, proof: effectiveRequest.proof, approvedBy: approverId, approvedByUsername: approverName }); } sheetUpdated = true; await markQuotaApproved(requestId); await postApprovalLog(effectiveRequest, approverId, approverName); await markReviewMessage(messageId, original.message, "Approved"); await interactionFollowup(interaction, { content: liveProgram === "internship" ? `✅ ${effectiveRequest.quota} Internship Program minutes approved and added to QUSM Interns.` : `✅ ${effectiveRequest.quota} minutes approved and added to the Staff Database.`, flags: 64 }); } catch (error) { console.error("[quota] approval failed", { interactionId: interaction.id, error }); if (claimed && !sheetUpdated) { try { await releaseQuotaApproval(match[1]); } catch {} } try { await interactionFollowup(interaction, { content: `⚠️ Quota approval failed: ${error instanceof Error ? error.message : "unknown error"}`, flags: 64 }); } catch {} } return new Response(null, { status: 204 }); }
async function finishRejection(interaction: any, match: RegExpMatchArray) { if (!canReview(interaction)) return jsonResponse(ephemeral("Only Logistics or an approved tester can reject quota.")); if (String(interaction.channel_id) !== QUOTA_CHANNEL_ID) return jsonResponse(ephemeral("⚠️ Invalid quota review channel.")); const reason = String(modalValues(interaction).reason || "").trim(); if (!reason) return jsonResponse(ephemeral("A rejection reason is required.")); try { await interactionCallback(interaction, { type: 5, data: { flags: 64 } }); const requestId = match[1]; const signature = match[2].toLowerCase(); const messageId = match[3]; const state = await getQuotaRequestState(requestId); if (state !== "pending") return interactionFollowup(interaction, { content: `⚠️ This quota request is no longer pending (status: ${state || "not found"}).`, flags: 64 }); const original = await getAndValidateReviewMessage(messageId, requestId, signature); if (!original) return interactionFollowup(interaction, { content: "⚠️ This quota rejection request is invalid, outdated, or no longer pending.", flags: 64 }); if (!await markQuotaRejected(requestId, interactionUserId(interaction), interactionDisplayName(interaction))) return interactionFollowup(interaction, { content: "⚠️ This quota request is already being processed or has been completed.", flags: 64 }); const rejectedBy = interactionUserId(interaction); const rejectedByUsername = interactionDisplayName(interaction) || rejectedBy; const liveProgram = await getLiveProgram(original.request, STAFF_GUILD_ID); const effectiveRequest: QuotaRequest = { ...original.request, ...(liveProgram ? { program: liveProgram } : {}) }; await postRejectionLog(effectiveRequest, reason, rejectedBy, rejectedByUsername); await dmRejection(effectiveRequest.userId, reason, effectiveRequest.quota); await markReviewMessage(messageId, original.message, "Rejected", reason); await interactionFollowup(interaction, { content: liveProgram === "internship" ? `❌ ${effectiveRequest.quota} Internship Program minutes rejected.` : `❌ ${effectiveRequest.quota} minute quota rejected.`, flags: 64 }); } catch (error) { console.error("[quota] rejection failed", { interactionId: interaction.id, error }); try { await interactionFollowup(interaction, { content: `⚠️ Quota rejection failed: ${error instanceof Error ? error.message : "unknown error"}`, flags: 64 }); } catch {} } return new Response(null, { status: 204 }); }
async function handleQuotaStatus(interaction: any) {
  if (!hasRole(interaction, LOGISTICS_ROLE_ID)) return jsonResponse(ephemeral("Only Logistics can use /quota-status."));
  const targetUserId = String(option(interaction, "user")?.value || "").trim();
  if (!targetUserId) return jsonResponse(ephemeral("Select a staff member."));
  try {
    await interactionCallback(interaction, { type: 5, data: { flags: 64 } });
    const data = await getQuotaStatus(targetUserId);
    const lines = data.requests.slice(0, 10).map((r: any) => { const when = Math.floor(new Date(r.created_at).getTime() / 1000); return "• `" + r.status.toUpperCase() + "` — **" + r.minutes + " min**" + (r.program === "internship" ? " · Internship" : "") + " — <t:" + when + ":R> — `" + r.request_id.slice(0, 8) + "`"; }).join("\n") || "No quota requests found."; 
    await interactionFollowup(interaction, { content: "**Quota Status — " + (data.username || targetUserId) + "**\n\nPending: **" + data.pending + "** · Approved: **" + data.approved + "** · Rejected: **" + data.rejected + "**\n\n" + lines, flags: 64, allowed_mentions: { parse: [] } });
  } catch (error) { try { await interactionFollowup(interaction, { content: "⚠️ Could not load quota status: " + (error instanceof Error ? error.message : "unknown error"), flags: 64 }); } catch {} }
  return new Response(null, { status: 204 });
}

async function handleQuotaReview(interaction: any) {
  if (!hasRole(interaction, LOGISTICS_ROLE_ID)) return jsonResponse(ephemeral("Only Logistics can use /quota-review."));
  const requestId = String(option(interaction, "request_id")?.value || "").trim();
  if (!requestId) return jsonResponse(ephemeral("Enter the quota request ID."));
  try {
    await interactionCallback(interaction, { type: 5, data: { flags: 64 } });
    const row: any = await getQuotaReviewById(requestId);
    if (!row) return interactionFollowup(interaction, { content: "⚠️ Quota request not found.", flags: 64 });
    if (row.status !== "pending") return interactionFollowup(interaction, { content: "⚠️ Request " + requestId + " is **" + row.status + "** and is no longer awaiting approval.", flags: 64 });
    if (!row.message_id) return interactionFollowup(interaction, { content: "⚠️ This request has no Logistics review message attached.", flags: 64 });
    await discordApi("/channels/" + QUOTA_CHANNEL_ID + "/messages/" + row.message_id);
    const jumpUrl = "https://discord.com/channels/" + STAFF_GUILD_ID + "/" + QUOTA_CHANNEL_ID + "/" + row.message_id;
    await interactionFollowup(interaction, {
      content: "📋 **Quota Review**\n\n**Request ID:** `" + row.request_id + "`\n**Member:** <@" + row.user_id + "> (" + row.username + ")\n**Quota:** **" + row.minutes + " min**" + (row.program === "internship" ? " · Internship Program" : "") + "\n**Status:** **Pending**\n\n[Jump to Logistics approval message](" + jumpUrl + ")",
      components: quotaReviewButtons(String(row.request_id), String(row.signature), String(row.message_id)),
      flags: 64,
      allowed_mentions: { parse: [] },
    });
  } catch (error) {
    try { await interactionFollowup(interaction, { content: "⚠️ Could not open quota review: " + (error instanceof Error ? error.message : "unknown error"), flags: 64 }); } catch {}
  }
  return new Response(null, { status: 204 });
}

async function handleQuotaSummary(interaction: any) {
  if (!hasRole(interaction, LOGISTICS_ROLE_ID)) return jsonResponse(ephemeral("Only Logistics can use /quota-summary."));
  try {
    await interactionCallback(interaction, { type: 5, data: { flags: 64 } });
    const rows = await getPendingQuotaSummary();
    const now = Date.now();
    const overdue = rows.filter((r: any) => now - new Date(r.created_at).getTime() >= 24 * 60 * 60 * 1000);
    const lines = overdue.slice(0, 40).map((r: any) => "• <@" + r.user_id + "> — **" + r.minutes + " min** — waiting " + Math.floor((now - new Date(r.created_at).getTime()) / 3600000) + "h — `" + r.request_id.slice(0, 8) + "`").join("\n") || "No pending quotas over 24 hours."; 
    await interactionFollowup(interaction, { content: "**Daily Pending Quota Summary**\n\nPending total: **" + rows.length + "**\nOver 24h: **" + overdue.length + "**\n\n" + lines, flags: 64, allowed_mentions: { parse: [] } });
  } catch (error) { try { await interactionFollowup(interaction, { content: "⚠️ Could not load quota summary: " + (error instanceof Error ? error.message : "unknown error"), flags: 64 }); } catch {} }
  return new Response(null, { status: 204 });
}
async function handleAskAi(interaction: any) {
  if (!isStaffHighcom(interaction)) return jsonResponse(ephemeral("Only COS+ can use /ask-ai."));
  const question = String(option(interaction, "question")?.value || "").trim();
  const targetUserId = String(option(interaction, "user")?.value || "").trim();
  const resolvedUser = targetUserId ? interaction?.data?.resolved?.users?.[targetUserId] : null;
  const targetUsername = resolvedUser?.global_name || resolvedUser?.username || "";
  if (!question) return jsonResponse(ephemeral("Please provide a question."));
  if (question.length > 1500) return jsonResponse(ephemeral("Question is too long. Maximum is 1,500 characters."));

  after(async () => {
    try {
      const { askPerformanceAI } = await import("@/lib/discord/performance");
      const result = await askPerformanceAI(interactionUserId(interaction), question, targetUserId || undefined, targetUsername || undefined);
      const targetLabel = targetUsername ? ` about **${targetUsername}**` : "";
      await interactionFollowup(interaction, {
        content: `🤖 **QUSM COS+ AI**${targetLabel}\\n\\n${result.answer}\\n\\n*Source: current QUSM staff/report data · AI: ${result.provider}*`,
        flags: 64,
        allowed_mentions: { parse: [] },
      });
    } catch (error) {
      console.error("[ask-ai] failed", { interactionId: interaction.id, error });
      try {
        await interactionFollowup(interaction, {
          content: `⚠️ /ask-ai could not answer: ${error instanceof Error ? error.message : "unknown error"}`,
          flags: 64,
        });
      } catch (followupError) {
        console.error("[ask-ai] followup failed", { interactionId: interaction.id, error: followupError });
      }
    }
  });

  return jsonResponse({ type: 5, data: { flags: 64 } });
}

async function handlePerformanceReport(interaction: any, kind: "staff" | "logistics") {
  if (!isStaffHighcom(interaction)) {
    return jsonResponse(ephemeral("Only COS+ can use performance reports."));
  }
  const limit = checkPerformanceReportLimit(interactionUserId(interaction), kind);
  if (!limit.allowed) {
    const label = kind === "staff" ? "staff" : "logistics";
    return jsonResponse(ephemeral("You have reached the /" + label + "-performance limit of 2 reports per 5 hours. Try again in about " + limit.retryMinutes + " minute(s)."));
  }
  try {
    await interactionCallback(interaction, { type: 5, data: { flags: 64 } });
    const report = await buildPerformanceReport(kind);
    const title = kind === "staff" ? "Staff Performance Report" : "Logistics Performance Report";
    const header = report.ai ? "🤖 AI analysis completed." : "📊 Data analysis completed (AI unavailable).";
    const filename = `QUSM_${kind === "staff" ? "Staff" : "Logistics"}_Performance_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    const fileContent = [
      `QUSM ${title.toUpperCase()}`,
      `Generated: ${report.data.generatedAt}`,
      `Analysis: ${report.ai ? `AI (${report.provider}) + database data` : "Database data only"}`,
      "",
      report.text.replace(/\\*\\*/g, ""),
    ].join("\\n");
    await interactionFollowupFile(interaction, {
      content: `✅ **${title} generated.** ${header}\\n📄 Full report attached as \`${filename}\`.`,
      flags: 64,
      allowed_mentions: { parse: [] },
    }, filename, fileContent);
  } catch (error) {
    console.error("[performance] report failed", { kind, interactionId: interaction.id, error });
    try {
      await interactionFollowup(interaction, {
        content: `⚠️ Could not generate the ${kind} performance report: ${error instanceof Error ? error.message : "unknown error"}`,
        flags: 64,
      });
    } catch {}
  }
  return new Response(null, { status: 204 });
}

export async function handlePost(interaction: any) { if (interaction.type === 1) return jsonResponse({ type: 1 }); if (interaction.guild_id !== STAFF_GUILD_ID) return jsonResponse(ephemeral("This quota system is only available in the Staff Team server.")); if (interaction.type === 2 && interaction.data?.name === "quota-status") return handleQuotaStatus(interaction); if (interaction.type === 2 && interaction.data?.name === "quota-summary") return handleQuotaSummary(interaction); if (interaction.type === 2 && interaction.data?.name === "quota-review") return handleQuotaReview(interaction); if (interaction.type === 2 && interaction.data?.name === "ask-ai") return handleAskAi(interaction); if (interaction.type === 2 && interaction.data?.name === "staff-performance") return handlePerformanceReport(interaction, "staff");
  if (interaction.type === 2 && interaction.data?.name === "logistics-performance") return handlePerformanceReport(interaction, "logistics");
  if (interaction.type === 2 && interaction.data?.name === "botsecurity") return handleBotSecurity(interaction); if (interaction.type === 2 && interaction.data?.name === "quota-leaderboard") return handleLeaderboard(interaction); if (interaction.type === 2 && interaction.data?.name === "quota-submit") return handleSubmit(interaction); if (interaction.type === 3) return handleButton(interaction); if (interaction.type === 5) { const customId = String(interaction?.data?.custom_id || ""); const approval = customId.match(/^qac:([0-9a-f-]{36}):([0-9a-f]{24}):(\d+)$/i); if (approval) return finishApproval(interaction, approval); const rejection = customId.match(/^qrj:([0-9a-f-]{36}):([0-9a-f]{24}):(\d+)$/i); if (rejection) return finishRejection(interaction, rejection); } return jsonResponse(ephemeral("Unsupported quota interaction.")); }
