import { getContent as getFileContent, saveContent as saveFileContent, type Content } from "./content";
import { readDbContent, writeDbContent, writeDbSection } from "./db";
import { cached, invalidateCache } from "./cache";

const CONTENT_CACHE_KEY = "cms-content";
const CONTENT_CACHE_TTL = 2_000;

const useDatabase = () => Boolean(process.env.DATABASE_URL);

export async function loadContent(): Promise<Content> {
  return cached(CONTENT_CACHE_KEY, CONTENT_CACHE_TTL, async () => {
    if (!useDatabase()) return getFileContent();

    const stored = await readDbContent();
    if (stored) return stored;

    // First deployment: seed the persistent database from the existing content source.
    const initial = await getFileContent();
    await writeDbContent(initial);
    return initial;
  });
}

export async function persistContent(content: Content): Promise<void> {
  if (useDatabase()) await writeDbContent(content);
  else await saveFileContent(content);
  invalidateCache(CONTENT_CACHE_KEY);
}

export async function persistSection<K extends keyof Content>(section: K, value: Content[K]): Promise<Content> {
  let next: Content;

  if (useDatabase()) {
    const current = await readDbContent();
    if (!current) {
      const initial = await getFileContent();
      next = { ...initial, [section]: value } as Content;
      await writeDbContent(next);
    } else {
      next = await writeDbSection(String(section), value);
    }
  } else {
    const current = await getFileContent();
    next = { ...current, [section]: value } as Content;
    await saveFileContent(next);
  }

  invalidateCache(CONTENT_CACHE_KEY);
  return next;
}

export const readContent = loadContent;
export const writeContent = persistContent;
