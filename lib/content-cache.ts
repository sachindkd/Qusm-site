import type { Content } from "./content";

const TTL = 15_000;
let cached: { value: Content; expiresAt: number } | null = null;
let pending: Promise<Content> | null = null;

export async function getCachedContent(loader: () => Promise<Content>) {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (pending) return pending;
  pending = loader().then((value) => {
    cached = { value, expiresAt: Date.now() + TTL };
    return value;
  }).finally(() => { pending = null; });
  return pending;
}

export function invalidateContentCache() { cached = null; }
