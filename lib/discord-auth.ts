import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { FBMRP_GUILD_ID, getAccessLevel, getPermissions } from "./discord-roles";

async function getGuildMember(discordUserId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  const response = await fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${discordUserId}`, {
    headers: { Authorization: `Bot ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<{ roles?: string[]; nick?: string | null }>;
}

const secureCookies = process.env.NODE_ENV === "production";
const cookiePrefix = secureCookies ? "__Secure-" : "";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      return Boolean(user.id && account?.provider === "discord");
    },
    async jwt({ token, user }) {
      if (user?.id) {
        const member = await getGuildMember(user.id);
        const roleIds = member?.roles ?? [];
        const access = getAccessLevel(user.id, roleIds);
        token.discordId = user.id;
        token.guildMember = Boolean(member);
        token.discordRoles = roleIds;
        token.access = access;
        token.permissions = getPermissions(access);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as typeof session.user & {
          discordId?: string;
          guildMember?: boolean;
          discordRoles?: string[];
          access?: string;
          permissions?: string[];
        };
        u.discordId = token.discordId as string | undefined;
        u.guildMember = Boolean(token.guildMember);
        u.discordRoles = (token.discordRoles as string[] | undefined) ?? [];
        u.access = token.access as string | undefined;
        u.permissions = (token.permissions as string[] | undefined) ?? [];
      }
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: secureCookies },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: secureCookies },
    },
    csrfToken: {
      name: `${cookiePrefix}next-auth.csrf-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: secureCookies },
    },
  },
};
