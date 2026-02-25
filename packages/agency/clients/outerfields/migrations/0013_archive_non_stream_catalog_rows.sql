-- Archive published+ready rows without a valid Stream UID from public catalog surfaces.

UPDATE videos
SET visibility = 'archived',
    is_featured = 0,
    featured_order = 0,
    updated_at = (strftime('%s', 'now') * 1000)
WHERE visibility = 'published'
  AND ingest_status = 'ready'
  AND (
    stream_uid IS NULL
    OR TRIM(stream_uid) = ''
    OR LENGTH(TRIM(stream_uid)) != 32
  );
