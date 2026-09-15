export type MemoryRecord = { guildId: string; key: string; value: unknown; updatedAt: string };

const memory = new Map<string, MemoryRecord>();

function scopedKey(guildId: string, key: string) { return `${guildId}:${key}`; }

export function getMemory(guildId: string, key: string): MemoryRecord | undefined {
  return memory.get(scopedKey(guildId, key));
}

export function setMemory(guildId: string, key: string, value: unknown): MemoryRecord {
  const record = { guildId, key, value, updatedAt: new Date().toISOString() };
  memory.set(scopedKey(guildId, key), record);
  return record;
}

export function listMemory(guildId: string): MemoryRecord[] {
  return [...memory.values()].filter((record) => record.guildId === guildId);
}

export function memoryNamespace(guildId: string) {
  return { get: (key: string) => getMemory(guildId, key), set: (key: string, value: unknown) => setMemory(guildId, key, value), list: () => listMemory(guildId) };
}
