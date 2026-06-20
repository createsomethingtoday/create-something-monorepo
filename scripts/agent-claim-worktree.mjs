#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_BASE_REF = 'origin/main';

function usage() {
  console.log(`Usage:
  node scripts/agent-claim-worktree.mjs --issue CRE-123 [options]

Claims a Linear issue, creates an isolated git worktree, and records the
branch/worktree/base SHA handoff back to Linear.

Options:
  --issue <id>          Required Linear issue identifier or id
  --branch <name>       Branch to create; default codex/<issue>-agent-worktree
  --worktree <path>     Worktree path; default /tmp/<issue>-agent-worktree
  --root <path>         Parent directory for default worktree path
  --base <ref>          Base ref for new branches; default origin/main
  --reuse-branch        Use an existing local branch without resetting it
  --no-fetch            Skip fetching origin/main before resolving --base
  --bootstrap           Run pnpm bootstrap:worktree inside the new worktree
  --dry-run             Print the plan without mutating git or Linear
  --json                Print machine-readable output
`);
}

export function parseArgs(argv) {
  const args = argv.slice(2).filter((arg) => arg !== '--');
  const options = {
    base: DEFAULT_BASE_REF,
    bootstrap: false,
    dryRun: false,
    fetch: true,
    json: false,
    reuseBranch: false,
    root: process.env.AGENT_WORKTREE_ROOT || os.tmpdir(),
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--issue' && args[index + 1]) options.issue = args[++index];
    else if (arg === '--branch' && args[index + 1]) options.branch = args[++index];
    else if (arg === '--worktree' && args[index + 1]) options.worktree = args[++index];
    else if (arg === '--root' && args[index + 1]) options.root = args[++index];
    else if (arg === '--base' && args[index + 1]) options.base = args[++index];
    else if (arg === '--reuse-branch') options.reuseBranch = true;
    else if (arg === '--no-fetch') options.fetch = false;
    else if (arg === '--bootstrap') options.bootstrap = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export function normalizeIssueIdentifier(issue) {
  const normalized = String(issue || '').trim().toUpperCase();
  if (!/^[A-Z]+-[0-9]+$/.test(normalized)) {
    throw new Error(`Issue must look like CRE-123, got: ${issue}`);
  }
  return normalized;
}

export function slugify(value) {
  return String(value)
    .trim()
    .replace(/[^A-Za-z0-9._/-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '');
}

export function normalizeBranchName(branch) {
  const normalized = slugify(branch);
  if (!normalized || normalized.includes('..') || normalized.endsWith('.') || normalized.includes('@{')) {
    throw new Error(`Unsafe branch name: ${branch}`);
  }
  return normalized;
}

export function buildDefaults(options) {
  const issue = normalizeIssueIdentifier(options.issue);
  const issueSlug = issue.toLowerCase();
  const branch = options.branch || `codex/${issue}-agent-worktree`;
  const root = options.root || process.env.AGENT_WORKTREE_ROOT || os.tmpdir();
  const worktree = options.worktree || path.join(path.resolve(root), `${issueSlug}-agent-worktree`);

  return {
    issue,
    branch: normalizeBranchName(branch),
    worktree: path.resolve(worktree),
    base: options.base || DEFAULT_BASE_REF,
    bootstrap: Boolean(options.bootstrap),
    dryRun: Boolean(options.dryRun),
    fetch: options.fetch !== false,
    reuseBranch: Boolean(options.reuseBranch),
  };
}

export function formatClaimBody(context) {
  return [
    'Agent workspace claim:',
    '',
    `- Issue: ${context.issue}`,
    `- Branch: \`${context.branch}\``,
    `- Worktree: \`${context.worktree}\``,
    `- Base ref: \`${context.base}\``,
    `- Base SHA: \`${context.baseSha}\``,
    `- Branch existed before claim: ${context.branchExisted ? 'yes' : 'no'}`,
    `- Bootstrap run: ${context.bootstrap ? 'yes' : 'no'}`,
    `- Created at: ${context.createdAt}`,
    '',
    'Before pushing or promoting this work, rebase or merge current `origin/main` if the base SHA is stale.',
  ].join('\n');
}

async function run(command, args, options = {}) {
  const { cwd = ROOT, dryRun = false, plan = [] } = options;
  plan.push({ command, args, cwd });
  if (dryRun) return '';
  const { stdout } = await execFileAsync(command, args, { cwd, maxBuffer: 1024 * 1024 * 10 });
  return stdout.trim();
}

async function git(args, options) {
  return run('git', args, options);
}

async function branchExists(branch, dryRun, plan) {
  if (dryRun) return false;
  try {
    await git(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { dryRun, plan });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }

  const context = buildDefaults(options);
  const plan = [];

  if (context.fetch) {
    await git(['fetch', '--quiet', 'origin', 'main'], { dryRun: context.dryRun, plan });
  }

  const baseSha = context.dryRun
    ? '<dry-run-base-sha>'
    : await git(['rev-parse', '--verify', `${context.base}^{commit}`], { plan });
  const branchExisted = await branchExists(context.branch, context.dryRun, plan);

  if (branchExisted && !context.reuseBranch) {
    throw new Error(`Branch already exists: ${context.branch}. Pass --reuse-branch to attach without resetting it.`);
  }
  if (existsSync(context.worktree)) {
    throw new Error(`Worktree path already exists: ${context.worktree}`);
  }

  const claimArgs = ['scripts/linear/remote.mjs', 'claim', '--issue', context.issue];
  await run(process.execPath, claimArgs, { dryRun: context.dryRun, plan });

  if (branchExisted) {
    await git(['worktree', 'add', context.worktree, context.branch], { dryRun: context.dryRun, plan });
  } else {
    await git(['worktree', 'add', '-b', context.branch, context.worktree, baseSha], { dryRun: context.dryRun, plan });
  }

  if (context.bootstrap) {
    await run('pnpm', ['bootstrap:worktree'], { cwd: context.worktree, dryRun: context.dryRun, plan });
  }

  const claimContext = {
    ...context,
    baseSha,
    branchExisted,
    createdAt: new Date().toISOString(),
  };
  const body = formatClaimBody(claimContext);
  await run(process.execPath, ['scripts/linear/remote.mjs', 'comment', '--issue', context.issue, '--body', body], {
    dryRun: context.dryRun,
    plan,
  });

  const output = { ...claimContext, linearComment: body, plan };
  if (options.json || context.dryRun) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`Claimed ${context.issue}`);
    console.log(`Worktree: ${context.worktree}`);
    console.log(`Branch: ${context.branch}`);
    console.log(`Base: ${context.base} ${baseSha}`);
    if (!context.bootstrap) console.log('Next: pnpm bootstrap:worktree');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
