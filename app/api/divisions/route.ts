import { NextResponse } from "next/server";
import { requirePermission, passesSameOrigin } from "@/lib/authorization";
import { readContent, persistSection } from "@/lib/content-store";

function normalizeDivision(body: any, existing?: any) {
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : (existing?.code ?? "");
  const name = typeof body?.name === "string" ? body.name.trim() : (existing?.name ?? "");
  const description = typeof body?.description === "string" ? body.description.trim() : (existing?.description ?? "");
  const leadership = typeof body?.leadership === "string" ? body.leadership.trim() : (existing?.leadership ?? "");
  const logoUrl = typeof body?.logoUrl === "string" ? body.logoUrl.trim() : (existing?.logoUrl ?? "");
  if (code.length > 50 || name.length > 200 || description.length > 5000 || leadership.length > 200 || logoUrl.length > 1000) return null;
  return {
    id: existing?.id ?? (typeof body?.id === "string" && body.id.length <= 100 ? body.id : crypto.randomUUID()),
    code, name, description,
    status: ["active", "inactive", "temporary"].includes(body?.status) ? body.status : (existing?.status ?? "active"),
    leadership, logoUrl,
    order: Number.isFinite(body?.order) ? Math.max(0, Math.min(10000, Number(body.order))) : (Number.isFinite(existing?.order) ? existing.order : 0),
  };
}

export async function GET() {
  try { return NextResponse.json((await readContent()).divisions || [], { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Divisions unavailable" }, { status: 503 }); }
}

export async function POST(req: Request) {
  if (!passesSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  if (!(await requirePermission("divisions:edit"))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await req.json();
    if (!body || typeof body.code !== "string" || typeof body.name !== "string" || typeof body.description !== "string") return NextResponse.json({ error: "Invalid division" }, { status: 400 });
    const entry = normalizeDivision(body);
    if (!entry) return NextResponse.json({ error: "Invalid division" }, { status: 400 });
    const content = await readContent();
    entry.order = Number.isFinite(body.order) ? Math.max(0, Math.min(10000, Number(body.order))) : (content.divisions || []).length;
    await persistSection("divisions", [...(content.divisions || []), entry].sort((a, b) => a.order - b.order));
    return NextResponse.json(entry, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Division persistence failed" }, { status: 503 }); }
}

export async function PATCH(req: Request) {
  if (!passesSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  if (!(await requirePermission("divisions:edit"))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await req.json();
    if (!body || typeof body.id !== "string" || body.id.length > 100) return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
    const content = await readContent();
    const current = content.divisions || [];
    const index = current.findIndex((item: any) => item.id === body.id);
    if (index < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const entry = normalizeDivision(body, current[index]);
    if (!entry) return NextResponse.json({ error: "Invalid division" }, { status: 400 });
    const next = [...current]; next[index] = entry; next.sort((a, b) => a.order - b.order);
    await persistSection("divisions", next);
    return NextResponse.json(entry, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Division persistence failed" }, { status: 503 }); }
}

export async function PUT(req: Request) { return PATCH(req); }

export async function DELETE(req: Request) {
  if (!passesSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  if (!(await requirePermission("divisions:edit"))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id || id.length > 100) return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
    const content = await readContent(); const current = content.divisions || []; const next = current.filter((item: any) => item.id !== id);
    if (next.length === current.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await persistSection("divisions", next);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Division persistence failed" }, { status: 503 }); }
}
