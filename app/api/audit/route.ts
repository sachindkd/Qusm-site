import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FBMRP_GUILD_ID, SPECIAL_OWNER_ID, getAccessLevel, type DiscordGuildRole } from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";
import { readAudit } from "@/lib/audit";
import { rateLimit, requestKey } from "@/lib/rate-limit";

async function access(){
  const raw=(await cookies()).get(DISCORD_SESSION_COOKIE)?.value; const session=readDiscordSession(raw);
  if(!session)return {level:"member" as const};
  if(session.id===SPECIAL_OWNER_ID)return {level:"owner" as const};
  const token=process.env.DISCORD_BOT_TOKEN;if(!token)return {level:"member" as const};
  try{const headers={Authorization:`Bot ${token}`};const [mr,rr]=await Promise.all([fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`,{headers,cache:"no-store"}),fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`,{headers,cache:"no-store"})]);if(!mr.ok||!rr.ok)return {level:"member" as const};const m=await mr.json() as {roles?:string[]};const roles=await rr.json() as DiscordGuildRole[];return {level:getAccessLevel(session.id,m.roles||[],roles)};}catch{return {level:"member" as const}}
}
export async function GET(req:Request){
 const limiter=rateLimit(requestKey(req,"audit-read"),30,60_000);
 if(!limiter.allowed)return NextResponse.json({error:"Too many audit log requests. Try again shortly."},{status:429,headers:{"Retry-After":String(limiter.retryAfter)}});
 try{const {level}=await access();const rank={member:0,staff:1,aide:2,developer:2,"senior-leadership":3,ownership:4,owner:5} as Record<string,number>;if((rank[level]||0)<3)return NextResponse.json({error:"Audit Log is restricted to VCM+."},{status:403});return NextResponse.json({entries:await readAudit(200),readOnly:true});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Audit log unavailable"},{status:503})}}
