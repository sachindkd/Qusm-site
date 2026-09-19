import { syncQusmWebsiteFromDiscord } from "@/lib/discord/website-sync";

export const maxDuration = 60;
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== "qsync_9f4c71e2b8a64d5f") return new Response("Not found", { status: 404 });
  try {
    const result = await syncQusmWebsiteFromDiscord();
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Sync failed" }, { status: 500 });
  }
}
