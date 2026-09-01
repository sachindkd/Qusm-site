import { NextResponse } from "next/server";
import { requirePermission, passesSameOrigin } from "@/lib/authorization";
import { readContent, persistSection } from "@/lib/content-store";

function clean(body: any) {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!title || !name || title.length > 200 || name.length > 200) return null;
  const discordId = typeof body?.discordId === "string" ? body.discordId.trim() : "";
  const division = typeof body?.division === "string" ? body.division.trim() : "";
  const rank = typeof body?.rank === "string" ? body.rank.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (discordId.length > 30 || division.length > 200 || rank.length > 200 || description.length > 5000) return null;
  return { title, name, discordId, division, rank, description, active: body?.active !== false, order: Number.isFinite(body?.order) ? Math.max(0, Math.min(10000, Number(body.order))) : undefined };
}

export async function GET() {
  try { return NextResponse.json((await readContent()).leadership || [], { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Leadership unavailable" }, { status: 503 }); }
}

export async function PUT(req: Request) {
  if (!passesSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  if (!(await requirePermission("leadership:edit"))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await req.json();
    const fields = clean(body);
    if (!fields) return NextResponse.json({ error: "Invalid leadership entry" }, { status: 400 });
    const content = await readContent();
    const current = content.leadership || [];
    const requestedId = typeof body.id === "string" ? body.id.trim() : "";
    if (requestedId.length > 100) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const index = requestedId ? current.findIndex((item: any) => item.id === requestedId) : -1;
    const existing = index >= 0 ? current[index] : undefined;
    const id = existing?.id ?? crypto.randomUUID();
    const entry = { id, ...fields, order: fields.order ?? (existing?.order ?? current.length), createdAt: (existing as any)?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
    const next = [...current];
    if (index >= 0) next[index] = entry; else next.push(entry);
    next.sort((a: any, b: any) => a.order - b.order);
    await persistSection("leadership", next);
    return NextResponse.json(entry, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Leadership persistence failed" }, { status: 503 }); }
}

export async function POST(req: Request) { return PUT(req); }
export async function PATCH(req: Request) { return PUT(req); }

export async function DELETE(req: Request) {
  if (!passesSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  if (!(await requirePermission("leadership:edit"))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id || id.length > 100) return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
    const content = await readContent();
    const current = content.leadership || [];
    const next = current.filter((item: any) => item.id !== id);
    if (next.length === current.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await persistSection("leadership", next);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Leadership persistence failed" }, { status: 503 }); }
}
