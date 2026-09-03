import { createHmac, createPublicKey, randomUUID, verify } from "node:crypto";

const STAFF_GUILD_ID = "1539736452995350528";
const STAFF_ROLE_ID = "1539751393139626044";
const LOGISTICS_ROLE_ID = "1539908119067492427";
const TESTER_ROLE_ID = "1540499074061439006";
const QUOTA_CHANNEL_ID = "1545116182858965046";
const SHEETS_URL = process.env.QUOTA_GOOGLE_APPS_SCRIPT_URL?.trim();
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim();
const APPLICATION_ID = (process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID || "").trim();
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY?.trim();

const encoder = new TextEncoder();

type QuotaRequest = {
  id: string;
  userId: string;
  username: string;
  quota: number;
  proof: string;
  notes: string;
  createdAt: string;
};

function secret() {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value || value.length < 32) throw new Error("NEXTAUTH_SECRET is not configured");
  return value;
}

function hmac(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function requestSignature(request: QuotaRequest) {
  return hmac(JSON.stringify(request));
}

function publicKey() {
  if (!PUBLIC_KEY) throw new Error("DISCORD_PUBLIC_KEY is not configured");
  const raw = Buffer.from(PUBLIC_KEY, "hex");
  if (raw.length !== 32) throw new Error("Invalid Discord public key");
  return createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]), format: "der", type: "spki" });
}

function verifyDiscordSignature(body: string, timestamp: string, signature: string) {
  try {
    return verify(null, encoder.encode(timestamp + body), publicKey(), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

function roles(interaction: any): string[] {
  return Array.isArray(interaction?.member?.roles) ? interaction.member.roles : [];
}

function hasRole(interaction: any, roleId: string) {
  return roles(interaction).includes(roleId);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function ephemeral(content: string) {
  return { type: 4, data: { content, flags: 64 } };
}

function modalResponse() {
  return {
    type: 9,
    data: {
      custom_id: "quota_submit",
      title: "Submit Quota (Minutes)",
      components: [
        { type: 1, components: [{ type: 4, custom_id: "quota", label: "Quota completed (minutes)", style: 1, required: true, min_length: 1, max_length: 10, placeholder: "e.g. 10" }] },
        { type: 1, components: [{ type: 4, custom_id: "proof", label: "Proof / evidence URL", style: 1, required: true, min_length: 8, max_length: 500, placeholder: "https://..." }] },
        { type: 1, components: [{ type: 4, custom_id: "notes", label: "Notes (optional)", style: 2, required: false, max_length: 1000, placeholder: "Anything Logistics should know" }] },
      ],
    },
  };
}

function modalValues(interaction: any) {
  const out: Record<string, string> = {};
  for (const row of interaction?.data?.components || []) {
    for (const component of row?.components || []) out[component.custom_id] = String(component.value || "");
  }
  return out;
}

async function discordApi(path: string, init: RequestInit) {
  if (!BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN is not configured");
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Discord API ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function ensureQuotaCommandRegistered() {
  if (!APPLICATION_ID || !BOT_TOKEN) throw new Error("Discord application credentials are not configured");
  const commands = await discordApi(`/applications/${APPLICATION_ID}/guilds/${STAFF_GUILD_ID}/commands`, { method: "GET" });
  const existing = Array.isArray(commands) ? commands.find((command: any) => command?.name === "quota") : null;
  const payload = {
    name: "quota",
    description: "Submit your staff quota in minutes for Logistics review",
    type: 1,
    options: [],
  };
  if (existing?.id) {
    await discordApi(`/applications/${APPLICATION_ID}/guilds/${STAFF_GUILD_ID}/commands/${existing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    console.log("/quota command updated", { guildId: STAFF_GUILD_ID, commandId: existing.id });
  } else {
    const created = await discordApi(`/applications/${APPLICATION_ID}/guilds/${STAFF_GUILD_ID}/commands`, { method: "POST", body: JSON.stringify(payload) });
    console.log("/quota command created", { guildId: STAFF_GUILD_ID, commandId: created?.id });
  }
}

async function sendQuotaReview(request: QuotaRequest) {
  const sig = requestSignature(request).slice(0, 24);
  return discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages`, {
    method: "POST",
    body: JSON.stringify({
      embeds: [{
        title: "Quota Submission — Pending Review",
        description: `<@${request.userId}> submitted a quota for Logistics review.`,
        fields: [
          { name: "Request ID", value: request.id, inline: false },
          { name: "Member", value: `<@${request.userId}> (${request.username})`, inline: true },
          { name: "Quota (minutes)", value: `${request.quota} min`, inline: true },
          { name: "Proof", value: request.proof, inline: false },
          { name: "Notes", value: request.notes || "—", inline: false },
        ],
        footer: { text: "QUSM Quota System • Staff Team" },
        timestamp: request.createdAt,
      }],
      components: [{ type: 1, components: [
        { type: 2, style: 3, label: "Approve & Add Minutes", custom_id: `quota:approve:${request.id}:${sig}` },
        { type: 2, style: 4, label: "Reject", custom_id: `quota:reject:${request.id}:${sig}` },
      ]}],
      allowed_mentions: { users: [request.userId] },
    }),
  });
}

function extractRequest(interaction: any, signature: string): QuotaRequest | null {
  const fields = interaction?.message?.embeds?.[0]?.fields;
  if (!Array.isArray(fields)) return null;
  const values = Object.fromEntries(fields.map((field: any) => [String(field.name), String(field.value || "")]));
  const id = values["Request ID"];
  const member = values["Member"] || "";
  const quota = Number(String(values["Quota (minutes)"] || "").replace(/\s*min(?:utes?)?\s*$/i, ""));
  const proof = values["Proof"] || "";
  const notes = values["Notes"] === "—" ? "" : (values["Notes"] || "");
  const mention = member.match(/^<@(\d+)>/);
  if (!id || !mention?.[1] || !Number.isFinite(quota) || quota < 0 || !/^https?:\/\//i.test(proof)) return null;
  const request: QuotaRequest = { id, userId: mention[1], username: member.replace(/^<@\d+>\s*\((.*)\)$/, "$1"), quota, proof, notes, createdAt: String(interaction?.message?.timestamp || new Date().toISOString()) };
  const expected = requestSignature(request).slice(0, 24);
  return expected === signature ? request : null;
}

async function logApproval(request: QuotaRequest, interaction: any, status: "approved" | "rejected") {
  if (status === "approved") {
    if (!SHEETS_URL) throw new Error("Quota Google database is not configured");
    const response = await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve",
        mode: "add_minutes",
        id: request.id,
        requestId: request.id,
        userId: request.userId,
        username: request.username,
        quota: request.quota,
        proof: request.proof,
        notes: request.notes,
        createdAt: request.createdAt,
        approvedBy: interaction.member.user.id,
        approvedByUsername: interaction.member.user.username,
        approvedAt: new Date().toISOString(),
        status: "approved",
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Google database request failed");
    const result = await response.json().catch(() => null);
    if (result && result.success === false) throw new Error(String(result.error || "Google database rejected the update"));
  }
}

async function followup(interaction: any, content: string) {
  if (!APPLICATION_ID) return;
  await fetch(`https://discord.com/api/v10/webhooks/${APPLICATION_ID}/${interaction.token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, flags: 64 }), cache: "no-store" });
}

export async function GET() {
  try {
    await ensureQuotaCommandRegistered();
    return json({ success: true, command: "quota", guildId: STAFF_GUILD_ID });
  } catch (error) {
    console.error("Failed to register /quota command from GET", error);
    return json({ success: false, error: error instanceof Error ? error.message : "unknown error" }, 500);
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyDiscordSignature(body, request.headers.get("x-signature-timestamp") || "", request.headers.get("x-signature-ed25519") || "")) return json({ error: "invalid signature" }, 401);

  let interaction: any;
  try { interaction = JSON.parse(body); } catch { return json({ error: "invalid json" }, 400); }

  if (interaction.type === 1) {
    try { await ensureQuotaCommandRegistered(); } catch (error) { console.error("Failed to register /quota command", error); }
    return json({ type: 1 });
  }
  if (interaction.guild_id !== STAFF_GUILD_ID) return json(ephemeral("This quota system is only available in the Staff Team server."));

  if (interaction.type === 2 && interaction.data?.name === "quota") {
    if (!hasRole(interaction, STAFF_ROLE_ID)) return json(ephemeral("You need the Staff role to submit quota."));
    return json(modalResponse());
  }

  if (interaction.type === 5 && interaction.data?.custom_id === "quota_submit") {
    if (!hasRole(interaction, STAFF_ROLE_ID)) return json(ephemeral("You need the Staff role to submit quota."));
    const values = modalValues(interaction);
    const quota = Number(values.quota);
    const proof = values.proof.trim();
    const notes = values.notes.trim();
    if (!Number.isFinite(quota) || quota < 0 || quota > 100000 || !/^https?:\/\//i.test(proof)) return json(ephemeral("Invalid quota minutes or proof URL."));
    const user = interaction.member?.user;
    const quotaRequest: QuotaRequest = { id: randomUUID(), userId: user.id, username: user.global_name || user.username || user.id, quota, proof, notes, createdAt: new Date().toISOString() };
    await sendQuotaReview(quotaRequest);
    return json(ephemeral(`✅ ${quota} minute(s) submitted. It is now waiting for Logistics approval.`));
  }

  if (interaction.type === 3 && typeof interaction.data?.custom_id === "string") {
    const match = interaction.data.custom_id.match(/^quota:(approve|reject):([^:]+):([a-f0-9]{24})$/);
    if (!match) return json(ephemeral("Unknown quota action."));
    const [, action, requestId, signature] = match;
    const authorized = hasRole(interaction, LOGISTICS_ROLE_ID) || hasRole(interaction, TESTER_ROLE_ID);
    if (!authorized) return json(ephemeral("Only Logistics can approve or reject quota submissions."));
    const quotaRequest = extractRequest(interaction, signature);
    if (!quotaRequest || quotaRequest.id !== requestId) return json(ephemeral("This quota request is invalid or has been tampered with."));

    if (APPLICATION_ID) {
      await fetch(`https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: 5, data: { flags: 64 } }), cache: "no-store" });
    } else {
      return json(ephemeral("Discord application ID is not configured."));
    }

    try {
      await logApproval(quotaRequest, interaction, action === "approve" ? "approved" : "rejected");
      await discordApi(`/channels/${QUOTA_CHANNEL_ID}/messages/${interaction.message.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          embeds: [{ ...interaction.message.embeds[0], title: action === "approve" ? "Quota Submission — Approved" : "Quota Submission — Rejected", footer: { text: `QUSM Quota System • ${action === "approve" ? "Minutes added to Google database" : "Rejected by Logistics"}` } }],
          components: [{ type: 1, components: [
            { type: 2, style: 3, label: action === "approve" ? "Approved & Added" : "Approved", custom_id: `quota:done:${requestId}`, disabled: true },
            { type: 2, style: 4, label: action === "reject" ? "Rejected" : "Rejected", custom_id: `quota:done-reject:${requestId}`, disabled: true },
          ]}],
        }),
      });
      await followup(interaction, action === "approve" ? `✅ **${quotaRequest.username}** — ${quotaRequest.quota} minute(s) approved and added to the Google database.` : `❌ **${quotaRequest.username}** quota rejected.`);
    } catch (error) {
      await followup(interaction, `⚠️ Quota action failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
    return new Response(null, { status: 204 });
  }

  return json(ephemeral("Unsupported interaction."));
}
