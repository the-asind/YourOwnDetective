-- 001_init.sql — Core schema

CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        TEXT UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS squares (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secret_name TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('image', 'text', 'audio', 'video')),
    content     TEXT,
    audio_url   TEXT,
    description TEXT,
    is_opened   BOOLEAN DEFAULT FALSE,
    opened_by   TEXT REFERENCES users(name) ON DELETE SET NULL,
    opened_at   TIMESTAMPTZ,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_squares_is_opened ON squares(is_opened);
CREATE INDEX IF NOT EXISTS idx_squares_opened_by ON squares(opened_by);
