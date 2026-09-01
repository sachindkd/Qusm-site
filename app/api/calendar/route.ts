import { NextResponse } from "next/server";
import { requirePermission, passesSameOrigin } from "@/lib/authorization";
import { readContent, persistSection } from "@/lib/content-store";

function clean(body: any) {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const date = typeof body?.date === "string" ? body.date.trim() : "";
  const time = typeof body?.time === "string" ? body.time.trim() : "";
  if (!title || title.length > 200 || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (time && !/^\d{2}:\d{2}$/.test(time))) return null;
  const location = typeof body?.location === "string" ? body.location.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (location.length > 500 || description.length > 5000) return null;
  return { title, date, time, location, description, status: body?.status === "published" ? "published" : "draft" };
}

export async function GET() { try { return NextResponse.json((await readContent()).calendar || [], { headers: { "Cache-Control": "no-store" } }); } catch { return NextResponse.json({ error: "Calendar unavailable" }, { status: 503 }); } }

export async function POST(req: Request) {
  if (!passesSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  if (!(await requirePermission("calendar:manage"))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try { const entry = clean(await req.json()); if (!entry) return NextResponse.json({ error: "Invalid calendar entry" }, { status: 400 }); const content = await readContent(); const now = new Date().toISOString(); const item = { id: crypto.randomUUID(), ...entry, createdAt: now, updatedAt: now }; const next = [...(content.calendar || []), item].sort((a,b)=>`${a.date} ${a.time||""}`.localeCompare(`${b.date} ${b.time||""}`)); await persistSection("calendar", next); return NextResponse.json(item,{status:201,headers:{"Cache-Control":"no-store"}}); } catch { return NextResponse.json({error:"Calendar persistence unavailable"},{status:503}); }
}

export async function PATCH(req: Request) {
  if (!passesSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  if (!(await requirePermission("calendar:manage"))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try { const body=await req.json(); if(typeof body?.id!=="string"||body.id.length>100)return NextResponse.json({error:"Missing or invalid id"},{status:400}); const entry=clean(body); if(!entry)return NextResponse.json({error:"Invalid calendar entry"},{status:400}); const content=await readContent(); const current=content.calendar||[]; const index=current.findIndex((item:any)=>item.id===body.id); if(index<0)return NextResponse.json({error:"Not found"},{status:404}); const next=[...current]; next[index]={...next[index],...entry,updatedAt:new Date().toISOString()}; next.sort((a,b)=>`${a.date} ${a.time||""}`.localeCompare(`${b.date} ${b.time||""}`)); await persistSection("calendar",next); return NextResponse.json(next.find((item)=>item.id===body.id),{headers:{"Cache-Control":"no-store"}}); } catch { return NextResponse.json({error:"Calendar persistence unavailable"},{status:503}); }
}

export async function DELETE(req: Request) {
  if (!passesSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  if (!(await requirePermission("calendar:manage"))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try { const id=new URL(req.url).searchParams.get("id"); if(!id||id.length>100)return NextResponse.json({error:"Missing or invalid id"},{status:400}); const content=await readContent(); const current=content.calendar||[]; const next=current.filter((item:any)=>item.id!==id); if(next.length===current.length)return NextResponse.json({error:"Not found"},{status:404}); await persistSection("calendar",next); return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}}); } catch { return NextResponse.json({error:"Calendar persistence unavailable"},{status:503}); }
}
