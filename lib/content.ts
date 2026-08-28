import fs from "fs/promises";
import path from "path";

// Simple JSON-file-backed content store.
// Works out of the box locally and on traditional Node hosts (Railway, Render, a VPS).
// NOTE: Vercel's serverless filesystem is read-only/ephemeral in production —
// if you deploy there, swap the two functions below for a real database call
// (Vercel Postgres, Supabase, etc). Everything else in the app stays the same.

const filePath = path.join(process.cwd(), "data", "content.json");

export type Content = {
  org: { name: string; fullName: string; owner: string; coOwner: string; status: string };
  announcements: { id: string; date: string; title: string; body: string }[];
  leadership: { id: string; rank: string; name: string; role: string }[];
  divisions: { id: string; name: string; head: string; desc: string }[];
  rules: { id: string; title: string; body: string }[];
  government: { id: string; title: string; name: string; note: string }[];
  ranks: { id: string; code: string; name: string; desc: string }[];
  news: { id: string; date: string; tag: string; title: string; body: string }[];
  media: { id: string; caption: string; imageUrl: string }[];
  applications: { id: string; name: string; desc: string; status: "open" | "closed" }[];
};

export async function getContent(): Promise<Content> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export async function saveContent(content: Content): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(content, null, 2), "utf-8");
}
