-- Airtable Assets checkbox fldZY9vzOYaaCR5vv. Existing rows remain unknown
-- until an authoritative read; never infer false from an unbackfilled row.
ALTER TABLE template_documents ADD COLUMN has_cms INTEGER CHECK (has_cms IN (0, 1) OR has_cms IS NULL);
