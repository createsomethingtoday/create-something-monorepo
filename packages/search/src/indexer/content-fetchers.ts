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

// LTD uses D1 with masters, principles tables
// Schema: packages/ltd/migrations/0001_create_ltd_tables.sql

interface LTDPrinciple {
  id: string;
  title: string;  // Note: column is 'title' not 'name'
  description: string | null;
  master_id: string;
  category: string | null;
  order_index: number | null;
  created_at: number;
}

interface LTDMaster {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  discipline: string | null;
  biography: string | null;
  legacy: string | null;
  updated_at: number;
}

export async function fetchLTDContent(db: D1Database): Promise<IndexableContent[]> {
  const results: IndexableContent[] = [];

  // Fetch masters with their principles
  try {
    const masters = await db
      .prepare(`
        SELECT id, slug, name, tagline, discipline, biography, legacy, updated_at
        FROM masters
      `)
      .all<LTDMaster>();

    for (const master of masters.results || []) {
      const description = master.tagline || master.biography?.slice(0, 200) || '';
      const content = `${master.name}. ${master.tagline || ''}. ${master.discipline || ''}. ${master.biography || ''} ${master.legacy || ''}`;

      results.push({
        id: `ltd:master:${master.slug}`,
        title: master.name,
        description: description.slice(0, 300),
        content: content.slice(0, 5000),
        property: 'ltd',
        type: 'master',
        path: `/masters/${master.slug}`,
        concepts: [master.name], // Master name is a concept
        hash: hashContent(content),
        lastModified: master.updated_at?.toString() || new Date().toISOString(),
      });
    }
    
    console.log(`Fetched ${masters.results?.length || 0} LTD masters`);
  } catch (e) {
    console.log('Could not fetch LTD masters:', e);
  }

  // Fetch principles with master info
  try {
    const principles = await db
      .prepare(`
        SELECT p.id, p.title, p.description, p.category, p.master_id, p.created_at,
               m.name as master_name, m.slug as master_slug
        FROM principles p
        JOIN masters m ON p.master_id = m.id
        ORDER BY m.name, p.order_index
      `)
      .all<LTDPrinciple & { master_name: string; master_slug: string }>();

    for (const principle of principles.results || []) {
      const description = principle.description || '';
      const content = `${principle.title}. ${description}. By ${principle.master_name}.`;

      // Generate slug from title if not available
      const slug = principle.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      results.push({
        id: `ltd:principle:${slug}`,
        title: principle.title,
        description: description.slice(0, 300),
        content: content.slice(0, 5000),
        property: 'ltd',
        type: 'principle',
        path: `/masters/${principle.master_slug}#${slug}`, // Principles are on master pages
        concepts: [principle.master_name, principle.title],
        hash: hashContent(content),
        lastModified: principle.created_at?.toString() || new Date().toISOString(),
      });
    }
    
    console.log(`Fetched ${principles.results?.length || 0} LTD principles`);
  } catch (e) {
    console.log('Could not fetch LTD principles:', e);
  }

  return results;
}

// =============================================================================
// AGENCY CONTENT (.agency)
// =============================================================================

// Agency Manifest types
interface AgencyContentItem {
  slug: string;
  title: string;
  description: string;
  category?: string;
}

interface AgencyManifest {
  property: string;
  services: AgencyContentItem[];
  work: AgencyContentItem[];
  generated: string;
}

// Cache for the Agency manifest (refreshed each indexing run)
let cachedAgencyManifest: AgencyManifest | null = null;

/**
 * Fetch the content manifest from agency
 * Agency services are static data, work/case studies are markdown files
 */
async function fetchAgencyManifest(): Promise<AgencyManifest | null> {
  if (cachedAgencyManifest) {
    return cachedAgencyManifest;
  }

  try {
    const response = await fetch('https://createsomething.agency/api/manifest');
    if (!response.ok) {
      console.warn(`Failed to fetch Agency manifest: ${response.status}`);
      return null;
    }

    cachedAgencyManifest = await response.json();
    console.log(`Agency manifest loaded: ${cachedAgencyManifest!.services.length} services, ${cachedAgencyManifest!.work.length} case studies`);
    return cachedAgencyManifest;
  } catch (error) {
    console.error('Error fetching Agency manifest:', error);
    return null;
  }
}

/**
 * Clear the Agency manifest cache (call at start of indexing)
 */
export function clearAgencyManifestCache(): void {
  cachedAgencyManifest = null;
}

/**
 * Fetch Agency content from the manifest (NOT from D1)
 * 
 * Agency services are static TypeScript data.
 * Work/case studies are markdown files.
 * The manifest provides rich metadata for indexing.
 */
export async function fetchAgencyContent(_db: D1Database): Promise<IndexableContent[]> {
  const results: IndexableContent[] = [];
  const manifest = await fetchAgencyManifest();

  if (!manifest) {
    console.warn('Could not fetch Agency manifest - skipping Agency content');
    return results;
  }

  // Index services from manifest
  for (const service of manifest.services) {
    const content = `${service.title}. ${service.description}`;
    
    results.push({
      id: `agency:service:${service.slug}`,
      title: service.title,
      description: service.description,
      content,
      property: 'agency',
      type: 'service',
      path: `/services#${service.slug}`, // Services are on one page with anchors
      concepts: extractConceptsFromText(content),
      hash: hashContent(service.slug + service.title),
      lastModified: manifest.generated,
    });
  }

  // Index case studies from manifest
  for (const work of manifest.work) {
    const content = `${work.title}. ${work.description}`;
    
    results.push({
      id: `agency:case-study:${work.slug}`,
      title: work.title,
      description: work.description,
      content,
      property: 'agency',
      type: 'case-study',
      path: `/work/${work.slug}`,
      concepts: extractConceptsFromText(content),
      hash: hashContent(work.slug + work.title),
      lastModified: manifest.generated,
    });
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
