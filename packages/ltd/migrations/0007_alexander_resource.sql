-- ═══════════════════════════════════════════════════════════════════════════
-- Christopher Alexander: Interpreter of Dwelling
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Alexander concretizes Heidegger's abstract notion of dwelling into
-- architectural practice. He is positioned as interpreter, not originator.
--
-- See: "Concretizing Heidegger's Notion of Dwelling" (Seamon, 2000)
-- Source: https://www.are.na/block/32634532
--
-- Apply with: wrangler d1 migrations apply ltd-db --remote
-- ═══════════════════════════════════════════════════════════════════════════

-- Resource: The Unfolding Whole (from The Nature of Order)
INSERT OR REPLACE INTO resources (
  id,
  master_id,
  title,
  type,
  url,
  description,
  year,
  featured
) VALUES (
  'resource-alexander-unfolding',
  'master-heidegger',
  'Christopher Alexander: The Unfolding Whole',
  'pdf',
  'https://www.are.na/block/32634532',
  'From "The Nature of Order" (2002-2005). Alexander argues that wholeness unfolds from centers—design emerges from context rather than being imposed upon it. This parallels Heidegger''s hermeneutic circle: the whole understood through parts, parts through whole. Alexander''s "unfolding" is Zuhandenheit made architectural: structures possess a quality of "being alive" not reducible to formal properties. He concretizes Heidegger''s dwelling into pattern languages that guide authentic inhabitation.',
  2002,
  1
);

-- Canon reference: Link Alexander to Heidegger's dwelling principle
INSERT OR REPLACE INTO canon_references (
  id,
  master_id,
  principle_id,
  reference_type,
  reference_slug,
  reference_domain,
  description
) VALUES (
  'canon-ref-alexander-dwelling',
  'master-heidegger',
  'heidegger-dwelling',
  'interpreter',
  'alexander-unfolding-whole',
  'external',
  'Christopher Alexander''s pattern language and "Nature of Order" translate Heidegger''s abstract dwelling into concrete architectural principles. Where Heidegger asks "what does it mean to dwell?", Alexander answers "how do we build spaces that enable dwelling?"'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Summary
-- ═══════════════════════════════════════════════════════════════════════════
-- Resources added: 1 (Alexander - The Unfolding Whole)
-- Canon references added: 1 (Alexander → heidegger-dwelling)
--
-- Alexander is honored as interpreter, not master. His work illuminates
-- Heidegger; it does not stand independently as origin.
-- ═══════════════════════════════════════════════════════════════════════════
