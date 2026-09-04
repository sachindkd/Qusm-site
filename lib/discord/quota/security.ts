import { createHmac, createPublicKey, verify } from "node:crypto";
import { publicKey, quotaSecret } from "./config";
import type { QuotaRequest } from "./types";

const encoder = new TextEncoder();

export function quotaSignature(request: QuotaRequest): string {
  const payload = JSON.stringify({
    id: request.id,
    userId: request.userId,
    username: request.username,
    quota: request.quota,
    proof: request.proof,
    proofName: request.proofName,
    notes: request.notes,
  });
  return createHmac("sha256", quotaSecret()).update(payload).digest("hex").slice(0, 24);
}

export function verifyDiscordSignature(body: string, timestamp: string, signature: string): boolean {
  try {
    const raw = Buffer.from(publicKey(), "hex");
    const key = createPublicKey({
      key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]),
      format: "der",
      type: "spki",
    });
    return verify(null, encoder.encode(timestamp + body), key, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}
