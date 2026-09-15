/**
 * Every NEXUS operation carries a guild boundary. Do not expose cross-guild
 * storage or tool execution through this module.
 */
export function assertGuildScope(expectedGuildId: string, actualGuildId: string) {
  if (!expectedGuildId || !actualGuildId || expectedGuildId !== actualGuildId) {
    throw new Error('NEXUS guild scope violation');
  }
}

export function guildMemoryKey(guildId: string, key: string): string {
  assertGuildScope(guildId, guildId);
  return `nexus:guild:${guildId}:${key}`;
}
