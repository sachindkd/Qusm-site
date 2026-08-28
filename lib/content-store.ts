import { getContent as getFileContent, saveContent as saveFileContent, type Content } from "./content";
import { readDbContent, writeDbContent, writeDbSection } from "./db";
export async function loadContent():Promise<Content>{if(process.env.DATABASE_URL){const stored=await readDbContent();if(stored)return stored;const initial=await getFileContent();await writeDbContent(initial);return initial}return getFileContent()}
export async function persistContent(content:Content):Promise<void>{if(process.env.DATABASE_URL){await writeDbContent(content);return}await saveFileContent(content)}
export async function persistSection<K extends keyof Content>(section:K,value:Content[K]):Promise<Content>{if(process.env.DATABASE_URL)return writeDbSection(String(section),value);const current=await getFileContent();const next={...current,[section]:value};await saveFileContent(next);return next}
export const readContent=loadContent;export const writeContent=persistContent;
