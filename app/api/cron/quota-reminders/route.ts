import { NextResponse } from "next/server";
import { runQuotaReminderCheck } from "@/lib/discord/quota/reminders";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runQuotaReminderCheck("periodic");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[quota-reminder] cron failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "unknown error" }, { status: 500 });
  }
}
