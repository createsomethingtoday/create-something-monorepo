/**
 * File Walker
 *
 * Discovers markdown files across the monorepo, extracting metadata.
 */

import { createHash } from 'crypto';
import { readFileSync, statSync } from 'fs';
import { basename, dirname, relative, resolve } from 'path';
import { glob } from 'glob';
import type { GraphNode, NodeType, PackageName, BuildConfig } from '../types.js';

/**
 * Default configuration for file discovery
 */
export const DEFAULT_INCLUDE_DIRS = ['packages', '.claude', 'specs', 'docs', 'papers'];

export const DEFAULT_EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.svelte-kit/**',
  '**/dist/**',
  '**/build/**',
  '**/*.test.md',
  '**/CHANGELOG.md',
];

/**
 * Extract package name from file path
 */
export function extractPackage(relativePath: string): PackageName {
  const parts = relativePath.split('/');

  if (parts[0] === 'packages' && parts.length > 1) {
    const pkg = parts[1];
    const validPackages: PackageName[] = [
      'io', 'space', 'agency', 'ltd', 'lms', 'components',
      'harness', 'dotfiles', 'templates-platform', 'verticals', 'cloudflare-sdk'
    ];
    return validPackages.includes(pkg as PackageName) ? pkg as PackageName : null;
  }

  return null;
}

/**
 * Determine node type from filename and path
 */
export function determineNodeType(relativePath: string, filename: string): NodeType {
  const lowerFilename = filename.toLowerCase();
  const lowerPath = relativePath.toLowerCase();

  if (lowerFilename === 'understanding.md') return 'understanding';
  if (lowerFilename === 'readme.md') return 'readme';
  if (lowerPath.includes('/papers/') || lowerPath.includes('papers/published')) return 'paper';
  if (lowerPath.includes('/lessons/') || lowerPath.includes('/praxis/')) return 'lesson';
  if (lowerPath.includes('.claude/rules/')) return 'rule';
  if (lowerPath.includes('/specs/') || lowerPath.startsWith('specs/')) return 'spec';

  return 'general';
}

/**
 * Extract title from markdown content
 * Looks for first H1 heading, falls back to filename
 */
export function extractTitle(content: string, filename: string): string {
  // Match first H1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Fall back to filename without extension
  return basename(filename, '.md');
}

/**
 * Count words in markdown content
 * Strips code blocks and HTML for more accurate count
 */
export function countWords(content: string): number {
  // Remove code blocks
  let text = content.replace(/```[\s\S]*?```/g, '');
  // Remove inline code
  text = text.replace(/`[^`]+`/g, '');
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Remove markdown links, keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove images
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
  // Remove headers markers
  text = text.replace(/^#+\s*/gm, '');
  // Remove bold/italic markers
  text = text.replace(/[*_]{1,3}/g, '');

  // Split on whitespace and count
  const words = text.split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

/**
 * Compute SHA-256 hash of content
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Walk the repository and discover all markdown files
 */
export async function walkRepository(
  rootDir: string,
  config?: Partial<BuildConfig>
): Promise<GraphNode[]> {
  const includeDirs = config?.includeDirs ?? DEFAULT_INCLUDE_DIRS;
  const excludePatterns = config?.excludePatterns ?? DEFAULT_EXCLUDE_PATTERNS;

  const nodes: GraphNode[] = [];

  // Build glob pattern
  const patterns = includeDirs.map(dir => `${dir}/**/*.md`);

  // Find all markdown files
  const files = await glob(patterns, {
    cwd: rootDir,
    ignore: excludePatterns,
    absolute: false,
  });

  for (const relativePath of files) {
    const absolutePath = resolve(rootDir, relativePath);
    const filename = basename(relativePath);

    try {
      const content = readFileSync(absolutePath, 'utf-8');
      const stats = statSync(absolutePath);

      const node: GraphNode = {
        id: relativePath,
        title: extractTitle(content, filename),
        package: extractPackage(relativePath),
        type: determineNodeType(relativePath, filename),
        concepts: [], // Filled by concepts extractor
        hash: hashContent(content),
        wordCount: countWords(content),
        lastModified: stats.mtime.toISOString(),
        absolutePath,
      };

      nodes.push(node);
    } catch (error) {
      console.warn(`Warning: Could not read ${relativePath}: ${error}`);
    }
  }

  return nodes;
}

/**
 * Filter nodes that have changed since last build
 */
export function filterChangedNodes(
  nodes: GraphNode[],
  previousHashes: Record<string, string>
): GraphNode[] {
  return nodes.filter(node => previousHashes[node.id] !== node.hash);
}
