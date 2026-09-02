import { NextResponse } from "next/server";
import { ROLE_IDS, isSpecialUser, type Permission } from "@/lib/discord-roles";
import { getAuthContext, requirePermission, sameOrigin, requestContentTypeIsJson } from "@/lib/security";
import { readContent, persistSection } from "@/lib/content-store";
import { recordAudit } from "@/lib/audit";
import { rateLimit, requestKey } from "@/lib/rate-limit";
import { createHash } from "node:crypto";
import { CMS_SECTION_BY_ID } from "@/lib/cms-section-registry";

const sectionPermission: Record<string, Permission> = Object.fromEntries(Object.values(CMS_SECTION_BY_ID).map(s => [s.id, s.permission as Permission]));
const MAX_BODY_BYTES = 512 * 1024;
const MAX_ITEMS = 500;
const hash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value??null)).digest("hex");

function validSectionValue(section:string,value:unknown){
  if(section==="org") return !!value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value as object).length<=100;
  return Array.isArray(value)&&value.length<=MAX_ITEMS;
}

export async function GET(){
  try { const c=await readContent(); const {applications:_private,...publicContent}=c; return NextResponse.json(publicContent,{headers:{"Cache-Control":"no-store, no-cache, must-revalidate"}}); }
  catch { return NextResponse.json({error:"Content store unavailable"},{status:503}); }
}

export async function PUT(req:Request){
  const limiter=rateLimit(requestKey(req,"content-write"),30,60_000);
  if(!limiter.allowed) return NextResponse.json({error:"Too many content updates. Try again shortly."},{status:429,headers:{"Retry-After":String(limiter.retryAfter)}});
  if(!sameOrigin(req)) return NextResponse.json({error:"Cross-origin request blocked"},{status:403});
  if(!requestContentTypeIsJson(req)) return NextResponse.json({error:"JSON body required"},{status:415});
  const contentLength=Number(req.headers.get("content-length")||0); if(contentLength>MAX_BODY_BYTES) return NextResponse.json({error:"Request body too large"},{status:413});
  try {
    const body=await req.json(); if(!body||typeof body!=="object"||Array.isArray(body)) return NextResponse.json({error:"Invalid content"},{status:400});
    const section=req.headers.get("x-content-section")||"";
    const required=sectionPermission[section];
    const identity=required?await requirePermission(required):await getAuthContext();
    if(section==="shop"){
      if(!identity || (!isSpecialUser(identity.userId) && !identity.roleIds.some(id=>id===ROLE_IDS.owner||id===ROLE_IDS.coOwner))) return NextResponse.json({error:"Shop management is restricted to Owner, Co-Owner, or Special User."},{status:403});
    } else if(!required || !identity) return NextResponse.json({error:"Unauthorized"},{status:403});
    const value=(body as Record<string,unknown>)[section];
    if(!validSectionValue(section,value)) return NextResponse.json({error:"Invalid section payload"},{status:400});
    const current=await readContent();
    const before=current[section as keyof typeof current];
    await persistSection(section as keyof import("@/lib/content").Content,value as never);
    await recordAudit({actorId:identity.userId,actorName:identity.username,action:"content.update",section,summary:`Updated ${section}`,beforeHash:hash(before),afterHash:hash(value)});
    return NextResponse.json({ok:true,section},{headers:{"Cache-Control":"no-store"}});
  } catch(error){ return NextResponse.json({error:error instanceof Error?error.message:"Content persistence unavailable"},{status:503}); }
}
