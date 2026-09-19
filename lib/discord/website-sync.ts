import { getContent, saveContent } from "@/lib/content";
import { FBMRP_GUILD_ID } from "@/lib/discord-roles";

const API = "https://discord.com/api/v10";

function token() {
  const t = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!t) throw new Error("DISCORD_BOT_TOKEN is not configured");
  return t;
}
async function discord(path: string) {
  const r = await fetch(API + path, { headers: { Authorization: `Bot ${token()}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`Discord API ${r.status}: ${await r.text()}`);
  return r.json();
}
function clean(v: unknown) {
  return String(v ?? "").replace(/<@!?\d+>/g, "@member").replace(/<@&\d+>/g, "@role").replace(/<#\d+>/g, "#channel").replace(/https?:\/\/\S+/g, "").trim();
}
async function aiJson(prompt: string) {
  const key = process.env.GEMINI_API_KEY || process.env.PERFORMANCE_GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  const model = process.env.WEBSITE_SYNC_AI_MODEL || "gemini-2.5-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.1 } }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
  return JSON.parse(text);
}
export async function syncQusmWebsiteFromDiscord() {
  const guildId = FBMRP_GUILD_ID;
  const [guild, roles, channels] = await Promise.all([discord(`/guilds/${guildId}`), discord(`/guilds/${guildId}/roles`), discord(`/guilds/${guildId}/channels`)]);
  const textChannels = (Array.isArray(channels) ? channels : []).filter((c: any) => c?.type === 0 && c?.name).sort((a: any,b: any)=>Number(a.position||0)-Number(b.position||0));
  const channelData: any[] = [];
  for (const c of textChannels.slice(0, 80)) {
    const messages = await discord(`/channels/${c.id}/messages?limit=100`);
    channelData.push({ channel: c.name, category: c.parent_id, messages: (Array.isArray(messages)?messages:[]).filter((m:any)=>!m?.author?.bot && m?.content).slice(0,40).map((m:any)=>({author:clean(m.author?.global_name||m.author?.username), content:clean(m.content), timestamp:m.timestamp})) });
  }
  const snapshot = { guild: { id:guildId,name:guild?.name,description:guild?.description||"" }, roles:(Array.isArray(roles)?roles:[]).filter((r:any)=>!r.managed).map((r:any)=>({id:r.id,name:r.name,position:r.position})), channels:channelData };
  const current = await getContent();
  const prompt = `You are the QUSM website synchronization AI. Transform the Discord snapshot into a proposed update for the existing website CMS. Do NOT invent facts. Preserve existing information unless Discord clearly provides a replacement. Only change sections supported by evidence. You may update announcements, leadership, cocLeadership, divisions, rules, government, ranks, news, media, applications, org, and customSections. Return ONLY JSON with keys: summary (string), changes (array of strings), content (object). The content object must be a complete website content object based on the CURRENT content below, with only evidence-backed changes. Keep private application data unless explicitly evidenced; never copy secrets, tokens, emails, phone numbers, or personal data.\n\nCURRENT CONTENT:\n${JSON.stringify(current)}\n\nDISCORD SNAPSHOT:\n${JSON.stringify(snapshot)}`;
  const result = await aiJson(prompt);
  if (!result?.content || typeof result.content !== "object") throw new Error("AI returned invalid website content");
  const next = result.content as Awaited<ReturnType<typeof getContent>>;
  await saveContent(next);
  return { guildId, guildName: guild?.name || guildId, channelsScanned: textChannels.length, rolesScanned: Array.isArray(snapshot.roles)?snapshot.roles.length:0, messagesScanned: channelData.reduce((n,c)=>n+c.messages.length,0), summary:String(result.summary||""), changes:Array.isArray(result.changes)?result.changes.slice(0,30):[] };
}
