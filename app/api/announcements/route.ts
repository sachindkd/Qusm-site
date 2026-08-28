import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, getAccessLevel, can, type DiscordGuildRole } from "@/lib/discord-roles";
import { readContent, writeContent } from "@/lib/content-store";

type Announcement={id:string;title:string;body:string;published:boolean;createdAt:string;updatedAt:string;discordMessageId?:string};

async function auth(){
 const raw=(await cookies()).get("fbmrp_discord_user")?.value; const token=process.env.DISCORD_BOT_TOKEN;
 if(!raw||!token)return false;
 try{const s=JSON.parse(raw);const h={Authorization:`Bot ${token}`};const [m,r]=await Promise.all([fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${s.id}`,{headers:h,cache:"no-store"}),fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`,{headers:h,cache:"no-store`})]); if(!m.ok||!r.ok)return false; const member=await m.json();const roles=await r.json() as DiscordGuildRole[];return can(getAccessLevel(s.id,member.roles||[],roles),"announcements:manage");}catch{return false}
}
export async function GET(){const c=await readContent();return NextResponse.json(c.announcements||[])}
export async function POST(req:Request){if(!(await auth()))return NextResponse.json({error:"Unauthorized"},{status:403});const b=await req.json();if(!b.title?.trim()||!b.body?.trim())return NextResponse.json({error:"Title and body are required"},{status:400});const now=new Date().toISOString();const a:Announcement={id:crypto.randomUUID(),title:b.title.trim(),body:b.body.trim(),published:Boolean(b.published),createdAt:now,updatedAt:now};const c=await readContent();c.announcements=[...(c.announcements||[]),a];await writeContent(c);return NextResponse.json(a,{status:201})}
export async function PATCH(req:Request){if(!(await auth()))return NextResponse.json({error:"Unauthorized"},{status:403});const b=await req.json();if(!b.id)return NextResponse.json({error:"Missing id"},{status:400});const c=await readContent();const i=(c.announcements||[]).findIndex((x:any)=>x.id===b.id);if(i<0)return NextResponse.json({error:"Not found"},{status:404});c.announcements[i]={...c.announcements[i],...b,updatedAt:new Date().toISOString()};await writeContent(c);return NextResponse.json(c.announcements[i])}
export async function DELETE(req:Request){if(!(await auth()))return NextResponse.json({error:"Unauthorized"},{status:403});const id=new URL(req.url).searchParams.get("id");if(!id)return NextResponse.json({error:"Missing id"},{status:400});const c=await readContent();c.announcements=(c.announcements||[]).filter((x:any)=>x.id!==id);await writeContent(c);return NextResponse.json({ok:true})}
