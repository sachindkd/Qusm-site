# Spec: Admin-editable site, locked to specific Google accounts

Use this as a brief for any AI coding assistant to build a similar project
from scratch. It describes the pattern, not just this one site.

## The pattern

A public website whose content is data-driven (JSON, or a real DB later),
plus a `/admin` area where only specific people can log in and edit that
content directly — no CMS, no third-party dashboard, just a real login gate
and a form.

## Stack

- **Next.js 14 (App Router) + TypeScript** — server-rendered pages, API
  routes, and middleware all in one framework, no separate backend needed.
- **NextAuth.js (`next-auth` v4)** — handles the actual OAuth flow with
  Google. Don't write OAuth by hand; this library does the redirect,
  token exchange, and session/JWT handling correctly.
- **Tailwind CSS** — utility classes, no separate CSS files to maintain.
- **Framer Motion** — for any nav/tab transitions in the admin UI.
- **A JSON file as the content store** (`data/content.json`), read/written
  through two functions in one file (`lib/content.ts`) so it's a one-file
  swap to a real database later.

## Auth: locking login to specific emails

This is the part that actually matters and is easy to get wrong. The
correct place to enforce an email allowlist is the NextAuth `signIn`
callback — **reject the sign-in itself**, don't let someone log in and then
check their role afterward:

```ts
// lib/auth.ts
import GoogleProvider from "next-auth/providers/google";

const ADMIN_EMAILS = ["email1@gmail.com", "email2@gmail.com"];

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "");
    },
  },
};
```

Anyone outside the allowlist gets bounced at Google's OAuth screen — no
session, no cookie, nothing to escalate later. This is more secure than
checking `user.role === "admin"` after login, because there's no in-between
state where a non-admin has a valid session.

Protect the `/admin` route itself with `next-auth/middleware` matched to
that path, so even a direct URL visit redirects unauthenticated users to
`/login`.

## What has to happen outside the code (can't be automated by an AI)

1. **Google Cloud OAuth client** — created manually at
   console.cloud.google.com/apis/credentials. Needs a redirect URI
   registered per environment: `http://localhost:3000/api/auth/callback/google`
   for local dev, `https://yourdomain.com/api/auth/callback/google` for
   production. This step requires a human with access to a Google account
   and cannot be done by an AI on someone's behalf — it's account-scoped
   credential creation.
2. **Environment variables** — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `NEXTAUTH_SECRET` (random string), `NEXTAUTH_URL`. Set locally in
   `.env.local`, and again in whatever hosting platform's dashboard.
3. **Deployment** — Vercel is the lowest-friction host for a Next.js app.
   `vercel` CLI or connecting the GitHub repo both work.

## The filesystem trap

If the content store is a JSON file on disk (`fs.writeFile`), that only
persists on a host with a real, writable filesystem — a VPS, Railway,
Render, or `next start` on your own machine. **Vercel's production
filesystem is read-only**, so admin edits will silently fail to persist
there. If deploying to Vercel long-term, swap the JSON file for a real
database (Vercel Postgres, Supabase, or similar) — this only requires
changing the two functions that read/write content, not the rest of the app.

## Content model shape

Keep content as an array of small objects per section, each with a stable
`id`, so the admin UI can do add/edit/delete without special-casing:

```json
{
  "announcements": [
    { "id": "a1", "date": "2026-08-28", "title": "...", "body": "..." }
  ]
}
```

The admin UI becomes one generic "list editor" component reused per
section — pass it the array, an `onChange`, and a list of `{ key, label }`
fields to render as inputs. Adding a new editable section is then: extend
the JSON shape, extend the TypeScript type, add one `<ListEditor>` block,
done — no new component needed.

## Design notes (only relevant if matching this project's look)

Palette: near-black navy/charcoal base (#0B0E14), brass/gold accent
(#C2A05F), muted olive for "active/open" status, muted red for
"closed/alert" status. Typefaces: Spectral (serif, headings), Inter (body),
IBM Plex Mono (labels, codes, dates, status badges) — the mono font on
small uppercase labels is what gives it an official/dossier feel rather
than a generic dashboard look.
