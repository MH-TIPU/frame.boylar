# frame.boylar

Free banner makers for frame.boylar.com, built with Next.js. Each page draws a banner on a
canvas from what the visitor uploads and types, shows a live preview, and downloads a JPG for
Facebook and other social media. Visitors can also leave their contact details, which are
stored in PostgreSQL.

## Pages

- `/` — index of the available banners
- `/smefair` — put your photo in the 13th National SME Product Fair 2026 frame
- `/fbcover` — a Facebook cover inviting customers to your stall at the fair
- `/admin` — table of collected leads with CSV export (user `admin`, password from `ADMIN_PASSWORD`)
- `POST /api/lead` — stores a lead; each page sends its own `source`

## Files

- `app/<page>/page.js` — one banner each: canvas drawing, inputs, preview
- `components/FrameForm.js` — the shared panel: Download plus the optional details we collect
- `public/frames/` — the SME fair frame artwork, and the standard stall drawing used on `/fbcover`
- `public/logos/` — the fixed partner logos, cut out with transparent backgrounds
- `app/api/lead/route.js`, `app/admin/route.js`, `lib/db.js`, `schema.sql` — lead storage

## Run locally

Needs Node 22 and a PostgreSQL server.

```bash
npm install
createdb frame_dev
cp .env.example .env.local   # then set DATABASE_URL and ADMIN_PASSWORD
psql -d frame_dev -f schema.sql
npm run dev
```

## Deploy

```bash
npm ci
npm run build
npm start -- -p 3003
```

Put `DATABASE_URL` and `ADMIN_PASSWORD` in `.env` on the server (not in git). Serve it over
HTTPS: the admin password is sent with every request to `/admin`.

## Adding a banner

Copy a folder under `app/`, give it its own canvas geometry and artwork, pass a new `source`
to `FrameForm`, then list it in `app/page.js` and `app/sitemap.js`.

`/fbcover` draws its Bengali text on the canvas with Hind Siliguri, loaded through
`next/font/google`, so the build needs network access the first time.
