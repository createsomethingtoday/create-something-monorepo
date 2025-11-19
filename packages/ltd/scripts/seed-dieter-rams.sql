-- Seed Dieter Rams and his 10 Principles

-- Insert Dieter Rams
INSERT INTO masters (id, slug, name, tagline, birth_year, death_year, discipline, biography, legacy)
VALUES (
  'dieter-rams',
  'dieter-rams',
  'Dieter Rams',
  'Pioneer of functional minimalism',
  1932,
  NULL,
  'Industrial Design',
  '<p>Dieter Rams is a German industrial designer best known for his work with Braun and Vitsœ. Over a 40-year career at Braun, he established design principles that continue to influence product design worldwide—most notably at Apple, whose products unmistakably echo Rams'' philosophy.</p>

<p>Born in Wiesbaden, Germany, Rams studied architecture and interior decoration before joining Braun in 1955. He became chief design officer in 1961, a position he held until 1995. During this time, he created some of the most iconic consumer products of the 20th century: radios, record players, calculators, and furniture.</p>

<p>His approach was revolutionary: strip away everything unnecessary until only the essential remains. This wasn''t minimalism for fashion—it was clarity for function.</p>',
  '<p><strong>"Less, but better"</strong> — Weniger, aber besser — is the distillation of Rams'' approach. Every element must justify its existence. Decoration is dishonest. Simplicity is not easy; it''s the result of rigorous refinement.</p>

<p>His 10 Principles of Good Design remain the gold standard for evaluating whether something is truly well-designed. They''ve influenced generations of designers, from Jonathan Ive at Apple to countless industrial designers, architects, and software creators.</p>

<p>Rams proved that design isn''t about making things look good—it''s about making them work well, last long, and respect both users and the environment.</p>'
);

-- Insert the 10 Principles
INSERT INTO principles (id, master_id, title, description, order_index, category) VALUES
(
  'rams-principle-1',
  'dieter-rams',
  'Good design is innovative',
  '<p>The possibilities for innovation are not, by any means, exhausted. Technological development is always offering new opportunities for innovative design. But innovative design always develops in tandem with innovative technology, and can never be an end in itself.</p>',
  1,
  'Philosophy'
),
(
  'rams-principle-2',
  'dieter-rams',
  'Good design makes a product useful',
  '<p>A product is bought to be used. It has to satisfy certain criteria, not only functional, but also psychological and aesthetic. Good design emphasizes the usefulness of a product whilst disregarding anything that could possibly detract from it.</p>',
  2,
  'Function'
),
(
  'rams-principle-3',
  'dieter-rams',
  'Good design is aesthetic',
  '<p>The aesthetic quality of a product is integral to its usefulness because products we use every day affect our person and our well-being. But only well-executed objects can be beautiful.</p>',
  3,
  'Aesthetics'
),
(
  'rams-principle-4',
  'dieter-rams',
  'Good design makes a product understandable',
  '<p>It clarifies the product''s structure. Better still, it can make the product talk. At best, it is self-explanatory.</p>',
  4,
  'Clarity'
),
(
  'rams-principle-5',
  'dieter-rams',
  'Good design is unobtrusive',
  '<p>Products fulfilling a purpose are like tools. They are neither decorative objects nor works of art. Their design should therefore be both neutral and restrained, to leave room for the user''s self-expression.</p>',
  5,
  'Restraint'
),
(
  'rams-principle-6',
  'dieter-rams',
  'Good design is honest',
  '<p>It does not make a product more innovative, powerful or valuable than it really is. It does not attempt to manipulate the consumer with promises that cannot be kept.</p>',
  6,
  'Honesty'
),
(
  'rams-principle-7',
  'dieter-rams',
  'Good design is long-lasting',
  '<p>It avoids being fashionable and therefore never appears antiquated. Unlike fashionable design, it lasts many years—even in today''s throwaway society.</p>',
  7,
  'Longevity'
),
(
  'rams-principle-8',
  'dieter-rams',
  'Good design is thorough down to the last detail',
  '<p>Nothing must be arbitrary or left to chance. Care and accuracy in the design process show respect for the user.</p>',
  8,
  'Precision'
),
(
  'rams-principle-9',
  'dieter-rams',
  'Good design is environmentally friendly',
  '<p>Design makes an important contribution to the preservation of the environment. It conserves resources and minimizes physical and visual pollution throughout the lifecycle of the product.</p>',
  9,
  'Environment'
),
(
  'rams-principle-10',
  'dieter-rams',
  'Good design is as little design as possible',
  '<p>Less, but better—because it concentrates on the essential aspects, and the products are not burdened with non-essentials. Back to purity, back to simplicity.</p>',
  10,
  'Minimalism'
);

-- Insert key quotes
INSERT INTO quotes (id, master_id, quote_text, context) VALUES
(
  'rams-quote-1',
  'dieter-rams',
  'Weniger, aber besser. Less, but better.',
  'Rams'' design philosophy, distilled'
),
(
  'rams-quote-2',
  'dieter-rams',
  'Indifference towards people and the reality in which they live is actually the one and only cardinal sin in design.',
  'On the responsibility of designers'
),
(
  'rams-quote-3',
  'dieter-rams',
  'Good design is as little design as possible.',
  'Principle #10, the culmination of his philosophy'
),
(
  'rams-quote-4',
  'dieter-rams',
  'You cannot understand good design if you do not understand people.',
  'On user-centered design'
);

-- Insert key resources
INSERT INTO resources (id, master_id, title, type, url, description, featured) VALUES
(
  'rams-resource-1',
  'dieter-rams',
  'Rams (Documentary)',
  'video',
  'https://www.hustwit.com/rams',
  'Gary Hustwit''s 2018 documentary exploring Rams'' life, philosophy, and legacy',
  1
),
(
  'rams-resource-2',
  'dieter-rams',
  'Less and More: The Design Ethos of Dieter Rams',
  'book',
  NULL,
  'Comprehensive retrospective of Rams'' work at Braun and Vitsœ',
  1
),
(
  'rams-resource-3',
  'dieter-rams',
  'Vitsœ - Dieter Rams',
  'article',
  'https://www.vitsoe.com/us/about/dieter-rams',
  'Official biography and principles from the company Rams still works with',
  1
);
