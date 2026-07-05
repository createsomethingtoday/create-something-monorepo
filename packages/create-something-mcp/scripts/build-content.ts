#!/usr/bin/env tsx
/**
 * Build Content — Collects content from across CREATE SOMETHING properties
 * and generates TypeScript modules for embedding in the MCP server.
 *
 * Sources:
 *   packages/io/content/papers/*.md               → papers
 *   packages/ltd/src/lib/content/canon/**         → canon pages
 *   packages/ltd/src/lib/content/patterns/*.md    → design patterns
 *   .graph/ (fallback: packages/io/static/.graph) → knowledge graph
 *   property package markdown files                → property documents
 *
 * Run: tsx scripts/build-content.ts
 */

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const OUT_DIR = join(import.meta.dirname, '..', 'src', 'content', 'generated');

const IGNORED_DIRECTORY_NAMES = new Set([
  'node_modules',
  '.svelte-kit',
  '.wrangler',
  '.git',
  '.cache',
  '.vite',
  '.mf',
  'dist',
  'build',
  'coverage',
]);

type PropertyKey = 'io' | 'ltd' | 'space' | 'agency';

interface PropertyScanConfig {
  property: PropertyKey;
  root: string;
  excludePrefixes: string[];
}

const PROPERTY_SCAN_CONFIG: PropertyScanConfig[] = [
  {
    property: 'io',
    root: join(ROOT, 'packages', 'io'),
    excludePrefixes: ['content/papers/'],
  },
  {
    property: 'ltd',
    root: join(ROOT, 'packages', 'ltd'),
    excludePrefixes: ['src/lib/content/canon/', 'src/lib/content/patterns/'],
  },
  {
    property: 'space',
    root: join(ROOT, 'packages', 'space'),
    excludePrefixes: [],
  },
  {
    property: 'agency',
    root: join(ROOT, 'packages', 'agency'),
    excludePrefixes: [],
  },
];

// ============================================================================
// Simple frontmatter parser (no dependencies)
// ============================================================================

interface Frontmatter {
  data: Record<string, string>;
  body: string;
}

function parseFrontmatter(content: string): Frontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: content };

  const data: Record<string, string> = {};
  let currentKey = '';
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && !line.startsWith(' ') && !line.startsWith('\t')) {
      currentKey = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      data[currentKey] = value.replace(/^["']|["']$/g, '');
    } else if (currentKey && (line.startsWith(' ') || line.startsWith('\t'))) {
      // Continuation of multiline value
      data[currentKey] += ' ' + line.trim();
    }
  }
  return { data, body: match[2].trim() };
}

// ============================================================================
// File traversal helpers
// ============================================================================

interface MarkdownFile {
  relativePath: string;
  frontmatter: Record<string, string>;
  content: string;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function isMarkdownFile(fileName: string): boolean {
  return fileName.endsWith('.md') && !fileName.endsWith('.draft') && !fileName.includes('.md.draft');
}

async function readMarkdownFiles(dir: string): Promise<{ slug: string; frontmatter: Record<string, string>; content: string }[]> {
  const results: { slug: string; frontmatter: Record<string, string>; content: string }[] = [];
  try {
    const entries = await readdir(dir);
    for (const entry of entries) {
      if (!isMarkdownFile(entry)) continue;
      const filePath = join(dir, entry);
      const raw = await readFile(filePath, 'utf-8');
      const { data, body } = parseFrontmatter(raw);
      results.push({
        slug: basename(entry, '.md'),
        frontmatter: data,
        content: body
      });
    }
  } catch (e) {
    console.error(`Warning: Could not read directory ${dir}:`, (e as Error).message);
  }
  return results;
}

async function readMarkdownFilesRecursive(dir: string, section = ''): Promise<{ slug: string; section: string; frontmatter: Record<string, string>; content: string }[]> {
  const results: { slug: string; section: string; frontmatter: Record<string, string>; content: string }[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = await readMarkdownFilesRecursive(fullPath, entry.name);
        results.push(...sub);
      } else if (isMarkdownFile(entry.name)) {
        const raw = await readFile(fullPath, 'utf-8');
        const { data, body } = parseFrontmatter(raw);
        results.push({
          slug: section ? `${section}/${basename(entry.name, '.md')}` : basename(entry.name, '.md'),
          section: section || 'root',
          frontmatter: data,
          content: body
        });
      }
    }
  } catch (e) {
    console.error(`Warning: Could not read directory ${dir}:`, (e as Error).message);
  }
  return results;
}

async function collectMarkdownFilesRecursive(
  root: string,
  excludePrefixes: string[]
): Promise<MarkdownFile[]> {
  const results: MarkdownFile[] = [];

  const normalizedPrefixes = excludePrefixes
    .map(prefix => normalizePath(prefix).replace(/^\/+/, ''))
    .map(prefix => prefix.endsWith('/') ? prefix : `${prefix}/`);

  const isExcluded = (relativePath: string) => {
    const normalizedPath = normalizePath(relativePath).replace(/^\/+/, '');
    return normalizedPrefixes.some(prefix => normalizedPath.startsWith(prefix));
  };

  const walk = async (directory: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      console.error(`Warning: Could not read directory ${directory}:`, (error as Error).message);
      return;
    }

    for (const entry of entries) {
      const fullPath = join(directory, entry.name);
      const relPath = normalizePath(relative(root, fullPath));

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
          continue;
        }
        await walk(fullPath);
        continue;
      }

      if (!isMarkdownFile(entry.name)) continue;
      if (isExcluded(relPath)) continue;

      const raw = await readFile(fullPath, 'utf-8');
      const { data, body } = parseFrontmatter(raw);
      results.push({
        relativePath: relPath,
        frontmatter: data,
        content: body
      });
    }
  };

  await walk(root);
  results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return results;
}

// ============================================================================
// Escape helper for template literals in generated code
// ============================================================================

function escapeForTemplate(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

// ============================================================================
// Build papers
// ============================================================================

async function buildPapers(): Promise<string> {
  const papersDir = join(ROOT, 'packages', 'io', 'content', 'papers');
  const files = await readMarkdownFiles(papersDir);

  const entries = files.map(f => {
    const fm = f.frontmatter;
    return `  {
    slug: ${JSON.stringify(f.slug)},
    title: ${JSON.stringify(fm.title || f.slug)},
    subtitle: ${JSON.stringify(fm.subtitle || '')},
    description: ${JSON.stringify(fm.abstract || fm.subtitle || '')},
    category: ${JSON.stringify(fm.category || 'research')},
    date: ${JSON.stringify(fm.publishedAt || '')},
    readingTime: ${parseInt(fm.readingTime || '0') || undefined},
    difficulty: ${JSON.stringify(fm.difficulty || 'intermediate')},
    keywords: ${JSON.stringify(parseKeywords(fm.keywords))},
    content: \`${escapeForTemplate(f.content)}\`
  }`;
  });

  return `/**
 * Generated papers content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/io/content/papers/
 */

import type { Paper } from '../types.js';

export const PAPERS: Paper[] = [
${entries.join(',\n')}
];
`;
}

function parseKeywords(raw?: string): string[] {
  if (!raw) return [];
  // Handle YAML array format: [a, b, c] or just comma-separated
  const cleaned = raw.replace(/^\[|\]$/g, '').trim();
  if (!cleaned) return [];
  return cleaned.split(',').map(k => k.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

// ============================================================================
// Build canon pages
// ============================================================================

async function buildCanon(): Promise<string> {
  const canonDir = join(ROOT, 'packages', 'ltd', 'src', 'lib', 'content', 'canon');
  const files = await readMarkdownFilesRecursive(canonDir);

  const entries = files.map(f => {
    const fm = f.frontmatter;
    return `  {
    slug: ${JSON.stringify(f.slug)},
    section: ${JSON.stringify(f.section)},
    title: ${JSON.stringify(fm.title || f.slug)},
    description: ${JSON.stringify(fm.description || fm.lead || '')},
    content: \`${escapeForTemplate(f.content)}\`
  }`;
  });

  return `/**
 * Generated Canon design system content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/ltd/src/lib/content/canon/
 */

import type { CanonPage } from '../types.js';

export const CANON_PAGES: CanonPage[] = [
${entries.join(',\n')}
];
`;
}

// ============================================================================
// Build Canon registry snapshot
// ============================================================================

async function buildCanonRegistry(): Promise<string> {
  const registryModuleUrl = pathToFileURL(
    join(ROOT, 'packages', 'canon', 'src', 'lib', 'registry', 'index.ts')
  ).href;
  const registry = await import(registryModuleUrl) as {
    getCanonRegistryManifest: () => unknown;
  };
  const manifest = registry.getCanonRegistryManifest();

  return `/**
 * Generated Canon registry content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/registry/
 */

import type { CanonRegistryManifest } from '../types.js';

export const CANON_REGISTRY_MANIFEST: CanonRegistryManifest = ${JSON.stringify(manifest, null, 2)};
`;
}

async function buildCanonPublicExportClassification(): Promise<string> {
  const registryModuleUrl = pathToFileURL(
    join(ROOT, 'packages', 'canon', 'src', 'lib', 'registry', 'index.ts')
  ).href;
  const registry = await import(registryModuleUrl) as {
    CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES: unknown[];
  };
  const rules = registry.CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES;

  return `/**
 * Generated Canon public export classification content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/registry/public-export-classification.ts
 */

import type { CanonPublicExportClassificationRule } from '../types.js';

export const CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES: CanonPublicExportClassificationRule[] = ${JSON.stringify(rules, null, 2)};
`;
}

async function buildCanonOverlayCatalog(): Promise<string> {
  const overlaysModuleUrl = pathToFileURL(
    join(ROOT, 'packages', 'canon', 'src', 'lib', 'overlays', 'index.ts')
  ).href;
  const overlays = await import(overlaysModuleUrl) as {
    getCanonOverlayCatalog: () => unknown;
  };
  const catalog = overlays.getCanonOverlayCatalog();

  return `/**
 * Generated Canon overlay catalog content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/overlays/
 */

import type { CanonOverlayCatalog } from '../types.js';

export const CANON_OVERLAY_CATALOG: CanonOverlayCatalog = ${JSON.stringify(catalog, null, 2)};
`;
}

async function buildCanonOverlayIntakeInventory(): Promise<string> {
  const intakeModuleUrl = pathToFileURL(
    join(ROOT, 'packages', 'canon', 'src', 'lib', 'overlays', 'intake.ts')
  ).href;
  const intake = await import(intakeModuleUrl) as {
    buildCanonOverlayIntakeInventory: (options: { rootDir: string; rootLabel?: string }) => Promise<unknown>;
  };
  const inventory = await intake.buildCanonOverlayIntakeInventory({
    rootDir: ROOT,
    rootLabel: '<repo-root>'
  });

  return `/**
 * Generated Canon overlay intake inventory content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/overlays/intake.ts
 */

import type { CanonProjectOverlayInventory } from '../types.js';

export const CANON_OVERLAY_INTAKE_INVENTORY: CanonProjectOverlayInventory = ${JSON.stringify(inventory, null, 2)};
`;
}

async function buildCanonOverlayCandidateQueue(): Promise<string> {
  const intakeModuleUrl = pathToFileURL(
    join(ROOT, 'packages', 'canon', 'src', 'lib', 'overlays', 'intake.ts')
  ).href;
  const intake = await import(intakeModuleUrl) as {
    buildCanonOverlayIntakeInventory: (options: { rootDir: string; rootLabel?: string }) => Promise<unknown>;
    buildCanonOverlayCandidateQueue: (inventory: unknown) => unknown;
  };
  const inventory = await intake.buildCanonOverlayIntakeInventory({
    rootDir: ROOT,
    rootLabel: '<repo-root>'
  });
  const queue = intake.buildCanonOverlayCandidateQueue(inventory);

  return `/**
 * Generated Canon overlay candidate queue content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/overlays/intake.ts
 */

import type { CanonOverlayCandidateQueue } from '../types.js';

export const CANON_OVERLAY_CANDIDATE_QUEUE: CanonOverlayCandidateQueue = ${JSON.stringify(queue, null, 2)};
`;
}

async function buildCanonOverlayCandidateReviewPackets(): Promise<string> {
  const intakeModuleUrl = pathToFileURL(
    join(ROOT, 'packages', 'canon', 'src', 'lib', 'overlays', 'intake.ts')
  ).href;
  const intake = await import(intakeModuleUrl) as {
    buildCanonOverlayIntakeInventory: (options: { rootDir: string; rootLabel?: string }) => Promise<unknown>;
    buildCanonOverlayCandidateQueue: (inventory: unknown) => unknown;
    buildCanonOverlayCandidateReviewPackets: (queue: unknown) => unknown;
  };
  const inventory = await intake.buildCanonOverlayIntakeInventory({
    rootDir: ROOT,
    rootLabel: '<repo-root>'
  });
  const queue = intake.buildCanonOverlayCandidateQueue(inventory);
  const packets = intake.buildCanonOverlayCandidateReviewPackets(queue);

  return `/**
 * Generated Canon overlay candidate review packet content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/overlays/intake.ts
 */

import type { CanonOverlayCandidateReviewPacketCollection } from '../types.js';

export const CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS: CanonOverlayCandidateReviewPacketCollection = ${JSON.stringify(packets, null, 2)};
`;
}

// ============================================================================
// Build patterns
// ============================================================================

async function buildPatterns(): Promise<string> {
  const patternsDir = join(ROOT, 'packages', 'ltd', 'src', 'lib', 'content', 'patterns');
  const files = await readMarkdownFiles(patternsDir);

  const entries = files.map(f => {
    const fm = f.frontmatter;
    return `  {
    slug: ${JSON.stringify(f.slug)},
    title: ${JSON.stringify(fm.title || f.slug)},
    subtitle: ${JSON.stringify(fm.subtitle || '')},
    category: ${JSON.stringify(fm.category || 'Pattern')},
    content: \`${escapeForTemplate(f.content)}\`
  }`;
  });

  return `/**
 * Generated design patterns content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/ltd/src/lib/content/patterns/
 */

import type { Pattern } from '../types.js';

export const PATTERNS: Pattern[] = [
${entries.join(',\n')}
];
`;
}

// ============================================================================
// Build property documents (all markdown content across .io/.ltd/.space/.agency)
// ============================================================================

interface BuildPropertyDocumentsResult {
  source: string;
  totalCount: number;
  countsByProperty: Record<PropertyKey, number>;
}

function stripMarkdownExtension(path: string): string {
  return path.endsWith('.md') ? path.slice(0, -3) : path;
}

function encodeUriPath(path: string): string {
  return path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

function humanizeSlugSegment(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function extractHeading(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function deriveTitle(
  relativePath: string,
  frontmatter: Record<string, string>,
  body: string
): string {
  const explicit = frontmatter.title?.trim();
  if (explicit) return explicit;

  const heading = extractHeading(body);
  if (heading) return heading;

  const slug = stripMarkdownExtension(relativePath);
  const parts = slug.split('/');
  const leaf = parts[parts.length - 1] || 'document';
  if (leaf.toLowerCase() === 'readme' && parts.length > 1) {
    return `${humanizeSlugSegment(parts[parts.length - 2])} Readme`;
  }
  return humanizeSlugSegment(leaf);
}

function deriveDescription(frontmatter: Record<string, string>, body: string): string {
  const explicit = frontmatter.description || frontmatter.abstract || frontmatter.subtitle || frontmatter.lead;
  if (explicit && explicit.trim()) {
    return explicit.trim();
  }

  const paragraph = body
    .split(/\n\s*\n/)
    .map(block => block.replace(/^#+\s+/gm, '').trim())
    .find(block => block.length > 0);

  if (!paragraph) return '';
  return paragraph.slice(0, 240);
}

async function buildPropertyDocuments(): Promise<BuildPropertyDocumentsResult> {
  const entries: string[] = [];
  const countsByProperty: Record<PropertyKey, number> = {
    io: 0,
    ltd: 0,
    space: 0,
    agency: 0,
  };

  for (const config of PROPERTY_SCAN_CONFIG) {
    const files = await collectMarkdownFilesRecursive(config.root, config.excludePrefixes);

    for (const file of files) {
      const slug = stripMarkdownExtension(file.relativePath);
      const section = slug.includes('/') ? slug.split('/')[0] : 'root';
      const title = deriveTitle(file.relativePath, file.frontmatter, file.content);
      const description = deriveDescription(file.frontmatter, file.content);
      const uriPath = encodeUriPath(slug);
      const uri = `docs://${config.property}/${uriPath}`;

      entries.push(`  {
    id: ${JSON.stringify(`${config.property}:${slug}`)},
    property: ${JSON.stringify(config.property)},
    title: ${JSON.stringify(title)},
    description: ${JSON.stringify(description)},
    section: ${JSON.stringify(section)},
    path: ${JSON.stringify(file.relativePath)},
    slug: ${JSON.stringify(slug)},
    uri: ${JSON.stringify(uri)},
    content: \`${escapeForTemplate(file.content)}\`
  }`);

      countsByProperty[config.property] += 1;
    }
  }

  return {
    source: `/**
 * Generated property documents content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Sources:
 *   packages/io markdown files (excluding content/papers)
 *   packages/ltd markdown files (excluding src/lib/content/canon and src/lib/content/patterns)
 *   packages/space markdown files
 *   packages/agency markdown files
 */

import type { PropertyDocument } from '../types.js';

export const PROPERTY_DOCUMENTS: PropertyDocument[] = [
${entries.join(',\n')}
];
`,
    totalCount: entries.length,
    countsByProperty,
  };
}

// ============================================================================
// Build knowledge graph
// ============================================================================

async function buildGraph(): Promise<string> {
  const preferredGraphDir = join(ROOT, '.graph');
  const legacyGraphDir = join(ROOT, 'packages', 'io', 'static', '.graph');

  let nodesRaw: string;
  let edgesRaw: string;
  let graphDir = preferredGraphDir;
  try {
    nodesRaw = await readFile(join(graphDir, 'nodes.json'), 'utf-8');
    edgesRaw = await readFile(join(graphDir, 'edges.json'), 'utf-8');
  } catch {
    // Fallback to legacy location used by older graph build workflows.
    graphDir = legacyGraphDir;
    try {
      nodesRaw = await readFile(join(graphDir, 'nodes.json'), 'utf-8');
      edgesRaw = await readFile(join(graphDir, 'edges.json'), 'utf-8');
    } catch {
      console.error('Warning: Could not read graph files, generating empty graph.');
      nodesRaw = '[]';
      edgesRaw = '[]';
    }
  }

  const rawNodes = JSON.parse(nodesRaw);
  const rawEdges = JSON.parse(edgesRaw);

  // Simplify nodes — strip absolutePath, keep essential fields
  const nodes = rawNodes.map((n: Record<string, unknown>) => ({
    id: n.id,
    title: n.title,
    package: n.package,
    type: n.type,
    concepts: n.concepts || [],
    wordCount: n.wordCount || 0
  }));

  // Simplify edges — flatten metadata
  const edges = rawEdges.map((e: Record<string, unknown>) => ({
    source: e.source,
    target: e.target,
    type: e.type,
    weight: e.weight || 1,
    reason: (e.metadata as Record<string, unknown>)?.reason || undefined
  }));

  return `/**
 * Generated knowledge graph — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: .graph/ (fallback: packages/io/static/.graph/)
 */
// @ts-nocheck

import type { GraphNode, GraphEdge } from '../types.js';

export const GRAPH_NODES: GraphNode[] = ${JSON.stringify(nodes, null, 2)};

export const GRAPH_EDGES: GraphEdge[] = ${JSON.stringify(edges, null, 2)};
`;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('Building content for CREATE SOMETHING MCP...');

  // Ensure output directory exists
  await mkdir(OUT_DIR, { recursive: true });

  // Build all content in parallel
  const [
    papers,
    canon,
    canonRegistry,
    canonPublicExportClassification,
    canonOverlayCatalog,
    canonOverlayIntakeInventory,
    canonOverlayCandidateQueue,
    canonOverlayCandidateReviewPackets,
    patterns,
    graph,
    propertyDocs
  ] = await Promise.all([
    buildPapers(),
    buildCanon(),
    buildCanonRegistry(),
    buildCanonPublicExportClassification(),
    buildCanonOverlayCatalog(),
    buildCanonOverlayIntakeInventory(),
    buildCanonOverlayCandidateQueue(),
    buildCanonOverlayCandidateReviewPackets(),
    buildPatterns(),
    buildGraph(),
    buildPropertyDocuments(),
  ]);

  // Write generated files
  await Promise.all([
    writeFile(join(OUT_DIR, 'papers.ts'), papers, 'utf-8'),
    writeFile(join(OUT_DIR, 'canon.ts'), canon, 'utf-8'),
    writeFile(join(OUT_DIR, 'canon-registry.ts'), canonRegistry, 'utf-8'),
    writeFile(join(OUT_DIR, 'canon-public-export-classification.ts'), canonPublicExportClassification, 'utf-8'),
    writeFile(join(OUT_DIR, 'canon-overlay-catalog.ts'), canonOverlayCatalog, 'utf-8'),
    writeFile(join(OUT_DIR, 'canon-overlay-intake-inventory.ts'), canonOverlayIntakeInventory, 'utf-8'),
    writeFile(join(OUT_DIR, 'canon-overlay-candidate-queue.ts'), canonOverlayCandidateQueue, 'utf-8'),
    writeFile(join(OUT_DIR, 'canon-overlay-candidate-review-packets.ts'), canonOverlayCandidateReviewPackets, 'utf-8'),
    writeFile(join(OUT_DIR, 'patterns.ts'), patterns, 'utf-8'),
    writeFile(join(OUT_DIR, 'graph.ts'), graph, 'utf-8'),
    writeFile(join(OUT_DIR, 'property-docs.ts'), propertyDocs.source, 'utf-8'),
  ]);

  // Count content
  const paperCount = (papers.match(/slug:/g) || []).length;
  const canonCount = (canon.match(/slug:/g) || []).length;
  const canonRegistryCount = (canonRegistry.match(/"id":/g) || []).length - 1;
  const canonPublicExportClassificationCount = (canonPublicExportClassification.match(/"exportPath":/g) || []).length;
  const canonOverlayTemplateCount = (canonOverlayCatalog.match(/"manifest":/g) || []).length;
  const canonOverlayIntakeCount = (canonOverlayIntakeInventory.match(/"manifestPath":/g) || []).length;
  const canonOverlayCandidateCount = (canonOverlayCandidateQueue.match(/"intakeId":/g) || []).length;
  const canonOverlayCandidateReviewPacketCount = (canonOverlayCandidateReviewPackets.match(/"candidateId":/g) || []).length;
  const patternCount = (patterns.match(/slug:/g) || []).length;
  const nodeCount = (graph.match(/"id":/g) || []).length;

  console.log('Content built successfully:');
  console.log(`  Papers:         ${paperCount}`);
  console.log(`  Canon:          ${canonCount}`);
  console.log(`  Canon registry: ${canonRegistryCount} items`);
  console.log(`  Canon export policy: ${canonPublicExportClassificationCount} rules`);
  console.log(`  Canon overlays: ${canonOverlayTemplateCount} templates`);
  console.log(`  Canon overlay intake: ${canonOverlayIntakeCount} project manifests`);
  console.log(`  Canon overlay candidates: ${canonOverlayCandidateCount} candidates`);
  console.log(`  Canon overlay review packets: ${canonOverlayCandidateReviewPacketCount} packets`);
  console.log(`  Patterns:       ${patternCount}`);
  console.log(`  Graph:          ${nodeCount} nodes`);
  console.log(`  Property docs:  ${propertyDocs.totalCount}`);
  console.log(`    .io:          ${propertyDocs.countsByProperty.io}`);
  console.log(`    .ltd:         ${propertyDocs.countsByProperty.ltd}`);
  console.log(`    .space:       ${propertyDocs.countsByProperty.space}`);
  console.log(`    .agency:      ${propertyDocs.countsByProperty.agency}`);
  console.log(`  Output:         ${relative(process.cwd(), OUT_DIR)}`);
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
