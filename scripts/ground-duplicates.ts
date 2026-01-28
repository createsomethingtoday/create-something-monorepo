#!/usr/bin/env npx tsx
/**
 * Ground Duplicate Detection
 * 
 * Unified tool that works across CREATE SOMETHING and WORKWAY.
 * Reads configuration from .ground/consolidation-config.yml
 * 
 * Usage:
 *   pnpm ground:duplicates           # Check for duplicates
 *   pnpm ground:duplicates --json    # JSON output for CI
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';
import { parse as parseYaml } from 'yaml';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration Loading
// ─────────────────────────────────────────────────────────────────────────────

interface Config {
  duplicates: {
    similarity_threshold: number;
    min_lines: number;
    canonical_sources: string[];
    check_paths: string[];
    ignore_functions: string[];
    ignore_files: string[];
  };
}

function loadConfig(): Config {
  const configPath = '.ground/consolidation-config.yml';
  
  if (!existsSync(configPath)) {
    // Fallback defaults
    console.warn('Warning: .ground/consolidation-config.yml not found, using defaults');
    return {
      duplicates: {
        similarity_threshold: 85,
        min_lines: 5,
        canonical_sources: [],
        check_paths: ['.'],
        ignore_functions: ['load', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'handle', 'handleError'],
        ignore_files: ['*.test.ts', '*.spec.ts', '*.d.ts', 'index.ts'],
      }
    };
  }
  
  const content = readFileSync(configPath, 'utf-8');
  return parseYaml(content) as Config;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FunctionInfo {
  name: string;
  file: string;
  line: number;
  params: string[];
  body: string;
  bodyHash: string;
  lineCount: number;
  isCanonical: boolean;
}

interface DuplicateCluster {
  canonical?: FunctionInfo;
  duplicates: FunctionInfo[];
  similarity: number;
}

interface Results {
  clusters: DuplicateCluster[];
  functionsAnalyzed: number;
  filesScanned: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scanning
// ─────────────────────────────────────────────────────────────────────────────

const IGNORE_DIRS = ['node_modules', '.svelte-kit', 'dist', 'build', 'target'];

function matchesPattern(filename: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    if (pattern.startsWith('*.')) {
      return filename.endsWith(pattern.slice(1));
    }
    return filename === pattern;
  });
}

function* walkFiles(dir: string, ignoreFiles: string[]): Generator<string> {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      if (IGNORE_DIRS.some(ignore => fullPath.includes(ignore))) {
        continue;
      }
      
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        yield* walkFiles(fullPath, ignoreFiles);
      } else if (entry.endsWith('.ts') && !matchesPattern(entry, ignoreFiles)) {
        yield fullPath;
      }
    }
  } catch {
    // Directory doesn't exist
  }
}

function extractFunctions(
  filePath: string, 
  content: string, 
  isCanonical: boolean,
  config: Config
): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const lines = content.split('\n');
  const { ignore_functions, min_lines } = config.duplicates;
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
      i++;
      continue;
    }
    
    const funcMatch = line.match(/(?:export\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
    const arrowMatch = line.match(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*\w+)?\s*=>/);
    
    const match = funcMatch || arrowMatch;
    if (match) {
      const name = match[1];
      const params = match[2].split(',').map(p => p.trim()).filter(Boolean);
      
      if (ignore_functions.includes(name)) {
        i++;
        continue;
      }
      
      let braceCount = 0;
      let bodyStart = i;
      let bodyEnd = i;
      let foundStart = false;
      
      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j];
        
        for (const char of currentLine) {
          if (char === '{') {
            if (!foundStart) foundStart = true;
            braceCount++;
          } else if (char === '}') {
            braceCount--;
          }
        }
        
        if (foundStart && braceCount === 0) {
          bodyEnd = j;
          break;
        }
      }
      
      const bodyLines = lines.slice(bodyStart, bodyEnd + 1);
      const body = bodyLines.join('\n');
      const lineCount = bodyEnd - bodyStart + 1;
      
      if (lineCount >= min_lines) {
        const normalizedBody = normalizeBody(body);
        const bodyHash = createHash('md5').update(normalizedBody).digest('hex');
        
        functions.push({
          name,
          file: filePath,
          line: i + 1,
          params,
          body,
          bodyHash,
          lineCount,
          isCanonical,
        });
      }
      
      i = bodyEnd + 1;
    } else {
      i++;
    }
  }
  
  return functions;
}

function normalizeBody(body: string): string {
  return body
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'[^']*'/g, "'STR'")
    .replace(/"[^"]*"/g, '"STR"')
    .replace(/`[^`]*`/g, '`STR`')
    .replace(/\s+/g, ' ')
    .replace(/\b(const|let|var)\s+\w+/g, '$1 VAR')
    .trim();
}

function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 100;
  
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  
  const distance = levenshteinDistance(a, b);
  return Math.round((1 - distance / maxLen) * 100);
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const maxLen = 1000;
  const truncA = a.slice(0, maxLen);
  const truncB = b.slice(0, maxLen);
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= truncB.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= truncA.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= truncB.length; i++) {
    for (let j = 1; j <= truncA.length; j++) {
      if (truncB.charAt(i - 1) === truncA.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[truncB.length][truncA.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis
// ─────────────────────────────────────────────────────────────────────────────

function findDuplicates(config: Config): Results {
  const allFunctions: FunctionInfo[] = [];
  let filesScanned = 0;
  const { canonical_sources, check_paths, ignore_files, similarity_threshold } = config.duplicates;
  
  // Collect from canonical sources
  for (const sourcePath of canonical_sources) {
    for (const filePath of walkFiles(sourcePath, ignore_files)) {
      filesScanned++;
      try {
        const content = readFileSync(filePath, 'utf-8');
        const functions = extractFunctions(filePath, content, true, config);
        allFunctions.push(...functions);
      } catch {
        // Skip unreadable files
      }
    }
  }
  
  // Collect from check paths
  for (const checkPath of check_paths) {
    for (const filePath of walkFiles(checkPath, ignore_files)) {
      filesScanned++;
      try {
        const content = readFileSync(filePath, 'utf-8');
        const functions = extractFunctions(filePath, content, false, config);
        allFunctions.push(...functions);
      } catch {
        // Skip unreadable files
      }
    }
  }
  
  // Find clusters
  const clusters: DuplicateCluster[] = [];
  const processed = new Set<string>();
  
  for (const func of allFunctions) {
    if (processed.has(`${func.file}:${func.name}`)) continue;
    
    const similar: FunctionInfo[] = [];
    const normalizedA = normalizeBody(func.body);
    
    for (const other of allFunctions) {
      if (func === other) continue;
      if (processed.has(`${other.file}:${other.name}`)) continue;
      
      if (func.bodyHash === other.bodyHash) {
        similar.push(other);
        processed.add(`${other.file}:${other.name}`);
        continue;
      }
      
      const normalizedB = normalizeBody(other.body);
      const similarity = calculateSimilarity(normalizedA, normalizedB);
      
      if (similarity >= similarity_threshold) {
        similar.push(other);
        processed.add(`${other.file}:${other.name}`);
      }
    }
    
    if (similar.length > 0) {
      processed.add(`${func.file}:${func.name}`);
      
      const allInCluster = [func, ...similar];
      const canonical = allInCluster.find(f => f.isCanonical);
      const duplicates = allInCluster.filter(f => !f.isCanonical);
      
      if (duplicates.length > 0) {
        clusters.push({
          canonical,
          duplicates,
          similarity: 100,
        });
      }
    }
  }
  
  return {
    clusters,
    functionsAnalyzed: allFunctions.length,
    filesScanned,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────────────────────────────────────

function formatResults(results: Results, json: boolean): string {
  if (json) {
    return JSON.stringify(results, null, 2);
  }
  
  const lines: string[] = [];
  
  lines.push('');
  lines.push('┌─────────────────────────────────────────────────────────────────┐');
  lines.push('│  Ground Duplicate Detection                                     │');
  lines.push('└─────────────────────────────────────────────────────────────────┘');
  lines.push('');
  
  if (results.clusters.length === 0) {
    lines.push('✓ No duplicate utilities found');
    lines.push(`  Analyzed ${results.functionsAnalyzed} functions in ${results.filesScanned} files`);
    return lines.join('\n');
  }
  
  lines.push(`⚠ Duplicate Clusters Found (${results.clusters.length})`);
  lines.push('─'.repeat(60));
  
  for (let i = 0; i < results.clusters.length; i++) {
    const cluster = results.clusters[i];
    
    lines.push(`\nCluster ${i + 1}: ${cluster.duplicates[0]?.name || 'unknown'}`);
    
    if (cluster.canonical) {
      lines.push(`  CANONICAL: ${relative(process.cwd(), cluster.canonical.file)}:${cluster.canonical.line}`);
      lines.push(`             ${cluster.canonical.name}(${cluster.canonical.params.join(', ')})`);
    } else {
      lines.push(`  NO CANONICAL SOURCE - consider adding to shared package`);
    }
    
    for (const dup of cluster.duplicates) {
      lines.push(`  DUPLICATE: ${relative(process.cwd(), dup.file)}:${dup.line}`);
      lines.push(`             ${dup.name}(${dup.params.join(', ')})`);
    }
    
    if (cluster.canonical) {
      lines.push(`  → Action: Import from canonical source`);
    } else {
      lines.push(`  → Action: Consolidate to shared package`);
    }
  }
  
  lines.push('');
  lines.push('─'.repeat(60));
  lines.push(`Summary: ${results.clusters.length} duplicate clusters, ${results.functionsAnalyzed} functions analyzed`);
  lines.push('');
  
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  
  console.log(jsonOutput ? '' : '\nLoading configuration...');
  const config = loadConfig();
  
  console.log(jsonOutput ? '' : 'Analyzing for duplicate utilities...\n');
  
  const results = findDuplicates(config);
  console.log(formatResults(results, jsonOutput));
  
  process.exit(results.clusters.length > 0 ? 1 : 0);
}

main();
