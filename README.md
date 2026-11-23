# frame.boylar

Free banner makers for frame.boylar.com, built with Next.js. Each page draws a banner on a
canvas from what the visitor uploads and types, shows a live preview, and downloads a JPG for
Facebook and other social media. Visitors can also leave their contact details, which are
stored in PostgreSQL.

## Pages

- `/` — index of the available banners
- `/smefair` — put your photo in the 13th National SME Product Fair 2026 frame
- `/fbcover` — a Facebook cover inviting customers to your stall at the fair
- `/fbcover-mobile` — the same invitation, laid out to survive Facebook's mobile crop and
  the profile photo that covers the middle of a page cover on a phone
- `/admin` — a dashboard: downloads per page and per day, leads, and CSV export. Sign in with
  `ADMIN_PASSWORD`; the cookie it sets is an expiry signed with that password, so changing the
  password signs everyone out
- `POST /api/lead` — stores a lead; each page sends its own `source`
- `POST /api/download` — one row per banner saved, so `/admin` can count them

## Files

- `app/<page>/page.js` — one banner each: canvas drawing, inputs, preview
- `components/FrameForm.js` — the shared panel: Download plus the optional details we collect
- `public/frames/` — the standard stall and the kantha grounds for the two covers (`kantha.svg`
  for `/fbcover`, `kantha-mobile.svg`, which carries more visible trade motifs, for
  `/fbcover-mobile`), the trade motifs
  for `/smefair`. `smefair.jpg` is the fair's original artwork and is no longer loaded: that
  page draws its sky, bands, circle and headline itself.
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
HTTPS: the password is posted to `/admin`, and the cookie is only marked `Secure` when the
proxy passes `X-Forwarded-Proto: https`.

`schema.sql` only ever adds what is missing, so run it again after a deploy that introduces
a table: `psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -f schema.sql`.

## Adding a banner

Copy a folder under `app/`, give it its own canvas geometry and artwork, pass a new `source`
to `FrameForm`, then list it in `app/page.js` and `app/sitemap.js`.

`/fbcover` draws its Bengali text on the canvas with Hind Siliguri, loaded through
`next/font/google`, so the build needs network access the first time.
