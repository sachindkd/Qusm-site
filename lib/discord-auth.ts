import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? "1426271681969655913";
const ROLE_PERMISSIONS: Record<string, string[]> = {
  "1430245086930669579": ["owner"],
  "1501042310320881834": ["owner"],
  "1530961653103853669": ["owner", "admin"],
  "1210317929485181000": ["owner", "admin"],
  "1431171866680365097": ["admin"],
  "1535569347928658010": ["admin"],
  "1538911108788654160": ["admin", "assistant"],
  "1478156027244314825": ["developer"],
  "1506466679100801196": ["developer"],
  "1531899271614562314": ["senior-management"],
  "1496561403501219952": ["staff"],
  "1540038203959152650": ["division-head"],
  "1493982432276385812": ["division-head"],
  "1431617140674265129": ["division-head"],
  "1539579714841350235": ["division-head"],
  "1540038224431554633": ["division-head"],
};

function permissionsForRoles(roleIds: string[]) {
  const permissions = new Set<string>();
  for (const roleId of roleIds) for (const permission of ROLE_PERMISSIONS[roleId] ?? []) permissions.add(permission);
  return [...permissions];
}

async function getGuildMember(discordUserId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  const response = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordUserId}`, {
    headers: { Authorization: `Bot ${token}` }, cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<{ roles?: string[]; nick?: string | null }>;
}

export const authOptions: NextAuthOptions = {
  providers: [DiscordProvider({ clientId: process.env.DISCORD_CLIENT_ID!, clientSecret: process.env.DISCORD_CLIENT_SECRET! })],
  callbacks: {
    async signIn({ user, account }) { return Boolean(user.id && account?.provider === "discord"); },
    async jwt({ token, user }) {
      if (user?.id) {
        const member = await getGuildMember(user.id);
        const roleIds = member?.roles ?? [];
        token.discordId = user.id;
        token.guildMember = Boolean(member);
        token.discordRoles = roleIds;
        token.permissions = permissionsForRoles(roleIds);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as typeof session.user & { discordId?: string; guildMember?: boolean; discordRoles?: string[]; permissions?: string[] };
        u.discordId = token.discordId as string | undefined;
        u.guildMember = Boolean(token.guildMember);
        u.discordRoles = (token.discordRoles as string[] | undefined) ?? [];
        u.permissions = (token.permissions as string[] | undefined) ?? [];
      }
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
};
