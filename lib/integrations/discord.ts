export type DiscordPublishResult =
  | { ok: true; messageId?: string }
  | { ok: false; code: "missing_config" | "missing_channel" | "forbidden" | "rate_limited" | "discord_error"; message: string; retryAfterMs?: number };

const DISCORD_API = "https://discord.com/api/v10";

export async function publishDiscordMessage(content: string, channelId = process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID): Promise<DiscordPublishResult> {
  if (!process.env.DISCORD_BOT_TOKEN) return { ok: false, code: "missing_config", message: "Discord publishing is not configured." };
  if (!channelId) return { ok: false, code: "missing_channel", message: "Announcement channel is not configured." };
  if (!content.trim()) return { ok: false, code: "discord_error", message: "Cannot publish an empty announcement." };

  try {
    const response = await fetch(`${DISCORD_API}/channels/${encodeURIComponent(channelId)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 2000) }),
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) return { ok: false, code: "forbidden", message: "Discord rejected the bot credentials or channel permissions." };
    if (response.status === 404) return { ok: false, code: "missing_channel", message: "The configured Discord announcement channel was not found." };
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 1);
      return { ok: false, code: "rate_limited", message: "Discord rate-limited this publish. Try again shortly.", retryAfterMs: Math.ceil(retryAfter * 1000) };
    }
    if (!response.ok) return { ok: false, code: "discord_error", message: `Discord returned HTTP ${response.status}.` };
    const data = await response.json().catch(() => ({}));
    return { ok: true, messageId: typeof data?.id === "string" ? data.id : undefined };
  } catch {
    return { ok: false, code: "discord_error", message: "Discord is currently unreachable. The announcement can remain saved locally." };
  }
}
