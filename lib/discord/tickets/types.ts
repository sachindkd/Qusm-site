import { createHmac } from "node:crypto";
import { quotaSecret } from "@/lib/discord/quota/config";

export type TicketRequest = {
  id: string;
  userId: string;
  username: string;
  tickets: number;
  proof: string;
  proofName: string;
  notes: string;
  createdAt: string;
};

export function ticketSignature(request: TicketRequest): string {
  const payload = JSON.stringify({ id: request.id, userId: request.userId, username: request.username, tickets: request.tickets, proof: request.proof, proofName: request.proofName, notes: request.notes });
  return createHmac("sha256", quotaSecret()).update(payload).digest("hex").slice(0, 24);
}
