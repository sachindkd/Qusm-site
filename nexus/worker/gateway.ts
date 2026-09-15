import WebSocket from 'ws';
import { investigateAndRespond } from '../security/analysis';
import { NEXUS_ALLOWED_GUILD_ID, isAuthorized } from '../security/access';
import { sendMessage, members } from '../discord/rest';
import { generateNexusReply } from '../core/ai-runtime';

const GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';
const WINDOW_MS = 30_000;
const MAX_BUFFER = 150;
type GatewayPayload = { op: number; d: any; s?: number; t?: string };

export class NexusGatewayWorker {
  private ws?: WebSocket;
  private heartbeat?: NodeJS.Timeout;
  private securityTimer?: NodeJS.Timeout;
  private sequence: number | null = null;
  private reconnectMs = 1000;
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

      // Ignore NEXUS's own messages and answer direct mentions.
      const botId = String(message.author?.id || '');
      const mentioned = Array.isArray(message.mentions) && message.mentions.some((u: any) => String(u?.id) === botId);
      const mentionText = content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim();
      if (mentioned && authorId !== botId && mentionText) {
        try {
          // Authorization is checked against the user's role in the guild before NEXUS replies.
          const userMembers = await members(guildId, authorId, 10) as any[];
          const member = Array.isArray(userMembers) ? userMembers.find(m => String(m?.user?.id) === authorId) : null;
          const roleIds = Array.isArray(member?.roles) ? member.roles.map(String) : [];
          if (!isAuthorized({ guildId, userId: authorId, roleIds })) {
            await sendMessage(guildId, String(message.channel_id), 'NEXUS access denied: you are not authorized to use NEXUS.');
          } else {
            const reply = await generateNexusReply(mentionText, guildId, authorId);
            await sendMessage(guildId, String(message.channel_id), reply.slice(0, 1900));
          }
        } catch (error) {
          console.error('[NEXUS mention]', error);
          await sendMessage(guildId, String(message.channel_id), 'NEXUS could not process that request right now.');
        }
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
