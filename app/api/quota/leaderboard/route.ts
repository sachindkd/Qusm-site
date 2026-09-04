export async function GET() {
  return Response.json({ error: "Quota leaderboard is Discord-only." }, { status: 404 });
}
