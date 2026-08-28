import { NextResponse } from "next/server";
import { getDiscordBotApplication } from "@/lib/discord";

export async function GET() {
  if (!process.env.DISCORD_BOT_TOKEN) {
    return NextResponse.json({ configured: false, connected: false });
  }

  try {
    const app = await getDiscordBotApplication();
    return NextResponse.json({
      configured: true,
      connected: true,
      applicationId: app.id,
      applicationName: app.name,
      botUsername: app.bot?.username ?? null,
    });
  } catch {
    return NextResponse.json({ configured: true, connected: false }, { status: 502 });
  }
}
