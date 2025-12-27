/**
 * @create-something/harness
 *
 * YAML Spec Parser: Parses structured YAML specs with JSON Schema validation.
 *
 * YAML specs provide unambiguous, machine-validatable specifications.
 * Schema: https://createsomething.ltd/schemas/harness-spec.json
 *
 * Example YAML spec:
 * ```yaml
 * title: User Authentication
 * property: agency
 * complexity: standard
 *
 * features:
 *   - title: Login endpoint
 *     priority: 1
 *     files:
 *       - src/routes/api/auth/login/+server.ts
 *     acceptance:
 *       - test: Returns JWT on valid credentials
 *         verify: pnpm test --filter=agency
 *       - User session created in KV
 *
 *   - title: Session middleware
 *     depends_on:
 *       - Login endpoint
 *     acceptance:
 *       - Validates JWT on protected routes
 * ```
 */

import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import type { Feature, ParsedSpec, DependencyGraph } from './types.js';

// JSON Schema for harness specs (runtime version without $schema to avoid Ajv meta-schema lookup)
// Full schema with $schema available at: https://createsomething.ltd/schemas/harness-spec.json
const SCHEMA = {
  "$id": "https://createsomething.ltd/schemas/harness-spec.json",
  "title": "CREATE SOMETHING Harness Spec",
  "type": "object",
  "required": ["title", "features"],
  "properties": {
    "title": { "type": "string", "minLength": 1 },
    "property": { "type": "string", "enum": ["space", "io", "agency", "ltd"] },
    "complexity": { "type": "string", "enum": ["trivial", "simple", "standard", "complex"] },
    "overview": { "type": "string" },
    "features": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/feature" }
    },
    "requirements": { "type": "array", "items": { "type": "string" } },
    "success": { "type": "array", "items": { "type": "string" } }
  },
  "$defs": {
    "feature": {
      "type": "object",
      "required": ["title"],
      "properties": {
        "title": { "type": "string", "minLength": 1 },
        "description": { "type": "string" },
        "complexity": { "type": "string", "enum": ["trivial", "simple", "standard", "complex"] },
        "priority": { "type": "integer", "enum": [0, 1, 2, 3, 4], "default": 2 },
        "files": { "type": "array", "items": { "type": "string" } },
        "depends_on": { "type": "array", "items": { "type": "string" } },
        "acceptance": {
          "type": "array",
          "items": {
            "oneOf": [
              { "type": "string" },
              {
                "type": "object",
                "required": ["test"],
                "properties": {
                  "test": { "type": "string" },
                  "verify": { "type": "string" }
                }
              }
            ]
          }
        },
        "labels": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
};

// Initialize Ajv validator
const ajv = new Ajv({ allErrors: true, verbose: true });
const validate = ajv.compile(SCHEMA);

/**
 * YAML spec structure (matches schema)
 */
interface YamlSpec {
  title: string;
  property?: 'space' | 'io' | 'agency' | 'ltd';
  complexity?: 'trivial' | 'simple' | 'standard' | 'complex';
  overview?: string;
  features: YamlFeature[];
  requirements?: string[];
  success?: string[];
}

interface YamlFeature {
  title: string;
  description?: string;
  complexity?: 'trivial' | 'simple' | 'standard' | 'complex';
  priority?: number;
  files?: string[];
  depends_on?: string[];
  acceptance?: (string | { test: string; verify?: string })[];
  labels?: string[];
}

/**
 * Validation error with clear messaging
 */
export class SpecValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'SpecValidationError';
  }

  format(): string {
    const lines = ['Spec validation failed:', ''];
    for (const err of this.errors) {
      lines.push(`  ${err.path}: ${err.message}`);
    }
    return lines.join('\n');
  }
}

/**
 * Parse a YAML spec file with validation.
 */
export function parseYamlSpec(yamlContent: string): ParsedSpec {
  // Parse YAML
  let spec: YamlSpec;
  try {
    spec = parseYaml(yamlContent) as YamlSpec;
  } catch (err) {
    throw new SpecValidationError('Invalid YAML syntax', [
      { path: '/', message: (err as Error).message }
    ]);
  }

  // Validate against schema
  const valid = validate(spec);
  if (!valid && validate.errors) {
    const errors = validate.errors.map(err => ({
      path: err.instancePath || '/',
      message: err.message || 'Unknown error'
    }));
    throw new SpecValidationError('Schema validation failed', errors);
  }

  // Convert to ParsedSpec format
  return convertToParsedSpec(spec);
}

/**
 * Convert YAML spec to internal ParsedSpec format.
 */
function convertToParsedSpec(spec: YamlSpec): ParsedSpec {
  // Build feature ID map (title -> id)
  const titleToId = new Map<string, string>();
  spec.features.forEach((f, i) => {
    const id = `feature-${i.toString().padStart(3, '0')}`;
    titleToId.set(f.title, id);
  });

  // Convert features
  const features: Feature[] = spec.features.map((f, i) => {
    const id = `feature-${i.toString().padStart(3, '0')}`;

    // Resolve depends_on titles to IDs
    const dependsOn: string[] = [];
    if (f.depends_on) {
      for (const depTitle of f.depends_on) {
        const depId = titleToId.get(depTitle);
        if (depId) {
          dependsOn.push(depId);
        } else {
          console.warn(`Warning: Unknown dependency "${depTitle}" in feature "${f.title}"`);
        }
      }
    }

    // Convert acceptance criteria
    const acceptanceCriteria: string[] = [];
    if (f.acceptance) {
      for (const criterion of f.acceptance) {
        if (typeof criterion === 'string') {
          acceptanceCriteria.push(criterion);
        } else {
          // Include verify command in criterion text
          const text = criterion.verify
            ? `${criterion.test} (verify: ${criterion.verify})`
            : criterion.test;
          acceptanceCriteria.push(text);
        }
      }
    }

    // Build labels
    const labels: string[] = [...(f.labels || [])];
    if (spec.property && !labels.includes(spec.property)) {
      labels.push(spec.property);
    }
    // Add complexity as label for model routing
    if (f.complexity) {
      labels.push(`complexity:${f.complexity}`);
    }
    labels.push(slugify(f.title));

    return {
      id,
      title: f.title,
      description: f.description || '',
      complexity: f.complexity,
      priority: f.priority ?? 2,
      dependsOn,
      blockedBy: [], // Will be populated by buildDependencyGraph
      isIndependent: dependsOn.length === 0,
      acceptanceCriteria,
      labels,
      files: f.files,
    };
  });

  // Build dependency graph
  const dependencyGraph = buildDependencyGraph(features);

  // Update blockedBy and isIndependent
  for (const feature of features) {
    feature.blockedBy = feature.dependsOn;
    feature.isIndependent = feature.dependsOn.length === 0;
  }

  // Collect independent features
  const independentFeatures = features.filter(f => f.isIndependent);

  return {
    title: spec.title,
    overview: spec.overview || '',
    features,
    independentFeatures,
    dependencyGraph,
    // Additional metadata from YAML
    property: spec.property,
    complexity: spec.complexity,
    requirements: spec.requirements,
    successCriteria: spec.success,
  };
}

/**
 * Build dependency graph (same logic as markdown parser)
 */
function buildDependencyGraph(features: Feature[]): DependencyGraph {
  const blocksMap = new Map<string, string[]>();
  const dependsOnMap = new Map<string, string[]>();

  for (const feature of features) {
    blocksMap.set(feature.id, []);
    dependsOnMap.set(feature.id, [...feature.dependsOn]);
  }

  for (const feature of features) {
    for (const depId of feature.dependsOn) {
      const blocks = blocksMap.get(depId) || [];
      blocks.push(feature.id);
      blocksMap.set(depId, blocks);
    }
  }

  const roots = features.filter(f => f.dependsOn.length === 0).map(f => f.id);
  const leaves = features.filter(f => {
    const blocks = blocksMap.get(f.id) || [];
    return blocks.length === 0;
  }).map(f => f.id);

  const maxDepth = calculateMaxDepth(features, blocksMap, roots);

  return { blocksMap, dependsOnMap, roots, leaves, maxDepth };
}

function calculateMaxDepth(
  features: Feature[],
  blocksMap: Map<string, string[]>,
  roots: string[]
): number {
  if (roots.length === 0 || features.length === 0) return 0;

  const depths = new Map<string, number>();
  for (const feature of features) {
    depths.set(feature.id, 0);
  }

  const queue = [...roots];
  for (const root of roots) {
    depths.set(root, 1);
  }

  let maxDepth = 1;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current) || 1;

    const dependents = blocksMap.get(current) || [];
    for (const depId of dependents) {
      const newDepth = currentDepth + 1;
      const existingDepth = depths.get(depId) || 0;

      if (newDepth > existingDepth) {
        depths.set(depId, newDepth);
        maxDepth = Math.max(maxDepth, newDepth);
        queue.push(depId);
      }
    }
  }

  return maxDepth;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Detect if content is YAML or Markdown
 */
export function isYamlSpec(content: string): boolean {
  const trimmed = content.trim();
  // YAML specs start with 'title:' or a YAML document marker
  return trimmed.startsWith('title:') ||
         trimmed.startsWith('---') ||
         trimmed.startsWith('# yaml');
}

/**
 * Generate example YAML spec from Markdown spec
 */
export function generateYamlFromMarkdown(markdownSpec: ParsedSpec): string {
  const lines: string[] = [];

  lines.push(`title: ${markdownSpec.title}`);
  if (markdownSpec.property) {
    lines.push(`property: ${markdownSpec.property}`);
  }
  lines.push('');

  if (markdownSpec.overview) {
    lines.push(`overview: |`);
    for (const line of markdownSpec.overview.split('\n')) {
      lines.push(`  ${line}`);
    }
    lines.push('');
  }

  lines.push('features:');
  for (const feature of markdownSpec.features) {
    lines.push(`  - title: ${feature.title}`);
    if (feature.priority !== 2) {
      lines.push(`    priority: ${feature.priority}`);
    }
    if (feature.description) {
      lines.push(`    description: ${feature.description}`);
    }
    if (feature.dependsOn.length > 0) {
      lines.push('    depends_on:');
      for (const dep of feature.dependsOn) {
        // Find the title for this ID
        const depFeature = markdownSpec.features.find(f => f.id === dep);
        if (depFeature) {
          lines.push(`      - ${depFeature.title}`);
        }
      }
    }
    if (feature.acceptanceCriteria.length > 0) {
      lines.push('    acceptance:');
      for (const criterion of feature.acceptanceCriteria) {
        lines.push(`      - ${criterion}`);
      }
    }
  }

  return lines.join('\n');
}
