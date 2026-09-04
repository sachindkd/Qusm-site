import { createHmac, createPublicKey, randomUUID, verify } from "node:crypto";
import { getQuotaLeaderboard, processQuotaDirect } from "@/lib/quota-sheets";
import { attachQuotaMessage, claimQuotaApproval, createQuotaRequest, getQuotaRequestState, markQuotaApproved, markQuotaRejected } from "@/lib/quota-state";

const STAFF_GUILD_ID = "1539736452995350528";
const STAFF_ROLE_ID = "1539751393139626044";
const LOGISTICS_ROLE_ID = "1539908119067492427";
const TESTER_ROLE_ID = "1540499074061439006";
const QUOTA_CHANNEL_ID = "1545116182858965046";
const QUOTA_LOG_CHANNEL_ID = "1539785260923879505";
const LEADERBOARD_ROLE_ID = STAFF_ROLE_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim();
const APPLICATION_ID = (process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID || "").trim();
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY?.trim();
const encoder = new TextEncoder();

type QuotaRequest = { id: string; userId: string; username: string; quota: number; proof: string; proofName: string; notes: string; createdAt: string };
function secret() { const value = process.env.NEXTAUTH_SECRET; if (!value || value.length < 32) throw new Error("NEXTAUTH_SECRET is not configured"); return value; }
function hmac(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }
function requestSignature(request: QuotaRequest) { return hmac(JSON.stringify({ id: request.id, userId: request.userId, username: request.username, quota: request.quota, proof: request.proof, proofName: request.proofName, notes: request.notes })); }
function publicKey() { if (!PUBLIC_KEY) throw new Error("DISCORD_PUBLIC_KEY is not configured"); const raw = Buffer.from(PUBLIC_KEY, "hex"); if (raw.length !== 32) throw new Error("Invalid Discord public key"); return createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]), format: "der", type: "spki" }); }
function verifyDiscordSignature(body: string, timestamp: string, signature: string) { try { return verify(null, encoder.encode(timestamp + body), publicKey(), Buffer.from(signature, "hex")); } catch { return false; } }
function roles(interaction: any): string[] { return Array.isArray(interaction?.member?.roles) ? interaction.member.roles : []; }
function hasRole(interaction: any, roleId: string) { return roles(interaction).includes(roleId); }
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }); }
function ephemeral(content: string) { return { type: 4, data: { content, flags: 64 } }; }
function option(interaction: any, name: string) { return (interaction?.data?.options || []).find((item: any) => item?.name === name); }
async function discordApi(path: string, init: RequestInit = {}) { if (!BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN is not configured"); const response = await fetch(`https://discord.com/api/v10${path}`, { ...init, headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json", ...(init.headers || {}) }, cache: "no-store" }); const text = await response.text(); if (!response.ok) throw new Error(`Discord API ${response.status}: ${text.slice(0, 300)}`); return text ? JSON.parse(text) : {}; }
async function ensureQuotaCommandsRegistered() { if (!APPLICATION_ID || !BOT_TOKEN) throw new Error("Discord application credentials are not configured"); const base = `/applications/${APPLICATION_ID}/guilds/${STAFF_GUILD_ID}/commands`; const payloads = [{ name: "quota-submit", description: "Submit staff quota with a proof image", type: 1, options: [{ type: 4, name: "minutes", description: "Quota completed in minutes", required: true, min_value: 1, max_value: 100000 }, { type: 11, name: "proof", description: "Attach the proof image directly", required: true }, { type: 3, name: "notes", description: "Optional notes for Logistics", required: false, max_length: 1000 }] }, { name: "quota-leaderboard", description: "Show the live quota leaderboard in Discord", type: 1, options: [] }]; const commands = await discordApi(base, { method: "GET" }); if (Array.isArray(commands)) for (const command of commands) if (command?.name === "quota" && command?.id) await discordApi(`${base}/${command.id}`, { method: "DELETE" }); for (const payload of payloads) { const existing = Array.isArray(commands) ? commands.find((command: any) => command?.name === payload.name) : null; if (existing?.id) await discordApi(`${base}/${existing.id}`, { method: "PATCH", body: JSON.stringify(payload) }); else await discordApi(base, { method: "POST", body: JSON.stringify(payload) }); } }
function modalValues(interaction: any) { const out: Record<string, string> = {}; for (const row of interaction?.data?.components || []) for (const component of row?.components || []) out[component.custom_id] = String(component.value || ""); return out; }
function confirmApproveModal(requestId: string, signature: string, messageId: string) { return { type: 9, data: { custom_id: `quota_approve_confirm:${requestId}:${signature}:${messageId}`, title: "Confirm Quota Approval", components: [{ type: 1, components: [{ type: 4, custom_id: "confirm", label: "Type APPROVE to confirm", style: 1, required: true, min_length: 7, max_length: 7, placeholder: "APPROVE" }] }] } }; }
function rejectReasonModal(requestId: string, signature: string, messageId: string) { return { type: 9, data: { custom_id: `quota_reject:${requestId}:${signature}:${messageId}`, title: "Reject Quota", components: [{ type: 1, components: [{ type: 4, custom_id: "reason", label: "Reason for rejection", style: 2, required: true, min_length: 2, max_length: 1000, placeholder: "Explain why this quota is being rejected" }] }] } }; }
async function sendQuotaReview(request: QuotaRequest, displayName: string) { const sig = requestSignature(request).slice(0, 24); return discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages`, { method: "POST", body: JSON.stringify({ content: `<@&${LOGISTICS_ROLE_ID}>`, embeds: [{ title: "Quota Submission — Pending Review", description: `<@${request.userId}> submitted a quota for Logistics review.`, fields: [{ name: "Request ID", value: request.id }, { name: "Member", value: `<@${request.userId}> (${request.username})`, inline: true }, { name: "Display Name", value: displayName || request.username, inline: true }, { name: "Quota (minutes)", value: `${request.quota} min`, inline: true }, { name: "Proof", value: `[${request.proofName || "View proof image"}](${request.proof})` }, { name: "Notes", value: request.notes || "—" }], image: { url: request.proof }, footer: { text: "QUSM Quota System • Staff Team" }, timestamp: request.createdAt }], components: [{ type: 1, components: [{ type: 2, style: 3, label: "Approve & Add Minutes", custom_id: `quota:approve:${request.id}:${sig}` }, { type: 2, style: 4, label: "Reject", custom_id: `quota:reject:${request.id}:${sig}` }] }], allowed_mentions: { users: [request.userId], roles: [LOGISTICS_ROLE_ID] } }) }); }
async function sendQuotaApprovalLog(request: QuotaRequest, approvedById: string, approvedByUsername: string) { const allowedUsers = [...new Set([request.userId, approvedById])]; return discordApi(`/channels/${QUOTA_LOG_CHANNEL_ID}/messages`, { method: "POST", body: JSON.stringify({ content: `<@&${LOGISTICS_ROLE_ID}>`, embeds: [{ title: "Quota Approved", description: `<@${request.userId}> quota has been approved and added to the Google Staff Database.`, color: 0x57f287, fields: [{ name: "Staff Member", value: `<@${request.userId}> (${request.username})`, inline: true }, { name: "Minutes Added", value: `${request.quota} min`, inline: true }, { name: "Approved By", value: `<@${approvedById}> (${approvedByUsername})`, inline: true }, { name: "Request ID", value: request.id }, { name: "Proof", value: `[${request.proofName || "View proof image"}](${request.proof})` }, { name: "Notes", value: request.notes || "—" }], image: { url: request.proof }, footer: { text: "QUSM Quota System • Approval Log" }, timestamp: new Date().toISOString() }], allowed_mentions: { users: allowedUsers, roles: [LOGISTICS_ROLE_ID] } }) }); }
async function sendQuotaRejectionLog(request: QuotaRequest, reason: string, rejectedById: string, rejectedByUsername: string) { const allowedUsers = [...new Set([request.userId, rejectedById])]; return discordApi(`/channels/${QUOTA_LOG_CHANNEL_ID}/messages`, { method: "POST", body: JSON.stringify({ content: `<@&${LOGISTICS_ROLE_ID}>`, embeds: [{ title: "Quota Rejected", description: `<@${request.userId}> quota submission has been rejected by Logistics.`, color: 0xed4245, fields: [{ name: "Staff Member", value: `<@${request.userId}> (${request.username})`, inline: true }, { name: "Quota Submitted", value: `${request.quota} min`, inline: true }, { name: "Rejected By", value: `<@${rejectedById}> (${rejectedByUsername})`, inline: true }, { name: "Request ID", value: request.id }, { name: "Reason", value: reason }, { name: "Proof", value: `[${request.proofName || "View proof image"}](${request.proof})` }, { name: "Notes", value: request.notes || "—" }], image: { url: request.proof }, footer: { text: "QUSM Quota System • Rejection Log" }, timestamp: new Date().toISOString() }], allowed_mentions: { users: allowedUsers, roles: [LOGISTICS_ROLE_ID] } }) }); }
function extractRequestFromMessage(message: any, signature: string): QuotaRequest | null { const fields = message?.embeds?.[0]?.fields; if (!Array.isArray(fields)) return null; const values = Object.fromEntries(fields.map((field: any) => [String(field.name), String(field.value || "")])); const id = values["Request ID"]; const member = values["Member"] || ""; const quota = Number(String(values["Quota (minutes)"] || "").replace(/\s*min(?:utes?)?\s*$/i, "")); const proofField = values["Proof"] || ""; const proof = proofField.match(/\((https?:\/\/[^)]+)\)/i)?.[1] || proofField; const proofName = proofField.match(/^\[([^\]]+)\]/)?.[1] || "Proof image"; const notes = values["Notes"] === "—" ? "" : (values["Notes"] || ""); const mention = member.match(/^<@(\d+)>/); const usernameMatch = member.match(/^<@\d+>\s*\(([^\n]*)\)$/); const username = usernameMatch?.[1]?.trim() || ""; if (!id || !mention?.[1] || !username || !Number.isFinite(quota) || quota <= 0 || !/^https?:\/\//i.test(proof)) return null; const request: QuotaRequest = { id, userId: mention[1], username, quota, proof, proofName, notes, createdAt: String(message?.timestamp || new Date().toISOString()) }; return requestSignature(request).slice(0, 24) === signature ? request : null; }
async function getPendingMessage(messageId: string, expectedRequestId: string, signature: string) { const message = await discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages/${messageId}`, { method: "GET" }); const requestData = extractRequestFromMessage(message, signature); const expectedButton = `quota:approve:${expectedRequestId}:${signature}`; const isPending = message?.embeds?.[0]?.title === "Quota Submission — Pending Review" && Array.isArray(message?.components) && message.components.some((row: any) => Array.isArray(row?.components) && row.components.some((component: any) => component?.type === 2 && component?.custom_id === expectedButton)); if (!requestData || requestData.id !== expectedRequestId || !isPending) return null; return { message, requestData }; }
async function followup(interaction: any, payload: any) { if (!APPLICATION_ID) return; const response = await fetch(`https://discord.com/api/v10/webhooks/${APPLICATION_ID}/${interaction.token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" }); if (!response.ok) console.warn("[quota] followup failed", response.status, await response.text()); }
async function sendQuotaLeaderboard(interaction: any) { const rows = await getQuotaLeaderboard(); if (!rows.length) return followup(interaction, { content: "No staff quota records were found in the Google Staff Database.", flags: 64 }); const chunks: any[] = []; for (let i = 0; i < rows.length; i += 25) { const chunk = rows.slice(i, i + 25); chunks.push({ title: i === 0 ? "QUSM Quota Leaderboard" : "QUSM Quota Leaderboard — Continued", color: 0xd4af37, description: chunk.map((row, index) => `${i + index + 1}. **${row.username}** — ${row.minutes} min${row.rank ? ` · ${row.rank}` : ""}`).join("\n"), footer: { text: "Live from QUSM Staff Database • Column E" } }); } await followup(interaction, { embeds: chunks.slice(0, 10), flags: 64 }); }
async function dmRejection(userId: string, reason: string, quota: number) { const dm = await discordApi("/users/@me/channels", { method: "POST", body: JSON.stringify({ recipient_id: userId }) }); await discordApi(`/channels/${dm.id}/messages`, { method: "POST", body: JSON.stringify({ content: `❌ Your **${quota} minute** quota submission has been rejected by Logistics.\n\n**Reason:** ${reason}` }) }); }
function interactionContext(interaction: any) { return { interactionId: String(interaction?.id || ""), interactionType: Number(interaction?.type || 0), userId: String(interaction?.member?.user?.id || interaction?.user?.id || ""), customId: String(interaction?.data?.custom_id || ""), requestId: "" }; }

export async function GET() { try { await ensureQuotaCommandsRegistered(); return json({ success: true, commands: ["/quota-submit", "/quota-leaderboard"], guildId: STAFF_GUILD_ID }); } catch (error) { console.error("Failed to register quota commands", error); return json({ success: false, error: error instanceof Error ? error.message : "unknown error" }, 500); } }

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyDiscordSignature(body, request.headers.get("x-signature-timestamp") || "", request.headers.get("x-signature-ed25519") || "")) return json({ error: "invalid signature" }, 401);
  let interaction: any; try { interaction = JSON.parse(body); } catch { return json({ error: "invalid json" }, 400); }
  const ctx = interactionContext(interaction);
  console.info("[quota] interaction received", ctx);
  if (interaction.type === 1) { try { await ensureQuotaCommandsRegistered(); } catch (error) { console.error("Failed to register quota commands", error); } return json({ type: 1 }); }
  if (interaction.guild_id !== STAFF_GUILD_ID) return json(ephemeral("This quota system is only available in the Staff Team server."));

  if (interaction.type === 2 && interaction.data?.name === "quota-leaderboard") {
    if (!hasRole(interaction, LEADERBOARD_ROLE_ID)) return json(ephemeral("You need the Staff Team server staff role to view the quota leaderboard."));
    if (!APPLICATION_ID) return json(ephemeral("Discord application ID is not configured."));
    try { await fetch(`https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: 5, data: { flags: 64 } }), cache: "no-store" }); await sendQuotaLeaderboard(interaction); } catch (error) { console.error("Quota leaderboard fetch failed", error); await followup(interaction, { content: `⚠️ Could not fetch the live leaderboard: ${error instanceof Error ? error.message : "unknown error"}`, flags: 64 }); } return new Response(null, { status: 204 });
  }

  if (interaction.type === 2 && interaction.data?.name === "quota-submit") {
    if (!hasRole(interaction, STAFF_ROLE_ID)) return json(ephemeral("You need the Staff Team role to submit quota."));
    const minutes = Number(option(interaction, "minutes")?.value); const proofId = String(option(interaction, "proof")?.value || ""); const notes = String(option(interaction, "notes")?.value || "").trim(); const attachment = interaction?.data?.resolved?.attachments?.[proofId]; const proof = String(attachment?.url || "").trim(); const proofName = String(attachment?.filename || "Proof image").trim(); const contentType = String(attachment?.content_type || "").toLowerCase();
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 100000 || !proof || (contentType && !contentType.startsWith("image/"))) return json(ephemeral("Invalid quota submission. Minutes must be positive and proof must be an image."));
    const username = String(interaction?.member?.user?.username || interaction?.user?.username || "").trim(); if (!username) return json(ephemeral("Could not determine your Discord username."));
    const displayName = String(interaction?.member?.nick || interaction?.member?.user?.global_name || username).trim(); const quotaRequest: QuotaRequest = { id: randomUUID(), userId: String(interaction?.member?.user?.id || interaction?.user?.id || ""), username, quota: Math.round(minutes), proof, proofName, notes, createdAt: new Date().toISOString() }; const signature = requestSignature(quotaRequest).slice(0, 24);
    try {
      await createQuotaRequest({ requestId: quotaRequest.id, userId: quotaRequest.userId, username: quotaRequest.username, minutes: quotaRequest.quota, signature });
      const message = await sendQuotaReview(quotaRequest, displayName);
      await attachQuotaMessage(quotaRequest.id, String(message?.id || ""));
    } catch (error) {
      try { await markQuotaRejected(quotaRequest.id); } catch (stateError) { console.error("[quota] failed to cancel unposted request", stateError); }
      console.error("Failed to send quota review", { interactionId: interaction.id, requestId: quotaRequest.id, error });
      return json(ephemeral(`⚠️ Could not send your quota for review: ${error instanceof Error ? error.message : "unknown error"}`));
    }
    return json(ephemeral(`✅ Your ${quotaRequest.quota} minute quota was submitted to Logistics for review.`));
  }

  const customId = String(interaction?.data?.custom_id || "");

  if (interaction.type === 3) {
    const approveMatch = customId.match(/^quota:approve:([0-9a-f-]{36}):([0-9a-f]{24})$/i);
    if (approveMatch) {
      const requestId = approveMatch[1]; const signature = approveMatch[2].toLowerCase();
      console.info("[quota] approve button received", { interactionId: interaction.id, interactionType: interaction.type, userId: ctx.userId, customId, requestId });
      if (!hasRole(interaction, LOGISTICS_ROLE_ID) && !hasRole(interaction, TESTER_ROLE_ID)) return json(ephemeral("Only Logistics or an approved tester can approve quota."));
      if (String(interaction?.channel_id || "") !== QUOTA_CHANNEL_ID) return json(ephemeral("⚠️ This quota approval button is not from the quota review channel."));
      const messageId = String(interaction?.message?.id || ""); if (!messageId) return json(ephemeral("⚠️ This quota request is missing its review message."));
      try { const pending = await getPendingMessage(messageId, requestId, signature); if (!pending) return json(ephemeral("⚠️ This quota request is no longer pending or is invalid.")); return json(confirmApproveModal(requestId, signature, messageId)); }
      catch (error) { console.error("[quota] approve-button validation failed", { interactionId: interaction.id, requestId, error }); return json(ephemeral(`⚠️ Could not validate this quota request: ${error instanceof Error ? error.message : "unknown error"}`)); }
    }

    const rejectMatch = customId.match(/^quota:reject:([0-9a-f-]{36}):([0-9a-f]{24})$/i);
    if (rejectMatch) {
      const requestId = rejectMatch[1]; const signature = rejectMatch[2].toLowerCase();
      console.info("[quota] reject button received", { interactionId: interaction.id, interactionType: interaction.type, userId: ctx.userId, customId, requestId });
      if (!hasRole(interaction, LOGISTICS_ROLE_ID) && !hasRole(interaction, TESTER_ROLE_ID)) return json(ephemeral("Only Logistics or an approved tester can reject quota."));
      const messageId = String(interaction?.message?.id || ""); if (!messageId) return json(ephemeral("⚠️ This quota request is missing its review message."));
      try { const pending = await getPendingMessage(messageId, requestId, signature); if (!pending) return json(ephemeral("⚠️ This quota request is no longer pending or is invalid.")); return json(rejectReasonModal(requestId, signature, messageId)); }
      catch (error) { console.error("[quota] reject-button validation failed", { interactionId: interaction.id, requestId, error }); return json(ephemeral(`⚠️ Could not validate this quota request: ${error instanceof Error ? error.message : "unknown error"}`)); }
    }

    return json(ephemeral("Unknown quota component interaction."));
  }

  if (interaction.type === 5) {
    const approveMatch = customId.match(/^quota_approve_confirm:([0-9a-f-]{36}):([0-9a-f]{24}):(\d+)$/i);
    if (approveMatch) {
      const requestId = approveMatch[1]; const signature = approveMatch[2].toLowerCase(); const messageId = approveMatch[3];
      const confirmation = modalValues(interaction).confirm?.trim().toUpperCase();
      console.info("[quota] approval confirmation received", { interactionId: interaction.id, interactionType: interaction.type, userId: ctx.userId, customId, requestId, confirmationValid: confirmation === "APPROVE" });
      if (!hasRole(interaction, LOGISTICS_ROLE_ID) && !hasRole(interaction, TESTER_ROLE_ID)) return json(ephemeral("Only Logistics or an approved tester can approve quota."));
      if (confirmation !== "APPROVE") return json(ephemeral("Approval cancelled. Type APPROVE exactly to confirm."));
      try {
        const pending = await getPendingMessage(messageId, requestId, signature);
        if (!pending) return json(ephemeral("⚠️ This quota request is no longer pending or is invalid."));
        const state = await getQuotaRequestState(requestId);
        if (!state || state.status !== "pending" || state.message_id !== messageId || state.signature.toLowerCase() !== signature || state.user_id !== pending.requestData.userId || state.username !== pending.requestData.username || Number(state.minutes) !== pending.requestData.quota) {
          console.warn("[quota] approval blocked by persistent state", { interactionId: interaction.id, requestId, state: state?.status || "missing" });
          return json(ephemeral("⚠️ This quota request is no longer pending."));
        }
        const approvedById = ctx.userId; const approvedByUsername = String(interaction?.member?.user?.username || interaction?.user?.username || "Unknown");
        const claimed = await claimQuotaApproval(requestId, String(interaction.id), approvedById, approvedByUsername);
        if (!claimed) return json(ephemeral("⚠️ This quota request has already been processed or is being processed."));
        console.info("[quota] approval execution started", { interactionId: interaction.id, interactionType: interaction.type, userId: approvedById, requestId });
        const sheetResult = await processQuotaDirect({ userId: pending.requestData.userId, username: pending.requestData.username, minutes: pending.requestData.quota, requestId: pending.requestData.id, proof: pending.requestData.proof, approvedBy: approvedById, approvedByUsername });
        console.info("[quota] Sheets update succeeded", { interactionId: interaction.id, requestId, row: sheetResult.row, previousMinutes: sheetResult.previousMinutes, addedMinutes: sheetResult.addedMinutes, totalMinutes: sheetResult.totalMinutes });
        await markQuotaApproved(requestId);
        await sendQuotaApprovalLog(pending.requestData, approvedById, approvedByUsername);
        await discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages/${messageId}`, { method: "PATCH", body: JSON.stringify({ embeds: [{ title: "Quota Submission — Approved", description: `<@${pending.requestData.userId}> quota was approved and added to the Staff Database.`, color: 0x57f287, fields: [{ name: "Request ID", value: pending.requestData.id }, { name: "Member", value: `<@${pending.requestData.userId}> (${pending.requestData.username})`, inline: true }, { name: "Quota (minutes)", value: `${pending.requestData.quota} min`, inline: true }, { name: "Approved By", value: `<@${approvedById}> (${approvedByUsername})`, inline: true }], image: { url: pending.requestData.proof }, footer: { text: "QUSM Quota System • Approved" }, timestamp: new Date().toISOString() }], components: [] }) });
        console.info("[quota] approval completed", { interactionId: interaction.id, requestId });
        return json(ephemeral(`✅ Quota approved and ${pending.requestData.quota} minutes added for ${pending.requestData.username}.`));
      } catch (error) {
        console.error("[quota] approval failed", { interactionId: interaction.id, interactionType: interaction.type, userId: ctx.userId, customId, requestId, error });
        return json(ephemeral(`⚠️ Quota approval failed: ${error instanceof Error ? error.message : "unknown error"}`));
      }
    }

    const rejectMatch = customId.match(/^quota_reject:([0-9a-f-]{36}):([0-9a-f]{24}):(\d+)$/i);
    if (rejectMatch) {
      if (!hasRole(interaction, LOGISTICS_ROLE_ID) && !hasRole(interaction, TESTER_ROLE_ID)) return json(ephemeral("Only Logistics or an approved tester can reject quota."));
      const requestId = rejectMatch[1]; const signature = rejectMatch[2].toLowerCase(); const messageId = rejectMatch[3]; const reason = modalValues(interaction).reason?.trim();
      if (!reason) return json(ephemeral("⚠️ This quota request is invalid or missing a rejection reason."));
      try {
        const pending = await getPendingMessage(messageId, requestId, signature); if (!pending) return json(ephemeral("⚠️ This quota request is no longer pending or is invalid."));
        const state = await getQuotaRequestState(requestId); if (!state || state.status !== "pending" || state.message_id !== messageId) return json(ephemeral("⚠️ This quota request is no longer pending."));
        await markQuotaRejected(requestId);
        const rejectedById = ctx.userId; const rejectedByUsername = String(interaction?.member?.user?.username || interaction?.user?.username || "Unknown");
        await dmRejection(pending.requestData.userId, reason, pending.requestData.quota); await sendQuotaRejectionLog(pending.requestData, reason, rejectedById, rejectedByUsername); await discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages/${messageId}`, { method: "PATCH", body: JSON.stringify({ embeds: [{ title: "Quota Submission — Rejected", description: `<@${pending.requestData.userId}> quota submission was rejected.`, color: 0xed4245, fields: [{ name: "Request ID", value: pending.requestData.id }, { name: "Member", value: `<@${pending.requestData.userId}> (${pending.requestData.username})`, inline: true }, { name: "Quota (minutes)", value: `${pending.requestData.quota} min`, inline: true }, { name: "Reason", value: reason }], footer: { text: "QUSM Quota System • Rejected" }, timestamp: new Date().toISOString() }], components: [] }) }); return json(ephemeral("❌ Quota rejected and the staff member has been notified."));
      } catch (error) { console.error("[quota] rejection failed", { interactionId: interaction.id, requestId: rejectMatch[1], error }); return json(ephemeral(`⚠️ Quota rejection failed: ${error instanceof Error ? error.message : "unknown error"}`)); }
    }
    return json(ephemeral("Unknown quota modal interaction."));
  }

  return json(ephemeral("Unknown quota interaction."));
}
