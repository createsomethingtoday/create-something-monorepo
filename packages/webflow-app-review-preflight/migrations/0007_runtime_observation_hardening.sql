PRAGMA foreign_keys = ON;

ALTER TABLE runtime_observation_jobs ADD COLUMN sandbox_id TEXT;
ALTER TABLE runtime_observation_jobs ADD COLUMN sandbox_started_at TEXT;
ALTER TABLE runtime_observation_jobs ADD COLUMN sandbox_terminated_at TEXT;
ALTER TABLE runtime_observation_jobs ADD COLUMN sandbox_termination_status TEXT
  CHECK(sandbox_termination_status IS NULL OR sandbox_termination_status IN ('pending', 'verified', 'failed'));

WITH active_jobs AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY test_package_id
           ORDER BY created_at DESC, id DESC
         ) AS active_rank
    FROM runtime_observation_jobs
   WHERE status IN ('approved', 'running', 'uploading')
)
UPDATE runtime_observation_jobs
   SET status = 'expired',
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
 WHERE id IN (SELECT id FROM active_jobs WHERE active_rank > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_runtime_observation_jobs_one_active_per_package
  ON runtime_observation_jobs(test_package_id)
  WHERE status IN ('approved', 'running', 'uploading');

CREATE INDEX IF NOT EXISTS idx_runtime_observation_jobs_active_expiry
  ON runtime_observation_jobs(status, expires_at)
  WHERE status IN ('approved', 'running', 'uploading');
