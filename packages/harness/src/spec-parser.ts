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
 * Simple heuristic: features in the same category depend on earlier ones.
 */
function inferDependencies(features: Feature[]): void {
  const categoryFirstFeature: Record<string, string> = {};

  for (const feature of features) {
    const category = feature.labels[0];
    if (!category) continue;

    if (categoryFirstFeature[category]) {
      // Later features in a category depend on the first one
      // (Only add if not already the first)
      if (feature.id !== categoryFirstFeature[category]) {
        feature.dependsOn.push(categoryFirstFeature[category]);
      }
    } else {
      // This is the first feature in the category
      categoryFirstFeature[category] = feature.id;
    }
  }
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
