import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  FBMRP_GUILD_ID,
  SPECIAL_OWNER_ID,
  getAccessLevel,
  can,
  type DiscordGuildRole,
} from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";
import { readContent, persistSection } from "@/lib/content-store";

async function ok() {
  const raw = (await cookies()).get(DISCORD_SESSION_COOKIE)?.value;
  const session = readDiscordSession(raw);
  if (!session) return false;
  if (session.id === SPECIAL_OWNER_ID) return true;

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return false;

  try {
    const headers = { Authorization: `Bot ${token}` };
    const [memberResponse, rolesResponse] = await Promise.all([
      fetch(
        `https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${session.id}`,
        { headers, cache: "no-store" },
      ),
      fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/roles`, {
        headers,
        cache: "no-store",
      }),
    ]);

    if (!memberResponse.ok || !rolesResponse.ok) return false;
    const member = (await memberResponse.json()) as { roles?: string[] };
    const roles = (await rolesResponse.json()) as DiscordGuildRole[];
    return can(
      getAccessLevel(session.id, member.roles ?? [], roles),
      "divisions:edit",
    );
  } catch {
    return false;
  }
}

function normalizeDivision(body: any, existing?: any) {
  return {
    id: existing?.id ?? body.id ?? crypto.randomUUID(),
    code: typeof body.code === "string" ? body.code.trim().toUpperCase() : (existing?.code ?? ""),
    name: typeof body.name === "string" ? body.name.trim() : (existing?.name ?? ""),
    description: typeof body.description === "string" ? body.description.trim() : (existing?.description ?? ""),
    status: ["active", "inactive", "temporary"].includes(body.status)
      ? body.status
      : (existing?.status ?? "active"),
    leadership: typeof body.leadership === "string" ? body.leadership.trim() : (existing?.leadership ?? ""),
    logoUrl: typeof body.logoUrl === "string" ? body.logoUrl.trim() : (existing?.logoUrl ?? ""),
    order: Number.isFinite(body.order)
      ? body.order
      : (Number.isFinite(existing?.order) ? existing.order : 0),
  };
}

export async function GET() {
  try {
    return NextResponse.json((await readContent()).divisions || [], {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Divisions unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json();
    if (!body || typeof body.code !== "string" || typeof body.name !== "string" || typeof body.description !== "string" || !body.code.trim() || !body.name.trim() || !body.description.trim()) {
      return NextResponse.json(
        { error: "Code, name and description are required" },
        { status: 400 },
      );
    }

    const content = await readContent();
    const current = content.divisions || [];
    const entry = normalizeDivision(body, undefined);
    entry.order = Number.isFinite(body.order) ? body.order : current.length;
    const next = [...current, entry].sort((a, b) => a.order - b.order);

    await persistSection("divisions", next);
    return NextResponse.json(entry, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Division persistence failed" },
      { status: 503 },
    );
  }
}

export async function PATCH(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json();
    if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const content = await readContent();
    const current = content.divisions || [];
    const index = current.findIndex((item) => item.id === body.id);
    if (index < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // PATCH is an update operation. Do not require every field to be valid here;
    // this prevents one legacy/incomplete record from blocking saves elsewhere.
    const entry = normalizeDivision(body, current[index]);
    const next = [...current];
    next[index] = entry;
    next.sort((a, b) => a.order - b.order);

    await persistSection("divisions", next);
    return NextResponse.json(entry, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Division persistence failed" },
      { status: 503 },
    );
  }
}

export async function PUT(req: Request) {
  return PATCH(req);
}

export async function DELETE(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const content = await readContent();
    const current = content.divisions || [];
    const next = current.filter((item) => item.id !== id);
    if (next.length === current.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await persistSection("divisions", next);
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Division persistence failed" },
      { status: 503 },
    );
  }
}
