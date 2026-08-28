#!/usr/bin/env node

import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SECRET_PATTERNS = [
  { label: 'private key material', pattern: /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/ },
  { label: 'Google API key pattern', pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { label: 'AWS access key pattern', pattern: /(?:AKIA|ASIA)[0-9A-Z]{16}/ },
  { label: 'GitHub token pattern', pattern: /gh[pousr]_[0-9A-Za-z]{20,}/ },
  { label: 'Slack token pattern', pattern: /xox[baprs]-[0-9A-Za-z-]{10,}/ }
];

function normalizedRepositoryPath(candidate, label = 'Path') {
  if (
    typeof candidate !== 'string' ||
    candidate.length === 0 ||
    candidate.includes('\0') ||
    candidate.includes('\\') ||
    candidate.startsWith('/') ||
    path.posix.normalize(candidate) !== candidate ||
    candidate === '.' ||
    candidate.startsWith('../')
  ) {
    throw new Error(`${label} requires a normalized repository path: ${candidate}`);
  }
  return candidate;
}

export function assertAllowedPublicPath(candidate, policy) {
  normalizedRepositoryPath(candidate, 'Public distribution');

  const segments = candidate.split('/');
  const deniedSegment = segments.find((segment) => policy.deniedSegments.includes(segment));
  if (deniedSegment) {
    throw new Error(`Public distribution denied path segment "${deniedSegment}" in ${candidate}`);
  }

  const basename = path.posix.basename(candidate).toLowerCase();
  if (policy.deniedBasenames.map((value) => value.toLowerCase()).includes(basename)) {
    throw new Error(`Public distribution rejected credential-like filename: ${candidate}`);
  }

  const allowed = policy.includeRoots.some(
    (root) => candidate === root || candidate.startsWith(`${root}/`)
  );
  if (!allowed) {
    throw new Error(`Path is outside the public distribution allowlist: ${candidate}`);
  }

  return candidate;
}

export function assertSafePublicContent(relativePath, contents) {
  let text;
  try {
    text = Buffer.isBuffer(contents)
      ? new TextDecoder('utf-8', { fatal: true }).decode(contents)
      : String(contents);
  } catch {
    throw new Error(`Public distribution requires UTF-8 text source: ${relativePath}`);
  }
  if (text.includes('\0')) {
    throw new Error(`Public distribution supports text source only: ${relativePath}`);
  }
  for (const { label, pattern } of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`Public distribution rejected ${label} in ${relativePath}`);
    }
  }
}

function parseArgs(argv) {
  const args = argv.slice(2).filter((arg) => arg !== '--');
  const options = {
    root: process.cwd(),
    policy: 'config/public-distribution.v1.json',
    ref: 'HEAD',
    json: false
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--root' && args[index + 1]) options.root = args[++index];
    else if (arg === '--policy' && args[index + 1]) options.policy = args[++index];
    else if (arg === '--ref' && args[index + 1]) options.ref = args[++index];
    else if (arg === '--output' && args[index + 1]) options.output = args[++index];
    else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  return options;
}

function usage() {
  console.log(`Usage:
  node scripts/public-distribution.mjs --output <file.tar.gz> [options]

Builds the deterministic, allowlisted CREATE SOMETHING public source distribution
from one committed git ref and writes manifest and SHA-256 receipts beside it.

Options:
  --output <file.tar.gz>  Required destination; existing outputs are refused
  --ref <git-ref>        Committed source ref (default: HEAD)
  --policy <path>        Committed policy path (default: config/public-distribution.v1.json)
  --root <path>          Repository root (default: current directory)
  --json                 Print the JSON receipt summary
  --help                 Show this help
`);
}

async function git(root, args, options = {}) {
  return execFileAsync('git', args, {
    cwd: root,
    maxBuffer: 100 * 1024 * 1024,
    ...options
  });
}

async function readCommittedFile(root, ref, relativePath) {
  const { stdout } = await git(root, ['show', `${ref}:${relativePath}`], { encoding: 'buffer' });
  return stdout;
}

function validatePolicy(policy, policyPath) {
  if (policy?.schemaVersion !== 1) throw new Error('Public distribution policy schemaVersion must be 1');
  if (policy.license !== 'MIT') throw new Error('Public distribution license must be MIT');
  if (policy.releaseStage !== 'general-availability') {
    throw new Error('Public distribution releaseStage must be general-availability');
  }
  if (policy.sourcePrice?.currency !== 'USD' || policy.sourcePrice?.amount !== 0) {
    throw new Error('Public source price must be USD 0');
  }
  if (
    policy.managedService?.name !== 'CREATE SOMETHING Control' ||
    policy.managedService?.startsAt?.currency !== 'USD' ||
    policy.managedService?.startsAt?.amount !== 900 ||
    policy.managedService?.startsAt?.interval !== 'month'
  ) {
    throw new Error('Managed Control price must be declared separately as starting at USD 900 per month');
  }
  for (const key of ['includeRoots', 'deniedSegments', 'deniedBasenames']) {
    if (!Array.isArray(policy[key]) || policy[key].length === 0) {
      throw new Error(`Public distribution policy ${key} must be a non-empty array`);
    }
  }
  policy.includeRoots.forEach((root) => normalizedRepositoryPath(root, 'Allowlist root'));
  for (const required of ['LICENSE', 'PUBLIC_DISTRIBUTION.md', policyPath]) {
    if (!policy.includeRoots.includes(required)) {
      throw new Error(`Public distribution policy must include ${required}`);
    }
  }
  return policy;
}

function parseTree(output) {
  return output
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((entry) => {
      const match = /^(\d+) (\w+) ([0-9a-f]+)\t(.+)$/.exec(entry);
      if (!match) throw new Error(`Unexpected git tree entry: ${entry}`);
      return { mode: match[1], type: match[2], object: match[3], path: match[4] };
    });
}

async function listCommittedFiles(root, ref, policy) {
  const { stdout } = await git(
    root,
    ['ls-tree', '-r', '-z', '--full-tree', ref, '--', ...policy.includeRoots],
    { encoding: 'buffer' }
  );
  const entries = parseTree(stdout).sort((left, right) => left.path.localeCompare(right.path));
  if (entries.length === 0) throw new Error('Public distribution allowlist selected no committed files');
  for (const entry of entries) {
    assertAllowedPublicPath(entry.path, policy);
    if (entry.type !== 'blob' || entry.mode === '120000') {
      throw new Error(`Public distribution accepts regular committed files only: ${entry.path}`);
    }
  }
  return entries;
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function assertOutputsAbsent(paths) {
  for (const filePath of paths) {
    if (await pathExists(filePath)) throw new Error(`Refusing to overwrite existing output: ${filePath}`);
  }
}

function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

async function runBufferTransform(command, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = [];
    let stderr = '';
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(stdout));
      else reject(new Error(`${command} failed with exit code ${code}: ${stderr.trim()}`));
    });
    child.stdin.on('error', reject);
    child.stdin.end(input);
  });
}

export async function createPublicDistribution(options) {
  if (!options.output) throw new Error('--output is required');
  if (!options.output.endsWith('.tar.gz')) throw new Error('--output must end in .tar.gz');

  const root = await realpath(path.resolve(options.root));
  const policyPath = normalizedRepositoryPath(options.policy, 'Policy');
  const output = path.resolve(options.output);
  const receiptPaths = [output, `${output}.manifest.json`, `${output}.sha256`];
  await assertOutputsAbsent(receiptPaths);

  const { stdout: commitOutput } = await git(root, ['rev-parse', '--verify', `${options.ref}^{commit}`]);
  const commit = commitOutput.trim();
  const policyContents = await readCommittedFile(root, commit, policyPath);
  const policy = validatePolicy(JSON.parse(policyContents.toString('utf8')), policyPath);
  const entries = await listCommittedFiles(root, commit, policy);
  const files = [];
  for (const entry of entries) {
    const contents = await readCommittedFile(root, commit, entry.path);
    assertSafePublicContent(entry.path, contents);
    files.push({ path: entry.path, size: contents.byteLength, sha256: sha256(contents) });
  }

  const { stdout: tar } = await git(
    root,
    ['archive', '--format=tar', commit, '--', ...files.map((file) => file.path)],
    { encoding: 'buffer' }
  );
  const archive = await runBufferTransform('gzip', ['-n', '-c'], tar);
  const archiveHash = sha256(archive);
  const { stdout: committedAtOutput } = await git(root, [
    'show',
    '-s',
    '--format=%cI',
    commit
  ]);
  const manifest = {
    schemaVersion: 1,
    distribution: policy.id,
    releaseStage: policy.releaseStage,
    license: policy.license,
    sourcePrice: policy.sourcePrice,
    managedService: policy.managedService,
    gitCommit: commit,
    committedAt: committedAtOutput.trim(),
    policyPath,
    archiveSha256: archiveHash,
    files
  };

  await mkdir(path.dirname(output), { recursive: true });
  try {
    await writeFile(output, archive, { flag: 'wx' });
    await writeFile(`${output}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, {
      flag: 'wx'
    });
    await writeFile(`${output}.sha256`, `${archiveHash}  ${path.basename(output)}\n`, { flag: 'wx' });
  } catch (error) {
    await Promise.all(receiptPaths.map((filePath) => rm(filePath, { force: true })));
    throw error;
  }

  return {
    archive: output,
    archiveSha256: archiveHash,
    fileCount: files.length,
    gitCommit: commit,
    manifest: `${output}.manifest.json`,
    sha256Receipt: `${output}.sha256`
  };
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }
  const receipt = await createPublicDistribution(options);
  if (options.json) console.log(JSON.stringify(receipt));
  else {
    console.log(`Created ${receipt.archive}`);
    console.log(`Commit: ${receipt.gitCommit}`);
    console.log(`Files: ${receipt.fileCount}`);
    console.log(`SHA-256: ${receipt.archiveSha256}`);
    console.log(`Manifest: ${receipt.manifest}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
