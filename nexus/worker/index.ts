import { analyzeSecuritySignals } from '../security/monitor';

export type WorkerEvent = { guildId: string; type: string; payload: Record<string, unknown> };
export type WorkerHandler = (event: WorkerEvent) => Promise<void>;

export class NexusWorker {
  private handlers: WorkerHandler[] = [];
  onEvent(handler: WorkerHandler) { this.handlers.push(handler); }

  async handle(event: WorkerEvent) {
    if (!event.guildId) throw new Error('Worker event requires guildId.');
    for (const handler of this.handlers) await handler(event);
  }

  async handleSecurityBatch(guildId: string, events: Array<Record<string, unknown>>) {
    return analyzeSecuritySignals(guildId, events);
  }
}

export function createWorker() { return new NexusWorker(); }
