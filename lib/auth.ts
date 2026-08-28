import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map(e=>e.trim().toLowerCase()).filter(Boolean);
export const authOptions: NextAuthOptions = {
 providers:[GoogleProvider({clientId:process.env.GOOGLE_CLIENT_ID!,clientSecret:process.env.GOOGLE_CLIENT_SECRET!})],
 secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
 callbacks:{async signIn({user}){return !!user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())},async session({session}){if(session.user)(session.user as any).isAdmin=true;return session}},
 pages:{signIn:"/login",error:"/login"}, session:{strategy:"jwt"}
};
