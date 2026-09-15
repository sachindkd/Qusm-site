import { NextResponse } from 'next/server';
import { discordRequest, DiscordApiError } from '../../../../discord/rest';

export const runtime = 'nodejs';

const COMMAND = {
  name: 'nexus',
  type: 1,
  description: 'Give NEXUS an objective to plan and execute',
  options: [
    {
      type: 3,
      name: 'goal',
      description: 'What you want NEXUS to accomplish',
      required: true,
    },
  ],
};

export async function POST(req: Request) {
  const controlKey = process.env.NEXUS_CONTROL_KEY;
  const suppliedKey = req.headers.get('x-nexus-control-key');
  if (!controlKey) return NextResponse.json({ ok: false, error: 'NEXUS_CONTROL_KEY is not configured.' }, { status: 503 });
  if (!suppliedKey || suppliedKey !== controlKey) return NextResponse.json({ ok: false, error: 'Invalid NEXUS control key.' }, { status: 401 });

  const applicationId = process.env.NEXUS_DISCORD_CLIENT_ID;
  const guildId = process.env.NEXUS_ALLOWED_GUILD_ID;
  if (!applicationId || !guildId) return NextResponse.json({ ok: false, error: 'Discord application or guild configuration is incomplete.' }, { status: 503 });

  try {
    const result = await discordRequest(`/applications/${encodeURIComponent(applicationId)}/guilds/${encodeURIComponent(guildId)}/commands`, {
      method: 'PUT',
      body: [COMMAND],
    });
    return NextResponse.json({ ok: true, registered: result });
  } catch (error) {
    if (error instanceof DiscordApiError) {
      return NextResponse.json({ ok: false, error: `Discord API error: ${JSON.stringify(error.details)}` }, { status: 502 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Command registration failed.' }, { status: 500 });
  }
}
