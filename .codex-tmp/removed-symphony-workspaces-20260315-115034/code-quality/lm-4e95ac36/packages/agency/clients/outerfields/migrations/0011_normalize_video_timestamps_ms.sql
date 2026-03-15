-- Normalize videos.created_at / updated_at to epoch milliseconds.
-- Existing seed migrations stored seconds; runtime code stores milliseconds.
UPDATE videos
SET created_at = created_at * 1000
WHERE created_at > 0 AND created_at < 1000000000000;

UPDATE videos
SET updated_at = updated_at * 1000
WHERE updated_at > 0 AND updated_at < 1000000000000;
