import { getContent as getFileContent, saveContent as saveFileContent, type Content } from "./content";
import { readDbContent, writeDbContent, writeDbSection } from "./db";
import { createHash } from "node:crypto";
import { createNotification } from "./notifications";
const useDatabase = () => Boolean(process.env.DATABASE_URL);
const isVercelDeployment = () => Boolean(process.env.VERCEL);
const CMS_SCHEMA_VERSION = 7;
const hash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value??null)).digest("hex");
const notificationSummary=(section:string,value:any)=>{const label=section.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase());const items=Array.isArray(value)?value.filter(Boolean):[];const item=items[items.length-1];const subject=typeof item?.title==="string"?item.title:typeof item?.name==="string"?item.name:"";return subject?`${label}: ${subject}`:`${label} has new or updated information.`};
async function emitNotification(section:string,before:unknown,after:unknown){if(!useDatabase())return;const beforeHash=hash(before),afterHash=hash(after);if(beforeHash===afterHash)return;try{await createNotification({section,beforeHash,afterHash,summary:notificationSummary(section,after)})}catch{/* Notification failure must never block a successful CMS write. */}}
function assertDatabaseConfiguration() { if (isVercelDeployment() && !useDatabase()) throw new Error("DATABASE_URL is required for Vercel CMS deployments"); }
export async function loadContent(): Promise<Content> {
  assertDatabaseConfiguration(); const seed: any = await getFileContent(); if (!useDatabase()) return seed as Content;
  const stored: any = await readDbContent(); if (!stored) { seed.shop = Array.isArray(seed.shop) ? seed.shop : []; seed.customSections = Array.isArray(seed.customSections) ? seed.customSections : []; seed._schemaVersion = CMS_SCHEMA_VERSION; await writeDbContent(seed as Content); return seed as Content; }
  const previousVersion = Number(stored._schemaVersion || 0); if (previousVersion >= CMS_SCHEMA_VERSION) return stored as Content;
  const merged: any = { ...seed, ...stored, org: { ...(seed.org || {}), ...(stored.org || {}) } };
  const arraySections = ["announcements","calendar","leadership","divisions","rules","government","ranks","news","media","applications","cocLeadership","cocStaff","cocRoleplay","shop","customSections"];
  for (const key of arraySections) { const current = stored[key]; if (!Array.isArray(current) || (current.length === 0 && Array.isArray(seed[key]) && seed[key].length > 0)) merged[key] = seed[key]; }
  if (previousVersion < 4) { merged.cocLeadership = seed.cocLeadership || []; merged.cocStaff = seed.cocStaff || []; merged.cocRoleplay = seed.cocRoleplay || []; }
  // Replace the old placeholder military-rank list with the official FBMR military ranks.
  // This migration intentionally touches ONLY the ranks section; CoC/leadership entries remain separate.
  if (previousVersion < 7) merged.ranks = seed.ranks || [];
  if (!Array.isArray(merged.customSections)) merged.customSections = [];
  merged._schemaVersion = CMS_SCHEMA_VERSION; await writeDbContent(merged as Content); return merged as Content;
}
export async function persistContent(content: Content): Promise<void> { assertDatabaseConfiguration(); if (useDatabase()) { const before=await readDbContent(); await writeDbContent(content); await emitNotification("website",before,content); return; } await saveFileContent(content); }
export async function persistSection<K extends keyof Content>(section: K, value: Content[K]): Promise<Content> { assertDatabaseConfiguration(); if (useDatabase()) { const current: any = await readDbContent(); if (!current) { const initial: any = await getFileContent(); initial[section as string] = value; initial._schemaVersion = CMS_SCHEMA_VERSION; await writeDbContent(initial as Content); return initial as Content; } const next=await writeDbSection(String(section), value); await emitNotification(String(section),current[section as string],value); return next; } const current: any = await getFileContent(); const before=current[section as string]; current[section as string] = value; await saveContentAndNotify(current as Content, String(section), before, value); return current as Content; }
async function saveContentAndNotify(content:Content,section:string,before:unknown,after:unknown){await saveFileContent(content);}
export const readContent = loadContent; export const writeContent = persistContent;
