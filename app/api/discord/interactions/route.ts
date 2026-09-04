import { createHmac, createPublicKey, randomUUID, verify } from "node:crypto";
import { getQuotaLeaderboard, processQuotaDirect } from "@/lib/quota-sheets";

const STAFF_GUILD_ID = "1539736452995350528";
const STAFF_ROLE_ID = "1539751393139626044";
const LOGISTICS_ROLE_ID = "1539908119067492427";
const TESTER_ROLE_ID = "1540499074061439006";
const QUOTA_CHANNEL_ID = "1545116182858965046";
const QUOTA_LOG_CHANNEL_ID = "1539785260923879505";
const LEADERBOARD_ROLE_ID = "1496561403501219952";
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

async function discordApi(path: string, init: RequestInit) { if (!BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN is not configured"); const response = await fetch(`https://discord.com/api/v10${path}`, { ...init, headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json", ...(init.headers || {}) }, cache: "no-store" }); const text = await response.text(); if (!response.ok) throw new Error(`Discord API ${response.status}: ${text.slice(0, 300)}`); return text ? JSON.parse(text) : {}; }

async function ensureQuotaCommandsRegistered() {
  if (!APPLICATION_ID || !BOT_TOKEN) throw new Error("Discord application credentials are not configured");
  const base = `/applications/${APPLICATION_ID}/guilds/${STAFF_GUILD_ID}/commands`;
  const payloads = [
    { name: "quota-submit", description: "Submit staff quota with a proof image", type: 1, options: [
      { type: 4, name: "minutes", description: "Quota completed in minutes", required: true, min_value: 1, max_value: 100000 },
      { type: 11, name: "proof", description: "Attach the proof image directly", required: true },
      { type: 3, name: "notes", description: "Optional notes for Logistics", required: false, max_length: 1000 }
    ] },
    { name: "quota-leaderboard", description: "Show the live quota leaderboard in Discord", type: 1, options: [] }
  ];
  const commands = await discordApi(base, { method: "GET" });
  const desiredNames = new Set(payloads.map((p) => p.name));
  if (Array.isArray(commands)) {
    for (const command of commands) {
      if (command?.name === "quota" && command?.id) await discordApi(`${base}/${command.id}`, { method: "DELETE" });
    }
  }
  for (const payload of payloads) {
    const existing = Array.isArray(commands) ? commands.find((command: any) => command?.name === payload.name) : null;
    if (existing?.id) await discordApi(`${base}/${existing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    else await discordApi(base, { method: "POST", body: JSON.stringify(payload) });
  }
}

function rejectReasonModal(requestId: string, signature: string, messageId: string) { return { type: 9, data: { custom_id: `quota_reject:${requestId}:${signature}:${messageId}`, title: "Reject Quota", components: [{ type: 1, components: [{ type: 4, custom_id: "reason", label: "Reason for rejection", style: 2, required: true, min_length: 2, max_length: 1000, placeholder: "Explain why this quota is being rejected" }] }] } }; }
function modalValues(interaction: any) { const out: Record<string, string> = {}; for (const row of interaction?.data?.components || []) for (const component of row?.components || []) out[component.custom_id] = String(component.value || ""); return out; }

async function sendQuotaReview(request: QuotaRequest, displayName: string) { const sig = requestSignature(request).slice(0, 24); return discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages`, { method: "POST", body: JSON.stringify({ embeds: [{ title: "Quota Submission — Pending Review", description: `<@${request.userId}> submitted a quota for Logistics review.`, fields: [{ name: "Request ID", value: request.id }, { name: "Member", value: `<@${request.userId}> (${request.username})`, inline: true }, { name: "Display Name", value: displayName || request.username, inline: true }, { name: "Quota (minutes)", value: `${request.quota} min`, inline: true }, { name: "Proof", value: `[${request.proofName || "View proof image"}](${request.proof})` }, { name: "Notes", value: request.notes || "—" }], image: { url: request.proof }, footer: { text: "QUSM Quota System • Staff Team" }, timestamp: request.createdAt }], components: [{ type: 1, components: [{ type: 2, style: 3, label: "Approve & Add Minutes", custom_id: `quota:approve:${request.id}:${sig}` }, { type: 2, style: 4, label: "Reject", custom_id: `quota:reject:${request.id}:${sig}` }] }], allowed_mentions: { users: [request.userId] } }) }); }

async function sendQuotaApprovalLog(request: QuotaRequest, approvedById: string, approvedByUsername: string) { const allowedUsers = [...new Set([request.userId, approvedById])]; return discordApi(`/channels/${QUOTA_LOG_CHANNEL_ID}/messages`, { method: "POST", body: JSON.stringify({ embeds: [{ title: "Quota Approved", description: `<@${request.userId}> quota has been approved and added to the Google Staff Database.`, color: 0x57f287, fields: [{ name: "Staff Member", value: `<@${request.userId}> (${request.username})`, inline: true }, { name: "Minutes Added", value: `${request.quota} min`, inline: true }, { name: "Approved By", value: `<@${approvedById}> (${approvedByUsername})`, inline: true }, { name: "Request ID", value: request.id }, { name: "Proof", value: `[${request.proofName || "View proof image"}](${request.proof})` }, { name: "Notes", value: request.notes || "—" }], image: { url: request.proof }, footer: { text: "QUSM Quota System • Approval Log" }, timestamp: new Date().toISOString() }], allowed_mentions: { users: allowedUsers } }) }); }

function extractRequest(interaction: any, signature: string): QuotaRequest | null { const fields = interaction?.message?.embeds?.[0]?.fields; if (!Array.isArray(fields)) return null; const values = Object.fromEntries(fields.map((field: any) => [String(field.name), String(field.value || "")])); const id = values["Request ID"]; const member = values["Member"] || ""; const quota = Number(String(values["Quota (minutes)"] || "").replace(/\s*min(?:utes?)?\s*$/i, "")); const proofField = values["Proof"] || ""; const proof = proofField.match(/\((https?:\/\/[^)]+)\)/i)?.[1] || proofField; const proofName = proofField.match(/^\[([^\]]+)\]/)?.[1] || "Proof image"; const notes = values["Notes"] === "—" ? "" : (values["Notes"] || ""); const mention = member.match(/^<@(\d+)>/); const usernameMatch = member.match(/^<@\d+>\s*\(([^\n]*)\)$/); const username = usernameMatch?.[1]?.trim() || ""; if (!id || !mention?.[1] || !username || !Number.isFinite(quota) || quota <= 0 || !/^https?:\/\//i.test(proof)) return null; const request: QuotaRequest = { id, userId: mention[1], username, quota, proof, proofName, notes, createdAt: String(interaction?.message?.timestamp || new Date().toISOString()) }; return requestSignature(request).slice(0, 24) === signature ? request : null; }
async function resolveDiscordUsername(userId: string) { const user = await discordApi(`/users/${encodeURIComponent(userId)}`, { method: "GET" }); const username = String(user?.username || "").trim(); if (!username) throw new Error(`Discord user ${userId} has no username`); return username; }
async function followup(interaction: any, payload: any) { if (!APPLICATION_ID) return; await fetch(`https://discord.com/api/v10/webhooks/${APPLICATION_ID}/${interaction.token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" }); }
async function sendQuotaLeaderboard(interaction: any) { const rows = await getQuotaLeaderboard(); if (!rows.length) return followup(interaction, { content: "No staff quota records were found in the Google Staff Database.", flags: 64 }); const chunks: any[] = []; for (let i = 0; i < rows.length; i += 25) { const chunk = rows.slice(i, i + 25); chunks.push({ title: i === 0 ? "QUSM Quota Leaderboard" : "QUSM Quota Leaderboard — Continued", color: 0xd4af37, description: chunk.map((row, index) => `${i + index + 1}. **${row.username}** — ${row.minutes} min${row.rank ? ` · ${row.rank}` : ""}`).join("\n"), footer: { text: "Live from QUSM Staff Database • Column E" } }); } await followup(interaction, { embeds: chunks.slice(0, 10), flags: 64 }); }
async function dmRejection(userId: string, reason: string, quota: number) { const dm = await discordApi("/users/@me/channels", { method: "POST", body: JSON.stringify({ recipient_id: userId }) }); await discordApi(`/channels/${dm.id}/messages`, { method: "POST", body: JSON.stringify({ content: `❌ Your **${quota} minute** quota submission has been rejected by Logistics.\n\n**Reason:** ${reason}` }) }); }

export async function GET() { try { await ensureQuotaCommandsRegistered(); return json({ success: true, commands: ["/quota-submit", "/quota-leaderboard"], guildId: STAFF_GUILD_ID }); } catch (error) { console.error("Failed to register quota commands", error); return json({ success: false, error: error instanceof Error ? error.message : "unknown error" }, 500); } }

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyDiscordSignature(body, request.headers.get("x-signature-timestamp") || "", request.headers.get("x-signature-ed25519") || "")) return json({ error: "invalid signature" }, 401);
  let interaction: any; try { interaction = JSON.parse(body); } catch { return json({ error: "invalid json" }, 400); }
  if (interaction.type === 1) { try { await ensureQuotaCommandsRegistered(); } catch (error) { console.error("Failed to register quota commands", error); } return json({ type: 1 }); }
  if (interaction.guild_id !== STAFF_GUILD_ID) return json(ephemeral("This quota system is only available in the Staff Team server."));

  if (interaction.type === 2 && interaction.data?.name === "quota-leaderboard") {
    if (!hasRole(interaction, LEADERBOARD_ROLE_ID)) return json(ephemeral("You need the website Staff role to view the quota leaderboard."));
    if (!APPLICATION_ID) return json(ephemeral("Discord application ID is not configured."));
    try {
      await fetch(`https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: 5, data: { flags: 64 } }), cache: "no-store" });
      await sendQuotaLeaderboard(interaction);
    } catch (error) { console.error("Quota leaderboard fetch failed", error); await followup(interaction, { content: `⚠️ Could not fetch the live leaderboard: ${error instanceof Error ? error.message : "unknown error"}`, flags: 64 }); }
    return new Response(null, { status: 204 });
  }

  if (interaction.type === 2 && interaction.data?.name === "quota-submit") {
    if (!hasRole(interaction, STAFF_ROLE_ID)) return json(ephemeral("You need the Staff Team role to submit quota."));
    const minutes = Number(option(interaction, "minutes")?.value);
    const proofId = String(option(interaction, "proof")?.value || "");
    const notes = String(option(interaction, "notes")?.value || "").trim();
    const attachment = interaction?.data?.resolved?.attachments?.[proofId];
    const proof = String(attachment?.url || "").trim();
    const proofName = String(attachment?.filename || "Proof image").trim();
    const contentType = String(attachment?.content_type || "").toLowerCase();
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 100000 || !proof || (contentType && !contentType.startsWith("image/"))) return json(ephemeral("Invalid quota or proof. Enter a positive minute amount and attach an image directly to the command."));
    const user = interaction.member?.user || interaction.user;
    const username = String(user?.username || "").trim();
    const displayName = String(user?.global_name || user?.username || "").trim();
    if (!username) return json(ephemeral("Could not determine your Discord username. Please try again."));
    const quotaRequest: QuotaRequest = { id: randomUUID(), userId: user.id, username, quota: minutes, proof, proofName, notes, createdAt: new Date().toISOString() };
    await sendQuotaReview(quotaRequest, displayName);
    return json(ephemeral(`✅ ${minutes} minute(s) submitted with your proof image. It is now waiting for Logistics approval.`));
  }

  if (interaction.type === 3 && typeof interaction.data?.custom_id === "string") {
    const customId = interaction.data.custom_id;
    if (customId === "quota:leaderboard:yes" || customId === "quota:leaderboard:no") return json(ephemeral("The quota leaderboard is Discord-only. Use `/quota-leaderboard`."));
    const rejectModal = customId.match(/^quota:reject:([^:]+):([a-f0-9]{24})$/);
    if (rejectModal) {
      if (!(hasRole(interaction, LOGISTICS_ROLE_ID) || hasRole(interaction, TESTER_ROLE_ID))) return json(ephemeral("Only Logistics can reject quota submissions."));
      return json(rejectReasonModal(rejectModal[1], rejectModal[2], String(interaction.message?.id || "")));
    }
    const match = customId.match(/^quota:(approve|reject):([^:]+):([a-f0-9]{24})$/);
    if (!match) return json(ephemeral("Unknown quota action."));
    const [, action, requestId, signature] = match;
    if (!(hasRole(interaction, LOGISTICS_ROLE_ID) || hasRole(interaction, TESTER_ROLE_ID))) return json(ephemeral("Only Logistics can approve or reject quota submissions."));
    const quotaRequest = extractRequest(interaction, signature);
    if (!quotaRequest || quotaRequest.id !== requestId) return json(ephemeral("This quota request is invalid or has been tampered with."));
    if (action === "reject") return json(ephemeral("Please use the rejection reason form."));
    if (!APPLICATION_ID) return json(ephemeral("Discord application ID is not configured."));
    await fetch(`https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: 5, data: { flags: 64 } }), cache: "no-store" });
    try {
      const liveUsername = await resolveDiscordUsername(quotaRequest.userId);
      await processQuotaDirect({ userId: quotaRequest.userId, username: liveUsername, minutes: quotaRequest.quota, requestId: quotaRequest.id, proof: quotaRequest.proof, approvedBy: interaction.member.user.id, approvedByUsername: interaction.member.user.username });
      try { await sendQuotaApprovalLog({ ...quotaRequest, username: liveUsername }, interaction.member.user.id, interaction.member.user.username); } catch (logError) { console.error("Quota approval log failed", logError); }
      await discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages/${interaction.message.id}`, { method: "PATCH", body: JSON.stringify({ embeds: [{ ...interaction.message.embeds[0], title: "Quota Submission — Approved", footer: { text: "QUSM Quota System • Minutes added directly to Google Sheets" } }], components: [{ type: 1, components: [{ type: 2, style: 3, label: "Approved & Added", custom_id: `quota:done:${requestId}`, disabled: true }, { type: 2, style: 4, label: "Rejected", custom_id: `quota:done-reject:${requestId}`, disabled: true }] }] }) });
      await followup(interaction, { content: `✅ **${quotaRequest.username}** — ${quotaRequest.quota} minute(s) approved and added directly to the Google Staff Database.`, flags: 64 });
    } catch (error) { console.error("Quota direct Sheets action failed", error); await followup(interaction, { content: `⚠️ Quota action failed: ${error instanceof Error ? error.message : "unknown error"}`, flags: 64 }); }
    return new Response(null, { status: 204 });
  }

  if (interaction.type === 5 && typeof interaction.data?.custom_id === "string" && interaction.data.custom_id.startsWith("quota_reject:")) {
    const match = interaction.data.custom_id.match(/^quota_reject:([^:]+):([a-f0-9]{24}):(\d+)$/);
    if (!match) return json(ephemeral("Invalid rejection form."));
    if (!(hasRole(interaction, LOGISTICS_ROLE_ID) || hasRole(interaction, TESTER_ROLE_ID))) return json(ephemeral("Only Logistics can reject quota submissions."));
    if (!APPLICATION_ID) return json(ephemeral("Discord application ID is not configured."));
    const [, requestId, signature, messageId] = match;
    const message = await discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages/${messageId}`, { method: "GET" });
    const quotaRequest = extractRequest({ message }, signature);
    if (!quotaRequest || quotaRequest.id !== requestId) return json(ephemeral("This quota request is invalid or has been tampered with."));
    const reason = modalValues(interaction).reason?.trim();
    if (!reason) return json(ephemeral("A rejection reason is required."));
    await fetch(`https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: 5, data: { flags: 64 } }), cache: "no-store" });
    try {
      await dmRejection(quotaRequest.userId, reason, quotaRequest.quota);
      await discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages/${messageId}`, { method: "PATCH", body: JSON.stringify({ embeds: [{ ...message.embeds[0], title: "Quota Submission — Rejected", fields: [...(message.embeds[0]?.fields || []), { name: "Rejection Reason", value: reason, inline: false }], footer: { text: "QUSM Quota System • Rejected by Logistics" } }], components: [{ type: 1, components: [{ type: 2, style: 4, label: "Rejected", custom_id: `quota:done-reject:${requestId}`, disabled: true }] }] }) });
      await followup(interaction, { content: `❌ **${quotaRequest.username}** quota rejected. The requester was sent the reason by DM.`, flags: 64 });
    } catch (error) { console.error("Quota rejection failed", error); await followup(interaction, { content: `⚠️ Rejection action failed: ${error instanceof Error ? error.message : "unknown error"}`, flags: 64 }); }
    return new Response(null, { status: 204 });
  }
  return json(ephemeral("Unsupported interaction."));
}
