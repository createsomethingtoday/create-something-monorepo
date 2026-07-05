import type { Example, Master, Principle, Quote, Resource } from '$lib/types';

const CANON_TIMESTAMP = 1_735_171_200;

type MasterProfile = {
  master: Master | null;
  principles: Principle[];
  quotes: Quote[];
  examples: Example[];
  resources: Resource[];
};

type SeedMaster = Omit<Master, 'created_at' | 'updated_at'>;
type SeedPrinciple = Omit<Principle, 'created_at'>;
type SeedQuote = Omit<Quote, 'created_at'>;

const SEED_MASTERS: SeedMaster[] = [
  {
    id: 'master-rams',
    slug: 'dieter-rams',
    name: 'Dieter Rams',
    tagline: 'Less, but better',
    birth_year: 1932,
    death_year: undefined,
    discipline: 'Industrial Design',
    biography:
      'Dieter Rams is a German industrial designer closely associated with Braun and Vitsœ. His work spans six decades, but he is most celebrated for the functional, minimal product designs he created at Braun from 1961 to 1995. Rams articulated ten principles that still shape product, software, and organizational design.',
    legacy:
      'Rams made subtraction operational. “Weniger, aber besser” gives CREATE SOMETHING a durable test: every element must earn its existence, and every interface should become clearer as it becomes simpler.'
  },
  {
    id: 'master-mies',
    slug: 'mies-van-der-rohe',
    name: 'Ludwig Mies van der Rohe',
    tagline: 'Less is more',
    birth_year: 1886,
    death_year: 1969,
    discipline: 'Architecture',
    biography:
      'Ludwig Mies van der Rohe was a German-American architect and one of the pioneers of modernist architecture. His work used steel, glass, proportion, and open space to make structure legible instead of decorative.',
    legacy:
      'Mies turned restraint into spatial discipline. His insistence on structural honesty maps directly to software and systems work: the structure should explain itself.'
  },
  {
    id: 'master-tufte',
    slug: 'edward-tufte',
    name: 'Edward R. Tufte',
    tagline: 'Above all else, show the data',
    birth_year: 1942,
    death_year: undefined,
    discipline: 'Data Visualization',
    biography:
      'Edward R. Tufte is a statistician and information-design author whose work changed how complex evidence is shown. His writing emphasizes data density, small multiples, and the removal of chartjunk.',
    legacy:
      'Tufte gives the canon its evidence standard: show the data, remove noise, and let readers inspect the claim rather than accept decoration as proof.'
  },
  {
    id: 'master-eames',
    slug: 'charles-ray-eames',
    name: 'Charles & Ray Eames',
    tagline: 'The best for the most for the least',
    birth_year: 1907,
    death_year: 1988,
    discipline: 'Furniture & Film',
    biography:
      'Charles and Ray Eames worked across furniture, architecture, film, exhibition, and industrial design. Their studio treated constraints as design material and pursued excellent work at democratic scale.',
    legacy:
      'The Eameses keep the canon from becoming austere. They show that usefulness, play, production, and generosity can reinforce each other when the constraint is understood deeply.'
  },
  {
    id: 'master-heidegger',
    slug: 'martin-heidegger',
    name: 'Martin Heidegger',
    tagline: 'The question of Being',
    birth_year: 1889,
    death_year: 1976,
    discipline: 'Philosophy',
    biography:
      'Martin Heidegger was a German philosopher whose work in phenomenology and hermeneutics examined Being, tools, technology, language, and dwelling.',
    legacy:
      'Heidegger gives CREATE SOMETHING the question beneath the interface: does the system let the work become ready-to-hand, or does it turn everything into standing reserve?'
  },
  {
    id: 'master-canon',
    slug: 'create-something-canon',
    name: 'The Canon',
    tagline: 'Creation is removing what obscures',
    birth_year: 2024,
    death_year: undefined,
    discipline: 'Design Philosophy',
    biography:
      'The CREATE SOMETHING Canon synthesizes masters across disciplines into a working standard for judgment: implementation, artifact, and system each require disciplined subtraction.',
    legacy:
      'The Canon exists so judgment can travel. It turns taste into standards, standards into patterns, and patterns back into operating decisions.'
  },
  {
    id: 'master-ive',
    slug: 'jony-ive',
    name: 'Jony Ive',
    tagline: 'Simplicity is not the absence of clutter',
    birth_year: 1967,
    death_year: undefined,
    discipline: 'Digital & Industrial Design',
    biography:
      'Sir Jonathan Ive translated industrial restraint into mass digital products and interface motion. His Apple work extended the Rams lineage into software, glass, depth, and time.',
    legacy:
      'Ive gives the canon a motion standard: animation should communicate state, preserve clarity, and make digital objects feel inevitable rather than ornamental.'
  }
];

const SEED_PRINCIPLES: SeedPrinciple[] = [
  {
    id: 'rams-principle-1',
    master_id: 'master-rams',
    title: 'Good design is innovative',
    description: 'Innovation develops with useful technology and can never be an end in itself.',
    order_index: 1,
    category: 'core'
  },
  {
    id: 'rams-principle-2',
    master_id: 'master-rams',
    title: 'Good design makes a product useful',
    description: 'Good design emphasizes usefulness and removes anything that detracts from it.',
    order_index: 2,
    category: 'core'
  },
  {
    id: 'rams-principle-3',
    master_id: 'master-rams',
    title: 'Good design is aesthetic',
    description:
      'Only well-executed objects can be beautiful because daily tools affect well-being.',
    order_index: 3,
    category: 'core'
  },
  {
    id: 'rams-principle-4',
    master_id: 'master-rams',
    title: 'Good design makes a product understandable',
    description: 'It clarifies structure and, at best, becomes self-explanatory.',
    order_index: 4,
    category: 'core'
  },
  {
    id: 'rams-principle-5',
    master_id: 'master-rams',
    title: 'Good design is unobtrusive',
    description: 'Useful products are tools; they should be neutral and restrained.',
    order_index: 5,
    category: 'core'
  },
  {
    id: 'rams-principle-6',
    master_id: 'master-rams',
    title: 'Good design is honest',
    description:
      'It does not promise more innovation, power, or value than the product can deliver.',
    order_index: 6,
    category: 'core'
  },
  {
    id: 'rams-principle-7',
    master_id: 'master-rams',
    title: 'Good design is long-lasting',
    description: 'It avoids fashion so it can remain useful beyond the current moment.',
    order_index: 7,
    category: 'core'
  },
  {
    id: 'rams-principle-8',
    master_id: 'master-rams',
    title: 'Good design is thorough down to the last detail',
    description: 'Nothing is arbitrary; care in detail shows respect for the user.',
    order_index: 8,
    category: 'core'
  },
  {
    id: 'rams-principle-9',
    master_id: 'master-rams',
    title: 'Good design is environmentally friendly',
    description: 'Design conserves resources and minimizes physical and visual pollution.',
    order_index: 9,
    category: 'core'
  },
  {
    id: 'rams-principle-10',
    master_id: 'master-rams',
    title: 'Good design is as little design as possible',
    description: 'Less, but better: concentrate on the essential and remove the non-essential.',
    order_index: 10,
    category: 'core'
  },
  {
    id: 'mies-less-is-more',
    master_id: 'master-mies',
    title: 'Less is more',
    description: 'Reduction is not absence but distillation to essential structure.',
    order_index: 1,
    category: 'architecture'
  },
  {
    id: 'mies-god-details',
    master_id: 'master-mies',
    title: 'God is in the details',
    description: 'Excellence depends on joints, alignments, proportions, and small decisions.',
    order_index: 2,
    category: 'architecture'
  },
  {
    id: 'tufte-data-ink-ratio',
    master_id: 'master-tufte',
    title: 'Maximize the data-ink ratio',
    description: 'Erase non-data ink and redundant data ink within reason.',
    order_index: 1,
    category: 'visualization'
  },
  {
    id: 'eames-best-most-least',
    master_id: 'master-eames',
    title: 'The best for the most for the least',
    description: 'Accessibility and excellence are not opposites; they are the design challenge.',
    order_index: 1,
    category: 'design'
  },
  {
    id: 'heidegger-zuhandenheit',
    master_id: 'master-heidegger',
    title: 'Zuhandenheit (Ready-to-hand)',
    description: 'Tools that work well withdraw from attention and become transparent to the task.',
    order_index: 1,
    category: 'phenomenology'
  },
  {
    id: 'subtractive-triad',
    master_id: 'master-canon',
    title: 'The Subtractive Triad',
    description: 'Creation is removing what obscures across implementation, artifact, and system.',
    order_index: 1,
    category: 'meta'
  },
  {
    id: 'ive-purposeful-motion',
    master_id: 'master-ive',
    title: 'Motion should be purposeful',
    description: 'Animation exists to communicate state, not to decorate.',
    order_index: 1,
    category: 'motion'
  }
];

const SEED_QUOTES: SeedQuote[] = [
  {
    id: 'quote-rams-1',
    master_id: 'master-rams',
    quote_text: 'Weniger, aber besser. (Less, but better.)',
    context: 'Rams’ defining philosophy.',
    source_url: undefined
  },
  {
    id: 'quote-mies-1',
    master_id: 'master-mies',
    quote_text: 'Less is more.',
    context: 'Mies’ defining architectural philosophy.',
    source_url: undefined
  },
  {
    id: 'quote-tufte-1',
    master_id: 'master-tufte',
    quote_text: 'Above all else, show the data.',
    context: 'The foundational principle of data visualization.',
    source_url: undefined
  },
  {
    id: 'quote-eames-1',
    master_id: 'master-eames',
    quote_text: 'The best for the most for the least.',
    context: 'The Eames design philosophy.',
    source_url: undefined
  },
  {
    id: 'quote-heidegger-1',
    master_id: 'master-heidegger',
    quote_text: 'Language is the house of Being.',
    context: 'Language shapes what can be thought and made.',
    source_url: undefined
  },
  {
    id: 'quote-ive-1',
    master_id: 'master-ive',
    quote_text: 'Simplicity is not the absence of clutter. That’s a consequence of simplicity.',
    context: 'On the work behind simplicity.',
    source_url: undefined
  }
];

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? ` ${error.cause.message}` : '';
    return `${error.message}${cause}`;
  }

  return String(error);
}

export function isMissingMastersSchemaError(error: unknown): boolean {
  return /no such table:\s*(masters|principles|quotes|examples|resources)/i.test(
    getErrorMessage(error)
  );
}

function withMasterTimestamps(master: SeedMaster): Master {
  return {
    ...master,
    created_at: CANON_TIMESTAMP,
    updated_at: CANON_TIMESTAMP
  };
}

function withPrincipleTimestamp(principle: SeedPrinciple): Principle {
  return {
    ...principle,
    created_at: CANON_TIMESTAMP
  };
}

function withQuoteTimestamp(quote: SeedQuote): Quote {
  return {
    ...quote,
    created_at: CANON_TIMESTAMP
  };
}

export const fallbackMasters: Master[] = SEED_MASTERS.map(withMasterTimestamps);
const fallbackPrinciples = SEED_PRINCIPLES.map(withPrincipleTimestamp);
const fallbackQuotes = SEED_QUOTES.map(withQuoteTimestamp);

function fallbackMasterProfile(slug: string): MasterProfile {
  const master = fallbackMasters.find((item) => item.slug === slug) ?? null;

  if (!master) {
    return { master: null, principles: [], quotes: [], examples: [], resources: [] };
  }

  return {
    master,
    principles: fallbackPrinciples
      .filter((principle) => principle.master_id === master.id)
      .sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.title.localeCompare(b.title)
      ),
    quotes: fallbackQuotes.filter((quote) => quote.master_id === master.id),
    examples: [],
    resources: []
  };
}

export async function loadMasters(db: D1Database | undefined): Promise<Master[]> {
  if (!db) {
    return fallbackMasters;
  }

  try {
    const result = await db
      .prepare(
        `
				SELECT * FROM masters
				WHERE id != 'arena-taste'
				ORDER BY created_at ASC
			`
      )
      .all<Master>();
    const masters = result.results || [];

    return masters.length > 0 ? masters : fallbackMasters;
  } catch (error) {
    if (!isMissingMastersSchemaError(error)) {
      console.error('Error loading masters:', error);
    }

    return fallbackMasters;
  }
}

export async function loadMasterProfile(
  db: D1Database | undefined,
  slug: string
): Promise<MasterProfile> {
  if (slug === 'arena-taste') {
    return { master: null, principles: [], quotes: [], examples: [], resources: [] };
  }

  if (!db) {
    return fallbackMasterProfile(slug);
  }

  try {
    const master = await db
      .prepare('SELECT * FROM masters WHERE slug = ?')
      .bind(slug)
      .first<Master>();

    if (!master) {
      return fallbackMasterProfile(slug);
    }

    const [principlesResult, quotesResult, examplesResult, resourcesResult] = await Promise.all([
      db
        .prepare('SELECT * FROM principles WHERE master_id = ? ORDER BY order_index ASC, title ASC')
        .bind(master.id)
        .all<Principle>(),
      db
        .prepare('SELECT * FROM quotes WHERE master_id = ? ORDER BY created_at DESC')
        .bind(master.id)
        .all<Quote>(),
      db
        .prepare('SELECT * FROM examples WHERE master_id = ? ORDER BY year DESC')
        .bind(master.id)
        .all<Example>(),
      db
        .prepare('SELECT * FROM resources WHERE master_id = ? ORDER BY featured DESC, year DESC')
        .bind(master.id)
        .all<Resource>()
    ]);

    return {
      master,
      principles: principlesResult.results || [],
      quotes: quotesResult.results || [],
      examples: examplesResult.results || [],
      resources: resourcesResult.results || []
    };
  } catch (error) {
    if (!isMissingMastersSchemaError(error)) {
      console.error('Error loading master:', error);
    }

    return fallbackMasterProfile(slug);
  }
}
