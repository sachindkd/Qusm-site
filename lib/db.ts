import { neon } from "@neondatabase/serverless";
import type { Content } from "./content";

let initialized = false;
let initializing: Promise<void> | null = null;

// Keep structured CMS data safely below the project's 500 MB database budget.
// Images/video belong in Vercel Blob and should only be referenced by URL here.
export const MAX_CONTENT_BYTES = 25 * 1024 * 1024;

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

function assertContentSize(content: unknown) {
  const bytes = Buffer.byteLength(JSON.stringify(content ?? null), "utf8");
  if (bytes > MAX_CONTENT_BYTES) {
    throw new Error("CMS content is too large. Store media in Vercel Blob and keep the database for structured content.");
  }
}

export async function initDb() {
  if (initialized) return;
  if (initializing) return initializing;
  initializing = (async () => {
    const q = sql();
    await q`CREATE TABLE IF NOT EXISTS site_content (id INTEGER PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    initialized = true;
  })();
  try {
    await initializing;
  } finally {
    initializing = null;
  }
}

export async function readDbContent(): Promise<Content | null> {
  await initDb();
  const q = sql();
  const rows = await q`SELECT data FROM site_content WHERE id = 1`;
  return (rows[0]?.data as Content | undefined) ?? null;
}

export async function writeDbContent(content: Content) {
  assertContentSize(content);
  await initDb();
  const q = sql();
  await q`INSERT INTO site_content (id, data, updated_at)
    VALUES (1, ${JSON.stringify(content)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE
    SET data = EXCLUDED.data, updated_at = NOW()`;
}

export async function writeDbSection(section: string, value: unknown): Promise<Content> {
  if (!/^[a-zA-Z0-9_]+$/.test(section)) throw new Error("Invalid content section");
  await initDb();
  const q = sql();
  const currentRows = await q`SELECT data FROM site_content WHERE id = 1`;
  if (!currentRows.length) throw new Error("Content record does not exist");
  const current = currentRows[0].data as Record<string, unknown>;
  const next = { ...current, [section]: value };
  assertContentSize(next);
  const rows = await q`UPDATE site_content
    SET data = jsonb_set(data, ARRAY[${section}]::text[], ${JSON.stringify(value)}::jsonb, true), updated_at = NOW()
    WHERE id = 1
    RETURNING data`;
  if (!rows.length) throw new Error("Content record does not exist");
  return rows[0].data as Content;
}

export async function dbHealth() {
  await initDb();
  const q = sql();
  const rows = await q`SELECT 1 AS ok`;
  return rows[0]?.ok === 1;
}
