import { getContent as getFileContent, saveContent as saveFileContent, type Content } from "./content";

const KEY = "FBMRP_CONTENT_V1";

function hasVercelBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function loadContent(): Promise<Content> {
  if (!hasVercelBlob()) return getFileContent();
  const index = await fetch(`https://blob.vercel-storage.com/${KEY}`, { cache: "no-store" });
  if (!index.ok) return getFileContent();
  return await index.json();
}

export async function persistContent(content: Content): Promise<void> {
  // Vercel Blob REST support can be enabled by setting BLOB_READ_WRITE_TOKEN.
  // Keep the local store as a development fallback.
  if (!hasVercelBlob()) return saveFileContent(content);
  const token = process.env.BLOB_READ_WRITE_TOKEN!;
  const res = await fetch(`https://blob.vercel-storage.com/${KEY}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });
  if (!res.ok) throw new Error("Persistent content storage failed");
}
