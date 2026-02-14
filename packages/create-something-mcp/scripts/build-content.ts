#!/usr/bin/env tsx
/**
 * Build Content — Collects content from across CREATE SOMETHING properties
 * and generates TypeScript modules for embedding in the MCP server.
 *
 * Sources:
 *   packages/io/content/papers/*.md         → papers
 *   packages/ltd/src/lib/content/canon/**   → canon pages
 *   packages/ltd/src/lib/content/patterns/* → design patterns
 *   packages/io/static/.graph/              → knowledge graph
 *
 * Run: tsx scripts/build-content.ts
 */

import { readdir, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { join, basename, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const OUT_DIR = join(import.meta.dirname, '..', 'src', 'content', 'generated');

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

async function readMarkdownFiles(dir: string): Promise<{ slug: string; frontmatter: Record<string, string>; content: string }[]> {
  const results: { slug: string; frontmatter: Record<string, string>; content: string }[] = [];
  try {
    const entries = await readdir(dir);
    for (const entry of entries) {
      if (!entry.endsWith('.md') || entry.endsWith('.draft') || entry.includes('.md.draft')) continue;
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
      } else if (entry.name.endsWith('.md') && !entry.name.endsWith('.draft') && !entry.name.includes('.md.draft')) {
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
  const [papers, canon, patterns, graph] = await Promise.all([
    buildPapers(),
    buildCanon(),
    buildPatterns(),
    buildGraph()
  ]);

  // Write generated files
  await Promise.all([
    writeFile(join(OUT_DIR, 'papers.ts'), papers, 'utf-8'),
    writeFile(join(OUT_DIR, 'canon.ts'), canon, 'utf-8'),
    writeFile(join(OUT_DIR, 'patterns.ts'), patterns, 'utf-8'),
    writeFile(join(OUT_DIR, 'graph.ts'), graph, 'utf-8'),
  ]);

  // Count content
  const paperCount = (papers.match(/slug:/g) || []).length;
  const canonCount = (canon.match(/slug:/g) || []).length;
  const patternCount = (patterns.match(/slug:/g) || []).length;
  const nodeCount = (graph.match(/"id":/g) || []).length;

  console.log(`Content built successfully:`);
  console.log(`  Papers:   ${paperCount}`);
  console.log(`  Canon:    ${canonCount}`);
  console.log(`  Patterns: ${patternCount}`);
  console.log(`  Graph:    ${nodeCount} nodes`);
  console.log(`  Output:   ${relative(process.cwd(), OUT_DIR)}`);
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
