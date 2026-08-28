export { default } from "next-auth/middleware";

// Any route under /admin requires a signed-in session.
// The allowlist itself is enforced in lib/auth.ts's signIn callback —
// by the time a session exists here, the user already passed that check.
export const config = { matcher: ["/admin/:path*"] };
