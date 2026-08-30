# QUSM / FBMRP Site

The public website and Staff Management panel now use one persistent content source.

## Architecture

- `/` rewrites to `/live` for the public FBMRP website.
- `/admin` is the protected Staff Management CMS.
- `/member` is the member portal.
- `/developer-media` is the protected developer media studio.
- `/api/content` is the common read/write CMS API.
- `lib/content-store.ts` selects the persistent database when `DATABASE_URL` is configured.
- `lib/db.ts` stores the complete CMS document in the `site_content` table.

The public site reads `/api/content` with `no-store` and refreshes every 15 seconds, so staff changes do not require a new deployment. This is intentionally request-time/live data rather than build-time content.

## Staff-editable content

The Staff Management panel controls:

- Site identity and hero copy
- Recruitment URL
- Announcements
- Operations calendar
- Leadership Chain of Command
- Staff Chain of Command
- Roleplay Chain of Command
- Leadership records
- Divisions and logos
- Rules and regulations
- Government records
- Rank structure
- News and bulletins
- Media records
- Applications (staff-only)

All public sections are rendered from the same CMS state. No public Chain of Command list is hard-coded into the website.

## Database

Set `DATABASE_URL` in Vercel. The application creates the `site_content` table automatically on first access. Vercel's production filesystem should not be used as the primary CMS store.

## Media

Developer Media supports images and videos. The application enforces an 8 MB per-file upload limit and protects the upload endpoint with the existing Discord staff permissions. Vercel Blob is used for file storage when its token is configured.

## Deployment

The GitHub repository is connected to Vercel. Pushes to `main` trigger production deployments automatically.

After a content/code change, verify the newest Vercel deployment before making another patch.
