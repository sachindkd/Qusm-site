export type NexusConfig = { aiModel: string; appUrl: string; allowedGuildId: string; allowedRoleId: string };
export function getNexusConfig(): NexusConfig {
  const aiModel = process.env.NEXUS_AI_MODEL || 'openai/gpt-oss-120b';
  const appUrl = process.env.NEXUS_APP_URL || '';
  const allowedGuildId = process.env.NEXUS_ALLOWED_GUILD_ID || '1549377442240663572';
  const allowedRoleId = process.env.NEXUS_ALLOWED_ROLE_ID || '1549378437448335380';
  if (allowedGuildId !== '1549377442240663572') throw new Error('Configuration error: NEXUS_ALLOWED_GUILD_ID is not the authorized guild.');
  return { aiModel, appUrl, allowedGuildId, allowedRoleId };
}
