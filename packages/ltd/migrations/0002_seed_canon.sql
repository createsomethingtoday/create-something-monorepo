-- ═══════════════════════════════════════════════════════════════════════════
-- CANON SEED: Masters, Principles, Quotes
-- ═══════════════════════════════════════════════════════════════════════════
--
-- "Weniger, aber besser" — Less, but better.
--
-- This migration populates the canonical foundation of CREATE SOMETHING.
-- The masters herein define what "good" means across the hermeneutic circle.
--
-- Apply with: wrangler d1 migrations apply ltd-db --remote
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- MASTERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Dieter Rams (Industrial Design)
INSERT OR REPLACE INTO masters (id, slug, name, tagline, birth_year, death_year, discipline, biography, legacy) VALUES (
  'master-rams',
  'dieter-rams',
  'Dieter Rams',
  'Less, but better',
  1932,
  NULL,
  'Industrial Design',
  'Dieter Rams is a German industrial designer closely associated with the consumer products company Braun and the furniture company Vitsœ. His work spans six decades, but he is most celebrated for the functional, minimal product designs he created at Braun from 1961 to 1995. Rams articulated his design approach through ten principles that have influenced generations of designers, from Jonathan Ive at Apple to the creators of modern software interfaces. His philosophy rejects ornament in favor of honest, understandable, and environmentally conscious design.',
  'Rams'' influence extends far beyond product design. His ten principles—especially "Good design is as little design as possible"—have become a litmus test for quality across disciplines. The phrase "Weniger, aber besser" (Less, but better) encapsulates a design philosophy where every element must justify its existence. His work at Braun established the visual language of modern consumer electronics: clean lines, neutral colors, and interfaces that explain themselves. Today, his principles guide software design, architecture, and organizational thinking.'
);

-- Ludwig Mies van der Rohe (Architecture)
INSERT OR REPLACE INTO masters (id, slug, name, tagline, birth_year, death_year, discipline, biography, legacy) VALUES (
  'master-mies',
  'mies-van-der-rohe',
  'Ludwig Mies van der Rohe',
  'Less is more',
  1886,
  1969,
  'Architecture',
  'Ludwig Mies van der Rohe was a German-American architect who became one of the pioneers of modernist architecture. He served as the last director of the Bauhaus before emigrating to the United States, where he led the architecture program at the Illinois Institute of Technology. Mies developed an influential architectural style characterized by extreme clarity and simplicity, using modern materials like industrial steel and plate glass to define interior spaces. His Barcelona Pavilion (1929) and Farnsworth House (1951) are considered masterpieces of the International Style.',
  'Mies''s aphorisms—"Less is more" and "God is in the details"—have transcended architecture to become universal design principles. His work demonstrated that reduction is not absence but rather the distillation of form to its most essential expression. The open floor plans he pioneered influenced not just buildings but how we think about workspace, information architecture, and user interfaces. His insistence on structural honesty—expressing how a building works through its form—parallels software principles like transparency and explainability.'
);

-- Edward Tufte (Data Visualization)
INSERT OR REPLACE INTO masters (id, slug, name, tagline, birth_year, death_year, discipline, biography, legacy) VALUES (
  'master-tufte',
  'edward-tufte',
  'Edward R. Tufte',
  'Above all else, show the data',
  1942,
  NULL,
  'Data Visualization',
  'Edward Rolf Tufte is an American statistician and professor emeritus of political science, statistics, and computer science at Yale University. He is noted for his writings on information design and as a pioneer in the field of data visualization. His four self-published books—The Visual Display of Quantitative Information, Envisioning Information, Visual Explanations, and Beautiful Evidence—have influenced how data is presented across science, journalism, and software. Tufte''s work emphasizes maximizing the data-ink ratio: every drop of ink should present data, not decoration.',
  'Tufte introduced concepts that revolutionized data presentation: the data-ink ratio, chartjunk, small multiples, and sparklines. His critique of PowerPoint (''The Cognitive Style of PowerPoint'') argued that the medium itself corrupts reasoning by fragmenting narrative and reducing information density. His principles guide modern dashboard design, scientific publication standards, and interface development. The imperative "Above all else, show the data" rejects decoration in favor of honest, high-density information display.'
);

-- Charles and Ray Eames (Furniture/Film)
INSERT OR REPLACE INTO masters (id, slug, name, tagline, birth_year, death_year, discipline, biography, legacy) VALUES (
  'master-eames',
  'charles-ray-eames',
  'Charles & Ray Eames',
  'The best for the most for the least',
  1907,
  1988,
  'Furniture & Film',
  'Charles Eames (1907–1978) and Ray Kaiser Eames (1912–1988) were an American married couple who made significant historical contributions to the development of modern architecture and furniture. Working as a team, they produced groundbreaking work in furniture design, architectural design, industrial design, photography, and film. Their molded plywood and fiberglass furniture designs became icons of mid-century modernism. They approached each project with the belief that design should serve the greatest number of people with the most elegant solution at the lowest cost.',
  'The Eameses'' philosophy—"The best for the most for the least"—anticipated democratic design decades before it became an industry goal. Their furniture demonstrated that excellent design need not be exclusive; the Eames Lounge Chair remains both luxurious and mass-producible. Their films, particularly "Powers of Ten" (1977), showed how design thinking could illuminate scientific concepts. Their studio''s interdisciplinary approach—combining architecture, film, graphics, and industrial design—modeled how modern creative practices integrate multiple disciplines.'
);

-- Martin Heidegger (Philosophy)
INSERT OR REPLACE INTO masters (id, slug, name, tagline, birth_year, death_year, discipline, biography, legacy) VALUES (
  'master-heidegger',
  'martin-heidegger',
  'Martin Heidegger',
  'The question of Being',
  1889,
  1976,
  'Philosophy',
  'Martin Heidegger was a German philosopher and a seminal thinker in the Continental tradition of philosophy. He is best known for his contributions to phenomenology, hermeneutics, and existentialism. His 1927 work "Being and Time" (Sein und Zeit) investigates the meaning of "Being" through an analysis of human existence (Dasein). Heidegger''s concepts—including thrownness, authenticity, and being-toward-death—profoundly influenced existentialism, postmodernism, and contemporary philosophy. His later work explored technology, language, and the nature of dwelling.',
  'Heidegger''s concept of Zuhandenheit (ready-to-hand) describes how tools recede from consciousness when used effectively—a principle directly applicable to interface design. His hermeneutic circle—understanding parts through the whole and the whole through parts—provides a framework for iterative interpretation that informs software development, research methodology, and organizational design. His analysis of technology as a "mode of revealing" (Gestell) anticipates contemporary concerns about how tools shape human possibility.'
);


-- ═══════════════════════════════════════════════════════════════════════════
-- PRINCIPLES: Dieter Rams' Ten Principles
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR REPLACE INTO principles (id, master_id, title, description, order_index, category) VALUES
  ('rams-principle-1', 'master-rams', 'Good design is innovative', 'The possibilities for innovation are not, by any means, exhausted. Technological development is always offering new opportunities for innovative design. But innovative design always develops in tandem with innovative technology, and can never be an end in itself.', 1, 'core'),
  ('rams-principle-2', 'master-rams', 'Good design makes a product useful', 'A product is bought to be used. It has to satisfy certain criteria, not only functional, but also psychological and aesthetic. Good design emphasizes the usefulness of a product whilst disregarding anything that could possibly detract from it.', 2, 'core'),
  ('rams-principle-3', 'master-rams', 'Good design is aesthetic', 'The aesthetic quality of a product is integral to its usefulness because products we use every day affect our person and our well-being. But only well-executed objects can be beautiful.', 3, 'core'),
  ('rams-principle-4', 'master-rams', 'Good design makes a product understandable', 'It clarifies the product''s structure. Better still, it can make the product talk. At best, it is self-explanatory.', 4, 'core'),
  ('rams-principle-5', 'master-rams', 'Good design is unobtrusive', 'Products fulfilling a purpose are like tools. They are neither decorative objects nor works of art. Their design should therefore be both neutral and restrained, to leave room for the user''s self-expression.', 5, 'core'),
  ('rams-principle-6', 'master-rams', 'Good design is honest', 'It does not make a product more innovative, powerful or valuable than it really is. It does not attempt to manipulate the consumer with promises that cannot be kept.', 6, 'core'),
  ('rams-principle-7', 'master-rams', 'Good design is long-lasting', 'It avoids being fashionable and therefore never appears antiquated. Unlike fashionable design, it lasts many years – even in today''s throwaway society.', 7, 'core'),
  ('rams-principle-8', 'master-rams', 'Good design is thorough down to the last detail', 'Nothing must be arbitrary or left to chance. Care and accuracy in the design process show respect towards the user.', 8, 'core'),
  ('rams-principle-9', 'master-rams', 'Good design is environmentally friendly', 'Design makes an important contribution to the preservation of the environment. It conserves resources and minimizes physical and visual pollution throughout the lifecycle of the product.', 9, 'core'),
  ('rams-principle-10', 'master-rams', 'Good design is as little design as possible', 'Less, but better – because it concentrates on the essential aspects, and the products are not burdened with non-essentials. Back to purity, back to simplicity.', 10, 'core');


-- ═══════════════════════════════════════════════════════════════════════════
-- PRINCIPLES: Edward Tufte
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR REPLACE INTO principles (id, master_id, title, description, order_index, category) VALUES
  ('tufte-data-ink-ratio', 'master-tufte', 'Maximize the data-ink ratio', 'The larger the share of a graphic''s ink devoted to data, the better. Erase non-data-ink within reason. Erase redundant data-ink within reason.', 1, 'visualization'),
  ('tufte-chartjunk', 'master-tufte', 'Avoid chartjunk', 'Chartjunk does not achieve the goals of its propagators. The overwhelming fact of data graphics is that they stand or fall on their content, their associative quality, and their design. Chartjunk can turn bores into disasters, but it can never rescue a thin data set.', 2, 'visualization'),
  ('tufte-small-multiples', 'master-tufte', 'Use small multiples', 'Small multiples are economical: once viewers understand the design of one slice, they have immediate access to the data in all the other slices. Small multiples reveal patterns through repetition.', 3, 'visualization'),
  ('tufte-layering', 'master-tufte', 'Layer and separate', 'Confusion and clutter are failures of design, not attributes of information. Effective layering of information establishes a visual hierarchy that leads the eye.', 4, 'visualization'),
  ('tufte-narrative', 'master-tufte', 'Data graphics should tell a story', 'Graphics reveal data. Indeed graphics can be more precise and revealing than conventional statistical computations. The best graphics tell a story about the data.', 5, 'visualization');


-- ═══════════════════════════════════════════════════════════════════════════
-- PRINCIPLES: Martin Heidegger
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR REPLACE INTO principles (id, master_id, title, description, order_index, category) VALUES
  ('heidegger-zuhandenheit', 'master-heidegger', 'Zuhandenheit (Ready-to-hand)', 'When we use equipment effectively, it withdraws from our attention. The hammer disappears when we hammer; we attend to the nail. Tools that work well become invisible, transparent to the task at hand. This is the ideal state of designed objects.', 1, 'phenomenology'),
  ('heidegger-vorhandenheit', 'master-heidegger', 'Vorhandenheit (Present-at-hand)', 'When equipment breaks or fails, it becomes conspicuous—present-at-hand rather than ready-to-hand. We suddenly see the hammer as an object. This breakdown reveals assumptions and enables reflection, but is not the mode of effective use.', 2, 'phenomenology'),
  ('heidegger-hermeneutic-circle', 'master-heidegger', 'The Hermeneutic Circle', 'Understanding moves in a circle: we understand the whole through its parts and the parts through the whole. Neither has logical priority. This circle is not vicious but productive—understanding deepens through iteration.', 3, 'hermeneutics'),
  ('heidegger-aletheia', 'master-heidegger', 'Aletheia (Unconcealment)', 'Truth is not correspondence between statement and fact but unconcealment—the revealing of what was hidden. Design as truth-telling brings forth what matters while letting peripheral elements recede.', 4, 'ontology'),
  ('heidegger-dwelling', 'master-heidegger', 'Dwelling (Wohnen)', 'To dwell is not merely to occupy space but to be at home in the world. Authentic dwelling involves care, preservation, and the cultivation of things that matter. Design should enable dwelling, not just occupation.', 5, 'ontology');


-- ═══════════════════════════════════════════════════════════════════════════
-- PRINCIPLES: Ludwig Mies van der Rohe
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR REPLACE INTO principles (id, master_id, title, description, order_index, category) VALUES
  ('mies-less-is-more', 'master-mies', 'Less is more', 'Reduction is not absence but distillation. By removing the unnecessary, we reveal the essential structure. Every element that remains must justify its presence.', 1, 'architecture'),
  ('mies-god-details', 'master-mies', 'God is in the details', 'Excellence emerges from attention to the smallest elements. A building''s character depends on the precision of its joints, the alignment of its surfaces, the proportion of its spaces. Nothing is too small to matter.', 2, 'architecture'),
  ('mies-structural-honesty', 'master-mies', 'Structural honesty', 'A building should express how it works. The structure should be visible, not hidden behind decoration. Materials should appear as themselves, not disguised as something else.', 3, 'architecture'),
  ('mies-universal-space', 'master-mies', 'Universal space', 'Architecture should create spaces that can serve multiple purposes over time. Open floor plans and flexible partitions allow buildings to adapt to changing needs without structural modification.', 4, 'architecture');


-- ═══════════════════════════════════════════════════════════════════════════
-- PRINCIPLES: Charles & Ray Eames
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR REPLACE INTO principles (id, master_id, title, description, order_index, category) VALUES
  ('eames-best-most-least', 'master-eames', 'The best for the most for the least', 'Design should provide excellent quality to the greatest number of people at the lowest possible cost. Accessibility and excellence are not opposites—they are the challenge.', 1, 'design'),
  ('eames-constraints', 'master-eames', 'Recognize and embrace constraints', 'Design depends largely on constraints. The sum of all constraints is your problem; working within them is your solution. Constraints are not obstacles but guides.', 2, 'design'),
  ('eames-take-pleasure', 'master-eames', 'Take your pleasure seriously', 'One of the important things to learn is what you like. Not what you''re supposed to like, but what you actually respond to. This authentic pleasure becomes the foundation for meaningful work.', 3, 'design'),
  ('eames-details-connections', 'master-eames', 'Details are not details', 'Details are not the details. They make the design. The connections between elements—joints, transitions, relationships—determine whether the whole works or fails.', 4, 'design');


-- ═══════════════════════════════════════════════════════════════════════════
-- QUOTES
-- ═══════════════════════════════════════════════════════════════════════════

-- Dieter Rams
INSERT OR REPLACE INTO quotes (id, master_id, quote_text, context, source_url) VALUES
  ('quote-rams-1', 'master-rams', 'Weniger, aber besser. (Less, but better.)', 'Rams'' defining philosophy, distilled to three words. Embossed on the cover of his retrospective book.', NULL),
  ('quote-rams-2', 'master-rams', 'Good design is as little design as possible.', 'The tenth and culminating principle. Design achieves excellence through subtraction.', NULL),
  ('quote-rams-3', 'master-rams', 'Indifference towards people and the reality in which they live is actually the one and only cardinal sin in design.', 'From his 1976 speech at the World Design Conference in Tokyo.', NULL),
  ('quote-rams-4', 'master-rams', 'I imagine our current situation will cause future generations to shake their heads in disbelief.', 'On contemporary design excess, from a 2009 interview.', NULL),
  ('quote-rams-5', 'master-rams', 'Question everything generally thought to be obvious.', 'On the designer''s responsibility to challenge assumptions.', NULL);

-- Ludwig Mies van der Rohe
INSERT OR REPLACE INTO quotes (id, master_id, quote_text, context, source_url) VALUES
  ('quote-mies-1', 'master-mies', 'Less is more.', 'Attributed to Mies, though possibly derived from Robert Browning. Became his defining architectural philosophy.', NULL),
  ('quote-mies-2', 'master-mies', 'God is in the details.', 'On the importance of meticulous execution. Often misattributed to other architects.', NULL),
  ('quote-mies-3', 'master-mies', 'Architecture is the will of an epoch translated into space.', 'On architecture as cultural expression.', NULL),
  ('quote-mies-4', 'master-mies', 'I don''t want to be interesting. I want to be good.', 'On prioritizing quality over novelty.', NULL),
  ('quote-mies-5', 'master-mies', 'It is better to be good than to be original.', 'A variant of his stance against novelty for its own sake.', NULL);

-- Edward Tufte
INSERT OR REPLACE INTO quotes (id, master_id, quote_text, context, source_url) VALUES
  ('quote-tufte-1', 'master-tufte', 'Above all else, show the data.', 'The foundational principle of data visualization.', NULL),
  ('quote-tufte-2', 'master-tufte', 'Confusion and clutter are failures of design, not attributes of information.', 'Rejecting the excuse that complexity requires complicated presentation.', NULL),
  ('quote-tufte-3', 'master-tufte', 'The minimum we should hope for with any display technology is that it should do no harm.', 'On PowerPoint''s cognitive cost. From "The Cognitive Style of PowerPoint."', NULL),
  ('quote-tufte-4', 'master-tufte', 'There is no such thing as information overload, only bad design.', 'The responsibility lies with the designer, not the data.', NULL),
  ('quote-tufte-5', 'master-tufte', 'If your words or images are not on point, making them dance in color won''t make them relevant.', 'On decoration substituting for substance.', NULL);

-- Charles & Ray Eames
INSERT OR REPLACE INTO quotes (id, master_id, quote_text, context, source_url) VALUES
  ('quote-eames-1', 'master-eames', 'The best for the most for the least.', 'The Eameses'' design philosophy in seven words.', NULL),
  ('quote-eames-2', 'master-eames', 'Design depends largely on constraints.', 'From "Design Q&A" (1972).', NULL),
  ('quote-eames-3', 'master-eames', 'Take your pleasure seriously.', 'Charles Eames on authentic creative work.', NULL),
  ('quote-eames-4', 'master-eames', 'The details are not the details. They make the design.', 'On the primacy of connections and transitions.', NULL),
  ('quote-eames-5', 'master-eames', 'Never delegate understanding.', 'On the designer''s responsibility to comprehend every aspect.', NULL);

-- Martin Heidegger
INSERT OR REPLACE INTO quotes (id, master_id, quote_text, context, source_url) VALUES
  ('quote-heidegger-1', 'master-heidegger', 'The question of Being is today forgotten.', 'Opening line of "Being and Time" (1927).', NULL),
  ('quote-heidegger-2', 'master-heidegger', 'Language is the house of Being.', 'From "Letter on Humanism" (1947). Language shapes what we can think.', NULL),
  ('quote-heidegger-3', 'master-heidegger', 'We do not "have" a body; rather, we "are" bodily.', 'On embodied existence, rejecting mind-body dualism.', NULL),
  ('quote-heidegger-4', 'master-heidegger', 'Every man is born as many men and dies as a single one.', 'On authenticity and the journey toward integrated selfhood.', NULL),
  ('quote-heidegger-5', 'master-heidegger', 'Dwelling is the manner in which mortals are on the earth.', 'From "Building Dwelling Thinking" (1951).', NULL);


-- ═══════════════════════════════════════════════════════════════════════════
-- META-PRINCIPLE: The Subtractive Triad
-- ═══════════════════════════════════════════════════════════════════════════
-- This is CREATE SOMETHING's synthesis of the masters' principles.
-- It exists as a principle belonging to the collective canon.

INSERT OR REPLACE INTO masters (id, slug, name, tagline, birth_year, death_year, discipline, biography, legacy) VALUES (
  'master-canon',
  'create-something-canon',
  'The Canon',
  'Creation is removing what obscures',
  2024,
  NULL,
  'Design Philosophy',
  'The CREATE SOMETHING Canon synthesizes the wisdom of masters across disciplines into a unified framework for creation. It recognizes that Rams, Mies, Tufte, Eames, and Heidegger all point to the same truth: excellence emerges through disciplined subtraction. The Subtractive Triad operationalizes this insight at three levels: implementation (DRY), artifact (Rams), and system (Heidegger).',
  'The Canon serves as the philosophical foundation for CREATE SOMETHING''s hermeneutic circle. Each property (.ltd, .io, .space, .agency) embodies a mode of being: Canon, Research, Practice, and Service. Together they form a self-referential system that validates and evolves its own principles through practice.'
);

INSERT OR REPLACE INTO principles (id, master_id, title, description, order_index, category) VALUES
  ('subtractive-triad', 'master-canon', 'The Subtractive Triad', 'Creation is the discipline of removing what obscures. Apply three questions in order: DRY (Have I built this before? → Unify), Rams (Does this earn its existence? → Remove), Heidegger (Does this serve the whole? → Reconnect).', 1, 'meta'),
  ('hermeneutic-workflow', 'master-canon', 'The Hermeneutic Circle', '.ltd provides standards for .io, which validates through .space, which is tested by .agency, which feeds back to .ltd. Nothing is canonical until it survives this full cycle.', 2, 'meta'),
  ('being-modes', 'master-canon', 'Modes of Being', 'Each property is a mode of being: .ltd (Being-as-Canon), .io (Being-as-Research), .space (Being-as-Practice), .agency (Being-as-Service). Together they form a complete ontology of creation.', 3, 'meta');


-- ═══════════════════════════════════════════════════════════════════════════
-- Summary
-- ═══════════════════════════════════════════════════════════════════════════
-- Masters:    6 (Rams, Mies, Tufte, Eames, Heidegger, Canon)
-- Principles: 27 (10 Rams + 5 Tufte + 5 Heidegger + 4 Mies + 4 Eames + 3 Canon)
-- Quotes:     25 (5 per master)
--
-- Note: Heidegger expanded from 5 → 10 principles in migration 0003.
-- Total principles after 0003: 32 (10 Rams + 5 Tufte + 10 Heidegger + 4 Mies + 4 Eames + 3 Canon)
-- ═══════════════════════════════════════════════════════════════════════════
