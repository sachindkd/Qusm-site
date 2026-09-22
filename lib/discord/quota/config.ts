export const STAFF_GUILD_ID = "1539736452995350528";
export const STAFF_ROLE_ID = "1539751393139626044";
export const INTERNSHIP_ROLE_ID = "1539742468701167726";
export const LOGISTICS_ROLE_ID = "1539908119067492427";
export const TESTER_ROLE_ID = "1540499074061439006";
export const QUOTA_CHANNEL_ID = "1545116182858965046";
export const QUOTA_LOG_CHANNEL_ID = "1539785260923879505";
export const QUOTA_ANNOUNCEMENT_CHANNEL_ID = "1539736453712445592";

// Hardcoded QUSM promotion ladder. The staff profile/rank remains database-backed;
// these names define only the allowed promotion order. Discord role assignment
// continues to resolve the corresponding role from the live guild.
export const QUSM_STAFF_RANK_LADDER = [
  { name: "Junior Moderator", roleId: "1539741693866283009" },
  { name: "Moderator", roleId: "1539736453007802451" },
  { name: "Senior Moderator", roleId: "1539741689584029726" },
  { name: "Junior Administrator", roleId: "1539736453016330303" },
  { name: "Administrator", roleId: "1539736453016330305" },
  { name: "Senior Administrator", roleId: "1539736453016330306" },
  { name: "Head of Administrator", roleId: "1539736453016330309" },
  { name: "Deputy Chief of Staff", roleId: "1545599457226137720" },
  { name: "Chief of Staff", roleId: "1539736453024849972" },
] as const;

// staff-management.ts already consumes QUSM_STAFF_RANKS. Populate that
// configuration from the hardcoded ladder so no Vercel environment variable
// is required for promotion eligibility.
process.env.QUSM_STAFF_RANKS = QUSM_STAFF_RANK_LADDER.map((rank) => rank.name).join(",");

// During development, only this Discord user may use the Staff bot commands.
// Set DEV_COMMAND_USER_ID to the designated special user on Vercel.
export function developmentCommandUserId() {
  return process.env.DEV_COMMAND_USER_ID?.trim() || "";
}

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
