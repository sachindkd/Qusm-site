import { applicationId, botToken } from "./config";

export async function discordApi(path: string, init: RequestInit = {}) {
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
  if (!response.ok) throw new Error(`Discord API ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
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
