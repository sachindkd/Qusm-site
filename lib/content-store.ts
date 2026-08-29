import { getContent as getFileContent, saveContent as saveFileContent, type Content } from "./content";
import { readDbContent, writeDbContent, writeDbSection } from "./db";

const useDatabase = () => Boolean(process.env.DATABASE_URL);

/**
 * Read the authoritative CMS state.
 *
 * CMS data must not use an in-memory cache: Vercel can serve different requests
 * from different serverless instances, so a process-local cache can make a
 * successful save appear to have disappeared on the public site.
 */
export async function loadContent(): Promise<Content> {
  if (!useDatabase()) return getFileContent();

  const stored = await readDbContent();
  if (stored) return stored;

  // First deployment: seed the persistent database from the existing content source.
  const initial = await getFileContent();
  await writeDbContent(initial);
  return initial;
}

export async function persistContent(content: Content): Promise<void> {
  if (useDatabase()) {
    await writeDbContent(content);
    return;
  }
  await saveFileContent(content);
}

export async function persistSection<K extends keyof Content>(section: K, value: Content[K]): Promise<Content> {
  if (useDatabase()) {
    const current = await readDbContent();
    if (!current) {
      const initial = await getFileContent();
      const next = { ...initial, [section]: value } as Content;
      await writeDbContent(next);
      return next;
    }
    return writeDbSection(String(section), value);
  }

  const current = await getFileContent();
  const next = { ...current, [section]: value } as Content;
  await saveFileContent(next);
  return next;
}

export const readContent = loadContent;
export const writeContent = persistContent;
