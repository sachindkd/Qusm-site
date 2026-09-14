import { createHmac } from "node:crypto";
import { quotaSecret } from "@/lib/discord/quota/config";

export type TicketProgram = "internship";

export type TicketRequest = {
  id: string;
  userId: string;
  username: string;
  tickets: number;
  proof: string;
  proofName: string;
  notes: string;
  createdAt: string;
  /** Set only for Internship Program requests. Staff requests remain backward-compatible. */
  program?: TicketProgram;
};

export function ticketSignature(request: TicketRequest): string {
  const payload = JSON.stringify({ id: request.id, userId: request.userId, username: request.username, tickets: request.tickets, proof: request.proof, proofName: request.proofName, notes: request.notes, program: request.program });
  return createHmac("sha256", quotaSecret()).update(payload).digest("hex").slice(0, 24);
}
