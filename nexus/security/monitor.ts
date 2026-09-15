export type SecuritySignal = { type: string; severity: 'low' | 'medium' | 'high' | 'critical'; guildId: string; subjectId?: string; details: Record<string, unknown> };

export function analyzeSecuritySignals(guildId: string, events: Array<Record<string, unknown>>): SecuritySignal[] {
  const signals: SecuritySignal[] = [];
  for (const event of events) {
    const type = String(event.type || 'unknown');
    const count = Number(event.count || 0);
    if (type === 'member_join_burst' && count >= 10) signals.push({ type, severity: count >= 25 ? 'critical' : 'high', guildId, details: event });
    if (type === 'message_spam' && count >= 8) signals.push({ type, severity: count >= 20 ? 'high' : 'medium', guildId, details: event });
    if (type === 'dangerous_permission_change') signals.push({ type, severity: 'high', guildId, details: event });
    if (type === 'mass_role_change') signals.push({ type, severity: 'critical', guildId, details: event });
  }
  return signals;
}
