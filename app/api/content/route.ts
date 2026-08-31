import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { FBMRP_GUILD_ID, SPECIAL_OWNER_ID, ROLE_IDS, getAccessLevel, can, type Permission, type DiscordGuildRole } from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";
import { readContent, persistSection } from "@/lib/content-store";
import { recordAudit } from "@/lib/audit";
const sectionPermission: Record<string, Permission> = { org:"site:edit", announcements:"announcements:manage", calendar:"calendar:manage", cocLeadership:"site:edit", cocStaff:"site:edit", cocRoleplay:"site:edit", leadership:"leadership:edit", divisions:"divisions:edit", applications:"applications:manage", rules:"site:edit", government:"site:edit", ranks:"site:edit", news:"site:edit", media:"media:manage", customSections:"site:edit" };
type Identity = { access: ReturnType<typeof getAccessLevel>; userId: string; roleIds: string[]; username: string };
async function getIdentity(): Promise<Identity> {
 const raw=(await cookies()).get(DISCORD_SESSION_COOKIE)?.value; const session=readDiscordSession(raw); if(!session) return {access:"member",userId:"",roleIds:[],username:"Unknown"};
 if(session.id===SPECIAL_OWNER_ID) return {access:"owner",userId:session.id,roleIds:session.roles??[],username:session.username||session.id};
 const token=process.env.DISCORD_BOT_TOKEN; if(!token) return {access:"member",userId:session.id,roleIds:[],username:session.username||session.id};
 try { const headers={Authorization:`Bot ${token}`}; const [mr,rr]=await Promise.all([fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`,{headers,cache:"no-store"}),fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`,{headers,cache:"no-store"})]); if(!mr.ok||!rr.ok) return {access:"member",userId:session.id,roleIds:[],username:session.username||session.id}; const member=await mr.json() as {roles?:string[];user?:{username?:string}}; const roles=await rr.json() as DiscordGuildRole[]; const roleIds=member.roles??[]; return {access:getAccessLevel(session.id,roleIds,roles),userId:session.id,roleIds,username:member.user?.username||session.username||session.id}; } catch { return {access:"member",userId:session.id,roleIds:[],username:session.username||session.id}; }
}
const hash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value??null)).digest("hex");
export async function GET(){try{const c=await readContent();const {applications:_private,...publicContent}=c;return NextResponse.json(publicContent,{headers:{"Cache-Control":"no-store, no-cache, must-revalidate"}})}catch{return NextResponse.json({error:"Content store unavailable"},{status:503})}}
export async function PUT(req:Request){try{const body=await req.json();if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Invalid content"},{status:400});const section=req.headers.get("x-content-section")||"";const identity=await getIdentity();
 if(section==="shop"){const allowed=identity.userId===SPECIAL_OWNER_ID||identity.roleIds.includes(ROLE_IDS.owner)||identity.roleIds.includes(ROLE_IDS.coOwner);if(!allowed)return NextResponse.json({error:"Shop management is restricted to Owner and Co-Owner."},{status:403});}
 else {const permission=sectionPermission[section];if(!permission)return NextResponse.json({error:"Missing or invalid content section"},{status:400});if(!can(identity.access,permission))return NextResponse.json({error:"Unauthorized"},{status:403});}
 const value=body[section]; const valid=section==="org"?!!value&&typeof value==="object"&&!Array.isArray(value):Array.isArray(value);if(!valid)return NextResponse.json({error:section==="org"?"Settings must be an object":"Section must be an array"},{status:400});
 const current=await readContent();const before=current[section as keyof typeof current];await persistSection(section as keyof import("@/lib/content").Content,value);await recordAudit({actorId:identity.userId,actorName:identity.username,action:"content.update",section,summary:`Updated ${section}`,beforeHash:hash(before),afterHash:hash(value)});return NextResponse.json({ok:true,section},{headers:{"Cache-Control":"no-store"}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Content persistence unavailable"},{status:503})}}
