/**
 * Concept Extractor
 *
 * Extracts philosophical concepts from markdown content using regex patterns.
 * Creates concept edges between nodes that share significant concept overlap.
 */

import { readFileSync } from 'fs';
import type { ConceptMention, ConceptDefinition, GraphEdge, GraphNode } from '../types.js';

/**
 * Canonical concept definitions for CREATE SOMETHING
 * Based on the philosophical foundation in .ltd and recurring patterns
 */
export const CANONICAL_CONCEPTS: ConceptDefinition[] = [
  {
    term: 'Subtractive Triad',
    aliases: ['subtractive triad', 'the triad', 'DRY-Rams-Heidegger'],
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
    aliases: ['hermeneutic circle', 'hermeneutics', 'hermeneutic'],
  },
  {
    term: 'Zero Framework Cognition',
    aliases: ['zero framework cognition', 'ZFC', 'framework freedom'],
  },
  {
    term: 'Canon',
    aliases: ['canon', 'design canon', 'css canon'],
  },
  {
    term: 'Beads',
    aliases: ['beads', 'beads-cli', 'bd', 'agent-native task management'],
  },
  {
    term: 'Weniger, aber besser',
    aliases: ['weniger, aber besser', 'weniger aber besser', 'less but better'],
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
];

/**
 * Build regex patterns for each concept
 * Word boundaries ensure we match whole words/phrases
 */
function buildConceptPatterns(
  concepts: ConceptDefinition[]
): Map<string, RegExp[]> {
  const patterns = new Map<string, RegExp[]>();

  for (const concept of concepts) {
    const termPatterns: RegExp[] = [];

    // Add pattern for canonical term
    termPatterns.push(
      new RegExp(`\\b${escapeRegex(concept.term)}\\b`, 'gi')
    );

    // Add patterns for aliases
    for (const alias of concept.aliases) {
      termPatterns.push(
        new RegExp(`\\b${escapeRegex(alias)}\\b`, 'gi')
      );
    }

    patterns.set(concept.term, termPatterns);
  }

  return patterns;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract concept mentions from content
 */
export function extractConcepts(
  content: string,
  concepts: ConceptDefinition[] = CANONICAL_CONCEPTS
): ConceptMention[] {
  const patterns = buildConceptPatterns(concepts);
  const mentions: ConceptMention[] = [];

  for (const [term, regexList] of patterns.entries()) {
    let totalCount = 0;

    for (const regex of regexList) {
      const matches = content.match(regex);
      if (matches) {
        totalCount += matches.length;
      }
    }

    if (totalCount > 0) {
      mentions.push({
        concept: term,
        count: totalCount,
      });
    }
  }

  return mentions;
}

/**
 * Add concepts to nodes (mutates nodes in place)
 */
export function enrichNodesWithConcepts(
  nodes: GraphNode[],
  concepts: ConceptDefinition[] = CANONICAL_CONCEPTS
): void {
  for (const node of nodes) {
    try {
      const content = readFileSync(node.absolutePath, 'utf-8');
      const mentions = extractConcepts(content, concepts);

      // Store concept names in node
      node.concepts = mentions.map(m => m.concept);
    } catch (error) {
      console.warn(`Warning: Could not extract concepts from ${node.id}: ${error}`);
      node.concepts = [];
    }
  }
}

/**
 * Create concept edges between nodes that share concepts
 * Weight is based on number of shared concepts
 */
export function createConceptEdges(
  nodes: GraphNode[],
  minSharedConcepts: number = 2
): GraphEdge[] {
  const edges: GraphEdge[] = [];

  // Build concept index: concept -> nodes that mention it
  const conceptIndex = new Map<string, GraphNode[]>();

  for (const node of nodes) {
    for (const concept of node.concepts) {
      if (!conceptIndex.has(concept)) {
        conceptIndex.set(concept, []);
      }
      conceptIndex.get(concept)!.push(node);
    }
  }

  // For each pair of nodes, check for shared concepts
  const processed = new Set<string>();

  for (const [concept, nodesWithConcept] of conceptIndex.entries()) {
    // Create edges between all nodes that share this concept
    for (let i = 0; i < nodesWithConcept.length; i++) {
      for (let j = i + 1; j < nodesWithConcept.length; j++) {
        const nodeA = nodesWithConcept[i];
        const nodeB = nodesWithConcept[j];

        // Create unique edge ID to avoid duplicates
        const edgeId = [nodeA.id, nodeB.id].sort().join('→');

        if (!processed.has(edgeId)) {
          const sharedConcepts = nodeA.concepts.filter(c =>
            nodeB.concepts.includes(c)
          );

          if (sharedConcepts.length >= minSharedConcepts) {
            // Weight based on number of shared concepts (normalized)
            const weight = Math.min(sharedConcepts.length / 5, 1.0);

            edges.push({
              source: nodeA.id,
              target: nodeB.id,
              type: 'concept',
              weight,
              metadata: {
                concept: sharedConcepts.join(', '),
              },
            });

            processed.add(edgeId);
          }
        }
      }
    }
  }

  return edges;
}
