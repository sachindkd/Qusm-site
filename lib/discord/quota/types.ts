export type QuotaRequest = {
  id: string;
  userId: string;
  username: string;
  quota: number;
  proof: string;
  proofName: string;
  notes: string;
  createdAt: string;
};

export type DiscordInteraction = any;

export function interactionUserId(interaction: DiscordInteraction): string {
  return String(interaction?.member?.user?.id || interaction?.user?.id || "");
}

export function interactionUsername(interaction: DiscordInteraction): string {
  return String(interaction?.member?.user?.username || interaction?.user?.username || "").trim();
}

export function interactionDisplayName(interaction: DiscordInteraction): string {
  return String(interaction?.member?.nick || interaction?.member?.user?.global_name || interactionUsername(interaction)).trim();
}
