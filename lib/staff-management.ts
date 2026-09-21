import { neon } from "@neondatabase/serverless";
import { getStaffDatabaseSnapshot } from "@/lib/quota-sheets";
import { STAFF_GUILD_ID } from "@/lib/discord/quota/config";

const MANAGEMENT_LOG = "1551552375989342260";
const PROMOTION_LOG = "1551552552468750417";
const DISCIPLINE_LOG = "1551552704126386176";
const STAFF_HIGHCOM_ROLE = process.env.QUSM_HIGHCOM_ROLE_ID?.trim() || "";
const COS_ROLE = process.env.QUSM_COS_ROLE_ID?.trim() || "";

function sql() { const url = process.env.DATABASE_URL; if (!url) throw new Error("DATABASE_URL is not configured"); return neon(url); }
function arr<T>(v: unknown): T[] { return Array.isArray(v) ? v as T[] : []; }
function envInt(name: string, fallback: number) { const n = Number(process.env[name]); return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : fallback; }
function rankLadder() { return String(process.env.QUSM_STAFF_RANKS || "").split(",").map(x => x.trim()).filter(Boolean); }

export type StaffProfile = {
  userId: string; username: string; rank: string; status: string; merits: number; demerits: number; net: number;
  quotaMinutes: number; tickets: number; duties: unknown[]; warnings: unknown[]; strikes: unknown[]; rankLocked: boolean;
  departments: unknown[]; recognition: unknown[]; promotionHistory: unknown[]; demotionHistory: unknown[]; staffHistory: unknown[];
  eligibility: { eligible: boolean; reasons: string[]; rankLocked: boolean; configured: boolean };
  updatedAt: string | null;
};

async function init() {
  const q = sql();
  await q`CREATE TABLE IF NOT EXISTS staff_profiles (
    user_id TEXT PRIMARY KEY, username TEXT NOT NULL, rank TEXT NOT NULL DEFAULT 'Unknown', status TEXT NOT NULL DEFAULT 'Active',
    merits INTEGER NOT NULL DEFAULT 0, demerits INTEGER NOT NULL DEFAULT 0, duties JSONB NOT NULL DEFAULT '[]'::jsonb,
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb, strikes JSONB NOT NULL DEFAULT '[]'::jsonb, rank_locked BOOLEAN NOT NULL DEFAULT FALSE,
    departments JSONB NOT NULL DEFAULT '[]'::jsonb, recognition JSONB NOT NULL DEFAULT '[]'::jsonb,
    promotion_history JSONB NOT NULL DEFAULT '[]'::jsonb, demotion_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    staff_history JSONB NOT NULL DEFAULT '[]'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await q`CREATE TABLE IF NOT EXISTS staff_point_transactions (
    id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL, amount INTEGER NOT NULL, point_type TEXT NOT NULL, reason TEXT NOT NULL,
    issuer_id TEXT NOT NULL, issuer_username TEXT NOT NULL, source TEXT NOT NULL, related_action TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await q`CREATE INDEX IF NOT EXISTS staff_point_user_idx ON staff_point_transactions(user_id, created_at DESC)`;
  await q`CREATE TABLE IF NOT EXISTS staff_cases (
    id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL, case_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    reason TEXT NOT NULL, created_by TEXT NOT NULL, created_by_username TEXT NOT NULL, decided_by TEXT, decided_by_username TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), decided_at TIMESTAMPTZ
  )`;
  await q`CREATE INDEX IF NOT EXISTS staff_cases_user_idx ON staff_cases(user_id, created_at DESC)`;
  await q`CREATE TABLE IF NOT EXISTS staff_audit (
    id BIGSERIAL PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, reason TEXT, source TEXT NOT NULL,
    issuer_id TEXT, issuer_username TEXT, before_state JSONB, after_state JSONB, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await q`CREATE INDEX IF NOT EXISTS staff_audit_user_idx ON staff_audit(user_id, created_at DESC)`;
}

async function getRow(userId: string) {
  await init(); const q = sql(); const rows = await q`SELECT * FROM staff_profiles WHERE user_id=${userId} LIMIT 1`; return rows[0] || null;
}
async function audit(userId: string, action: string, reason: string, source: string, issuerId: string, issuerUsername: string, beforeState: unknown, afterState: unknown, metadata: unknown = {}) {
  const q = sql(); await q`INSERT INTO staff_audit(user_id,action,reason,source,issuer_id,issuer_username,before_state,after_state,metadata) VALUES(${userId},${action},${reason||null},${source},${issuerId},${issuerUsername},${JSON.stringify(beforeState??null)}::jsonb,${JSON.stringify(afterState??null)}::jsonb,${JSON.stringify(metadata)}::jsonb)`;
}
function snapshotState(row: any) { return row ? { username: row.username, rank: row.rank, status: row.status, merits: row.merits, demerits: row.demerits, rankLocked: row.rank_locked, departments: row.departments, warnings: row.warnings, strikes: row.strikes } : null; }

async function discord(path: string, init?: RequestInit) {
  const token = process.env.DISCORD_BOT_TOKEN?.trim(); if (!token) throw new Error("DISCORD_BOT_TOKEN is not configured");
  const r = await fetch(`https://discord.com/api/v10${path}`, { ...init, headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Discord API ${r.status}: ${(await r.text()).slice(0,300)}`); return r.status === 204 ? null : r.json();
}
async function postLog(channel: string, title: string, description: string) { try { await discord(`/channels/${channel}/messages`, { method:"POST", body:JSON.stringify({embeds:[{title,description,timestamp:new Date().toISOString()}]}) }); } catch(e) { console.warn("[staff-management] log failed",e); } }

export async function isHighcom(interaction: any) {
  const id = String(interaction?.member?.user?.id || interaction?.user?.id || "");
  if (id && id === process.env.DISCORD_SPECIAL_USER_ID?.trim()) return true;
  const roles = arr<string>(interaction?.member?.roles);
  return Boolean((COS_ROLE && roles.includes(COS_ROLE)) || (STAFF_HIGHCOM_ROLE && roles.includes(STAFF_HIGHCOM_ROLE)));
}

async function ensureProfile(userId: string, username: string, rank: string, source: string, issuerId="system", issuerUsername="system") {
  await init(); const q = sql();
  await q`INSERT INTO staff_profiles(user_id,username,rank) VALUES(${userId},${username},${rank||"Unknown"}) ON CONFLICT(user_id) DO UPDATE SET username=EXCLUDED.username, rank=CASE WHEN staff_profiles.rank='Unknown' OR staff_profiles.rank='' THEN EXCLUDED.rank ELSE staff_profiles.rank END, updated_at=NOW()`;
  const row = await getRow(userId); if (!row) throw new Error("Staff profile could not be created");
  return row;
}

function eligibility(row: any, quotaMinutes: number, tickets: number) {
  const ladder = rankLadder(); const reasons: string[] = []; const configured = ladder.length > 0;
  if (row.rank_locked) reasons.push("Rank lock is active");
  const minNet = envInt("QUSM_PROMOTION_MIN_NET_POINTS", 0); if (row.merits-row.demerits < minNet) reasons.push(`Net points below ${minNet}`);
  const minQuota = envInt("QUSM_PROMOTION_MIN_QUOTA_MINUTES", 0); if (quotaMinutes < minQuota) reasons.push(`Quota below ${minQuota} minutes`);
  const minTickets = envInt("QUSM_PROMOTION_MIN_TICKETS", 0); if (tickets < minTickets) reasons.push(`Tickets below ${minTickets}`);
  if (row.strikes && arr(row.strikes).length > 0) reasons.push("Active strike(s)");
  if (!configured) reasons.push("Rank ladder is not configured");
  return { eligible: reasons.length===0, reasons, rankLocked:Boolean(row.rank_locked), configured };
}

export async function getStaffProfile(userId: string): Promise<StaffProfile | null> {
  const row = await getRow(userId); if (!row) return null;
  const snapshot = (await getStaffDatabaseSnapshot()).find(x => x.username.trim().toLowerCase() === String(row.username).trim().toLowerCase());
  const e = eligibility(row, snapshot?.minutes || 0, snapshot?.tickets || 0);
  return { userId:String(row.user_id), username:String(row.username), rank:String(row.rank), status:String(row.status), merits:Number(row.merits)||0, demerits:Number(row.demerits)||0, net:(Number(row.merits)||0)-(Number(row.demerits)||0), quotaMinutes:snapshot?.minutes||0, tickets:snapshot?.tickets||0, duties:arr(row.duties), warnings:arr(row.warnings), strikes:arr(row.strikes), rankLocked:Boolean(row.rank_locked), departments:arr(row.departments), recognition:arr(row.recognition), promotionHistory:arr(row.promotion_history), demotionHistory:arr(row.demotion_history), staffHistory:arr(row.staff_history), eligibility:e, updatedAt:row.updated_at ? String(row.updated_at):null };
}

export async function findDiscordStaff(username: string) {
  const wanted = username.trim().toLowerCase(); if (!wanted) return null;
  const members = await discord(`/guilds/${STAFF_GUILD_ID}/members/search?query=${encodeURIComponent(username.trim())}&limit=20`) as any[];
  const exact = members.filter(m => String(m?.user?.username||"").toLowerCase()===wanted);
  if (exact.length !== 1) return null; const m=exact[0]; return { id:String(m.user.id), username:String(m.user.username), nick:m.nick||null, roles:arr<string>(m.roles) };
}

export async function openStaffByUsername(username: string, issuerId: string, issuerUsername: string) {
  const member = await findDiscordStaff(username); if (!member) throw new Error(`No unique Discord username match for "${username}".`);
  const roles = await discord(`/guilds/${STAFF_GUILD_ID}/roles`) as any[]; const roleNames=new Map(roles.map(r=>[String(r.id),String(r.name)]));
  const currentRank = member.roles.map(r=>roleNames.get(r)).filter(Boolean)[0] || "Unknown";
  await ensureProfile(member.id,member.username,currentRank,"staff-panel",issuerId,issuerUsername);
  return getStaffProfile(member.id);
}

export async function addPoints(userId:string, amount:number, type:"merit"|"demerit", reason:string, issuerId:string, issuerUsername:string, source="manual") {
  if (!Number.isInteger(amount)||amount<=0) throw new Error("Points must be a positive whole number."); if (!reason.trim()) throw new Error("A reason is required.");
  const row=await getRow(userId); if(!row) throw new Error("Staff profile not found."); const before=snapshotState(row); const q=sql();
  const merits=Number(row.merits)+(type==="merit"?amount:0); const demerits=Number(row.demerits)+(type==="demerit"?amount:0);
  await q`UPDATE staff_profiles SET merits=${merits}, demerits=${demerits}, updated_at=NOW() WHERE user_id=${userId}`;
  await q`INSERT INTO staff_point_transactions(user_id,amount,point_type,reason,issuer_id,issuer_username,source,related_action) VALUES(${userId},${type==="merit"?amount:-amount},${type},${reason},${issuerId},${issuerUsername},${source},${type})`;
  const after=snapshotState(await getRow(userId)); await audit(userId,type=== "merit"?"merit_added":"demerit_added",reason,source,issuerId,issuerUsername,before,after,{amount});
  if(type==="demerit") await evaluateDiscipline(userId,issuerId,issuerUsername);
  return getStaffProfile(userId);
}

async function evaluateDiscipline(userId:string, issuerId:string, issuerUsername:string) {
  const row=await getRow(userId); if(!row) return; const warnings=arr<any>(row.warnings); const demerits=Number(row.demerits)||0;
  const warningThreshold=envInt("QUSM_DEMERIT_WARNING_THRESHOLD",5); const seriousThreshold=envInt("QUSM_DEMERIT_SERIOUS_THRESHOLD",10);
  if(demerits>=warningThreshold && warnings.length===0){ const item={reason:`Automatic threshold reached at ${demerits} demerits`,issuerId,issuerUsername,createdAt:new Date().toISOString(),source:"automation"}; const q=sql(); await q`UPDATE staff_profiles SET warnings=${JSON.stringify([...warnings,item])}::jsonb, updated_at=NOW() WHERE user_id=${userId}`; await audit(userId,"warning_auto_issued",item.reason,"automation",issuerId,issuerUsername,row,snapshotState(await getRow(userId))); await postLog(DISCIPLINE_LOG,"Automatic Warning",`<@${userId}> reached **${demerits} demerits**. A warning was issued automatically.`); }
  if(demerits>=seriousThreshold){ const q=sql(); const existing=await q`SELECT id FROM staff_cases WHERE user_id=${userId} AND case_type='strike' AND status='pending' LIMIT 1`; if(!existing.length){ const r=await q`INSERT INTO staff_cases(user_id,case_type,reason,created_by,created_by_username,payload) VALUES(${userId},'strike',${`Demerit threshold reached at ${demerits}`},${issuerId},${issuerUsername},${JSON.stringify({automatic:true,demerits})}::jsonb) RETURNING id`; await postLog(DISCIPLINE_LOG,"Strike Approval Required",`Case **#${r[0].id}** for <@${userId}> requires HighCOM approval. Further discipline was **not** applied automatically.`); } }
}

export async function createCase(userId:string, caseType:string, reason:string, issuerId:string, issuerUsername:string, payload:any={}) { await init(); const q=sql(); const r=await q`INSERT INTO staff_cases(user_id,case_type,reason,created_by,created_by_username,payload) VALUES(${userId},${caseType},${reason},${issuerId},${issuerUsername},${JSON.stringify(payload)}::jsonb) RETURNING id`; await postLog(DISCIPLINE_LOG,"HighCOM Approval Required",`Case **#${r[0].id}** • <@${userId}> • **${caseType}**\n${reason}`); return Number(r[0].id); }
export async function decideCase(caseId:number, decision:"approved"|"denied", issuerId:string, issuerUsername:string) { await init(); const q=sql(); const rows=await q`SELECT * FROM staff_cases WHERE id=${caseId} AND status='pending' LIMIT 1`; if(!rows.length) throw new Error("Approval case is no longer pending."); const c=rows[0]; await q`UPDATE staff_cases SET status=${decision},decided_by=${issuerId},decided_by_username=${issuerUsername},decided_at=NOW() WHERE id=${caseId} AND status='pending'`; if(decision==="approved" && c.case_type==="strike"){ const row=await getRow(String(c.user_id)); if(row){ const strikes=[...arr<any>(row.strikes),{reason:c.reason,issuerId,issuerUsername,createdAt:new Date().toISOString(),caseId}]; await q`UPDATE staff_profiles SET strikes=${JSON.stringify(strikes)}::jsonb,updated_at=NOW() WHERE user_id=${c.user_id}`; await audit(String(c.user_id),"strike_approved",c.reason,"approval",issuerId,issuerUsername,snapshotState(row),snapshotState(await getRow(String(c.user_id))),{caseId}); } } await audit(String(c.user_id),`case_${decision}`,c.reason,"approval",issuerId,issuerUsername,null,null,{caseId,caseType:c.case_type}); return getStaffProfile(String(c.user_id)); }

export async function setRankLock(userId:string, locked:boolean, reason:string, issuerId:string, issuerUsername:string){ const row=await getRow(userId); if(!row) throw new Error("Staff profile not found."); const before=snapshotState(row); const q=sql(); await q`UPDATE staff_profiles SET rank_locked=${locked},updated_at=NOW() WHERE user_id=${userId}`; const after=snapshotState(await getRow(userId)); await audit(userId,locked?"rank_lock_applied":"rank_lock_removed",reason,"manual",issuerId,issuerUsername,before,after); await postLog(PROMOTION_LOG,locked?"Rank Lock Applied":"Rank Lock Removed",`<@${userId}> • ${reason}`); return getStaffProfile(userId); }

async function nextRank(current:string, direction:1|-1){ const ladder=rankLadder(); if(!ladder.length) throw new Error("QUSM_STAFF_RANKS is not configured."); const i=ladder.findIndex(x=>x.toLowerCase()===current.toLowerCase()); if(i<0) throw new Error(`Current rank "${current}" is not present in QUSM_STAFF_RANKS.`); const n=i+direction; if(n<0||n>=ladder.length) throw new Error("No configured rank exists in that direction."); return ladder[n]; }
async function setDiscordRank(userId:string, oldRank:string, newRank:string){ const roles=await discord(`/guilds/${STAFF_GUILD_ID}/roles`) as any[]; const oldRole=roles.find(r=>String(r.name).toLowerCase()===oldRank.toLowerCase()); const newRole=roles.find(r=>String(r.name).toLowerCase()===newRank.toLowerCase()); if(!newRole) throw new Error(`Discord role for rank "${newRank}" was not found.`); if(oldRole) await discord(`/guilds/${STAFF_GUILD_ID}/members/${userId}/roles/${oldRole.id}`,{method:"DELETE"}); await discord(`/guilds/${STAFF_GUILD_ID}/members/${userId}/roles/${newRole.id}`,{method:"PUT",body:"{}"}); }

export async function changeRank(userId:string,direction:1|-1,reason:string,issuerId:string,issuerUsername:string,override=false){ const row=await getRow(userId); if(!row) throw new Error("Staff profile not found."); const profile=await getStaffProfile(userId); if(!profile) throw new Error("Staff profile not found."); if(direction===1&&!override&&!profile.eligibility.eligible) throw new Error(`Promotion blocked: ${profile.eligibility.reasons.join("; ")}`); if(direction===1&&row.rank_locked&&!override) throw new Error("Promotion blocked: rank lock is active."); const newRank=await nextRank(String(row.rank),direction); const before=snapshotState(row); await setDiscordRank(userId,String(row.rank),newRank); const q=sql(); const history=direction===1?arr<any>(row.promotion_history):arr<any>(row.demotion_history); history.push({from:row.rank,to:newRank,reason,issuerId,issuerUsername,createdAt:new Date().toISOString(),override}); await q`UPDATE staff_profiles SET rank=${newRank},${direction===1?q`promotion_history=${JSON.stringify(history)}::jsonb`:q`demotion_history=${JSON.stringify(history)}::jsonb`},updated_at=NOW() WHERE user_id=${userId}`;
  const after=snapshotState(await getRow(userId)); await audit(userId,direction===1?"promoted":"demoted",reason,"manual",issuerId,issuerUsername,before,after,{override}); await postLog(PROMOTION_LOG,direction===1?"Promotion Completed":"Demotion Completed",`<@${userId}> **${row.rank} → ${newRank}**\nReason: ${reason}${override?"\n**Override:** Yes":""}`); return getStaffProfile(userId); }

export async function addWarning(userId:string,reason:string,issuerId:string,issuerUsername:string){ const row=await getRow(userId); if(!row) throw new Error("Staff profile not found."); const before=snapshotState(row); const q=sql(); const warnings=[...arr<any>(row.warnings),{reason,issuerId,issuerUsername,createdAt:new Date().toISOString(),source:"manual"}]; await q`UPDATE staff_profiles SET warnings=${JSON.stringify(warnings)}::jsonb,updated_at=NOW() WHERE user_id=${userId}`; const after=snapshotState(await getRow(userId)); await audit(userId,"warning_added",reason,"manual",issuerId,issuerUsername,before,after); await postLog(DISCIPLINE_LOG,"Warning Added",`<@${userId}> • ${reason}`); return getStaffProfile(userId); }
export async function addRecognition(userId:string,reason:string,issuerId:string,issuerUsername:string){ const row=await getRow(userId); if(!row) throw new Error("Staff profile not found."); const q=sql(); const items=[...arr<any>(row.recognition),{reason,issuerId,issuerUsername,createdAt:new Date().toISOString()}]; await q`UPDATE staff_profiles SET recognition=${JSON.stringify(items)}::jsonb,updated_at=NOW() WHERE user_id=${userId}`; await audit(userId,"recognition_added",reason,"manual",issuerId,issuerUsername,snapshotState(row),snapshotState(await getRow(userId))); await postLog(MANAGEMENT_LOG,"Recognition Added",`<@${userId}> • ${reason}`); return getStaffProfile(userId); }

export async function syncProfiles(issuerId:string,issuerUsername:string){ const rows=await getStaffDatabaseSnapshot(); const results={created:0,updated:0,unmatched:[] as string[]}; for(const r of rows){ const member=await findDiscordStaff(r.username); if(!member){results.unmatched.push(r.username);continue;} const existing=await getRow(member.id); await ensureProfile(member.id,member.username,r.rank||"Unknown","profile-sync",issuerId,issuerUsername); if(existing) results.updated++; else results.created++; await audit(member.id,existing?"profile_sync_updated":"profile_sync_created","Staff Database synchronization","profile-sync",issuerId,issuerUsername,existing?snapshotState(existing):null,snapshotState(await getRow(member.id)),{databaseRank:r.rank,quotaMinutes:r.minutes,tickets:r.tickets}); } return results; }

export async function listPendingCases(userId?:string){ await init(); const q=sql(); return userId? q`SELECT * FROM staff_cases WHERE user_id=${userId} AND status='pending' ORDER BY created_at DESC LIMIT 20` : q`SELECT * FROM staff_cases WHERE status='pending' ORDER BY created_at DESC LIMIT 50`; }
export async function auditRecent(userId:string){ await init(); const q=sql(); return q`SELECT action,reason,source,issuer_username,created_at::text FROM staff_audit WHERE user_id=${userId} ORDER BY created_at DESC LIMIT 20`; }
export const STAFF_LOG_CHANNELS={management:MANAGEMENT_LOG,promotion:PROMOTION_LOG,discipline:DISCIPLINE_LOG};
