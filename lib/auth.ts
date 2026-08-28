import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "lilnunu504@gmail.com,sjejwjxoq@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    // Reject sign-in entirely unless the Google account email is on the allowlist.
    async signIn({ user }) {
      if (!user.email) return false;
      return ADMIN_EMAILS.includes(user.email.toLowerCase());
    },
    async session({ session }) {
      // Anyone who successfully signed in already passed the allowlist check above.
      if (session.user) (session.user as any).isAdmin = true;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
};
