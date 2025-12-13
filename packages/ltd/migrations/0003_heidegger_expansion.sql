-- ═══════════════════════════════════════════════════════════════════════════
-- HEIDEGGER PRINCIPLES EXPANSION
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Expands Heidegger from 5 to 10 principles, reordering all to follow
-- a coherent conceptual arc:
--
--   Tool-use (1-2) → Condition (3) → Understanding (4-5) →
--   Things (6-7) → Technology (8-9) → Authenticity (10)
--
-- Apply with: wrangler d1 migrations apply ltd-db --remote
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- REORDER EXISTING PRINCIPLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Zuhandenheit stays at 1
-- Vorhandenheit stays at 2
-- Hermeneutic Circle moves from 3 → 4
UPDATE principles SET order_index = 4 WHERE id = 'heidegger-hermeneutic-circle';

-- Aletheia moves from 4 → 5
UPDATE principles SET order_index = 5 WHERE id = 'heidegger-aletheia';

-- Dwelling moves from 5 → 7
UPDATE principles SET order_index = 7 WHERE id = 'heidegger-dwelling';


-- ═══════════════════════════════════════════════════════════════════════════
-- INSERT NEW PRINCIPLES
-- ═══════════════════════════════════════════════════════════════════════════

-- #3 Geworfenheit (Thrownness) - phenomenology
INSERT OR REPLACE INTO principles (id, master_id, title, description, order_index, category) VALUES (
  'heidegger-geworfenheit',
  'master-heidegger',
  'Geworfenheit (Thrownness)',
  'We do not begin from nothing. We are thrown into languages, tools, systems, and histories we did not choose. Design never starts from zero—it inherits. Acknowledging thrownness means working with the given rather than pretending pure invention. The constraint is not obstacle but material.',
  3,
  'phenomenology'
);

-- #6 Das Ding (The Thing) - ontology
INSERT OR REPLACE INTO principles (id, master_id, title, description, order_index, category) VALUES (
  'heidegger-das-ding',
  'master-heidegger',
  'Das Ding (The Thing)',
  'A thing is not an object. The handmade jug gathers—it holds meaning, connects maker to user, ritual to material. Mass-produced containers merely function. Systems can create things or process objects. A database that becomes the living memory of a practice is a thing. One that merely stores records is an object with a pulse.',
  6,
  'ontology'
);

-- #8 Gestell (Enframing) - technology
-- Note: Incorporates "The Saving Power" concept
INSERT OR REPLACE INTO principles (id, master_id, title, description, order_index, category) VALUES (
  'heidegger-gestell',
  'master-heidegger',
  'Gestell (Enframing)',
  'Modern technology reveals the world as standing-reserve—resources to be ordered, optimized, extracted. This is not evil but danger: when everything becomes material for processing, we lose the capacity to encounter things as they are. Yet "where danger is, grows the saving power also"—confronting enframing honestly opens the possibility of other modes of being. The question for design is not whether to use technology but whether our systems enable dwelling or merely accelerate consumption.',
  8,
  'technology'
);

-- #9 Gelassenheit (Releasement) - technology
-- Note: Incorporates Calculative/Meditative thinking distinction
INSERT OR REPLACE INTO principles (id, master_id, title, description, order_index, category) VALUES (
  'heidegger-gelassenheit',
  'master-heidegger',
  'Gelassenheit (Releasement)',
  'Neither rejection nor submission but a third way: using technology while remaining inwardly free of it. Releasement says yes to tools and simultaneously no to their claim on our being. Calculative thinking has its place; meditative thinking dwells, remains open, lets things be. The danger is not calculation but its monopoly. Systems should accelerate the calculative so that meditative thinking becomes possible again.',
  9,
  'technology'
);

-- #10 Das Man (The They) - authenticity
INSERT OR REPLACE INTO principles (id, master_id, title, description, order_index, category) VALUES (
  'heidegger-das-man',
  'master-heidegger',
  'Das Man (The They)',
  'We fall into doing what "one does"—the anonymous they. Average opinions, standard workflows, best practices borrowed wholesale. Inauthenticity is not moral failure but gravitational default. Authentic systems surface your priorities, not generic productivity theater. The question is not "what do people do?" but "what does this work demand?"',
  10,
  'authenticity'
);


-- ═══════════════════════════════════════════════════════════════════════════
-- Summary
-- ═══════════════════════════════════════════════════════════════════════════
-- Heidegger principles: 5 → 10
-- New principles: Geworfenheit, Das Ding, Gestell, Gelassenheit, Das Man
-- Reordered: Hermeneutic Circle (3→4), Aletheia (4→5), Dwelling (5→7)
--
-- Conceptual arc:
--   1. Zuhandenheit (Ready-to-hand)     - phenomenology
--   2. Vorhandenheit (Present-at-hand)  - phenomenology
--   3. Geworfenheit (Thrownness)        - phenomenology  [NEW]
--   4. The Hermeneutic Circle           - hermeneutics
--   5. Aletheia (Unconcealment)         - ontology
--   6. Das Ding (The Thing)             - ontology       [NEW]
--   7. Dwelling (Wohnen)                - ontology
--   8. Gestell (Enframing)              - technology     [NEW]
--   9. Gelassenheit (Releasement)       - technology     [NEW]
--  10. Das Man (The They)               - authenticity   [NEW]
-- ═══════════════════════════════════════════════════════════════════════════
