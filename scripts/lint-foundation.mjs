#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findCanonCssValueReplacement } from '../packages/canon/dist/lint-contract/index.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUPPORTED_PACKAGES = [
  'packages/io',
  'packages/mcp-core',
  'packages/webflow-components'
];
const SOURCE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx', '.svelte']);
const CSS_EXTENSIONS = new Set(['.css', '.scss']);
const EXCLUDED_SEGMENTS = new Set([
  'node_modules',
  '.svelte-kit',
  'build',
  'dist',
  'coverage',
  'test',
  'tests',
  '__tests__'
]);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function usage() {
  return [
    'Usage: pnpm lint:foundation -- [--changed-from <git-ref> | --files <paths>] [--dry-run] [--format json]',
    '',
    'Runs a warning-only, changed-file lint pilot for mcp-core, webflow-components, and io.',
    'Ground proof computation and non-JS/TS/Svelte/React language linting remain out of scope.'
  ].join('\n');
}

function readOptions(argv) {
  const options = { changedFrom: undefined, files: undefined, dryRun: false, format: 'text' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    } else if (arg === '--changed-from') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--changed-from requires a git ref');
      }
      options.changedFrom = value;
      index += 1;
    } else if (arg === '--files') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--files requires a comma-separated path list');
      }
      options.files = value.split(',').map((file) => file.trim()).filter(Boolean);
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--format') {
      const value = argv[index + 1];
      if (value !== 'text' && value !== 'json') {
        throw new Error('--format must be text or json');
      }
      options.format = value;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (options.files && options.changedFrom) {
    throw new Error('Use either --changed-from or --files, not both');
  }
  return options;
}

function changedFiles(ref) {
  const result = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMR', ref], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error(`Could not read changed files from ${ref}: ${result.stderr.trim() || result.stdout.trim()}`);
  }
  return result.stdout.split('\n').map((file) => file.trim()).filter(Boolean);
}

function isWithinSupportedPackage(file) {
  return SUPPORTED_PACKAGES.some((directory) => file === directory || file.startsWith(`${directory}/`));
}

function hasExcludedSegment(file) {
  return file.split('/').some((segment) => EXCLUDED_SEGMENTS.has(segment));
}

function planFiles(files) {
  const lintFiles = [];
  const cssFiles = [];
  const skippedFiles = [];

  for (const file of files) {
    const normalized = file.replace(/^\.\//, '');
    const extension = path.extname(normalized);
    if (!isWithinSupportedPackage(normalized) || hasExcludedSegment(normalized)) {
      skippedFiles.push(normalized);
    } else if (SOURCE_EXTENSIONS.has(extension)) {
      lintFiles.push(normalized);
    } else if (CSS_EXTENSIONS.has(extension)) {
      cssFiles.push(normalized);
    } else {
      skippedFiles.push(normalized);
    }
  }

  return {
    lintFiles: [...new Set(lintFiles)].sort(),
    cssFiles: [...new Set(cssFiles)].sort(),
    skippedFiles: [...new Set(skippedFiles)].sort(),
    warningOnly: true
  };
}

function findCssTokenWarnings(file) {
  const absoluteFile = path.join(REPO_ROOT, file);
  if (!existsSync(absoluteFile)) {
    return [`${file}: changed file is not present in this checkout`];
  }
  const source = readFileSync(absoluteFile, 'utf8');
  const warnings = [];
  const declaration = /([a-z-]+)\s*:\s*([^;{}]+)/gi;
  let match;
  while ((match = declaration.exec(source))) {
    const [, property, value] = match;
    const canon = findCanonCssValueReplacement(property, value.trim());
    if (!canon) continue;
    const line = source.slice(0, match.index).split('\n').length;
    warnings.push(`${file}:${line}: Use Canon token ${canon} instead of hardcoded value ${value.trim()}`);
  }
  return warnings;
}

function runEslint(files) {
  if (files.length === 0) return 0;
  const result = spawnSync(
    'pnpm',
    ['exec', 'eslint', '--config', 'eslint.foundation.config.mjs', ...files],
    { cwd: REPO_ROOT, stdio: 'inherit' }
  );
  return result.status ?? 1;
}

function main() {
  let options;
  try {
    options = readOptions(process.argv.slice(2));
  } catch (error) {
    fail(error.message);
    return;
  }

  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  let files;
  try {
    files = options.files ?? changedFiles(options.changedFrom ?? 'origin/main');
  } catch (error) {
    fail(error.message);
    return;
  }

  const plan = planFiles(files);
  if (options.dryRun) {
    process.stdout.write(`${options.format === 'json' ? JSON.stringify(plan, null, 2) : JSON.stringify(plan)}\n`);
    return;
  }

  const lintStatus = runEslint(plan.lintFiles);
  for (const file of plan.cssFiles) {
    for (const warning of findCssTokenWarnings(file)) {
      process.stdout.write(`[canon-css-token] ${warning}\n`);
    }
  }
  if (lintStatus !== 0) {
    process.exitCode = lintStatus;
  }
}

main();
