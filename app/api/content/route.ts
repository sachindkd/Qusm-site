import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, getAccessLevel } from "@/lib/discord-roles";
import { getContent, saveContent } from "@/lib/content";

async function getAdminAccess(){
 const raw=(await cookies()).get("fbmrp_discord_user")?.value;
 if(!raw||!process.env.DISCORD_BOT_TOKEN)return "member";
 try{const s=JSON.parse(raw);if(!s.id)return "member";const r=await fetch(`https://discord.com/api/guilds/${FBMRP_GUILD_ID}/members/${s.id}`,{headers:{Authorization:`Bot ${process.env.DISCORD_BOT_TOKEN}`},cache:"no-store"});if(!r.ok)return "member";const m=await r.json();return getAccessLevel(s.id,m.roles||[])}catch{return "member"}
}
export async function GET(){try{return NextResponse.json(await getContent())}catch{return NextResponse.json({error:"Content store unavailable"},{status:500})}}
export async function PUT(req:Request){const access=await getAdminAccess();if(access!=="owner"&&access!=="management")return NextResponse.json({error:"Unauthorized"},{status:401});try{const body=await req.json();if(!body||typeof body!=="object")return NextResponse.json({error:"Invalid content"},{status:400});await saveContent(body);return NextResponse.json({ok:true})}catch{return NextResponse.json({error:"Content persistence unavailable"},{status:503})}}
