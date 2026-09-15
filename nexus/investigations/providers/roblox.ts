const USERS_API = 'https://users.roblox.com/v1';
const GROUPS_API = 'https://groups.roblox.com/v2';
const GAMES_API = 'https://games.roblox.com/v2';

async function getJson(url: string) {
  const response = await fetch(url, { headers: { 'User-Agent': 'NEXUS/0.1' }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Roblox provider returned ${response.status}.`);
  return response.json();
}

export type RobloxInvestigation = {
  username?: string;
  user?: unknown;
  groups?: unknown;
  games?: unknown;
  queriedAt: string;
};

export async function investigateRoblox(subject: string): Promise<RobloxInvestigation> {
  const username = subject.trim().replace(/^@/, '');
  if (!username) throw new Error('A Roblox username is required.');
  const users = await fetch(`${USERS_API}/usernames/users`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'User-Agent': 'NEXUS/0.1' },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }), cache: 'no-store',
  });
  if (!users.ok) throw new Error(`Roblox user lookup returned ${users.status}.`);
  const userMatches = await users.json() as { data?: Array<{ id: number; name: string; displayName: string }> };
  const match = userMatches.data?.[0];
  if (!match) return { username, queriedAt: new Date().toISOString() };
  const [user, groups, games] = await Promise.all([
    getJson(`${USERS_API}/users/${match.id}`),
    getJson(`${GROUPS_API}/users/${match.id}/groups/roles`),
    getJson(`${GAMES_API}/users/${match.id}/games?sortOrder=Asc&limit=10`),
  ]);
  return { username: match.name, user, groups, games, queriedAt: new Date().toISOString() };
}
