/**
 * Concept Enrichment
 *
 * Extracts canonical concepts from content for faceted search.
 * Canon: Concepts are the threads that weave properties together.
 */

import type { IndexableContent } from '../types';

// =============================================================================
// CANONICAL CONCEPTS
// =============================================================================

interface ConceptDefinition {
  term: string;
  aliases: string[];
}

/**
 * Canonical concepts for CREATE SOMETHING
 * Aligned with .ltd design canon
 */
export const CANONICAL_CONCEPTS: ConceptDefinition[] = [
  {
    term: 'Subtractive Triad',
    aliases: ['subtractive triad', 'the triad', 'DRY-Rams-Heidegger', 'less but better'],
  },
  {
    term: 'Zuhandenheit',
    aliases: ['zuhandenheit', 'ready-to-hand', 'ready to hand', 'readiness-to-hand'],
  },
  {
    term: 'Vorhandenheit',
    aliases: ['vorhandenheit', 'present-at-hand', 'present at hand'],
  },
  {
    term: 'Hermeneutic Circle',
    aliases: ['hermeneutic circle', 'hermeneutics', 'hermeneutic spiral'],
  },
  {
    term: 'Canon',
    aliases: ['design canon', 'css canon', 'canonical'],
  },
  {
    term: 'Weniger, aber besser',
    aliases: ['weniger, aber besser', 'weniger aber besser', 'less, but better'],
  },
  {
    term: 'Gestell',
    aliases: ['gestell', 'enframing', 'technological enframing'],
  },
  {
    term: 'Gelassenheit',
    aliases: ['gelassenheit', 'releasement', 'letting-be'],
  },
  {
    term: 'Dwelling',
    aliases: ['dwelling', 'heideggerian dwelling', 'bauen wohnen denken'],
  },
  {
    term: 'Complementarity',
    aliases: ['complementarity', 'complementarity principle', 'tool recedes'],
  },
  {
    term: 'Dieter Rams',
    aliases: ['rams', 'dieter rams', 'braun design', '10 principles'],
  },
  {
    term: 'Martin Heidegger',
    aliases: ['heidegger', 'martin heidegger', 'heideggerian'],
  },
  {
    term: 'Edward Tufte',
    aliases: ['tufte', 'edward tufte', 'data-ink ratio', 'chartjunk'],
  },
  {
    term: 'Cloudflare Workers',
    aliases: ['workers', 'cloudflare workers', 'edge computing', 'serverless'],
  },
  {
    term: 'D1 Database',
    aliases: ['d1', 'd1 database', 'sqlite', 'edge database'],
  },
  {
    term: 'SvelteKit',
    aliases: ['sveltekit', 'svelte', 'svelte 5', 'runes'],
  },
  {
    term: 'AI Native',
    aliases: ['ai native', 'ai-native', 'llm', 'language model', 'claude'],
  },
  {
    term: 'Component Library',
    aliases: ['component library', 'components', 'design system'],
  },
  {
    term: 'Templates',
    aliases: ['templates', 'webflow templates', 'template platform'],
  },
  {
    term: 'Motion Design',
    aliases: ['motion', 'animation', 'transitions', 'motion design'],
  },
];

// =============================================================================
// CONCEPT EXTRACTION
// =============================================================================

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build regex patterns for each concept
 */
function buildConceptPatterns(): Map<string, RegExp[]> {
  const patterns = new Map<string, RegExp[]>();

  for (const concept of CANONICAL_CONCEPTS) {
    const termPatterns: RegExp[] = [];

    // Add pattern for canonical term
    termPatterns.push(new RegExp(`\\b${escapeRegex(concept.term)}\\b`, 'gi'));

    // Add patterns for aliases
    for (const alias of concept.aliases) {
      termPatterns.push(new RegExp(`\\b${escapeRegex(alias)}\\b`, 'gi'));
    }

    patterns.set(concept.term, termPatterns);
  }

  return patterns;
}

const CONCEPT_PATTERNS = buildConceptPatterns();

/**
 * Extract concepts from content
 */
export function extractConcepts(content: string): string[] {
  const concepts: string[] = [];

  for (const [term, regexList] of CONCEPT_PATTERNS.entries()) {
    for (const regex of regexList) {
      if (regex.test(content)) {
        concepts.push(term);
        break; // Only count each concept once
      }
    }
  }

  return concepts;
}

/**
 * Enrich content items with concepts (mutates in place)
 */
export function enrichWithConcepts(items: IndexableContent[]): void {
  for (const item of items) {
    const searchText = `${item.title} ${item.description} ${item.content}`;
    item.concepts = extractConcepts(searchText);
  }
}
