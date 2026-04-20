-- Abundance public job search index
--
-- Adds an FTS5 search index over the public-job subset of inbound_jobs so the
-- MCP worker can do ranked search across structured fields plus source text.

CREATE VIRTUAL TABLE IF NOT EXISTS inbound_jobs_public_fts USING fts5(
  job_id UNINDEXED,
  title,
  employer,
  location,
  category,
  specialty,
  facility_name,
  employment_type,
  shift,
  notes,
  source_text,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS inbound_jobs_public_fts_ai
AFTER INSERT ON inbound_jobs
WHEN NEW.source_system IN ('adzuna', 'exa')
BEGIN
  INSERT INTO inbound_jobs_public_fts (
    job_id,
    title,
    employer,
    location,
    category,
    specialty,
    facility_name,
    employment_type,
    shift,
    notes,
    source_text
  ) VALUES (
    NEW.id,
    NEW.title,
    NEW.employer,
    NEW.location,
    NEW.category,
    NEW.specialty,
    NEW.facility_name,
    NEW.employment_type,
    NEW.shift,
    NEW.notes,
    trim(
      COALESCE(json_extract(NEW.raw_payload, '$.description'), '') || ' ' ||
      COALESCE(json_extract(NEW.raw_payload, '$.snippet'), '') || ' ' ||
      COALESCE(json_extract(NEW.raw_payload, '$.text'), '')
    )
  );
END;

CREATE TRIGGER IF NOT EXISTS inbound_jobs_public_fts_au
AFTER UPDATE ON inbound_jobs
BEGIN
  DELETE FROM inbound_jobs_public_fts WHERE job_id = OLD.id;

  INSERT INTO inbound_jobs_public_fts (
    job_id,
    title,
    employer,
    location,
    category,
    specialty,
    facility_name,
    employment_type,
    shift,
    notes,
    source_text
  )
  SELECT
    NEW.id,
    NEW.title,
    NEW.employer,
    NEW.location,
    NEW.category,
    NEW.specialty,
    NEW.facility_name,
    NEW.employment_type,
    NEW.shift,
    NEW.notes,
    trim(
      COALESCE(json_extract(NEW.raw_payload, '$.description'), '') || ' ' ||
      COALESCE(json_extract(NEW.raw_payload, '$.snippet'), '') || ' ' ||
      COALESCE(json_extract(NEW.raw_payload, '$.text'), '')
    )
  WHERE NEW.source_system IN ('adzuna', 'exa');
END;

CREATE TRIGGER IF NOT EXISTS inbound_jobs_public_fts_ad
AFTER DELETE ON inbound_jobs
BEGIN
  DELETE FROM inbound_jobs_public_fts WHERE job_id = OLD.id;
END;

DELETE FROM inbound_jobs_public_fts;

INSERT INTO inbound_jobs_public_fts (
  job_id,
  title,
  employer,
  location,
  category,
  specialty,
  facility_name,
  employment_type,
  shift,
  notes,
  source_text
)
SELECT
  id,
  title,
  employer,
  location,
  category,
  specialty,
  facility_name,
  employment_type,
  shift,
  notes,
  trim(
    COALESCE(json_extract(raw_payload, '$.description'), '') || ' ' ||
    COALESCE(json_extract(raw_payload, '$.snippet'), '') || ' ' ||
    COALESCE(json_extract(raw_payload, '$.text'), '')
  )
FROM inbound_jobs
WHERE source_system IN ('adzuna', 'exa');
