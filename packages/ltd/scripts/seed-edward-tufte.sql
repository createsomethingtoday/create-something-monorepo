-- Seed Edward Tufte and his Data Visualization Principles

-- Insert Edward Tufte
INSERT INTO masters (id, slug, name, tagline, birth_year, death_year, discipline, biography, legacy)
VALUES (
  'edward-tufte',
  'edward-tufte',
  'Edward Tufte',
  'Pioneer of data visualization and information design',
  1942,
  NULL,
  'Data Visualization',
  '<p>Edward Tufte is an American statistician and professor emeritus of political science, statistics, and computer science at Yale University. He is best known for his pioneering work in data visualization and information design, establishing principles that transform how we present and understand quantitative information.</p>

<p>His 1983 book <em>The Visual Display of Quantitative Information</em> is considered the foundational text of modern data visualization. Tufte argued that excellent graphics reveal data with clarity, precision, and efficiency—showing the greatest number of ideas in the shortest time with the least ink in the smallest space.</p>

<p>Tufte''s approach is empirical and anti-decorative. He coined the term "chartjunk" to describe visual elements that obscure rather than clarify data. His work demonstrates that the best designs are often the simplest: small multiples, sparklines, and high-resolution data displays that respect the reader''s intelligence.</p>',
  '<p><strong>"Above all else show the data"</strong> — this principle guides all of Tufte''s work. Graphics should maximize what he calls the "data-ink ratio": the proportion of ink devoted to displaying actual data versus decorative elements.</p>

<p>His principles have influenced generations of statisticians, designers, scientists, and engineers. From dashboard design to scientific publications, Tufte''s framework for evaluating visual integrity remains the standard.</p>

<p>Tufte proved that clarity in visualization is not merely aesthetic—it''s ethical. Poor graphics mislead. Excellent graphics reveal truth.</p>'
);

-- Insert Tufte's Core Principles
INSERT INTO principles (id, master_id, title, description, order_index, category) VALUES
(
  'tufte-principle-1',
  'edward-tufte',
  'Above all else show the data',
  '<p>The primary purpose of any graphic is to display data. Everything else—titles, labels, decoration—is secondary. The data should dominate the visual field, not the graphic elements surrounding it.</p>',
  1,
  'Philosophy'
),
(
  'tufte-principle-2',
  'edward-tufte',
  'Maximize the data-ink ratio',
  '<p>Data-ink is the non-erasable core of a graphic. Maximize the proportion of ink devoted to data. Erase non-data-ink and redundant data-ink. Every bit of ink requires a reason.</p>

<p>Formula: Data-ink ratio = data-ink / total ink used in graphic</p>

<p>The goal: erase as much non-data-ink as possible while preserving the information.</p>',
  2,
  'Efficiency'
),
(
  'tufte-principle-3',
  'edward-tufte',
  'Erase non-data-ink and redundant data-ink',
  '<p>Remove chartjunk: vibrating patterns, unnecessary gridlines, decorative shading, and redundant labels. Question every graphical element: Does this help show the data? If not, remove it.</p>

<p>Heavy grid lines can be erased. Excessive tick marks can go. Redundant labels waste space. The data itself should structure the display.</p>',
  3,
  'Clarity'
),
(
  'tufte-principle-4',
  'edward-tufte',
  'Revise and edit',
  '<p>Designing a graphic is an iterative process. The first draft is never the final draft. Revise to improve clarity. Edit to remove clutter. Test with real users to ensure comprehension.</p>

<p>Ask: What story does this data tell? Is that story immediately apparent? If not, revise.</p>',
  4,
  'Process'
),
(
  'tufte-principle-5',
  'edward-tufte',
  'Show data variation, not design variation',
  '<p>Visual prominence should reflect data importance, not designer preference. If the data varies by 2%, the graphic should show a small difference. If it varies by 200%, the graphic should show a large difference.</p>

<p>Design elements—color, size, position—should encode meaning, not decoration.</p>',
  5,
  'Integrity'
),
(
  'tufte-principle-6',
  'edward-tufte',
  'Use small multiples',
  '<p>Small multiples are a series of similar graphics with the same scale and axes, allowing easy comparison across categories or time. They enable viewers to compare many variables at once while preserving visual simplicity.</p>

<p>Instead of one complex chart with multiple overlays, show many small charts side by side. The human eye excels at pattern recognition across repeated structures.</p>',
  6,
  'Comparison'
),
(
  'tufte-principle-7',
  'edward-tufte',
  'Integrate text and graphics',
  '<p>Words and pictures belong together. Labels should be placed directly on the data, not separated in legends. Annotations should appear where they''re needed, not relegated to footnotes.</p>

<p>Integration reduces eye travel, eliminates decoding steps, and improves comprehension. The reader shouldn''t have to look elsewhere to understand what they''re seeing.</p>',
  7,
  'Integration'
),
(
  'tufte-principle-8',
  'edward-tufte',
  'Reveal data at several levels of detail',
  '<p>Excellent graphics give both overview and detail. From a distance, the viewer sees overall patterns. Up close, individual data points become readable. This requires high resolution and thoughtful layering.</p>

<p>Micro/macro readings allow exploration: the headline at a glance, the specifics upon investigation.</p>',
  8,
  'Depth'
),
(
  'tufte-principle-9',
  'edward-tufte',
  'Avoid chartjunk',
  '<p>Chartjunk includes: vibrating moiré patterns, unintended optical art, busy grids, decorative hatching, ornamented borders, and unnecessary 3D effects. These elements obscure data and insult the reader''s intelligence.</p>

<p>Every graphic element should encode information. If it doesn''t, it''s chartjunk.</p>',
  9,
  'Restraint'
),
(
  'tufte-principle-10',
  'edward-tufte',
  'Use high data density',
  '<p>Pack as much meaningful data as possible into the display. Humans can process tremendous visual complexity when it''s well-organized. Don''t dumb down graphics—clarify them.</p>

<p>A single high-resolution graphic often communicates more effectively than multiple simplified charts. Respect the reader''s cognitive capacity.</p>',
  10,
  'Density'
);

-- Insert key quotes
INSERT INTO quotes (id, master_id, quote_text, context) VALUES
(
  'tufte-quote-1',
  'edward-tufte',
  'Above all else show the data.',
  'Core principle from The Visual Display of Quantitative Information'
),
(
  'tufte-quote-2',
  'edward-tufte',
  'Graphical excellence is that which gives to the viewer the greatest number of ideas in the shortest time with the least ink in the smallest space.',
  'Definition of excellence in data visualization'
),
(
  'tufte-quote-3',
  'edward-tufte',
  'Clutter and confusion are failures of design, not attributes of information.',
  'On the responsibility of designers to create clarity'
),
(
  'tufte-quote-4',
  'edward-tufte',
  'The commonality between science and art is in trying to see profoundly—to develop strategies of seeing and showing.',
  'On the intersection of analytical and visual thinking'
),
(
  'tufte-quote-5',
  'edward-tufte',
  'If the statistics are boring, then you''ve got the wrong numbers.',
  'On finding meaningful data stories'
),
(
  'tufte-quote-6',
  'edward-tufte',
  'There are only two industries that call their customers ''users'': illegal drugs and software.',
  'Critique of dehumanizing terminology in technology'
),
(
  'tufte-quote-7',
  'edward-tufte',
  'Confusion and clutter are failures of design, not attributes of information.',
  'On visual clarity as designer responsibility'
);

-- Insert key resources
INSERT INTO resources (id, master_id, title, type, url, description, featured) VALUES
(
  'tufte-resource-1',
  'edward-tufte',
  'The Visual Display of Quantitative Information',
  'book',
  'https://www.edwardtufte.com/tufte/books_vdqi',
  'The foundational text of modern data visualization (1983, 2nd edition 2001)',
  1
),
(
  'tufte-resource-2',
  'edward-tufte',
  'Envisioning Information',
  'book',
  'https://www.edwardtufte.com/tufte/books_ei',
  'Design strategies for visualizing complex, high-dimensional data (1990)',
  1
),
(
  'tufte-resource-3',
  'edward-tufte',
  'Visual Explanations',
  'book',
  'https://www.edwardtufte.com/tufte/books_visex',
  'Images and quantities, evidence and narrative (1997)',
  1
),
(
  'tufte-resource-4',
  'edward-tufte',
  'Beautiful Evidence',
  'book',
  'https://www.edwardtufte.com/tufte/books_be',
  'Science and art of evidence-based visual reasoning (2006)',
  1
),
(
  'tufte-resource-5',
  'edward-tufte',
  'Edward Tufte Official Website',
  'website',
  'https://www.edwardtufte.com/',
  'Official site with essays, course information, and book details',
  1
),
(
  'tufte-resource-6',
  'edward-tufte',
  'Sparklines: Theory and Practice',
  'article',
  'https://www.edwardtufte.com/bboard/q-and-a-fetch-msg?msg_id=0001OR',
  'Introduction to sparklines—intense, simple, word-sized graphics',
  0
);
