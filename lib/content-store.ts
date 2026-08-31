import { getContent as getFileContent, saveContent as saveFileContent, type Content } from "./content";
import { readDbContent, writeDbContent, writeDbSection } from "./db";
const useDatabase = () => Boolean(process.env.DATABASE_URL);
const isVercelDeployment = () => Boolean(process.env.VERCEL);
const CMS_SCHEMA_VERSION = 5;
function assertDatabaseConfiguration() { if (isVercelDeployment() && !useDatabase()) throw new Error("DATABASE_URL is required for Vercel CMS deployments"); }
export async function loadContent(): Promise<Content> {
  assertDatabaseConfiguration(); const seed: any = await getFileContent(); if (!useDatabase()) return seed as Content;
  const stored: any = await readDbContent(); if (!stored) { seed.shop = Array.isArray(seed.shop) ? seed.shop : []; seed.customSections = Array.isArray(seed.customSections) ? seed.customSections : []; seed._schemaVersion = CMS_SCHEMA_VERSION; await writeDbContent(seed as Content); return seed as Content; }
  const previousVersion = Number(stored._schemaVersion || 0); if (previousVersion >= CMS_SCHEMA_VERSION) return stored as Content;
  const merged: any = { ...seed, ...stored, org: { ...(seed.org || {}), ...(stored.org || {}) } };
  const arraySections = ["announcements","calendar","leadership","divisions","rules","government","ranks","news","media","applications","cocLeadership","cocStaff","cocRoleplay","shop","customSections"];
  for (const key of arraySections) { const current = stored[key]; if (!Array.isArray(current) || (current.length === 0 && Array.isArray(seed[key]) && seed[key].length > 0)) merged[key] = seed[key]; }
  if (previousVersion < 4) { merged.cocLeadership = seed.cocLeadership || []; merged.cocStaff = seed.cocStaff || []; merged.cocRoleplay = seed.cocRoleplay || []; }
  if (!Array.isArray(merged.customSections)) merged.customSections = [];
  merged._schemaVersion = CMS_SCHEMA_VERSION; await writeDbContent(merged as Content); return merged as Content;
}
export async function persistContent(content: Content): Promise<void> { assertDatabaseConfiguration(); if (useDatabase()) { await writeDbContent(content); return; } await saveFileContent(content); }
export async function persistSection<K extends keyof Content>(section: K, value: Content[K]): Promise<Content> { assertDatabaseConfiguration(); if (useDatabase()) { const current: any = await readDbContent(); if (!current) { const initial: any = await getFileContent(); initial[section as string] = value; initial._schemaVersion = CMS_SCHEMA_VERSION; await writeDbContent(initial as Content); return initial as Content; } return writeDbSection(String(section), value); } const current: any = await getFileContent(); current[section as string] = value; await saveFileContent(current as Content); return current as Content; }
export const readContent = loadContent; export const writeContent = persistContent;
