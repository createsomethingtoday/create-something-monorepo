#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
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

// Start with the representative packages that already adopted the contract.
// Expand this list as coverage grows.
const DEFAULT_TARGETS = [
  'packages/create-something-mcp/README.md',
  'packages/harness/README.md',
  'packages/harness-mcp/README.md',
  'packages/search/README.md',
  'packages/space/README.md',
  'packages/substrate-mcp/README.md',
  'packages/tufte/README.md',
];

function normalizePath(relPath) {
  return relPath.split(path.sep).join('/').replace(/^\.\//, '');
}

function parseArgs(argv) {
  const args = {
    targets: [...DEFAULT_TARGETS],
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
