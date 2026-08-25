#!/usr/bin/env tsx
/**
 * List Exports
 *
 * A minimal tool for verifying what symbols are exported from CREATE SOMETHING packages.
 * Use this BEFORE writing import statements to prevent hallucination.
 *
 * Usage:
 *   pnpm exports                    # List all packages with export counts
 *   pnpm exports components         # List exports from @create-something/components
 *   pnpm exports components Button  # Check if Button exists in components
 *
 * Philosophy: Verify before use. "I don't know" is better than hallucination.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const PACKAGES_DIR = resolve(ROOT, 'packages');
const SUPPORTED_PACKAGE_SCOPES = ['@create-something/', '@createsomething/'] as const;

interface ExportInfo {
  name: string;
  kind: 'function' | 'class' | 'type' | 'const' | 'component' | 'unknown';
  source: string;
}

interface PackageResolution {
  packageDir: string;
  packageName: string;
  displayName: string;
  subpath: string | null;
}

type PackageJson = {
  name?: string;
  exports?: Record<string, unknown>;
};

function isSupportedPackageName(value: string | undefined): value is string {
  return Boolean(value && SUPPORTED_PACKAGE_SCOPES.some((scope) => value.startsWith(scope)));
}

function stripComments(value: string): string {
  return value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/.*(?=\n|$)/g, '\n');
}

function parseExportSpecifiers(value: string): Array<{ name: string; isType: boolean }> {
  return stripComments(value)
    .split(',')
    .map((specifier) => specifier.trim())
    .filter(Boolean)
    .map((specifier) => {
      const isType = specifier.startsWith('type ');
      const normalized = isType ? specifier.slice('type '.length).trim() : specifier;
      const aliasParts = normalized.split(/\s+as\s+/);
      const name = (aliasParts[1] ?? aliasParts[0]).trim();
      return { name, isType };
    })
    .filter(({ name }) => Boolean(name) && name !== 'default');
}

function readPackageJson(packageDir: string): PackageJson | null {
  const packageJsonPath = resolve(packageDir, 'package.json');
  if (!existsSync(packageJsonPath)) return null;

  try {
    return JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Extract exports from a TypeScript/Svelte index file
 */
function extractExports(
  content: string,
  filePath: string,
  visited = new Set<string>()
): ExportInfo[] {
  const exports: ExportInfo[] = [];
  visited.add(filePath);

  // Match: export { Name, Name2 } from './module'
  const reExportPattern = /export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = reExportPattern.exec(content)) !== null) {
    const specifiers = parseExportSpecifiers(match[1]);
    const source = match[2];
    for (const { name, isType } of specifiers) {
      exports.push({
        name,
        kind: isType ? 'type' : name[0] === name[0].toUpperCase() ? 'component' : 'function',
        source
      });
    }
  }

  // Match: export type { Name } from './module'
  const typeReExportPattern = /export\s+type\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  while ((match = typeReExportPattern.exec(content)) !== null) {
    const specifiers = parseExportSpecifiers(match[1]);
    const source = match[2];
    for (const { name } of specifiers) {
      exports.push({ name, kind: 'type', source });
    }
  }

  // Match: export * from './module' - follow the re-export
  const starExportPattern = /export\s*\*\s*from\s*['"]([^'"]+)['"]/g;
  while ((match = starExportPattern.exec(content)) !== null) {
    const source = match[1];
    const sourcePath = resolveExportSource(filePath, source);
    if (sourcePath && !visited.has(sourcePath)) {
      const sourceContent = readFileSync(sourcePath, 'utf-8');
      exports.push(...extractExports(sourceContent, sourcePath, visited));
    } else {
      exports.push({ name: `* (from ${source})`, kind: 'unknown', source });
    }
  }

  // Match: export const/function/class Name
  const directExportPattern = /export\s+(const|function|class|let|var)\s+(\w+)/g;
  while ((match = directExportPattern.exec(content)) !== null) {
    const kind = match[1] === 'class' ? 'class' : match[1] === 'function' ? 'function' : 'const';
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

function resolveExportSource(fromFile: string, source: string): string | null {
  if (!source.startsWith('.')) return null;

  const base = resolve(dirname(fromFile), source);
  const candidates = [
    base,
    base.replace(/\.js$/, '.ts'),
    `${base}.ts`,
    `${base}.svelte`,
    resolve(base, 'index.ts')
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function uniqueExports(exports: ExportInfo[]): ExportInfo[] {
  const seen = new Set<string>();
  const unique: ExportInfo[] = [];

  for (const exp of exports) {
    const key = `${exp.kind}:${exp.name}:${exp.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(exp);
  }

  return unique;
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
    'src/index.js'
  ];

  for (const candidate of candidates) {
    const fullPath = resolve(packageDir, candidate);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

function extractPackageSpec(input: string): { packageName: string; subpath: string | null } {
  if (input.startsWith('@')) {
    const parts = input.split('/');
    const packageName = parts.slice(0, 2).join('/');
    const subpath = parts.length > 2 ? parts.slice(2).join('/') : null;
    return { packageName, subpath };
  }

  const [packageName, ...subpathParts] = input.split('/');
  return {
    packageName,
    subpath: subpathParts.length > 0 ? subpathParts.join('/') : null
  };
}

function findPackageDirByName(packageName: string): string | null {
  const entries = readdirSync(PACKAGES_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const packageDir = resolve(PACKAGES_DIR, entry.name);
    const pkgJson = readPackageJson(packageDir);
    if (pkgJson?.name === packageName) {
      return packageDir;
    }
  }

  return null;
}

function resolvePackage(input: string): PackageResolution | null {
  const { packageName, subpath } = extractPackageSpec(input);
  const isScopedPackage = isSupportedPackageName(packageName);
  const packageDir = isScopedPackage
    ? findPackageDirByName(packageName)
    : resolve(PACKAGES_DIR, packageName);

  if (!packageDir || !existsSync(packageDir)) return null;

  const pkgJson = readPackageJson(packageDir);
  if (!isSupportedPackageName(pkgJson?.name)) return null;

  return {
    packageDir,
    packageName: isScopedPackage ? packageName : pkgJson.name,
    displayName: subpath ? `${pkgJson.name}/${subpath}` : pkgJson.name,
    subpath
  };
}

function packageExportTargetToSourcePath(packageDir: string, target: unknown): string | null {
  if (typeof target === 'string') {
    const source = target
      .replace(/^\.\//, '')
      .replace(/^dist\//, 'src/lib/')
      .replace(/\.d\.ts$/, '.ts')
      .replace(/\.js$/, '.ts');
    return resolve(packageDir, source);
  }

  if (target && typeof target === 'object') {
    const record = target as Record<string, unknown>;
    for (const key of ['types', 'svelte', 'import', 'default']) {
      const resolved = packageExportTargetToSourcePath(packageDir, record[key]);
      if (resolved) return resolved;
    }
  }

  return null;
}

function findEntryPointForResolution(resolution: PackageResolution): string | null {
  if (!resolution.subpath) {
    return findEntryPoint(resolution.packageDir);
  }

  const pkgJson = readPackageJson(resolution.packageDir);
  const exportKey = `./${resolution.subpath}`;
  const exported = pkgJson?.exports?.[exportKey];
  const exportedSource = packageExportTargetToSourcePath(resolution.packageDir, exported);
  const candidates = [
    exportedSource,
    resolve(resolution.packageDir, 'src/lib', resolution.subpath, 'index.ts'),
    resolve(resolution.packageDir, 'src/lib', `${resolution.subpath}.ts`)
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

/**
 * Get all supported CREATE SOMETHING packages.
 */
function getPackages(): PackageResolution[] {
  const packages: PackageResolution[] = [];

  const entries = readdirSync(PACKAGES_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const pkgJsonPath = resolve(PACKAGES_DIR, entry.name, 'package.json');
      if (existsSync(pkgJsonPath)) {
        const pkgJson = readPackageJson(resolve(PACKAGES_DIR, entry.name));
        if (isSupportedPackageName(pkgJson?.name)) {
          packages.push({
            packageDir: resolve(PACKAGES_DIR, entry.name),
            packageName: pkgJson.name,
            displayName: pkgJson.name,
            subpath: null
          });
        }
      }
    }
  }

  return packages.sort((a, b) => a.packageName.localeCompare(b.packageName));
}

/**
 * Main
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // List all packages with export counts
    console.log('Available CREATE SOMETHING packages:\n');
    const packages = getPackages();

    for (const pkg of packages) {
      const entryPoint = findEntryPointForResolution(pkg);
      if (entryPoint) {
        const content = readFileSync(entryPoint, 'utf-8');
        const exports = uniqueExports(extractExports(content, entryPoint));
        const exportCount = exports.filter((e) => !e.name.startsWith('*')).length;
        const starCount = exports.filter((e) => e.name.startsWith('*')).length;

        console.log(
          `  ${pkg.packageName.padEnd(35)} ${exportCount} exports${starCount ? ` + ${starCount} re-exports` : ''}`
        );
      } else {
        console.log(`  ${pkg.packageName.padEnd(35)} (no entry point found)`);
      }
    }

    console.log('\nUsage: pnpm exports <package> [symbol]');
    console.log(
      'Example: pnpm exports @create-something/canon/overlays/project-template buildCanonProjectOverlayTemplateFilePack'
    );
    return;
  }

  const packageName = args[0];
  const searchSymbol = args[1];

  const resolution = resolvePackage(packageName);
  if (!resolution) {
    console.error(`Package not found: ${packageName}`);
    console.error('Run without arguments to see available packages.');
    process.exit(1);
  }

  const entryPoint = findEntryPointForResolution(resolution);
  if (!entryPoint) {
    console.error(`No entry point found for: ${packageName}`);
    process.exit(1);
  }

  const content = readFileSync(entryPoint, 'utf-8');
  const exports = uniqueExports(extractExports(content, entryPoint));

  if (searchSymbol) {
    // Check if specific symbol exists
    const found = exports.find((e) => e.name === searchSymbol);
    if (found) {
      console.log(`✓ ${searchSymbol} exists in ${resolution.displayName}`);
      console.log(`  Kind: ${found.kind}`);
      console.log(`  Source: ${relative(ROOT, found.source) || found.source}`);
      process.exit(0);
    } else {
      console.log(`✗ ${searchSymbol} NOT FOUND in ${resolution.displayName}`);
      console.log('\nAvailable exports:');
      const names = exports
        .filter((e) => !e.name.startsWith('*'))
        .map((e) => e.name)
        .sort();

      // Find similar names
      const similar = names.filter(
        (n) =>
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
    console.log(`Exports from ${resolution.displayName}:\n`);

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

    console.log(`Total: ${exports.filter((e) => !e.name.startsWith('*')).length} exports`);
  }
}

main();
