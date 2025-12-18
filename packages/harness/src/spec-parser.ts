/**
 * @create-something/harness
 *
 * Spec Parser: Converts markdown PRD documents into structured features.
 *
 * Expected format:
 * ```markdown
 * # Project Title
 *
 * ## Overview
 * Description of the project...
 *
 * ## Features
 *
 * ### Feature Category
 * - Feature 1 description
 * - Feature 2 description
 *   - Acceptance criteria item
 * ```
 */

import type { Feature, ParsedSpec } from './types.js';

/**
 * Parse a markdown PRD spec into structured features.
 */
export function parseSpec(markdown: string): ParsedSpec {
  const lines = markdown.split('\n');

  let title = '';
  let overview = '';
  const features: Feature[] = [];

  let currentSection: 'title' | 'overview' | 'features' | 'other' = 'title';
  let currentCategory = '';
  let currentFeature: Partial<Feature> | null = null;
  let overviewLines: string[] = [];
  let featureId = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // H1: Project title
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      title = trimmed.slice(2).trim();
      currentSection = 'title';
      continue;
    }

    // H2: Section headers
    if (trimmed.startsWith('## ')) {
      const sectionName = trimmed.slice(3).trim().toLowerCase();

      // Save any pending feature
      if (currentFeature && currentFeature.title) {
        features.push(finalizeFeature(currentFeature, featureId++));
        currentFeature = null;
      }

      if (sectionName === 'overview' || sectionName === 'description') {
        currentSection = 'overview';
        overviewLines = [];
      } else if (sectionName === 'features' || sectionName.includes('feature')) {
        currentSection = 'features';
      } else {
        currentSection = 'other';
      }
      continue;
    }

    // H3: Feature categories (within Features section)
    if (trimmed.startsWith('### ') && currentSection === 'features') {
      // Save any pending feature
      if (currentFeature && currentFeature.title) {
        features.push(finalizeFeature(currentFeature, featureId++));
        currentFeature = null;
      }

      currentCategory = trimmed.slice(4).trim();
      continue;
    }

    // Collect overview content
    if (currentSection === 'overview') {
      overviewLines.push(trimmed);
      continue;
    }

    // Parse feature items (bullet points in Features section)
    if (currentSection === 'features' && trimmed.startsWith('- ')) {
      const isSubItem = line.startsWith('  ') || line.startsWith('\t');

      if (isSubItem && currentFeature) {
        // Sub-item: Add as acceptance criteria
        const criterion = trimmed.slice(2).trim();
        if (criterion) {
          currentFeature.acceptanceCriteria = currentFeature.acceptanceCriteria || [];
          currentFeature.acceptanceCriteria.push(criterion);
        }
      } else {
        // Top-level item: New feature
        if (currentFeature && currentFeature.title) {
          features.push(finalizeFeature(currentFeature, featureId++));
        }

        const featureTitle = trimmed.slice(2).trim();
        currentFeature = {
          title: featureTitle,
          description: '',
          labels: currentCategory ? [slugify(currentCategory)] : [],
          acceptanceCriteria: [],
          dependsOn: [],
        };
      }
      continue;
    }

    // Plain text after a feature title becomes its description
    if (currentSection === 'features' && currentFeature && trimmed && !trimmed.startsWith('-')) {
      if (!currentFeature.description) {
        currentFeature.description = trimmed;
      } else {
        currentFeature.description += ' ' + trimmed;
      }
    }
  }

  // Save final pending feature
  if (currentFeature && currentFeature.title) {
    features.push(finalizeFeature(currentFeature, featureId++));
  }

  // Clean up overview
  overview = overviewLines
    .join('\n')
    .trim()
    .replace(/\n{3,}/g, '\n\n');

  // Infer dependencies from feature order and categories
  inferDependencies(features);

  return { title, overview, features };
}

/**
 * Finalize a partial feature into a complete Feature object.
 */
function finalizeFeature(partial: Partial<Feature>, index: number): Feature {
  return {
    id: `feature-${index.toString().padStart(3, '0')}`,
    title: partial.title || 'Untitled Feature',
    description: partial.description || '',
    priority: inferPriority(partial.title || '', index),
    dependsOn: partial.dependsOn || [],
    acceptanceCriteria: partial.acceptanceCriteria || [],
    labels: partial.labels || [],
  };
}

/**
 * Infer priority from keywords in title or position.
 * Earlier features get higher priority (lower number).
 */
function inferPriority(title: string, index: number): number {
  const lowerTitle = title.toLowerCase();

  // P0 keywords
  if (lowerTitle.includes('critical') || lowerTitle.includes('urgent') || lowerTitle.includes('blocker')) {
    return 0;
  }

  // P1 keywords
  if (lowerTitle.includes('important') || lowerTitle.includes('core') || lowerTitle.includes('essential')) {
    return 1;
  }

  // P3 keywords
  if (lowerTitle.includes('nice to have') || lowerTitle.includes('optional') || lowerTitle.includes('future')) {
    return 3;
  }

  // Default: P2 for first 10, P2-P3 based on position
  if (index < 10) return 2;
  if (index < 20) return 2;
  return 3;
}

/**
 * Infer dependencies between features.
 * Multi-level heuristic:
 * 1. Category-based: features in the same category may depend on earlier ones
 * 2. Content-based: analyze text for dependency keywords
 * 3. Sequential-based: numbered phases/steps imply order
 */
function inferDependencies(features: Feature[]): void {
  // Build title lookup for reference matching
  const titleToId = new Map<string, string>();
  for (const feature of features) {
    // Index by full title (normalized)
    titleToId.set(normalizeTitle(feature.title), feature.id);
    // Index by significant words
    for (const word of extractSignificantWords(feature.title)) {
      titleToId.set(word, feature.id);
    }
  }

  // Track first feature in each category
  const categoryFirstFeature: Record<string, string> = {};

  for (const feature of features) {
    // 1. Category-based dependencies
    const category = feature.labels[0];
    if (category) {
      if (categoryFirstFeature[category]) {
        if (feature.id !== categoryFirstFeature[category]) {
          addUniqueDependency(feature, categoryFirstFeature[category]);
        }
      } else {
        categoryFirstFeature[category] = feature.id;
      }
    }

    // 2. Content-based dependency detection
    const contentDeps = extractContentDependencies(feature, titleToId);
    for (const depId of contentDeps) {
      if (depId !== feature.id) {
        addUniqueDependency(feature, depId);
      }
    }

    // 3. Sequential naming detection (Phase 1, Step 2, etc.)
    const sequentialDeps = extractSequentialDependencies(feature, features);
    for (const depId of sequentialDeps) {
      if (depId !== feature.id) {
        addUniqueDependency(feature, depId);
      }
    }
  }
}

/**
 * Normalize a title for matching.
 */
function normalizeTitle(title: string): string {
  return title.toLowerCase().trim();
}

/**
 * Extract significant words from a title (3+ chars, not common words).
 */
function extractSignificantWords(title: string): string[] {
  const commonWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'will', 'can',
    'add', 'new', 'use', 'get', 'set', 'all', 'any'
  ]);

  return title
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word));
}

/**
 * Add a dependency if not already present.
 */
function addUniqueDependency(feature: Feature, depId: string): void {
  if (!feature.dependsOn.includes(depId)) {
    feature.dependsOn.push(depId);
  }
}

/**
 * Dependency keywords and their patterns.
 */
const DEPENDENCY_KEYWORDS = [
  { pattern: /requires?\s+["']?([^"'\n,]+)["']?/gi, type: 'requires' },
  { pattern: /depends?\s+on\s+["']?([^"'\n,]+)["']?/gi, type: 'depends' },
  { pattern: /after\s+["']?([^"'\n,]+)["']?/gi, type: 'after' },
  { pattern: /following\s+["']?([^"'\n,]+)["']?/gi, type: 'following' },
  { pattern: /once\s+["']?([^"'\n,]+)["']?\s+is\s+(complete|done|ready)/gi, type: 'once' },
];

/**
 * Extract dependencies from feature content based on keywords.
 */
function extractContentDependencies(
  feature: Feature,
  titleToId: Map<string, string>
): string[] {
  const text = `${feature.title} ${feature.description}`.toLowerCase();
  const dependencies: string[] = [];

  for (const { pattern } of DEPENDENCY_KEYWORDS) {
    let match;
    // Reset regex state
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const reference = match[1].trim().toLowerCase();

      // Try to match against known titles/words
      const matchedId = titleToId.get(reference);
      if (matchedId && !dependencies.includes(matchedId)) {
        dependencies.push(matchedId);
        continue;
      }

      // Try fuzzy matching against title parts
      for (const [key, id] of titleToId) {
        if (reference.includes(key) || key.includes(reference)) {
          if (!dependencies.includes(id)) {
            dependencies.push(id);
            break;
          }
        }
      }
    }
  }

  return dependencies;
}

/**
 * Sequential naming patterns.
 */
const SEQUENTIAL_PATTERNS = [
  /^(part|phase|step|stage)\s*(\d+)/i,
  /^(\d+)\.\s/,
  /\b(first|second|third|fourth|fifth)\b/i,
];

const ORDINAL_MAP: Record<string, number> = {
  'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5
};

/**
 * Extract dependencies based on sequential naming.
 */
function extractSequentialDependencies(
  feature: Feature,
  allFeatures: Feature[]
): string[] {
  const dependencies: string[] = [];
  const titleLower = feature.title.toLowerCase();

  for (const pattern of SEQUENTIAL_PATTERNS) {
    const match = titleLower.match(pattern);
    if (!match) continue;

    let prefix: string;
    let currentNum: number;

    if (match[1] && ORDINAL_MAP[match[1]]) {
      // Ordinal match (first, second, etc.)
      prefix = '';
      currentNum = ORDINAL_MAP[match[1]];
    } else if (match[2]) {
      // Numbered match (Part 1, Phase 2, etc.)
      prefix = match[1]?.toLowerCase() || '';
      currentNum = parseInt(match[2], 10);
    } else if (match[1] && !isNaN(parseInt(match[1], 10))) {
      // Pure number prefix (1. Task, 2. Task)
      prefix = '';
      currentNum = parseInt(match[1], 10);
    } else {
      continue;
    }

    // Look for previous numbered feature
    for (const prevFeature of allFeatures) {
      if (prevFeature.id === feature.id) continue;

      const prevTitleLower = prevFeature.title.toLowerCase();
      let prevNum: number | null = null;

      for (const prevPattern of SEQUENTIAL_PATTERNS) {
        const prevMatch = prevTitleLower.match(prevPattern);
        if (!prevMatch) continue;

        if (prevMatch[1] && ORDINAL_MAP[prevMatch[1]]) {
          prevNum = ORDINAL_MAP[prevMatch[1]];
        } else if (prevMatch[2]) {
          const prevPrefix = prevMatch[1]?.toLowerCase() || '';
          if (prefix === prevPrefix) {
            prevNum = parseInt(prevMatch[2], 10);
          }
        } else if (prevMatch[1] && !isNaN(parseInt(prevMatch[1], 10))) {
          prevNum = parseInt(prevMatch[1], 10);
        }

        if (prevNum !== null) break;
      }

      if (prevNum !== null && prevNum === currentNum - 1) {
        if (!dependencies.includes(prevFeature.id)) {
          dependencies.push(prevFeature.id);
        }
      }
    }
  }

  return dependencies;
}

/**
 * Convert a string to a URL-safe slug.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Format a parsed spec as a summary string.
 */
export function formatSpecSummary(spec: ParsedSpec): string {
  const lines: string[] = [];

  lines.push(`# ${spec.title}`);
  lines.push('');

  if (spec.overview) {
    lines.push(`## Overview`);
    lines.push(spec.overview);
    lines.push('');
  }

  lines.push(`## Features (${spec.features.length} total)`);
  lines.push('');

  // Group by category
  const byCategory: Record<string, Feature[]> = {};
  for (const feature of spec.features) {
    const category = feature.labels[0] || 'uncategorized';
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(feature);
  }

  for (const [category, categoryFeatures] of Object.entries(byCategory)) {
    lines.push(`### ${category} (${categoryFeatures.length})`);
    for (const feature of categoryFeatures) {
      const deps = feature.dependsOn.length > 0 ? ` (depends: ${feature.dependsOn.join(', ')})` : '';
      lines.push(`- P${feature.priority}: ${feature.title}${deps}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
