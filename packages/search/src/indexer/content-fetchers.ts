/**
 * Content Fetchers
 *
 * Fetch content from each property database for indexing.
 * Canon: Each property contributes to the whole.
 */

import type { IndexableContent, Property, ContentType } from '../types';
import { createHash } from 'node:crypto';

// =============================================================================
// HASH UTILITY
// =============================================================================

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

// =============================================================================
// SPACE CONTENT (.space)
// =============================================================================

interface SpacePaper {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string | null;
  excerpt_long: string | null;
  description: string | null;
  updated_at: string;
}

export async function fetchSpaceContent(db: D1Database): Promise<IndexableContent[]> {
  const results: IndexableContent[] = [];

  // Fetch papers/experiments
  const papers = await db
    .prepare(`
      SELECT id, title, slug, category, content, excerpt_long, description, updated_at
      FROM papers
      WHERE published = 1 AND is_hidden = 0 AND archived = 0
    `)
    .all<SpacePaper>();

  for (const paper of papers.results || []) {
    const description = paper.excerpt_long || paper.description || '';
    const content = paper.content || description;

    results.push({
      id: `space:experiment:${paper.slug}`,
      title: paper.title,
      description: description.slice(0, 300),
      content: content.slice(0, 5000), // Limit for embedding
      property: 'space',
      type: 'experiment',
      path: `/experiments/${paper.slug}`,
      concepts: [], // Will be enriched later
      hash: hashContent(content),
      lastModified: paper.updated_at,
    });
  }

  return results;
}

// =============================================================================
// IO CONTENT (.io)
// =============================================================================

// IO Manifest types
interface IOContentItem {
  slug: string;
  title: string;
  description: string;
  category?: string;
}

interface IOManifest {
  property: string;
  papers: IOContentItem[];
  experiments: IOContentItem[];
  generated: string;
}

// Cache for the IO manifest (refreshed each indexing run)
let cachedIOManifest: IOManifest | null = null;

/**
 * Fetch the content manifest from io
 * IO papers are static Svelte routes with interactive components - NOT D1 content
 * The manifest defines what routes exist with rich metadata
 */
async function fetchIOManifest(): Promise<IOManifest | null> {
  if (cachedIOManifest) {
    return cachedIOManifest;
  }

  try {
    const response = await fetch('https://createsomething.io/api/manifest');
    if (!response.ok) {
      console.warn(`Failed to fetch IO manifest: ${response.status}`);
      return null;
    }

    cachedIOManifest = await response.json();
    console.log(`IO manifest loaded: ${cachedIOManifest!.papers.length} papers, ${cachedIOManifest!.experiments.length} experiments`);
    return cachedIOManifest;
  } catch (error) {
    console.error('Error fetching IO manifest:', error);
    return null;
  }
}

/**
 * Clear the IO manifest cache (call at start of indexing)
 */
export function clearIOManifestCache(): void {
  cachedIOManifest = null;
}

/**
 * Fetch IO content from the manifest (NOT from D1)
 * 
 * IO papers are static Svelte routes with interactive components.
 * The manifest provides rich metadata (title, description, category).
 */
export async function fetchIOContent(_db: D1Database): Promise<IndexableContent[]> {
  const results: IndexableContent[] = [];
  const manifest = await fetchIOManifest();

  if (!manifest) {
    console.warn('Could not fetch IO manifest - skipping IO content');
    return results;
  }

  // Index papers from manifest
  for (const paper of manifest.papers) {
    const content = `${paper.title}. ${paper.description}`;
    
    results.push({
      id: `io:paper:${paper.slug}`,
      title: paper.title,
      description: paper.description,
      content,
      property: 'io',
      type: 'paper',
      path: `/papers/${paper.slug}`,
      concepts: extractConceptsFromText(content),
      hash: hashContent(paper.slug + paper.title),
      lastModified: manifest.generated,
    });
  }

  // Index experiments from manifest
  for (const experiment of manifest.experiments) {
    const content = `${experiment.title}. ${experiment.description}`;
    
    results.push({
      id: `io:experiment:${experiment.slug}`,
      title: experiment.title,
      description: experiment.description,
      content,
      property: 'io',
      type: 'experiment',
      path: `/experiments/${experiment.slug}`,
      concepts: extractConceptsFromText(content),
      hash: hashContent(experiment.slug + experiment.title),
      lastModified: manifest.generated,
    });
  }

  return results;
}

/**
 * Extract concepts from text content
 */
function extractConceptsFromText(text: string): string[] {
  const conceptKeywords: Record<string, string> = {
    'hermeneutic': 'Hermeneutic Circle',
    'heidegger': 'Martin Heidegger',
    'zuhandenheit': 'Zuhandenheit',
    'vorhandenheit': 'Vorhandenheit',
    'subtractive': 'Weniger, aber besser',
    'dieter rams': 'Dieter Rams',
    'cloudflare': 'Cloudflare Workers',
    'sveltekit': 'SvelteKit',
    'agent': 'AI Native',
    'beads': 'Beads',
    'code mode': 'Code Mode',
  };

  const concepts: string[] = [];
  const textLower = text.toLowerCase();

  for (const [keyword, concept] of Object.entries(conceptKeywords)) {
    if (textLower.includes(keyword)) {
      concepts.push(concept);
    }
  }

  return concepts;
}

// =============================================================================
// LTD CONTENT (.ltd)
// =============================================================================

interface LTDPrinciple {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  content: string | null;
  master_id: string | null;
  updated_at: string;
}

interface LTDPattern {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  content: string | null;
  updated_at: string;
}

interface LTDMaster {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  philosophy: string | null;
  updated_at: string;
}

export async function fetchLTDContent(db: D1Database): Promise<IndexableContent[]> {
  const results: IndexableContent[] = [];

  // Fetch principles
  try {
    const principles = await db
      .prepare(`
        SELECT id, name, slug, description, content, master_id, updated_at
        FROM principles
        WHERE published = 1 OR published IS NULL
      `)
      .all<LTDPrinciple>();

    for (const principle of principles.results || []) {
      const description = principle.description || '';
      const content = principle.content || description;

      results.push({
        id: `ltd:principle:${principle.slug}`,
        title: principle.name,
        description: description.slice(0, 300),
        content: content.slice(0, 5000),
        property: 'ltd',
        type: 'principle',
        path: `/principles/${principle.slug}`,
        concepts: [],
        hash: hashContent(content),
        lastModified: principle.updated_at,
      });
    }
  } catch (e) {
    console.log('Could not fetch LTD principles (table may not exist)');
  }

  // Fetch patterns
  try {
    const patterns = await db
      .prepare(`
        SELECT id, name, slug, description, content, updated_at
        FROM patterns
        WHERE published = 1 OR published IS NULL
      `)
      .all<LTDPattern>();

    for (const pattern of patterns.results || []) {
      const description = pattern.description || '';
      const content = pattern.content || description;

      results.push({
        id: `ltd:pattern:${pattern.slug}`,
        title: pattern.name,
        description: description.slice(0, 300),
        content: content.slice(0, 5000),
        property: 'ltd',
        type: 'pattern',
        path: `/patterns/${pattern.slug}`,
        concepts: [],
        hash: hashContent(content),
        lastModified: pattern.updated_at,
      });
    }
  } catch (e) {
    console.log('Could not fetch LTD patterns (table may not exist)');
  }

  // Fetch masters
  try {
    const masters = await db
      .prepare(`
        SELECT id, name, slug, bio, philosophy, updated_at
        FROM masters
      `)
      .all<LTDMaster>();

    for (const master of masters.results || []) {
      const description = master.bio || '';
      const content = `${master.bio || ''}\n\n${master.philosophy || ''}`;

      results.push({
        id: `ltd:master:${master.slug}`,
        title: master.name,
        description: description.slice(0, 300),
        content: content.slice(0, 5000),
        property: 'ltd',
        type: 'master',
        path: `/masters/${master.slug}`,
        concepts: [],
        hash: hashContent(content),
        lastModified: master.updated_at,
      });
    }
  } catch (e) {
    console.log('Could not fetch LTD masters (table may not exist)');
  }

  return results;
}

// =============================================================================
// AGENCY CONTENT (.agency)
// =============================================================================

interface AgencyService {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  content: string | null;
  updated_at: string;
}

interface AgencyCaseStudy {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  updated_at: string;
}

export async function fetchAgencyContent(db: D1Database): Promise<IndexableContent[]> {
  const results: IndexableContent[] = [];

  // Fetch services
  try {
    const services = await db
      .prepare(`
        SELECT id, name, slug, description, content, updated_at
        FROM services
        WHERE published = 1 OR published IS NULL
      `)
      .all<AgencyService>();

    for (const service of services.results || []) {
      const description = service.description || '';
      const content = service.content || description;

      results.push({
        id: `agency:service:${service.slug}`,
        title: service.name,
        description: description.slice(0, 300),
        content: content.slice(0, 5000),
        property: 'agency',
        type: 'service',
        path: `/services/${service.slug}`,
        concepts: [],
        hash: hashContent(content),
        lastModified: service.updated_at,
      });
    }
  } catch (e) {
    console.log('Could not fetch Agency services (table may not exist)');
  }

  // Fetch case studies
  try {
    const caseStudies = await db
      .prepare(`
        SELECT id, title, slug, excerpt, content, updated_at
        FROM case_studies
        WHERE published = 1 OR published IS NULL
      `)
      .all<AgencyCaseStudy>();

    for (const cs of caseStudies.results || []) {
      const description = cs.excerpt || '';
      const content = cs.content || description;

      results.push({
        id: `agency:case-study:${cs.slug}`,
        title: cs.title,
        description: description.slice(0, 300),
        content: content.slice(0, 5000),
        property: 'agency',
        type: 'case-study',
        path: `/work/${cs.slug}`,
        concepts: [],
        hash: hashContent(content),
        lastModified: cs.updated_at,
      });
    }
  } catch (e) {
    console.log('Could not fetch Agency case studies (table may not exist)');
  }

  return results;
}

// =============================================================================
// ALL CONTENT
// =============================================================================

export interface FetchResult {
  content: IndexableContent[];
  errors: string[];
}

export async function fetchAllContent(
  dbSpace: D1Database,
  dbIO: D1Database,
  dbLTD: D1Database,
  dbAgency: D1Database
): Promise<FetchResult> {
  const content: IndexableContent[] = [];
  const errors: string[] = [];

  // Fetch from each property in parallel
  const [spaceResult, ioResult, ltdResult, agencyResult] = await Promise.allSettled([
    fetchSpaceContent(dbSpace),
    fetchIOContent(dbIO),
    fetchLTDContent(dbLTD),
    fetchAgencyContent(dbAgency),
  ]);

  if (spaceResult.status === 'fulfilled') {
    content.push(...spaceResult.value);
  } else {
    errors.push(`Space: ${spaceResult.reason}`);
  }

  if (ioResult.status === 'fulfilled') {
    content.push(...ioResult.value);
  } else {
    errors.push(`IO: ${ioResult.reason}`);
  }

  if (ltdResult.status === 'fulfilled') {
    content.push(...ltdResult.value);
  } else {
    errors.push(`LTD: ${ltdResult.reason}`);
  }

  if (agencyResult.status === 'fulfilled') {
    content.push(...agencyResult.value);
  } else {
    errors.push(`Agency: ${agencyResult.reason}`);
  }

  return { content, errors };
}
