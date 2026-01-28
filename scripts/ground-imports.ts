#!/usr/bin/env npx tsx
/**
 * Ground Import Health Check
 * 
 * Standalone implementation of import-health.yml patterns.
 * Use until Ground MCP adds native support.
 * 
 * Usage:
 *   pnpm ground:imports              # Check for issues
 *   pnpm ground:imports --fix        # Auto-fix issues
 *   pnpm ground:imports --json       # JSON output for CI
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration (from import-health.yml)
// ─────────────────────────────────────────────────────────────────────────────

const DEPRECATED_PACKAGES: Record<string, string> = {
  '@create-something/components': '@create-something/canon',
  '@create-something/components/types': '@create-something/canon/types',
  '@create-something/components/utils': '@create-something/canon/utils',
  '@create-something/components/diagrams': '@create-something/canon/diagrams',
  '@create-something/components/interactive': '@create-something/canon/interactive',
  '@create-something/components/brand': '@create-something/canon/brand',
  '@create-something/components/auth': '@create-something/canon/auth',
  '@create-something/components/platform': '@create-something/canon/platform',
  '@create-something/components/newsletter': '@create-something/canon/newsletter',
  '@create-something/components/analytics': '@create-something/canon/analytics',
  '@create-something/components/validation': '@create-something/canon/validation',
};

const SCAN_PATHS = [
  'packages/ltd/src',
  'packages/agency/src',
  'packages/space/src',
  'packages/io/src',
  'packages/verticals/src',
  'packages/templates-platform/src',
];

const EXTENSIONS = ['.ts', '.svelte', '.js'];

const IGNORE_PATHS = [
  'node_modules',
  '.svelte-kit',
  'dist',
  'build',
  // The deprecated package itself can reference itself
  'packages/components',
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Violation {
  file: string;
  line: number;
  column: number;
  type: 'deprecated' | 'direct-source' | 'relative-cross-package';
  original: string;
  replacement?: string;
  message: string;
}

interface Results {
  violations: Violation[];
  filesScanned: number;
  fixable: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scanning
// ─────────────────────────────────────────────────────────────────────────────

function* walkFiles(dir: string): Generator<string> {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      // Skip ignored paths
      if (IGNORE_PATHS.some(ignore => fullPath.includes(ignore))) {
        continue;
      }
      
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        yield* walkFiles(fullPath);
      } else if (EXTENSIONS.some(ext => entry.endsWith(ext))) {
        yield fullPath;
      }
    }
  } catch {
    // Directory doesn't exist, skip
  }
}

function findViolations(filePath: string, content: string): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split('\n');
  
  lines.forEach((line, lineIndex) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }
    
    // Pattern 1: Deprecated package imports
    for (const [deprecated, replacement] of Object.entries(DEPRECATED_PACKAGES)) {
      const pattern = new RegExp(`from\\s+['"]${deprecated.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
      const match = line.match(pattern);
      if (match) {
        violations.push({
          file: filePath,
          line: lineIndex + 1,
          column: match.index! + 1,
          type: 'deprecated',
          original: deprecated,
          replacement,
          message: `Deprecated import: ${deprecated} → ${replacement}`,
        });
      }
    }
    
    // Pattern 2: Direct source imports
    const directSourcePattern = /from\s+['"]\.\..*\/(components|canon)\/src\/lib\//;
    const directMatch = line.match(directSourcePattern);
    if (directMatch) {
      violations.push({
        file: filePath,
        line: lineIndex + 1,
        column: directMatch.index! + 1,
        type: 'direct-source',
        original: line.trim(),
        message: 'Direct source import bypasses package boundaries',
      });
    }
    
    // Pattern 3: Relative cross-package imports
    const crossPackagePattern = /from\s+['"]\.\..*packages\/(ltd|agency|space|io|canon)\//;
    const crossMatch = line.match(crossPackagePattern);
    if (crossMatch) {
      violations.push({
        file: filePath,
        line: lineIndex + 1,
        column: crossMatch.index! + 1,
        type: 'relative-cross-package',
        original: line.trim(),
        message: 'Cross-package imports should use package name, not relative path',
      });
    }
  });
  
  return violations;
}

function scanFiles(): Results {
  const violations: Violation[] = [];
  let filesScanned = 0;
  
  for (const scanPath of SCAN_PATHS) {
    for (const filePath of walkFiles(scanPath)) {
      filesScanned++;
      try {
        const content = readFileSync(filePath, 'utf-8');
        const fileViolations = findViolations(filePath, content);
        violations.push(...fileViolations);
      } catch {
        // Skip unreadable files
      }
    }
  }
  
  const fixable = violations.filter(v => v.type === 'deprecated' && v.replacement).length;
  
  return { violations, filesScanned, fixable };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixing
// ─────────────────────────────────────────────────────────────────────────────

function applyFixes(violations: Violation[]): number {
  // Group by file
  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    if (v.type === 'deprecated' && v.replacement) {
      const existing = byFile.get(v.file) || [];
      existing.push(v);
      byFile.set(v.file, existing);
    }
  }
  
  let fixedCount = 0;
  
  for (const [filePath, fileViolations] of byFile) {
    let content = readFileSync(filePath, 'utf-8');
    
    for (const v of fileViolations) {
      const before = content;
      content = content.replace(
        new RegExp(`(['"])${v.original!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'g'),
        `$1${v.replacement}$1`
      );
      if (content !== before) {
        fixedCount++;
      }
    }
    
    writeFileSync(filePath, content);
  }
  
  return fixedCount;
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
  lines.push('│  Ground Import Health Check                                     │');
  lines.push('└─────────────────────────────────────────────────────────────────┘');
  lines.push('');
  
  if (results.violations.length === 0) {
    lines.push('✓ No import violations found');
    lines.push(`  Scanned ${results.filesScanned} files`);
    return lines.join('\n');
  }
  
  // Group by type
  const deprecated = results.violations.filter(v => v.type === 'deprecated');
  const directSource = results.violations.filter(v => v.type === 'direct-source');
  const crossPackage = results.violations.filter(v => v.type === 'relative-cross-package');
  
  if (deprecated.length > 0) {
    lines.push(`\n⚠ Deprecated Imports (${deprecated.length})`);
    lines.push('─'.repeat(60));
    
    // Group by original package
    const byPackage = new Map<string, Violation[]>();
    for (const v of deprecated) {
      const existing = byPackage.get(v.original!) || [];
      existing.push(v);
      byPackage.set(v.original!, existing);
    }
    
    for (const [pkg, violations] of byPackage) {
      const replacement = violations[0].replacement;
      lines.push(`\n  ${pkg} → ${replacement}`);
      for (const v of violations.slice(0, 5)) {
        lines.push(`    ${relative(process.cwd(), v.file)}:${v.line}`);
      }
      if (violations.length > 5) {
        lines.push(`    ... and ${violations.length - 5} more`);
      }
    }
  }
  
  if (directSource.length > 0) {
    lines.push(`\n✗ Direct Source Imports (${directSource.length})`);
    lines.push('─'.repeat(60));
    for (const v of directSource) {
      lines.push(`  ${relative(process.cwd(), v.file)}:${v.line}`);
      lines.push(`    ${v.original}`);
    }
  }
  
  if (crossPackage.length > 0) {
    lines.push(`\n✗ Cross-Package Relative Imports (${crossPackage.length})`);
    lines.push('─'.repeat(60));
    for (const v of crossPackage) {
      lines.push(`  ${relative(process.cwd(), v.file)}:${v.line}`);
      lines.push(`    ${v.original}`);
    }
  }
  
  lines.push('');
  lines.push('─'.repeat(60));
  lines.push(`Summary: ${results.violations.length} violations in ${results.filesScanned} files`);
  if (results.fixable > 0) {
    lines.push(`         ${results.fixable} auto-fixable (run with --fix)`);
  }
  lines.push('');
  
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const jsonOutput = args.includes('--json');
  
  console.log(jsonOutput ? '' : '\nScanning for import violations...\n');
  
  const results = scanFiles();
  
  if (shouldFix && results.fixable > 0) {
    const fixed = applyFixes(results.violations);
    console.log(jsonOutput ? JSON.stringify({ fixed }) : `\n✓ Fixed ${fixed} violations\n`);
    
    // Re-scan to show remaining
    const afterFix = scanFiles();
    console.log(formatResults(afterFix, jsonOutput));
    process.exit(afterFix.violations.length > 0 ? 1 : 0);
  } else {
    console.log(formatResults(results, jsonOutput));
    process.exit(results.violations.length > 0 ? 1 : 0);
  }
}

main();
