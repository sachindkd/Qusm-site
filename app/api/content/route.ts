import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContent, saveContent } from "@/lib/content";

export async function GET() {
  const content = await getContent();
  return NextResponse.json(content);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  await saveContent(body);
  return NextResponse.json({ ok: true });
}
