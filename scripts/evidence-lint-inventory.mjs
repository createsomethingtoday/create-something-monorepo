#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const outputIndex = process.argv.indexOf('--output');
const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;

if (outputIndex >= 0 && !outputPath) {
  throw new Error('Missing path after --output.');
}

const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.svelte']);
const ignoredDirectories = new Set(['node_modules', 'dist', 'build', '.svelte-kit', 'coverage', '.wrangler']);

function countSourceFiles(directory) {
  let count = 0;
  const visit = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) visit(resolve(path, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      const dot = entry.name.lastIndexOf('.');
      if (dot >= 0 && sourceExtensions.has(entry.name.slice(dot))) count += 1;
    }
  };
  if (existsSync(directory) && statSync(directory).isDirectory()) visit(directory);
  return count;
}

const workspace = JSON.parse(
  execFileSync('pnpm', ['-r', 'list', '--depth', '-1', '--json'], { cwd: root, encoding: 'utf8' })
);

const packages = workspace
  .filter((item) => typeof item.path === 'string' && item.path !== root)
  .map((item) => {
    const packagePath = item.path;
    const manifest = JSON.parse(readFileSync(resolve(packagePath, 'package.json'), 'utf8'));
    const relativePath = relative(root, packagePath).split('\\').join('/');
    const sourceFiles = countSourceFiles(packagePath);
    const eslintConfig = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.evidence.config.mjs', '.eslintrc.json']
      .find((name) => existsSync(resolve(packagePath, name))) ?? null;
    return {
      name: manifest.name ?? relativePath,
      path: relativePath,
      source_files: sourceFiles,
      scripts: {
        lint: typeof manifest.scripts?.lint === 'string',
        check: typeof manifest.scripts?.check === 'string',
        test: typeof manifest.scripts?.test === 'string'
      },
      eslint_config: eslintConfig,
      evidence_lint_opportunity: sourceFiles > 0
    };
  })
  .sort((left, right) => left.path.localeCompare(right.path));

const report = {
  schema_version: 'evidence-lint-inventory.v1',
  workspace_package_count: packages.length,
  summary: {
    packages_with_source: packages.filter((item) => item.source_files > 0).length,
    packages_with_lint: packages.filter((item) => item.scripts.lint).length,
    packages_with_check: packages.filter((item) => item.scripts.check).length,
    packages_with_eslint_config: packages.filter((item) => item.eslint_config !== null).length,
    evidence_lint_opportunities: packages.filter((item) => item.evidence_lint_opportunity).length
  },
  packages
};

const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (outputPath) writeFileSync(resolve(root, outputPath), serialized);
else process.stdout.write(serialized);
