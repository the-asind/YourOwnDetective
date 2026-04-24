-- Store a browser-compatible fallback for transcoded audio.

ALTER TABLE squares
ADD COLUMN IF NOT EXISTS audio_fallback_url TEXT;
