-- ═══════════════════════════════════════════════════════════════════════════
-- ADD IVE MASTER: Motion Design in Digital Interfaces
-- ═══════════════════════════════════════════════════════════════════════════
--
-- "The best designs are always the result of being really inquisitive 
--  about life in general." — Jony Ive
--
-- Ive extends the Canon lineage into digital motion. While Rams defined form
-- in physical products, Ive translated those principles into digital interfaces
-- and added the dimension Rams never addressed: how things move through time.
--
-- Apply with: wrangler d1 migrations apply ltd-db --remote
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- MASTER: Jony Ive
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR REPLACE INTO masters (id, slug, name, tagline, birth_year, death_year, discipline, biography, legacy) VALUES (
  'master-ive',
  'jony-ive',
  'Jony Ive',
  'Simplicity is not the absence of clutter',
  1967,
  NULL,
  'Digital & Industrial Design',
  'Sir Jonathan Paul Ive is a British-American industrial, software, and product designer who served as Chief Design Officer of Apple Inc. from 1996 to 2019. During his tenure, he led the design teams responsible for the iMac, iPod, iPhone, iPad, MacBook, and Apple Watch—products that redefined their categories and established new design paradigms. Ive has explicitly cited Dieter Rams as his primary influence, and the parallels between Braun products and Apple products demonstrate this lineage: the T3 pocket radio prefigures the iPod, the SK4 record player anticipates the Mac Mini. But Ive extended Rams'' philosophy into a domain Rams never addressed: digital interfaces and the motion that brings them to life.',
  'Ive''s legacy operates at two levels. First, he translated Dieter Rams'' principles of honest, unobtrusive industrial design into digital products—demonstrating that "less, but better" applies to software as powerfully as to physical objects. Second, he pioneered a motion language for digital interfaces: physics-based animations, spring dynamics, and purposeful transitions that communicate state without decoration. iOS 7''s animation system—with its emphasis on depth, translucency, and deferred content—codified principles that now influence all mobile interface design. Where Rams showed that physical products could be honest and restrained, Ive showed that digital interfaces could feel as precise and inevitable as a Swiss watch mechanism.'
);


-- ═══════════════════════════════════════════════════════════════════════════
-- PRINCIPLES: Jony Ive (Motion & Digital Design)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR REPLACE INTO principles (id, master_id, title, description, order_index, category) VALUES
  ('ive-purposeful-motion', 'master-ive', 'Motion should be purposeful', 'Animation exists to communicate state, not to decorate. Every transition should answer a question: Where did this come from? Where is it going? What changed? Motion that fails to inform is motion that distracts.', 1, 'motion'),
  ('ive-physics-based', 'master-ive', 'Motion should feel physics-based', 'Digital objects should behave as if they have mass and momentum. Spring dynamics, inertia, and deceleration curves create the feel of precision mechanisms—the same tactile quality that distinguishes a quality mechanical watch from a cheap digital one.', 2, 'motion'),
  ('ive-depth-translucency', 'master-ive', 'Depth through translucency', 'Layers of interface should feel like physical planes in space. Blur, shadow, and translucency establish hierarchy without borders. The user should understand what''s in front, what''s behind, and how elements relate spatially.', 3, 'motion'),
  ('ive-restraint', 'master-ive', 'Restraint in all things', 'The default answer to "should this animate?" is no. Motion earns its place by serving communication. Duration should be minimal—200ms for micro-interactions, never exceeding 500ms. Easing should be consistent. Fewer animations, executed perfectly.', 4, 'motion'),
  ('ive-inevitable-design', 'master-ive', 'Design should feel inevitable', 'The best designs appear obvious in retrospect—as if no other solution were possible. This inevitability emerges from removing everything that could be removed while preserving function. What remains is not minimal but essential.', 5, 'design');


-- ═══════════════════════════════════════════════════════════════════════════
-- QUOTES: Jony Ive
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR REPLACE INTO quotes (id, master_id, quote_text, context, source_url) VALUES
  ('quote-ive-1', 'master-ive', 'Simplicity is not the absence of clutter. That''s a consequence of simplicity.', 'Distinguishing true simplicity from mere tidiness. From a 2012 interview.', NULL),
  ('quote-ive-2', 'master-ive', 'True simplicity is derived from so much more than just the absence of clutter and ornamentation. It''s about bringing order to complexity.', 'On the work required to achieve simplicity. From Apple design presentations.', NULL),
  ('quote-ive-3', 'master-ive', 'When something exceeds your ability to understand how it works, it sort of becomes magical.', 'On the experience of well-designed technology.', NULL),
  ('quote-ive-4', 'master-ive', 'There''s a profound and enduring beauty in simplicity, in clarity, in efficiency.', 'On aesthetic principles. Echoes Rams'' "weniger, aber besser."', NULL),
  ('quote-ive-5', 'master-ive', 'The best designs are always the result of being really inquisitive about life in general.', 'On the source of design insight.', NULL);
