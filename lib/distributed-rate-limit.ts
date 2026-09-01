import { neon } from "@neondatabase/serverless";

const WINDOW_SECONDS = 60;

/**
 * Distributed fixed-window limiter backed by the existing Neon database.
 * It works across Vercel serverless instances instead of relying on process memory.
 * If DATABASE_URL is unavailable, callers can choose a safe fallback policy.
 */
export async function distributedRateLimit(key: string, limit: number, windowSeconds = WINDOW_SECONDS) {
  const url = process.env.DATABASE_URL;
  if (!url) return { available: false, allowed: true, remaining: limit, retryAfter: windowSeconds };

  const q = neon(url);
  await q`CREATE TABLE IF NOT EXISTS api_rate_limits (
    key TEXT PRIMARY KEY,
    window_start TIMESTAMPTZ NOT NULL,
    count INTEGER NOT NULL DEFAULT 0
  )`;

  const rows = await q`
    INSERT INTO api_rate_limits (key, window_start, count)
    VALUES (${key}, NOW(), 1)
    ON CONFLICT (key) DO UPDATE SET
      window_start = CASE
        WHEN api_rate_limits.window_start <= NOW() - make_interval(secs => ${windowSeconds})
        THEN NOW() ELSE api_rate_limits.window_start END,
      count = CASE
        WHEN api_rate_limits.window_start <= NOW() - make_interval(secs => ${windowSeconds})
        THEN 1 ELSE api_rate_limits.count + 1 END
    RETURNING count, GREATEST(0, EXTRACT(EPOCH FROM ((window_start + make_interval(secs => ${windowSeconds})) - NOW()))) AS retry_after
  `;

  const count = Number(rows[0]?.count ?? 1);
  const retryAfter = Math.max(1, Math.ceil(Number(rows[0]?.retry_after ?? windowSeconds)));
  return {
    available: true,
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfter,
  };
}

/** Periodic cleanup to prevent abandoned keys from accumulating indefinitely. */
export async function cleanupRateLimits() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const q = neon(url);
  await q`DELETE FROM api_rate_limits WHERE window_start < NOW() - INTERVAL '10 minutes'`;
}
