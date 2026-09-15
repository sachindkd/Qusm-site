const USERS_API = 'https://users.roblox.com/v1';
const GROUPS_API = 'https://groups.roblox.com/v2';
const GAMES_API = 'https://games.roblox.com/v2';
async function getJson(url: string) { const response = await fetch(url, { headers: { 'User-Agent': 'NEXUS/1.0' }, cache: 'no-store' }); if (!response.ok) throw new Error(`Roblox provider returned ${response.status}.`); return response.json(); }
export type RobloxInvestigation = { found: boolean; username: string; user?: { id: number; name: string; displayName: string; created: string; description: string }; groups?: Array<{ groupId: number; name: string; role: string }>; games?: Array<{ id: number; name: string; rootPlaceId: number; created: string; updated: string }>; queriedAt: string };
export async function investigateRoblox(subject: string): Promise<RobloxInvestigation> {
  const username = subject.trim().replace(/^@/, ''); if (!username) throw new Error('A Roblox username is required.');
  const users = await fetch(`${USERS_API}/usernames/users`, { method: 'POST', headers: { 'content-type': 'application/json', 'User-Agent': 'NEXUS/1.0' }, body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }), cache: 'no-store' });
  if (!users.ok) throw new Error(`Roblox user lookup returned ${users.status}.`);
  const matches = await users.json() as { data?: Array<{ id: number; name: string; displayName: string }> }; const match = matches.data?.[0]; const queriedAt = new Date().toISOString(); if (!match) return { found: false, username, queriedAt };
  const [user, groupData, gameData] = await Promise.all([getJson(`${USERS_API}/users/${match.id}`), getJson(`${GROUPS_API}/users/${match.id}/groups/roles`), getJson(`${GAMES_API}/users/${match.id}/games?sortOrder=Asc&limit=10`)]);
  const groups = Array.isArray(groupData?.data) ? groupData.data.slice(0, 25).map((g: any) => ({ groupId: Number(g?.group?.id), name: String(g?.group?.name || ''), role: String(g?.role?.name || '') })) : [];
  const games = Array.isArray(gameData?.data) ? gameData.data.slice(0, 10).map((g: any) => ({ id: Number(g?.id), name: String(g?.name || ''), rootPlaceId: Number(g?.rootPlaceId), created: String(g?.created || ''), updated: String(g?.updated || '') })) : [];
  return { found: true, username: match.name, user: { id: Number(user?.id), name: String(user?.name || ''), displayName: String(user?.displayName || ''), created: String(user?.created || ''), description: String(user?.description || '') }, groups, games, queriedAt };
}
