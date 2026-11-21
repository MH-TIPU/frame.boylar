-- Run once against the database:  psql "$DATABASE_URL" -f schema.sql
CREATE TABLE IF NOT EXISTS leads (
    id         bigserial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    source     text NOT NULL DEFAULT '',   -- which page the lead came from, e.g. 'smefair'
    name       text NOT NULL DEFAULT '',
    business   text NOT NULL DEFAULT '',
    url        text NOT NULL DEFAULT '',
    email      text NOT NULL DEFAULT ''
);

-- One row per banner downloaded, so /admin can count them per page.
CREATE TABLE IF NOT EXISTS downloads (
    id         bigserial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    source     text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS downloads_source_idx ON downloads (source);
