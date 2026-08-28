import { getContent as getFileContent, saveContent as saveFileContent, type Content } from "./content";
import { readDbContent, writeDbContent } from "./db";

export async function loadContent(): Promise<Content> {
  if (process.env.DATABASE_URL) {
    const stored=await readDbContent();
    if(stored)return stored;
    const initial=await getFileContent();
    await writeDbContent(initial);
    return initial;
  }
  return getFileContent();
}
export async function persistContent(content:Content):Promise<void>{
  if(process.env.DATABASE_URL){await writeDbContent(content);return;}
  await saveFileContent(content);
}
export const readContent=loadContent;
export const writeContent=persistContent;
