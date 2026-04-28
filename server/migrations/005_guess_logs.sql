-- Store player guess attempts for the admin activity log.
CREATE TABLE IF NOT EXISTS guess_logs (
    id          BIGSERIAL PRIMARY KEY,
    player_name TEXT NOT NULL,
    query_text  TEXT NOT NULL,
    is_match    BOOLEAN NOT NULL,
    hint_level  TEXT,
    hint_label  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guess_logs_id ON guess_logs(id);
CREATE INDEX IF NOT EXISTS idx_guess_logs_created_at ON guess_logs(created_at DESC);
