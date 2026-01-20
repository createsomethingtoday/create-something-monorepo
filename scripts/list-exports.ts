#!/usr/bin/env tsx
/**
 * List Exports
 * 
 * A minimal tool for verifying what symbols are exported from @create-something packages.
 * Use this BEFORE writing import statements to prevent hallucination.
 * 
 * Usage:
 *   pnpm exports                    # List all packages with export counts
 *   pnpm exports components         # List exports from @create-something/components
 *   pnpm exports components Button  # Check if Button exists in components
 * 
 * Philosophy: Verify before use. "I don't know" is better than hallucination.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const PACKAGES_DIR = resolve(ROOT, 'packages');

interface ExportInfo {
  name: string;
  kind: 'function' | 'class' | 'type' | 'const' | 'component' | 'unknown';
  source: string;
}

/**
 * Extract exports from a TypeScript/Svelte index file
 */
function extractExports(content: string, filePath: string): ExportInfo[] {
  const exports: ExportInfo[] = [];
  
  // Match: export { Name, Name2 } from './module'
  const reExportPattern = /export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = reExportPattern.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim().split(' as ')[0].trim());
    const source = match[2];
    for (const name of names) {
      if (name && !name.startsWith('type ')) {
        exports.push({ 
          name, 
          kind: name[0] === name[0].toUpperCase() ? 'component' : 'function',
          source 
        });
      }
    }
  }
  
  // Match: export type { Name } from './module'
  const typeReExportPattern = /export\s+type\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  while ((match = typeReExportPattern.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim());
    const source = match[2];
    for (const name of names) {
      if (name) {
        exports.push({ name, kind: 'type', source });
      }
    }
  }
  
  // Match: export * from './module' - follow the re-export
  const starExportPattern = /export\s*\*\s*from\s*['"]([^'"]+)['"]/g;
  while ((match = starExportPattern.exec(content)) !== null) {
    const source = match[1];
    exports.push({ name: `* (from ${source})`, kind: 'unknown', source });
  }
  
  // Match: export const/function/class Name
  const directExportPattern = /export\s+(const|function|class|let|var)\s+(\w+)/g;
  while ((match = directExportPattern.exec(content)) !== null) {
    const kind = match[1] === 'class' ? 'class' : 
                 match[1] === 'function' ? 'function' : 'const';
    exports.push({ name: match[2], kind: kind as ExportInfo['kind'], source: filePath });
  }
  
  // Match: export type Name = ...
  const typeExportPattern = /export\s+type\s+(\w+)\s*=/g;
  while ((match = typeExportPattern.exec(content)) !== null) {
    exports.push({ name: match[1], kind: 'type', source: filePath });
  }
  
  // Match: export interface Name
  const interfacePattern = /export\s+interface\s+(\w+)/g;
  while ((match = interfacePattern.exec(content)) !== null) {
    exports.push({ name: match[1], kind: 'type', source: filePath });
  }
  
  return exports;
}

/**
 * Find the main entry point for a package
 */
function findEntryPoint(packageDir: string): string | null {
  const candidates = [
    'src/lib/index.ts',
    'src/index.ts',
    'index.ts',
    'src/lib/index.js',
    'src/index.js',
  ];
  
  for (const candidate of candidates) {
    const fullPath = resolve(packageDir, candidate);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  
  return null;
}

/**
 * Get all @create-something packages
 */
function getPackages(): string[] {
  const packages: string[] = [];
  
  const entries = readdirSync(PACKAGES_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const pkgJsonPath = resolve(PACKAGES_DIR, entry.name, 'package.json');
      if (existsSync(pkgJsonPath)) {
        try {
          const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
          if (pkgJson.name?.startsWith('@create-something/')) {
            packages.push(entry.name);
          }
        } catch {
          // Skip invalid package.json
        }
      }
    }
  }
  
  return packages.sort();
}

/**
 * Main
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // List all packages with export counts
    console.log('Available @create-something packages:\n');
    const packages = getPackages();
    
    for (const pkg of packages) {
      const entryPoint = findEntryPoint(resolve(PACKAGES_DIR, pkg));
      if (entryPoint) {
        const content = readFileSync(entryPoint, 'utf-8');
        const exports = extractExports(content, entryPoint);
        const exportCount = exports.filter(e => !e.name.startsWith('*')).length;
        const starCount = exports.filter(e => e.name.startsWith('*')).length;
        
        console.log(`  ${pkg.padEnd(25)} ${exportCount} exports${starCount ? ` + ${starCount} re-exports` : ''}`);
      } else {
        console.log(`  ${pkg.padEnd(25)} (no entry point found)`);
      }
    }
    
    console.log('\nUsage: pnpm exports <package> [symbol]');
    console.log('Example: pnpm exports components Button');
    return;
  }
  
  const packageName = args[0];
  const searchSymbol = args[1];
  
  // Find the package
  const packageDir = resolve(PACKAGES_DIR, packageName);
  if (!existsSync(packageDir)) {
    console.error(`Package not found: ${packageName}`);
    console.error('Run without arguments to see available packages.');
    process.exit(1);
  }
  
  const entryPoint = findEntryPoint(packageDir);
  if (!entryPoint) {
    console.error(`No entry point found for: ${packageName}`);
    process.exit(1);
  }
  
  const content = readFileSync(entryPoint, 'utf-8');
  const exports = extractExports(content, entryPoint);
  
  if (searchSymbol) {
    // Check if specific symbol exists
    const found = exports.find(e => e.name === searchSymbol);
    if (found) {
      console.log(`✓ ${searchSymbol} exists in @create-something/${packageName}`);
      console.log(`  Kind: ${found.kind}`);
      console.log(`  Source: ${found.source}`);
      process.exit(0);
    } else {
      console.log(`✗ ${searchSymbol} NOT FOUND in @create-something/${packageName}`);
      console.log('\nAvailable exports:');
      const names = exports
        .filter(e => !e.name.startsWith('*'))
        .map(e => e.name)
        .sort();
      
      // Find similar names
      const similar = names.filter(n => 
        n.toLowerCase().includes(searchSymbol.toLowerCase()) ||
        searchSymbol.toLowerCase().includes(n.toLowerCase())
      );
      
      if (similar.length > 0) {
        console.log(`\nDid you mean: ${similar.join(', ')}?`);
      }
      
      process.exit(1);
    }
  } else {
    // List all exports from package
    console.log(`Exports from @create-something/${packageName}:\n`);
    
    const byKind: Record<string, ExportInfo[]> = {};
    for (const exp of exports) {
      if (!byKind[exp.kind]) byKind[exp.kind] = [];
      byKind[exp.kind].push(exp);
    }
    
    const order = ['component', 'function', 'class', 'const', 'type', 'unknown'];
    for (const kind of order) {
      const items = byKind[kind];
      if (items && items.length > 0) {
        console.log(`${kind.toUpperCase()}S:`);
        for (const item of items.sort((a, b) => a.name.localeCompare(b.name))) {
          console.log(`  ${item.name}`);
        }
        console.log('');
      }
    }
    
    console.log(`Total: ${exports.filter(e => !e.name.startsWith('*')).length} exports`);
  }
}

main();
