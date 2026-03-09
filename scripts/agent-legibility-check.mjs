#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const REQUIRED_FIELDS = [
  'Entry point',
  'Boot command',
  'Smoke command',
  'Validation surfaces',
  'UI validation path',
  'Escalation rule',
];

const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

function normalizePath(relPath) {
  return relPath.split(path.sep).join('/').replace(/^\.\//, '');
}

function parseArgs(argv) {
  const args = {
    targets: [],
    format: 'text',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--target' && argv[i + 1]) {
      args.targets = argv[++i]
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map(normalizePath);
      continue;
    }

    if (arg === '--format' && argv[i + 1]) {
      args.format = argv[++i].trim().toLowerCase();
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!['text', 'json'].includes(args.format)) {
    throw new Error(`Unsupported format: ${args.format}`);
  }

  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/agent-legibility-check.mjs [--target path1,path2] [--format text|json]`);
}

function discoverTargetsFromPackageMetadata() {
  if (!existsSync(PACKAGES_DIR)) {
    return [];
  }

  const packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const targets = [];

  for (const dirName of packageDirs) {
    const packageJsonPath = path.join(PACKAGES_DIR, dirName, 'package.json');
    if (!existsSync(packageJsonPath)) {
      continue;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    if (!packageJson.createSomething?.agentLegibilityContract) {
      continue;
    }

    targets.push(normalizePath(path.join('packages', dirName, 'README.md')));
  }

  return targets;
}

function validateTarget(relPath) {
  const fullPath = path.join(REPO_ROOT, relPath);
  const details = [];

  if (!existsSync(fullPath)) {
    details.push(`Missing target file: ${relPath}`);
    return { target: relPath, ok: false, details };
  }

  const content = readFileSync(fullPath, 'utf8');

  if (!content.includes('## Agent Legibility Contract')) {
    details.push('Missing "## Agent Legibility Contract" section.');
  }

  for (const field of REQUIRED_FIELDS) {
    if (!content.includes(`| ${field} |`)) {
      details.push(`Missing contract field row: "${field}".`);
    }
  }

  return {
    target: relPath,
    ok: details.length === 0,
    details,
  };
}

function printText(results) {
  const failed = results.filter((result) => !result.ok);

  if (failed.length === 0) {
    console.log(`Agent legibility check passed for ${results.length} target file(s).`);
    return;
  }

  console.error(`Agent legibility check failed for ${failed.length} of ${results.length} target file(s):`);
  for (const result of failed) {
    console.error(`- ${result.target}`);
    for (const detail of result.details) {
      console.error(`  - ${detail}`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (args.targets.length === 0) {
    args.targets = discoverTargetsFromPackageMetadata();
  }
  const results = args.targets.map(validateTarget);
  const passed = results.every((result) => result.ok);

  if (args.format === 'json') {
    console.log(JSON.stringify({
      audit: {
        command: 'agent:legibility:check',
        passed,
        target_count: results.length,
      },
      results,
    }, null, 2));
  } else {
    printText(results);
  }

  if (!passed) {
    process.exit(1);
  }
}

main();
