import { verifyDiscordSignature } from "@/lib/discord/quota/security";
import { handleGet, handlePost } from "@/lib/discord/quota/handler";
import { jsonResponse } from "@/lib/discord/quota/discord-api";

export async function GET() {
  return handleGet();
}

export async function POST(request: Request) {
  const body = await request.text();
  const timestamp = request.headers.get("x-signature-timestamp") || "";
  const signature = request.headers.get("x-signature-ed25519") || "";

  if (!verifyDiscordSignature(body, timestamp, signature)) {
    return jsonResponse({ error: "invalid signature" }, 401);
  }

  try {
    const interaction = JSON.parse(body);
    console.info("[quota] interaction received", {
      interactionId: interaction.id,
      interactionType: interaction.type,
      userId: interaction?.member?.user?.id || interaction?.user?.id,
      customId: interaction?.data?.custom_id || "",
    });
    return handlePost(interaction);
  } catch {
    return jsonResponse({ error: "invalid json" }, 400);
  }
}
