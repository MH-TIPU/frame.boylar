# frame.boylar

Photo frame maker for frame.boylar.com, built with Next.js. A visitor adds their photo and (optionally) a company logo, sees a live preview, and downloads a 2000×2000 JPG for Facebook and other social media. They can also leave their name, business name, website and email, which are stored in PostgreSQL.

## Pages

- `/smefair` — frame for the 13th National SME Product Fair 2026
- `/` — redirects to `/smefair` until there is a home page
- `/admin` — table of collected leads with CSV export (user `admin`, password from `ADMIN_PASSWORD`)
- `POST /api/lead` — stores a lead; each page sends its own `source`

## Files

- `app/smefair/page.js` — the frame page (canvas preview, download, details form)
- `public/frames/smefair.jpg` — the frame artwork
- `app/api/lead/route.js` — saves a lead
- `app/admin/route.js` — leads table and CSV export
- `lib/db.js` — PostgreSQL connection
- `schema.sql` — creates the `leads` table

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

Put `DATABASE_URL` and `ADMIN_PASSWORD` in `.env` on the server (not in git). Serve it over HTTPS: the admin password is sent with every request to `/admin`.

## Changing the frame

Replace `public/frames/smefair.jpg`. If the photo circle or logo slot moved, update `CIRCLE` and `LOGO` at the top of `app/smefair/page.js`.
