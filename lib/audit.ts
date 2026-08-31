import { neon } from "@neondatabase/serverless";

function sql(){const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is not configured");return neon(url)}

export type AuditEntry={id:number;actorId:string;actorName:string;action:string;section:string;summary:string;beforeHash:string;afterHash:string;createdAt:string};

const MAX_SUMMARY_LENGTH=1000;
const MAX_AUDIT_ROWS=10000;
let initialized=false;

async function init(){
  if(initialized)return;
  const q=sql();
  await q`CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    section TEXT NOT NULL,
    summary TEXT NOT NULL,
    before_hash TEXT NOT NULL,
    after_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await q`CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC)`;
  await q`CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log (actor_id, created_at DESC)`;
  await q`CREATE INDEX IF NOT EXISTS audit_log_section_idx ON audit_log (section, created_at DESC)`;
  initialized=true;
}

export async function recordAudit(input:{actorId:string;actorName:string;action:string;section:string;summary:string;beforeHash:string;afterHash:string}){
  await init();
  const q=sql();
  const summary=input.summary.slice(0,MAX_SUMMARY_LENGTH);

  // Prevent duplicate writes caused by retries or double-clicks.
  const duplicate=await q`SELECT id FROM audit_log
    WHERE actor_id=${input.actorId}
      AND action=${input.action}
      AND section=${input.section}
      AND before_hash=${input.beforeHash}
      AND after_hash=${input.afterHash}
      AND created_at > NOW() - INTERVAL '5 minutes'
    LIMIT 1`;
  if(duplicate.length)return;

  // Hard storage guard. Existing audit records are never edited or deleted by the app.
  const countRows=await q`SELECT COUNT(*)::int AS count FROM audit_log`;
  const count=Number((countRows[0] as {count:number|string})?.count||0);
  if(count>=MAX_AUDIT_ROWS)throw new Error("Audit log storage limit reached; no audit record was written.");

  await q`INSERT INTO audit_log
    (actor_id,actor_name,action,section,summary,before_hash,after_hash)
    VALUES (${input.actorId},${input.actorName.slice(0,200)},${input.action.slice(0,100)},${input.section.slice(0,100)},${summary},${input.beforeHash.slice(0,128)},${input.afterHash.slice(0,128)})`;
}

export async function readAudit(limit=100){
  await init();
  const q=sql();
  const safeLimit=Math.min(Math.max(Number(limit)||100,1),200);
  const rows=await q`SELECT id,actor_id AS "actorId",actor_name AS "actorName",action,section,summary,before_hash AS "beforeHash",after_hash AS "afterHash",created_at AS "createdAt"
    FROM audit_log ORDER BY id DESC LIMIT ${safeLimit}`;
  return rows as unknown as AuditEntry[];
}
