import { getContent as getFileContent, saveContent as saveFileContent, type Content } from "./content";
import { readDbContent, writeDbContent, writeDbSection } from "./db";
import { cached, invalidateCache } from "./cache";

const CONTENT_CACHE_KEY = "cms-content";
const CONTENT_CACHE_TTL = 10_000;

export async function loadContent(): Promise<Content> {
  return cached(CONTENT_CACHE_KEY, CONTENT_CACHE_TTL, async () => {
    if (process.env.DATABASE_URL) {
      const stored = await readDbContent();
      if (stored) return stored;
      const initial = await getFileContent();
      await writeDbContent(initial);
      return initial;
    }
    return getFileContent();
  });
}

export async function persistContent(content: Content): Promise<void> {
  if (process.env.DATABASE_URL) await writeDbContent(content);
  else await saveContentFile(content);
  invalidateCache(CONTENT_CACHE_KEY);
}

async function saveContentFile(content: Content) {
  await saveFileContent(content);
}

export async function persistSection<K extends keyof Content>(section: K, value: Content[K]): Promise<Content> {
  let next: Content;
  if (process.env.DATABASE_URL) {
    next = await writeDbSection(String(section), value);
  } else {
    const current = await getFileContent();
    next = { ...current, [section]: value };
    await saveFileContent(next);
  }
  invalidateCache(CONTENT_CACHE_KEY);
  return next;
}

export const readContent = loadContent;
export const writeContent = persistContent;
