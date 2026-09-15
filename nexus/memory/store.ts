export type MemoryRecord = { guildId: string; key: string; value: unknown; updatedAt: string };

const MAX_RECORDS_PER_GUILD = 200;
const memory = new Map<string, MemoryRecord>();

function scopedKey(guildId: string, key: string) {
  return `${guildId}:${key}`;
}

function enforceGuildLimit(guildId: string) {
  const records = [...memory.values()]
    .filter((record) => record.guildId === guildId)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

  while (records.length > MAX_RECORDS_PER_GUILD) {
    const oldest = records.shift();
    if (oldest) memory.delete(scopedKey(guildId, oldest.key));
  }
}

export function getMemory(guildId: string, key: string): MemoryRecord | undefined {
  return memory.get(scopedKey(guildId, key));
}

export function setMemory(guildId: string, key: string, value: unknown): MemoryRecord {
  if (!guildId) throw new Error('Memory requires a guild scope.');
  const record = { guildId, key, value, updatedAt: new Date().toISOString() };
  memory.set(scopedKey(guildId, key), record);
  enforceGuildLimit(guildId);
  return record;
}

export function listMemory(guildId: string): MemoryRecord[] {
  return [...memory.values()]
    .filter((record) => record.guildId === guildId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function memoryNamespace(guildId: string) {
  return {
    get: (key: string) => getMemory(guildId, key),
    set: (key: string, value: unknown) => setMemory(guildId, key, value),
    list: () => listMemory(guildId),
  };
}
