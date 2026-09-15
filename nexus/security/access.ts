export const NEXUS_ALLOWED_GUILD_ID = process.env.NEXUS_ALLOWED_GUILD_ID || '1549377442240663572';
export const NEXUS_ALLOWED_ROLE_ID = process.env.NEXUS_ALLOWED_ROLE_ID || '1549378437448335380';

export type DiscordActor = { guildId?: string; userId?: string; roleIds?: string[] };

export function isAuthorized(actor: DiscordActor): boolean {
  return actor.guildId === NEXUS_ALLOWED_GUILD_ID && !!actor.roleIds?.includes(NEXUS_ALLOWED_ROLE_ID);
}

export function assertAuthorized(actor: DiscordActor) {
  if (!actor.guildId || actor.guildId !== NEXUS_ALLOWED_GUILD_ID) throw new Error('NEXUS is not enabled in this server.');
  if (!actor.roleIds?.includes(NEXUS_ALLOWED_ROLE_ID)) throw new Error('You are not authorized to use NEXUS.');
}
