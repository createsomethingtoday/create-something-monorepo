-- Repair / standardize transcript FTS index for existing deployments
-- Rebuilds meetings_fts and trigger set to guarantee search availability.

DROP TRIGGER IF EXISTS meetings_ai;
DROP TRIGGER IF EXISTS meetings_au;
DROP TRIGGER IF EXISTS meetings_ad;

DROP TABLE IF EXISTS meetings_fts;

CREATE VIRTUAL TABLE meetings_fts USING fts5(
  id UNINDEXED,
  title,
  transcript,
  summary,
  tokenize = 'unicode61'
);

INSERT INTO meetings_fts (id, title, transcript, summary)
SELECT
  id,
  COALESCE(title, ''),
  COALESCE(transcript, ''),
  COALESCE(summary, '')
FROM meetings;

CREATE TRIGGER meetings_ai AFTER INSERT ON meetings BEGIN
  INSERT INTO meetings_fts(id, title, transcript, summary)
  VALUES (
    new.id,
    COALESCE(new.title, ''),
    COALESCE(new.transcript, ''),
    COALESCE(new.summary, '')
  );
END;

CREATE TRIGGER meetings_au AFTER UPDATE ON meetings BEGIN
  DELETE FROM meetings_fts WHERE id = old.id;
  INSERT INTO meetings_fts(id, title, transcript, summary)
  VALUES (
    new.id,
    COALESCE(new.title, ''),
    COALESCE(new.transcript, ''),
    COALESCE(new.summary, '')
  );
END;

CREATE TRIGGER meetings_ad AFTER DELETE ON meetings BEGIN
  DELETE FROM meetings_fts WHERE id = old.id;
END;

INSERT INTO meetings_fts(meetings_fts) VALUES ('optimize');
