import { applicationId, botToken } from "./config";

const MAX_429_RETRIES = 6;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function discordApi(path: string, init: RequestInit = {}) {
  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt += 1) {
    const response = await fetch(`https://discord.com/api/v10${path}`, {
      ...init,
      headers: {
        Authorization: `Bot ${botToken()}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      cache: "no-store",
    });
    const text = await response.text();

    if (response.ok) return text ? JSON.parse(text) : {};

    if (response.status === 429 && attempt < MAX_429_RETRIES) {
      let retryAfterMs = Number(response.headers.get("Retry-After")) * 1000;
      try {
        const body = JSON.parse(text);
        if (Number.isFinite(Number(body?.retry_after))) retryAfterMs = Number(body.retry_after) * 1000;
      } catch {}
      if (!Number.isFinite(retryAfterMs) || retryAfterMs <= 0) retryAfterMs = 2000;
      await sleep(Math.min(Math.max(retryAfterMs + 250, 1000), 15000));
      continue;
    }

    throw new Error(`Discord API ${response.status}: ${text.slice(0, 300)}`);
  }

  throw new Error("Discord API rate limit retries exhausted");
}

export async function interactionCallback(interaction: any, payload: any) {
  return fetch(`https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function interactionFollowup(interaction: any, payload: any) {
  const response = await fetch(`https://discord.com/api/v10/webhooks/${applicationId()}/${interaction.token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Discord followup ${response.status}: ${(await response.text()).slice(0, 300)}`);
}

export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export function ephemeral(content: string) {
  return { type: 4, data: { content, flags: 64 } };
}

export function hasRole(interaction: any, roleId: string): boolean {
  return Array.isArray(interaction?.member?.roles) && interaction.member.roles.includes(roleId);
}

export function option(interaction: any, name: string) {
  return (interaction?.data?.options || []).find((item: any) => item?.name === name);
}

export function modalValues(interaction: any): Record<string, string> {
  const values: Record<string, string> = {};
  for (const row of interaction?.data?.components || []) {
    for (const component of row?.components || []) values[component.custom_id] = String(component.value || "");
  }
  return values;
}
