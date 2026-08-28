import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const raw = (await cookies()).get("fbmrp_discord_user")?.value;
  if (!raw) return NextResponse.json({ authenticated: false });
  try { return NextResponse.json({ authenticated: true, user: JSON.parse(raw) }); }
  catch { return NextResponse.json({ authenticated: false }); }
}
