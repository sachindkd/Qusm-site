import { createHmac, timingSafeEqual } from "node:crypto";

export const DISCORD_SESSION_COOKIE = "fbmrp_discord_user";

type Session = {
  id: string;
  username?: string;
  avatar?: string | null;
  roles: string[];
  access: string;
};

function secret() {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value || value.length < 32) throw new Error("NEXTAUTH_SECRET must be configured with at least 32 characters");
  return value;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function serializeDiscordSession(session: Session) {
  const payload = encode(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

export function readDiscordSession(value?: string | null): Session | null {
  if (!value) return null;
  try {
    const [payload, signature] = value.split(".");
    if (!payload || !signature) return null;
    const expected = sign(payload);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session?.id || typeof session.id !== "string" || !Array.isArray(session.roles)) return null;
    return session as Session;
  } catch {
    return null;
  }
}
