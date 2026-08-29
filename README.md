# QUSM Site — Admin-Editable, Google-Locked

A real Next.js site: public pages render live from `data/content.json`, and
`/admin` is a dashboard (Framer Motion dock nav) where the two allowed Google
accounts can edit announcements, chain of command, divisions, and rules —
changes save immediately and show up on the public site.

Sign-in only works for the emails in `ADMIN_EMAILS`. Everyone else is rejected
at the Google OAuth step, before a session is even created.

## 1. Get Google OAuth credentials (you have to do this part — I can't create
   credentials on your behalf)

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a project (or use an existing one).
3. Click **Create Credentials → OAuth client ID**.
   - Application type: **Web application**
   - Authorized redirect URI (local dev): `http://localhost:3000/api/auth/callback/google`
   - Once deployed, add: `https://YOUR-DOMAIN/api/auth/callback/google`
4. Copy the **Client ID** and **Client Secret**.
5. If prompted, configure the OAuth consent screen (External, add your two
   admin emails as test users if the app is in "Testing" mode).

## 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from step 1
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` locally, your real domain in prod
- `ADMIN_EMAILS` — already set to `lilnunu504@gmail.com,sjejwjxoq@gmail.com`

## 3. Run it

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` for the public site, `/login` to sign in as
admin, `/admin` for the dashboard (redirects to `/login` if you're not
authenticated with an allowed email).

## 4. Deploy for real

Easiest path is Vercel:

```bash
npm i -g vercel
vercel
```

Then in the Vercel project settings, add the same environment variables from
`.env.local` (with `NEXTAUTH_URL` set to your real Vercel URL), and add that
URL's callback path to the OAuth client's authorized redirect URIs in Google
Cloud Console.

**Important limitation on Vercel:** the content editor currently writes to
`data/content.json` on disk. Vercel's production filesystem is read-only, so
saves in `/admin` won't persist there. It works perfectly on a normal Node
host (Railway, Render, a VPS, or `next start` on your own server) where the
filesystem is real. To run this on Vercel long-term, swap the two functions
in `lib/content.ts` for calls to a real database — Vercel Postgres or
Supabase are the least-friction options and the rest of the app (API routes,
admin UI) doesn't need to change at all.

## What's editable right now

All nine sections are wired end-to-end (content.json → homepage → admin tab):
Announcements, Chain of Command, Divisions, Rules & Regulations, Government,
Rank Structure, News & Updates, Media, and Applications.

Media currently takes an image URL (paste a link, or leave blank for a
placeholder) — there's no file upload yet. Adding one means an upload API
route plus swapping the "Image URL" field for a file input; same pattern,
slightly more plumbing.

<!-- Vercel deployment trigger: 2026-08-30 -->
