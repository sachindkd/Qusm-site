import WebSocket from 'ws';
import { investigateAndRespond } from '../security/analysis';
import { NEXUS_ALLOWED_GUILD_ID, isAuthorized } from '../security/access';
import { sendMessage, member } from '../discord/rest';
import { decideAgentTurn, createDynamicPlan, generateExecutionReport, generateNexusReply } from '../core/ai-runtime';
import { executeCapability } from '../tools/executor';

const GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';
const WINDOW_MS = 30_000;
type GatewayPayload = { op: number; d: any; s?: number; t?: string };

export class NexusGatewayWorker {
  private ws?: WebSocket;
  private heartbeat?: NodeJS.Timeout;
  private securityTimer?: NodeJS.Timeout;
  private sequence: number | null = null;
  private reconnectMs = 1000;
  private botUserId = '';
  private signals: any[] = [];
  private processing = false;

  start() {
    this.securityTimer = setInterval(() => void this.flushSecurity(), 5000);
    this.connect();
  }
  private connect() {
    const token = process.env.NEXUS_DISCORD_BOT_TOKEN;
    if (!token) throw new Error('NEXUS_DISCORD_BOT_TOKEN is not configured.');
    this.ws = new WebSocket(GATEWAY);
    this.ws.on('open', () => { this.reconnectMs = 1000; console.log('[NEXUS] Discord Gateway connected.'); });
    this.ws.on('message', raw => this.handle(JSON.parse(raw.toString()), token).catch(err => console.error('[NEXUS gateway]', err)));
    this.ws.on('close', () => this.scheduleReconnect());
    this.ws.on('error', err => console.error('[NEXUS gateway]', err));
  }
  private scheduleReconnect() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    const delay = this.reconnectMs;
    this.reconnectMs = Math.min(this.reconnectMs * 2, 30_000);
    setTimeout(() => this.connect(), delay);
  }
  private send(payload: object) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload)); }
  private async handle(payload: GatewayPayload, token: string) {
    if (payload.s !== undefined) this.sequence = payload.s;
    if (payload.op === 0 && payload.t === 'READY') {
      this.botUserId = String(payload.d?.user?.id || '');
      console.log(`[NEXUS] Logged in as ${payload.d?.user?.username || 'bot'} (${this.botUserId}).`);
    }
    if (payload.op === 10) {
      const interval = Number(payload.d.heartbeat_interval || 41250);
      if (this.heartbeat) clearInterval(this.heartbeat);
      this.heartbeat = setInterval(() => this.send({ op: 1, d: this.sequence }), interval);
      this.send({ op: 2, d: { token, intents: 1 | 2 | 4 | 512 | 32768, properties: { os: 'linux', browser: 'nexus', device: 'nexus' } } });
      return;
    }
    if (payload.op === 11) return;
    if (payload.op === 7 || payload.op === 9) { this.ws?.close(); return; }
    if (payload.op !== 0 || payload.d?.guild_id !== NEXUS_ALLOWED_GUILD_ID) return;
    const type = String(payload.t || '');
    const guildId = String(payload.d.guild_id);
    const now = Date.now();

    if (type === 'MESSAGE_CREATE') {
      const message = payload.d;
      const authorId = String(message.author?.id || '');
      const content = String(message.content || '').trim();
      this.signals.push({ guildId, type: 'message_create', userId: authorId, channelId: message.channel_id, data: { contentLength: content.length }, at: now });
      if (authorId === this.botUserId) return;
      const mentioned = !!this.botUserId && Array.isArray(message.mentions) && message.mentions.some((u: any) => String(u?.id) === this.botUserId);
      if (!mentioned) return;
      const mentionText = content.replace(new RegExp(`<@!?${this.botUserId}>`, 'g'), '').trim();
      if (!mentionText) return;
      try {
        const user = await member(guildId, authorId) as any;
        const roleIds = Array.isArray(user?.roles) ? user.roles.map(String) : [];
        if (!isAuthorized({ guildId, userId: authorId, roleIds })) {
          await sendMessage(guildId, String(message.channel_id), 'NEXUS access denied: you are not authorized to use NEXUS.');
          return;
        }
        const channelId = String(message.channel_id);
        const decision = await decideAgentTurn(mentionText, guildId, authorId, channelId);
        if (decision.mode === 'conversation') {
          await sendMessage(guildId, channelId, String(decision.response || await generateNexusReply(mentionText, guildId, authorId, channelId)).slice(0, 1900));
          return;
        }
        const goal = String(decision.goal);
        const plan = await createDynamicPlan(goal, guildId, authorId, channelId);
        const results: unknown[] = [];
        for (const step of plan.steps.slice(0, 12)) {
          const result = await executeCapability({ guildId, userId: authorId, channelId }, step.capability, { ...step.input, guildId, channelId });
          results.push({ capability: step.capability, ok: result.ok, result: result.result, error: result.error });
          if (!result.ok) break;
        }
        await sendMessage(guildId, channelId, (await generateExecutionReport(goal, guildId, authorId, plan, results)).slice(0, 1900));
      } catch (error) {
        console.error('[NEXUS agent]', error);
        try { await sendMessage(guildId, String(message.channel_id), `NEXUS error: ${error instanceof Error ? error.message : 'request failed'}`); } catch {}
      }
    }
    if (type === 'GUILD_MEMBER_ADD') this.signals.push({ guildId, type: 'guild_member_add', userId: payload.d.user?.id, data: {}, at: now });
    if (type === 'GUILD_ROLE_UPDATE') this.signals.push({ guildId, type: 'guild_role_update', data: { roleId: payload.d.role?.id, permissions: payload.d.role?.permissions }, at: now });
    if (type === 'GUILD_ROLE_CREATE') this.signals.push({ guildId, type: 'guild_role_update', data: { roleId: payload.d.role?.id, created: true }, at: now });
    if (type === 'GUILD_ROLE_DELETE') this.signals.push({ guildId, type: 'guild_role_update', data: { roleId: payload.d.role_id, deleted: true }, at: now });
    if (type === 'GUILD_AUDIT_LOG_ENTRY_CREATE') this.signals.push({ guildId, type: 'audit_log_entry', userId: payload.d.user_id, data: payload.d, at: now });
  }
  private async flushSecurity() {
    if (this.processing || this.signals.length < 3) return;
    const cutoff = Date.now() - WINDOW_MS;
    const batch = this.signals.filter(s => s.at >= cutoff);
    this.signals = [];
    if (!batch.length) return;
    this.processing = true;
    try {
      const report = await investigateAndRespond(NEXUS_ALLOWED_GUILD_ID, batch);
      if (report.assessment.severity !== 'low') {
        console.log('[NEXUS security incident]', JSON.stringify(report));
        const channelId = process.env.NEXUS_SECURITY_LOG_CHANNEL_ID || batch.find(s => s.channelId)?.channelId;
        if (channelId) {
          const summary = [`🛡️ **NEXUS Security Alert — ${report.assessment.severity.toUpperCase()}**`, report.assessment.reason, `Confidence: ${Math.round(report.assessment.confidence * 100)}%`, report.results?.length ? `Actions checked: ${report.results.length}` : 'Actions: none'].join('\n');
          try { await sendMessage(NEXUS_ALLOWED_GUILD_ID, channelId, summary); } catch (error) { console.error('[NEXUS security report]', error); }
        }
      }
    } catch (error) { console.error('[NEXUS security]', error); }
    finally { this.processing = false; }
  }
}
