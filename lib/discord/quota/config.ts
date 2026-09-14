export const STAFF_GUILD_ID = "1539736452995350528";
export const STAFF_ROLE_ID = "1539751393139626044";
export const INTERNSHIP_ROLE_ID = "1539742468701167726";
export const LOGISTICS_ROLE_ID = "1539908119067492427";
export const TESTER_ROLE_ID = "1540499074061439006";
export const QUOTA_CHANNEL_ID = "1545116182858965046";
export const QUOTA_LOG_CHANNEL_ID = "1539785260923879505";

export function botToken() {
  const value = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!value) throw new Error("DISCORD_BOT_TOKEN is not configured");
  return value;
}

export function applicationId() {
  const value = (process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID)?.trim();
  if (!value) throw new Error("DISCORD_APPLICATION_ID or DISCORD_CLIENT_ID is not configured");
  return value;
}

export function publicKey() {
  const value = process.env.DISCORD_PUBLIC_KEY?.trim();
  if (!value) throw new Error("DISCORD_PUBLIC_KEY is not configured");
  return value;
}

export function quotaSecret() {
  const value = process.env.NEXTAUTH_SECRET?.trim();
  if (!value || value.length < 32) throw new Error("NEXTAUTH_SECRET must be at least 32 characters");
  return value;
}
