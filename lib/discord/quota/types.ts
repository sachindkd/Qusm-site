export type QuotaProgram = "internship";

export type QuotaRequest = {
  id: string;
  userId: string;
  username: string;
  quota: number;
  proof: string;
  proofName: string;
  notes: string;
  createdAt: string;
  /** Set only for Internship Program requests. Staff requests remain backward-compatible. */
  program?: QuotaProgram;
};

export function interactionUserId(interaction: any) {
  return String(interaction?.member?.user?.id || interaction?.user?.id || "");
}

export function interactionUsername(interaction: any) {
  return String(interaction?.member?.user?.username || interaction?.user?.username || "");
}

export function interactionDisplayName(interaction: any) {
  return String(interaction?.member?.nick || interaction?.member?.user?.global_name || interaction?.user?.global_name || interactionUsername(interaction));
}
