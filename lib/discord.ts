export const DISCORD_ROLES = {
  chairman: "1501042310320881834",
  owner: "1430245086930669579",
  coOwner: "1530961653103853669",
  viceChairman: "716797005753483324",
  hocf: "1540038203959152650",
  ceo: "1493982432276385812",
  hod: "1431617140674265129",
  hdo: "1539579714841350235",
  hao: "1540038224431554633",
  gm: "1535569347928658010",
  hom: "1431171866680365097",
  development: "1478156027244314825",
  aides: "1538911108788654160",
  staff: "1496561403501219952",
  seniorManagement: "1531899271614562314",
} as const;

export const DISCORD_CHANNELS = {
  recruitment: "1532347499212177438",
  announcements: "1506706237721546852",
  developerPosts: "1506466679100801196",
} as const;

export const DIVISIONS = [
  { id: "hls", name: "Homeland Security", active: true },
  { id: "ss", name: "Secret Service", active: true },
  { id: "usmc", name: "United States Marine Corps", active: true },
  { id: "navy", name: "United States Navy", active: false },
  { id: "socom", name: "Special Operations Command", active: true },
  { id: "med", name: "Medical", active: true },
  { id: "doj", name: "Department of Justice", active: true },
  { id: "mp", name: "Military Police", active: true },
] as const;

const DISCORD_API = "https://discord.com/api/v10";

function botHeaders() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN is not configured");
  return {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };
}

export async function discordBotRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: {
      ...botHeaders(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Discord API ${response.status}: ${text || response.statusText}`);
  }

  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export async function getDiscordBotApplication() {
  return discordBotRequest<{
    id: string;
    name: string;
    bot?: { username: string; id: string };
  }>("/applications/@me");
}

export async function sendDiscordMessage(channelId: string, content: string) {
  return discordBotRequest<{ id: string; channel_id: string }>(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
