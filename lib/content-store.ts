import { getContent as getFileContent, saveContent as saveFileContent, type Content } from "./content";
import { readDbContent, writeDbContent, writeDbSection } from "./db";

const useDatabase = () => Boolean(process.env.DATABASE_URL);
const CMS_SCHEMA_VERSION = 2;

/** Database is the single source of truth. Older DB records are migrated once. */
export async function loadContent(): Promise<Content> {
  const seed: any = await getFileContent();
  if (!useDatabase()) return seed as Content;

  const stored: any = await readDbContent();
  if (!stored) {
    seed.shop = Array.isArray(seed.shop) ? seed.shop : [];
    seed._schemaVersion = CMS_SCHEMA_VERSION;
    await writeDbContent(seed as Content);
    return seed as Content;
  }

  const migrationNeeded = Number(stored._schemaVersion || 0) < CMS_SCHEMA_VERSION;
  if (!migrationNeeded) return stored as Content;

  // Import the records that were already visible in the legacy website/content
  // source, while preserving any non-empty records staff have already created.
  const merged: any = { ...seed, ...stored, org: { ...(seed.org || {}), ...(stored.org || {}) } };
  const arraySections = ["announcements","calendar","leadership","divisions","rules","government","ranks","news","media","applications","cocLeadership","cocStaff","cocRoleplay"];
  for (const key of arraySections) {
    const current = stored[key];
    if (!Array.isArray(current) || (current.length === 0 && Array.isArray(seed[key]) && seed[key].length > 0)) merged[key] = seed[key];
  }
  merged.shop = Array.isArray(stored.shop) ? stored.shop : [];
  merged._schemaVersion = CMS_SCHEMA_VERSION;
  await writeDbContent(merged as Content);
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
      initial._schemaVersion = CMS_SCHEMA_VERSION;
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
