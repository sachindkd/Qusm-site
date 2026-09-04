import { getLiveAuthorization } from "@/lib/authorization";
import { getQuotaLeaderboard } from "@/lib/quota-sheets";

const WEBSITE_STAFF_ROLE_ID = "1496561403501219952";

export async function GET() {
  const identity = await getLiveAuthorization();
  if (!identity || !identity.roleIds.includes(WEBSITE_STAFF_ROLE_ID)) return Response.json({ error: "Staff access required." }, { status: 403 });
  try {
    return Response.json({ rows: await getQuotaLeaderboard() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Quota leaderboard API failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Could not load quota leaderboard." }, { status: 500 });
  }
}
