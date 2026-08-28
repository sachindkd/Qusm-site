import { neon } from "@neondatabase/serverless";
import type { Content } from "./content";

let initialized=false;
function sql(){const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is not configured");return neon(url)}
export async function initDb(){if(initialized)return;const q=sql();await q`CREATE TABLE IF NOT EXISTS site_content (id INTEGER PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;initialized=true}
export async function readDbContent():Promise<Content|null>{await initDb();const q=sql();const rows=await q`SELECT data FROM site_content WHERE id=1`;return rows[0]?.data as Content|null}
export async function writeDbContent(content:Content){await initDb();const q=sql();await q`INSERT INTO site_content (id,data,updated_at) VALUES (1,${JSON.stringify(content)}::jsonb,NOW()) ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW()`}
