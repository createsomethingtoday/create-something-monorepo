#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const LABELS = [
  { name: 'paper-cycle', color: '1f6feb', description: 'Linear issue/PR participates in the paper lifecycle.' },
  { name: 'experiment-cycle', color: '0e8a16', description: 'Linear issue/PR participates in the experiment lifecycle.' },
  { name: 'policy-cycle', color: '5319e7', description: 'Linear issue/PR participates in the policy lifecycle.' },
  { name: 'ready-review-1', color: 'fbca04', description: 'Ready for first automated review pass.' },
  { name: 'ready-review-2', color: 'd93f0b', description: 'Ready for second automated review pass.' },
  { name: 'publish-approved', color: '0e8a16', description: 'Human approved for merge-to-main publication.' },
  { name: 'deployed', color: '0052cc', description: 'Published and post-deploy verification complete.' },
];

function parseArgs(argv) {
  const args = {
    dryRun: false,
    format: 'text',
    repo: '',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (arg === '--repo' && argv[i + 1]) {
      args.repo = argv[++i];
      continue;
    }
    if (arg === '--format' && argv[i + 1]) {
      args.format = argv[++i];
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
  node scripts/io-paper-cycle-labels.mjs [--repo owner/name] [--dry-run] [--format text|json]`);
}

function runGh(args, { parseJson = false } = {}) {
  const output = execFileSync('gh', args, { encoding: 'utf8' });
  return parseJson ? JSON.parse(output) : output.trim();
}

function detectRepo(explicitRepo) {
  if (explicitRepo) return explicitRepo;
  return runGh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']);
}

function labelExists(repo, labelName) {
  try {
    execFileSync('gh', ['api', `repos/${repo}/labels/${encodeURIComponent(labelName)}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function ensureLabel(repo, label, dryRun) {
  const exists = labelExists(repo, label.name);
  if (dryRun) {
    return {
      name: label.name,
      action: exists ? 'update' : 'create',
      dry_run: true,
    };
  }

  if (exists) {
    runGh([
      'api',
      '--method',
      'PATCH',
      `repos/${repo}/labels/${encodeURIComponent(label.name)}`,
      '-f',
      `new_name=${label.name}`,
      '-f',
      `color=${label.color}`,
      '-f',
      `description=${label.description}`,
    ]);
    return { name: label.name, action: 'updated', dry_run: false };
  }

  runGh([
    'api',
    '--method',
    'POST',
    `repos/${repo}/labels`,
    '-f',
    `name=${label.name}`,
    '-f',
    `color=${label.color}`,
    '-f',
    `description=${label.description}`,
  ]);
  return { name: label.name, action: 'created', dry_run: false };
}

function printText(repo, results) {
  console.log(`Synced ${results.length} IO paper-cycle labels for ${repo}.`);
  for (const result of results) {
    console.log(`- ${result.name}: ${result.action}`);
  }
}

function main() {
  const args = parseArgs(process.argv);
  const repo = detectRepo(args.repo);
  const results = LABELS.map((label) => ensureLabel(repo, label, args.dryRun));

  if (args.format === 'json') {
    console.log(JSON.stringify({ repo, results }, null, 2));
    return;
  }

  printText(repo, results);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
