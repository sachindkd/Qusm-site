import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, getAccessLevel, can, type Permission } from "@/lib/discord-roles";
import { readContent, writeContent } from "@/lib/content-store";

async function getAccess(){
 const raw=(await cookies()).get("fbmrp_discord_user")?.value;
 if(!raw||!process.env.DISCORD_BOT_TOKEN)return "member" as const;
 try{const s=JSON.parse(raw);if(!s.id)return "member" as const;const r=await fetch(`https://discord.com/api/guilds/${FBMRP_GUILD_ID}/members/${s.id}`,{headers:{Authorization:`Bot ${process.env.DISCORD_BOT_TOKEN}`},cache:"no-store"});if(!r.ok)return "member" as const;const m=await r.json();return getAccessLevel(s.id,m.roles||[])}catch{return "member" as const}
}
export async function GET(){try{return NextResponse.json(await readContent())}catch{return NextResponse.json({error:"Content store unavailable"},{status:503})}}
export async function PUT(req:Request){const access=await getAccess();const permission=(req.headers.get("x-content-permission")||"site:edit") as Permission;if(!can(access,permission))return NextResponse.json({error:"Unauthorized"},{status:403});try{const body=await req.json();if(!body||typeof body!=="object")return NextResponse.json({error:"Invalid content"},{status:400});await writeContent(body);return NextResponse.json({ok:true})}catch{return NextResponse.json({error:"Content persistence unavailable"},{status:503})}}
