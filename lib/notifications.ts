import { neon } from "@neondatabase/serverless";

export type Notification = { id:number; section:string; title:string; message:string; createdAt:string; read:boolean };

function sql(){const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is not configured");return neon(url)}
let initialized=false;

async function init(){
  if(initialized)return;
  const q=sql();
  await q`CREATE TABLE IF NOT EXISTS site_notifications (
    id BIGSERIAL PRIMARY KEY,
    section TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    before_hash TEXT,
    after_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await q`CREATE INDEX IF NOT EXISTS site_notifications_created_at_idx ON site_notifications (created_at DESC)`;
  await q`CREATE UNIQUE INDEX IF NOT EXISTS site_notifications_change_idx ON site_notifications (section, before_hash, after_hash) WHERE before_hash IS NOT NULL AND after_hash IS NOT NULL`;
  await q`CREATE TABLE IF NOT EXISTS site_notification_reads (
    user_id TEXT NOT NULL,
    notification_id BIGINT NOT NULL REFERENCES site_notifications(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, notification_id)
  )`;
  await q`CREATE INDEX IF NOT EXISTS site_notification_reads_user_idx ON site_notification_reads (user_id, notification_id)`;
  initialized=true;
}

const labels:Record<string,string>={announcements:"Announcements",calendar:"Calendar",leadership:"Leadership",divisions:"Divisions",rules:"Rules",government:"Government",ranks:"Military Ranks",news:"News",media:"Media",applications:"Applications",cocLeadership:"Leadership CoC",cocStaff:"Staff CoC",cocRoleplay:"Roleplay CoC",shop:"Store",customSections:"Website"};

export async function createNotification(input:{section:string;beforeHash:string;afterHash:string;summary?:string}){
  await init();
  if(input.beforeHash===input.afterHash)return;
  const q=sql();
  const label=labels[input.section]||input.section.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase());
  const title=`${label} updated`;
  const message=input.summary?.slice(0,500)||`New ${label.toLowerCase()} information is available on the website.`;
  await q`INSERT INTO site_notifications (section,title,message,before_hash,after_hash) VALUES (${input.section},${title},${message},${input.beforeHash},${input.afterHash}) ON CONFLICT DO NOTHING`;
}

export async function listNotifications(userId:string,limit=50){
  await init(); const q=sql(); const safe=Math.min(Math.max(Number(limit)||50,1),100);
  const rows=await q`SELECT n.id,n.section,n.title,n.message,n.created_at AS "createdAt",(r.notification_id IS NOT NULL) AS read FROM site_notifications n LEFT JOIN site_notification_reads r ON r.notification_id=n.id AND r.user_id=${userId} ORDER BY n.id DESC LIMIT ${safe}`;
  const unreadRows=await q`SELECT COUNT(*)::int AS count FROM site_notifications n LEFT JOIN site_notification_reads r ON r.notification_id=n.id AND r.user_id=${userId} WHERE r.notification_id IS NULL`;
  return {notifications:rows as unknown as Notification[],unreadCount:Number(unreadRows[0]?.count||0)};
}

export async function markNotificationRead(userId:string,id:number){
  await init(); const q=sql(); await q`INSERT INTO site_notification_reads(user_id,notification_id) VALUES(${userId},${id}) ON CONFLICT DO NOTHING`;
}

export async function markAllNotificationsRead(userId:string){
  await init(); const q=sql(); await q`INSERT INTO site_notification_reads(user_id,notification_id) SELECT ${userId},id FROM site_notifications ON CONFLICT DO NOTHING`;
}
