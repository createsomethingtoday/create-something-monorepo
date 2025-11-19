-- Seed Ludwig Mies van der Rohe and his design principles

-- Insert Ludwig Mies van der Rohe
INSERT INTO masters (id, slug, name, tagline, birth_year, death_year, discipline, biography, legacy)
VALUES (
  'mies-van-der-rohe',
  'mies-van-der-rohe',
  'Ludwig Mies van der Rohe',
  'Pioneer of modernist architecture',
  1886,
  1969,
  'Architecture',
  '<p>Ludwig Mies van der Rohe was born Maria Ludwig Michael Mies in Aachen, Germany. The son of a master stonemason, he began his career in his father''s stone carving shop before moving to Berlin to pursue architecture. He later renamed himself, adding "van der" and his mother''s maiden name "Rohe" as part of his transformation from tradesman''s son to architect working with Berlin''s cultural elite.</p>

<p>From 1908 to 1912, he apprenticed at the studio of Peter Behrens, where he worked alongside Walter Gropius and Le Corbusier—three architects who would define modernism. In 1930, Mies became the last director of the Bauhaus, the groundbreaking school of modernist art, design, and architecture. When the Nazis forced the school from its Dessau campus in 1932, Mies relocated it to an abandoned telephone factory in Berlin, but by July 1933, the school was permanently closed.</p>

<p>Fleeing Nazism''s opposition to modernism, Mies emigrated to the United States in 1937, where he was appointed director of the School of Architecture at Chicago''s Armour Institute (later the Illinois Institute of Technology). This move marked the beginning of his American period, during which he would create some of his most iconic works.</p>',
  '<p><strong>"Less is more"</strong> became the defining principle of Mies''s career. Though the phrase originated with Robert Browning, Mies made it the cornerstone of modern architecture. His buildings stripped away ornamentation to reveal the essence of structure and space—steel frames, glass walls, and the precise interplay between mass and void.</p>

<p>The Barcelona Pavilion (1929) distilled his philosophy into marble, glass, and steel. The Farnsworth House (1951) dissolved the boundaries between interior and exterior with floor-to-ceiling glass walls. The Seagram Building (1958) set a new global standard for corporate architecture, proving that skyscrapers could be both elegant and monumental.</p>

<p>Mies didn''t just design buildings—he redefined what architecture could be. He proved that simplicity isn''t simplistic, that restraint requires rigor, and that the most powerful spaces are often the most minimal. His influence extends far beyond architecture into industrial design, furniture, and the entire visual language of modernism.</p>

<p>From the Barcelona Chair to the glass towers that define our skylines, Mies''s legacy is everywhere. He taught us that architecture is not about decoration—it''s about truth, clarity, and the will of an epoch translated into space.</p>'
);

-- Insert key principles
INSERT INTO principles (id, master_id, title, description, order_index, category) VALUES
(
  'mies-principle-1',
  'mies-van-der-rohe',
  'Less is more',
  '<p>By stripping away unnecessary ornamentation and focusing on essential elements, architecture achieves elegant simplicity that is both beautiful and functional. Minimalism is not about deprivation—it''s about clarity, restraint, and the power of what remains.</p>',
  1,
  'Philosophy'
),
(
  'mies-principle-2',
  'mies-van-der-rohe',
  'Truth to materials',
  '<p>Materials should be used honestly, expressing their inherent properties rather than disguising them. Steel, glass, and concrete are not limitations—they are the vocabulary of modern architecture. Let materials speak for themselves.</p>',
  2,
  'Honesty'
),
(
  'mies-principle-3',
  'mies-van-der-rohe',
  'Universal space',
  '<p>Create flexible, open floor plans that can adapt to multiple uses rather than rigid, predetermined rooms. Architecture should provide a framework for life, not dictate it. The free-flowing plan liberates inhabitants to define their own spatial relationships.</p>',
  3,
  'Space'
),
(
  'mies-principle-4',
  'mies-van-der-rohe',
  'Structural clarity',
  '<p>The structure of a building should be visible and legible, not hidden behind false facades. When you can see how a building stands, you understand what it is. Structure is not something to conceal—it''s the essence of architecture.</p>',
  4,
  'Structure'
),
(
  'mies-principle-5',
  'mies-van-der-rohe',
  'God is in the details',
  '<p>Precision in execution separates good architecture from great architecture. Every joint, every material transition, every proportion must be considered with absolute care. Nothing is too small to matter. Excellence lives in the details.</p>',
  5,
  'Precision'
),
(
  'mies-principle-6',
  'mies-van-der-rohe',
  'Architecture as epoch',
  '<p>Architecture is the will of an epoch translated into space. Buildings should express the spirit and technological possibilities of their time, not mimic historical styles. Modernism isn''t a style—it''s an honest response to the present.</p>',
  6,
  'Time'
),
(
  'mies-principle-7',
  'mies-van-der-rohe',
  'Spatial continuity',
  '<p>Dissolve the barriers between interior and exterior, between one space and another. Glass walls, flowing plans, and elevated platforms blur traditional boundaries, creating seamless transitions that connect architecture to landscape and life.</p>',
  7,
  'Flow'
),
(
  'mies-principle-8',
  'mies-van-der-rohe',
  'Function and form united',
  '<p>Function and form are not separate concerns—they are one. A building''s purpose and its beauty are inseparable. When structure, materials, and spatial arrangement align with use, architecture achieves its highest expression.</p>',
  8,
  'Unity'
);

-- Insert key quotes
INSERT INTO quotes (id, master_id, quote_text, context) VALUES
(
  'mies-quote-1',
  'mies-van-der-rohe',
  'Less is more.',
  'Mies''s defining principle, distilling modernism to its essence'
),
(
  'mies-quote-2',
  'mies-van-der-rohe',
  'God is in the details.',
  'On the critical importance of precision and craftsmanship'
),
(
  'mies-quote-3',
  'mies-van-der-rohe',
  'Architecture is the will of an epoch translated into space.',
  'On architecture''s role as the expression of its time'
),
(
  'mies-quote-4',
  'mies-van-der-rohe',
  'I don''t want to be interesting. I want to be good.',
  'On prioritizing excellence over novelty'
),
(
  'mies-quote-5',
  'mies-van-der-rohe',
  'True architecture is always objective and is the expression of the inner structure of our time from which it springs.',
  'On the relationship between architecture and historical moment'
);

-- Insert key works as examples
INSERT INTO examples (id, master_id, title, description, year) VALUES
(
  'mies-example-1',
  'mies-van-der-rohe',
  'Barcelona Pavilion',
  'German Pavilion for the 1929 International Exposition. A masterpiece of flowing space, minimal structure, and luxurious materials—marble, glass, and steel in perfect harmony.',
  1929
),
(
  'mies-example-2',
  'mies-van-der-rohe',
  'Farnsworth House',
  'A single rectangular volume in Plano, Illinois, elevated on steel columns with transparent glass walls that dissolve the boundary between interior and exterior. Completed 1951.',
  1951
),
(
  'mies-example-3',
  'mies-van-der-rohe',
  'Seagram Building',
  'A 38-story bronze-and-glass tower in Manhattan that set the global standard for corporate modernism. Co-designed with Philip Johnson. Completed 1958.',
  1958
),
(
  'mies-example-4',
  'mies-van-der-rohe',
  'Lake Shore Drive Apartments',
  'Twin glass-and-steel residential towers in Chicago that pioneered the modern apartment building typology. Completed 1949-1951.',
  1951
),
(
  'mies-example-5',
  'mies-van-der-rohe',
  'Barcelona Chair',
  'Designed for the Barcelona Pavilion, this iconic chair exemplifies Mies''s principles applied to furniture: structural clarity, material honesty, and elegant simplicity.',
  1929
);

-- Insert key resources
INSERT INTO resources (id, master_id, title, type, url, description, year, featured) VALUES
(
  'mies-resource-1',
  'mies-van-der-rohe',
  'Mies van der Rohe: A Critical Biography',
  'book',
  'https://press.uchicago.edu/ucp/books/book/chicago/M/bo11185066.html',
  'The definitive biography by Franz Schulze and Edward Windhorst, comprehensively covering Mies''s life and work from Berlin to Chicago',
  2012,
  1
),
(
  'mies-resource-2',
  'mies-van-der-rohe',
  'Mies van der Rohe',
  'book',
  'https://yalebooks.yale.edu/book/9780300246230/mies-van-der-rohe/',
  'Dietrich Neumann''s comprehensive illustrated account, the most substantial examination of Mies''s entire career to date',
  2025,
  1
),
(
  'mies-resource-3',
  'mies-van-der-rohe',
  'Barcelona Pavilion Official Site',
  'article',
  'https://miesbcn.com/the-pavilion/',
  'Official website of the reconstructed Barcelona Pavilion, including history, visits, and educational resources',
  NULL,
  1
),
(
  'mies-resource-4',
  'mies-van-der-rohe',
  'Farnsworth House',
  'article',
  'https://edithfarnsworthhouse.org/',
  'Official site of the Farnsworth House, now operated as a historic house museum by the National Trust for Historic Preservation',
  NULL,
  1
);
