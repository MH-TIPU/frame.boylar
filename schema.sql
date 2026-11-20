-- Run once against the leads database:  psql -d frame_dev -f schema.sql
CREATE TABLE IF NOT EXISTS leads (
    id         bigserial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    name       text NOT NULL DEFAULT '',
    business   text NOT NULL DEFAULT '',
    url        text NOT NULL DEFAULT '',
    email      text NOT NULL DEFAULT ''
);
