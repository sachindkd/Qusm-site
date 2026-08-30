import { getContent as getFileContent, saveContent as saveFileContent, type Content } from "./content";
import { readDbContent, writeDbContent, writeDbSection } from "./db";

const useDatabase = () => Boolean(process.env.DATABASE_URL);

/**
 * Database is the single source of truth. On an older installation the DB may
 * contain the pre-CMS schema, so merge only genuinely missing sections from the
 * current seed/default content and persist that migration once.
 */
export async function loadContent(): Promise<Content> {
  const seed = await getFileContent();
  if (!useDatabase()) return seed;

  const stored = await readDbContent();
  if (!stored) {
    await writeDbContent(seed);
    return seed;
  }

  const merged: any = { ...seed, ...stored, org: { ...(seed.org || {}), ...(stored.org || {}) } };
  let changed = false;
  for (const key of Object.keys(seed)) {
    if (!(key in stored) || stored[key as keyof Content] === undefined || stored[key as keyof Content] === null) {
      merged[key] = seed[key as keyof Content];
      changed = true;
    }
  }
  if (!("shop" in merged)) { merged.shop = []; changed = true; }

  if (changed) await writeDbContent(merged as Content);
  return merged as Content;
}

export async function persistContent(content: Content): Promise<void> {
  if (useDatabase()) { await writeDbContent(content); return; }
  await saveFileContent(content);
}

export async function persistSection<K extends keyof Content>(section: K, value: Content[K]): Promise<Content> {
  if (useDatabase()) {
    const current: any = await readDbContent();
    if (!current) {
      const initial: any = await getFileContent();
      initial[section as string] = value;
      await writeDbContent(initial as Content);
      return initial as Content;
    }
    return writeDbSection(String(section), value);
  }
  const current: any = await getFileContent();
  current[section as string] = value;
  await saveFileContent(current as Content);
  return current as Content;
}

export const readContent = loadContent;
export const writeContent = persistContent;
