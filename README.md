# frame.boylar

A one-page photo frame maker for the 13th National SME Product Fair 2026. A visitor adds their photo and (optionally) a company logo, sees a live preview, and downloads a 2000×2000 JPG for Facebook and other social media. They can also leave their name, business name, website and email, which are stored in PostgreSQL.

## Files

- `index.html` — the whole app (canvas preview, download, details form)
- `frame.js` — the frame artwork, embedded as a data URI (generated from `frame.jpg`)
- `lead.php` — receives the details form and inserts a row into `leads`
- `schema.sql` — creates the `leads` table
- `config.example.php` — database settings template; copy to `config.php`

## Run locally

Needs PHP with the `pdo_pgsql` extension and a PostgreSQL server.

```bash
createdb frame_dev
psql -d frame_dev -f schema.sql
cp config.example.php config.php   # then edit the connection details
php -S localhost:8123
```

Open http://localhost:8123.

## Deploy

Upload the files to any PHP host, create a database, run `schema.sql` on it, and create `config.php` there from `config.example.php`. `config.php` is not in git.

## Changing the frame

Replace `frame.jpg`, then regenerate `frame.js`:

```bash
printf 'const FRAME_SRC="data:image/jpeg;base64,%s";\n' "$(base64 -i frame.jpg | tr -d '\n')" > frame.js
```

If the photo circle or logo slot moved, update `CIRCLE` and `LOGO` at the top of the script in `index.html`.
