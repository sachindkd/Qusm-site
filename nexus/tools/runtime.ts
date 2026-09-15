import * as discord from '../discord/rest';
import { NEXUS_ALLOWED_GUILD_ID } from '../security/access';

export async function inspectServerForRuntime(guildId: string) {
  if (guildId !== NEXUS_ALLOWED_GUILD_ID) throw new Error('Authorization error: runtime guild is not authorized.');
  return Promise.all([discord.guild(guildId), discord.channels(guildId), discord.roles(guildId)]);
}
