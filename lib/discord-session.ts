import { createHmac, timingSafeEqual } from "node:crypto";

export const DISCORD_SESSION_COOKIE = "fbmrp_discord_user";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

type Session = { id: string; username?: string; avatar?: string | null; roles: string[]; access: string; iat?: number; exp?: number };

function secret() {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value || value.length < 32) throw new Error("NEXTAUTH_SECRET must be configured with at least 32 characters");
  return value;
}
function encode(value: string) { return Buffer.from(value, "utf8").toString("base64url"); }
function sign(payload: string) { return createHmac("sha256", secret()).update(payload).digest("base64url"); }

export function serializeDiscordSession(session: Omit<Session, "iat" | "exp">) {
  const now = Math.floor(Date.now() / 1000);
  const payload = encode(JSON.stringify({ ...session, iat: now, exp: now + SESSION_MAX_AGE_SECONDS }));
  return `${payload}.${sign(payload)}`;
}

export function readDiscordSession(value?: string | null): Session | null {
  if (!value) return null;
  try {
    const parts = value.split(".");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expected = sign(payload);
    const a = Buffer.from(signature), b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (!session?.id || typeof session.id !== "string" || !Array.isArray(session.roles)) return null;
    if (!Number.isInteger(session.iat) || !Number.isInteger(session.exp)) return null;
    const now = Math.floor(Date.now() / 1000);
    if (session.exp <= now || session.iat > now + 60) return null;
    return session;
  } catch { return null; }
}
