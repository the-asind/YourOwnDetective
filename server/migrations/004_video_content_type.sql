-- Allow video squares. Video files are stored as compressed WebM URLs in content.
ALTER TABLE squares
DROP CONSTRAINT IF EXISTS squares_type_check;

ALTER TABLE squares
ADD CONSTRAINT squares_type_check CHECK (type IN ('image', 'text', 'audio', 'video'));
