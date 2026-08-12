#!/usr/bin/env node

import { accessSync, constants, existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const CHECKS = ['duplicates', 'orphans'];

export function parseArgs(argv) {
  const options = { base: 'origin/main', format: 'markdown' };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '--base') options.base = readValue(arg, argv[++index]);
    else if (arg.startsWith('--base=')) options.base = arg.slice('--base='.length);
    else if (arg === '--format') options.format = readValue(arg, argv[++index]);
    else if (arg.startsWith('--format=')) options.format = arg.slice('--format='.length);
    else if (arg === '--json') options.format = 'json';
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!['json', 'markdown'].includes(options.format)) {
    throw new Error(`Invalid format: ${options.format}. Expected json or markdown.`);
  }
  return options;
}

function readValue(flag, value) {
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
  return value;
}

function run(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 1024 * 1024 * 50,
    timeout: options.timeoutMs ?? 180_000
  });
  if (result.status !== 0) {
    const detail = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    throw new Error(`${command} ${args.join(' ')} failed${detail ? `:\n${detail}` : '.'}`);
  }
  return result.stdout ?? '';
}

function normalizePath(path) {
  return path.split(sep).join('/').replace(/^\.\//, '');
}

function changedFiles(root, base) {
  const tracked = run('git', ['diff', '--name-only', '--diff-filter=ACMR', base, '--'], root)
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = run('git', ['ls-files', '--others', '--exclude-standard'], root)
    .split(/\r?\n/)
    .filter(Boolean);
  return [...new Set([...tracked, ...untracked].map(normalizePath))].sort();
}

function supportedSource(path) {
  const dot = path.lastIndexOf('.');
  return dot >= 0 && SUPPORTED_EXTENSIONS.has(path.slice(dot));
}

function findPackageRoot(root, changedPath) {
  if (!supportedSource(changedPath)) return null;
  let cursor = dirname(resolve(root, changedPath));
  const boundary = resolve(root);

  while (cursor.startsWith(`${boundary}${sep}`)) {
    if (existsSync(join(cursor, 'package.json'))) return normalizePath(relative(boundary, cursor));
    cursor = dirname(cursor);
  }
  return null;
}

function packageName(root, packageRoot) {
  try {
    return JSON.parse(readFileSync(join(root, packageRoot, 'package.json'), 'utf8')).name ?? null;
  } catch {
    return null;
  }
}

function resolveGroundBinary(root) {
  const candidates = [
    process.env.GROUND_BINARY,
    join(root, 'packages/ground/target/release/ground'),
    join(root, 'packages/ground/npm/bin/ground')
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next explicit or repository-local binary.
    }
  }
  return 'ground';
}

function parseGroundJson(output) {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Ground did not return a JSON object.');
  return JSON.parse(output.slice(start, end + 1));
}

export function buildReceipt({ root, base, baseSha, files, groundBinary }) {
  const packageRoots = [
    ...new Set(files.map((file) => findPackageRoot(root, file)).filter(Boolean))
  ].sort();
  const targets = packageRoots.map((path) => {
    const result = parseGroundJson(
      run(groundBinary, ['diff', path, '--base', baseSha, '--checks', CHECKS.join(',')], root)
    );
    return {
      path,
      package_name: packageName(root, path),
      coverage: {
        discovered_changed_files: result.discovered_changed_files ?? 0,
        analyzable_changed_files: result.analyzable_changed_files ?? result.changed_files ?? 0,
        excluded_changed_files: result.excluded_changed_files ?? []
      },
      findings: result.new_issues ?? []
    };
  });

  const coveredPrefixes = packageRoots.map((path) => `${path}/`);
  const outsideTargets = files
    .filter((file) => !coveredPrefixes.some((prefix) => file.startsWith(prefix)))
    .map((path) => ({
      path,
      reason: supportedSource(path) ? 'outside_package_source' : 'unsupported_extension'
    }));
  const excluded = [
    ...targets.flatMap((target) => target.coverage.excluded_changed_files),
    ...outsideTargets
  ];
  const findings = targets.flatMap((target) =>
    target.findings.map((finding) => ({ target: target.path, ...finding }))
  );
  const analyzable = targets.reduce(
    (total, target) => total + target.coverage.analyzable_changed_files,
    0
  );

  return {
    schema_version: 'ground-review-receipt.v1',
    generated_at: new Date().toISOString(),
    mode: 'advisory',
    base,
    base_sha: baseSha,
    checks: CHECKS,
    changed_files: files,
    targets,
    coverage: {
      discovered_changed_files: files.length,
      analyzable_changed_files: analyzable,
      excluded_changed_files: excluded
    },
    findings,
    status: findings.length > 0 ? 'findings' : analyzable > 0 ? 'clear' : 'no_analyzable_files'
  };
}

export function formatMarkdown(receipt) {
  const lines = [
    '# Ground Review Receipt',
    '',
    `- Mode: ${receipt.mode}`,
    `- Base: ${receipt.base}`,
    `- Status: ${receipt.status}`,
    `- Changed files: ${receipt.coverage.discovered_changed_files}`,
    `- Analyzable files: ${receipt.coverage.analyzable_changed_files}`,
    `- Excluded files: ${receipt.coverage.excluded_changed_files.length}`,
    `- Findings: ${receipt.findings.length}`
  ];
  if (receipt.targets.length > 0) {
    lines.push('', '## Targets', '');
    for (const target of receipt.targets) {
      lines.push(
        `- ${target.path}${target.package_name ? ` (${target.package_name})` : ''}: ${target.coverage.analyzable_changed_files} analyzable, ${target.findings.length} finding(s)`
      );
    }
  }
  if (receipt.coverage.excluded_changed_files.length > 0) {
    lines.push('', '## Coverage exclusions', '');
    for (const exclusion of receipt.coverage.excluded_changed_files) {
      lines.push(`- ${exclusion.path}: ${exclusion.reason}`);
    }
  }
  lines.push('', '_Advisory evidence only; findings do not block promotion during calibration._');
  return `${lines.join('\n')}\n`;
}

function usage() {
  console.log(
    `Usage: node scripts/ground-review.mjs [--base <git-ref>] [--format json|markdown]\n\nEmits an advisory Ground receipt for changed package source.`
  );
}

function main() {
  try {
    const options = parseArgs(process.argv);
    if (options.help) return usage();
    const root = process.cwd();
    const baseSha = run('git', ['merge-base', options.base, 'HEAD'], root).trim();
    if (!baseSha) throw new Error(`No merge base found for ${options.base} and HEAD.`);
    const files = changedFiles(root, baseSha);
    const receipt = buildReceipt({
      root,
      base: options.base,
      baseSha,
      files,
      groundBinary: resolveGroundBinary(root)
    });
    console.log(
      options.format === 'json' ? JSON.stringify(receipt, null, 2) : formatMarkdown(receipt)
    );
  } catch (error) {
    console.error(
      `Ground review failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
