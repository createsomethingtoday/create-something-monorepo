#!/usr/bin/env node

import { accessSync, constants, existsSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
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

function trackedChanges(root, base) {
  const fields = run(
    'git',
    ['diff', '--name-status', '-z', '--find-renames', base, '--'],
    root
  ).split('\0');
  const changes = [];
  for (let index = 0; index < fields.length; ) {
    const status = fields[index++];
    if (!status) continue;
    if (status.startsWith('R') || status.startsWith('C')) {
      const source = normalizePath(fields[index++]);
      const destination = normalizePath(fields[index++]);
      if (status.startsWith('R')) changes.push({ path: source, status: 'rename_source' });
      changes.push({ path: destination, status });
    } else {
      changes.push({ path: normalizePath(fields[index++]), status });
    }
  }
  return changes;
}

function changedFiles(root, base) {
  const tracked = trackedChanges(root, base).map(({ path }) => path);
  const untracked = run('git', ['ls-files', '-z', '--others', '--exclude-standard'], root)
    .split('\0')
    .filter(Boolean);
  return [...new Set([...tracked, ...untracked].map(normalizePath))].sort();
}

function deletedFiles(root, base) {
  return new Set(
    trackedChanges(root, base)
      .filter(({ status }) => status === 'D' || status === 'rename_source')
      .map(({ path }) => path)
      .filter((path) => !existsSync(resolve(root, path)))
  );
}

function unmergedFiles(root) {
  return new Set(
    run('git', ['diff', '--name-only', '-z', '--diff-filter=U', '--'], root)
      .split('\0')
      .filter(Boolean)
      .map(normalizePath)
  );
}

function supportedSource(path) {
  const dot = path.lastIndexOf('.');
  return dot >= 0 && SUPPORTED_EXTENSIONS.has(path.slice(dot));
}

function unreadableFiles(root, files, deleted) {
  return new Set(
    files.filter((path) => {
      if (!supportedSource(path) || deleted.has(path)) return false;
      try {
        accessSync(resolve(root, path), constants.R_OK);
        return false;
      } catch {
        return true;
      }
    })
  );
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

function collapsePackageRoots(paths) {
  return [...paths]
    .sort(
      (left, right) => left.split('/').length - right.split('/').length || left.localeCompare(right)
    )
    .reduce((targets, path) => {
      if (!targets.some((target) => path.startsWith(`${target}/`))) targets.push(path);
      return targets;
    }, []);
}

function canonicalPath(path) {
  let cursor = resolve(path);
  const suffix = [];
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) return resolve(path);
    suffix.unshift(basename(cursor));
    cursor = parent;
  }
  return join(realpathSync(cursor), ...suffix);
}

function receiptPath(root, path) {
  if (!isAbsolute(path)) return normalizePath(path);
  // Canonicalize the containing directory to reconcile aliases such as
  // /var and /private/var, but keep the lexical filename. Resolving the full
  // path would follow a changed symlink and misattribute coverage to its target.
  const canonicalFile = join(canonicalPath(dirname(path)), basename(path));
  const candidate = relative(canonicalPath(root), canonicalFile);
  return candidate.startsWith('..') || isAbsolute(candidate)
    ? normalizePath(path)
    : normalizePath(candidate);
}

function normalizeFinding(root, finding) {
  if (!finding || typeof finding !== 'object' || Array.isArray(finding)) return finding;
  const normalized = { ...finding };
  if (typeof normalized.path === 'string') normalized.path = receiptPath(root, normalized.path);
  if (Array.isArray(normalized.files)) {
    normalized.files = normalized.files.map((path) =>
      typeof path === 'string' ? receiptPath(root, path) : path
    );
  }
  return normalized;
}

export function resolveGroundBinary(
  root,
  platform = process.platform,
  architecture = process.arch
) {
  const candidates = [
    process.env.GROUND_BINARY,
    join(root, 'packages/ground/target/release/ground')
  ];
  // The binary checked into the npm package is the release artifact for this
  // repository's development platform. Other platforms must use their installed
  // Ground binary rather than attempting to execute an incompatible Mach-O file.
  if (platform === 'darwin' && architecture === 'arm64') {
    candidates.push(join(root, 'packages/ground/npm/bin/ground'));
  }

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

export function buildReceipt({
  root,
  base,
  baseSha,
  files,
  deleted,
  unmerged,
  unreadable,
  groundBinary
}) {
  const packageRoots = collapsePackageRoots(
    new Set(
      files
        .filter((file) => !deleted.has(file) && !unmerged.has(file) && !unreadable.has(file))
        .map((file) => findPackageRoot(root, file))
        .filter(Boolean)
    )
  );
  const changedSet = new Set(files);
  const targets = packageRoots.map((path) => {
    const result = parseGroundJson(
      run(groundBinary, ['diff', path, '--base', baseSha, '--checks', CHECKS.join(',')], root)
    );
    const analyzedChangedFiles = [
      ...new Set(
        (result.changed_file_list ?? [])
          .map((file) => receiptPath(root, file))
          .filter(
            (file) =>
              changedSet.has(file) &&
              file.startsWith(`${path}/`) &&
              !deleted.has(file) &&
              !unmerged.has(file) &&
              !unreadable.has(file)
          )
      )
    ];
    return {
      path,
      package_name: packageName(root, path),
      coverage: {
        discovered_changed_files: result.discovered_changed_files ?? 0,
        analyzable_changed_files: analyzedChangedFiles.length,
        analyzed_changed_files: analyzedChangedFiles,
        excluded_changed_files: (result.excluded_changed_files ?? []).map((exclusion) => ({
          ...exclusion,
          path: receiptPath(root, exclusion.path)
        }))
      },
      findings: (result.new_issues ?? []).map((finding) => normalizeFinding(root, finding))
    };
  });

  const analyzedSet = new Set(targets.flatMap((target) => target.coverage.analyzed_changed_files));
  for (const target of targets) {
    const prefix = `${target.path}/`;
    target.coverage.excluded_changed_files = target.coverage.excluded_changed_files.filter(
      (exclusion) =>
        changedSet.has(exclusion.path) &&
        !analyzedSet.has(exclusion.path) &&
        exclusion.path.startsWith(prefix)
    );
  }

  const coveredPrefixes = packageRoots.map((path) => `${path}/`);
  const outsideTargets = files
    .filter(
      (file) =>
        deleted.has(file) ||
        unmerged.has(file) ||
        unreadable.has(file) ||
        !coveredPrefixes.some((prefix) => file.startsWith(prefix))
    )
    .map((path) => ({
      path,
      reason: unmerged.has(path)
        ? 'unmerged_file'
        : deleted.has(path)
          ? 'deleted_file'
          : unreadable.has(path)
            ? 'unreadable_file'
            : supportedSource(path)
              ? 'outside_package_source'
              : 'unsupported_extension'
    }));
  const targetExclusions = targets.flatMap((target) => target.coverage.excluded_changed_files);
  const accountedPaths = new Set([
    ...analyzedSet,
    ...targetExclusions.map((exclusion) => exclusion.path),
    ...outsideTargets.map((exclusion) => exclusion.path)
  ]);
  const unmatchedTargetFiles = files
    .filter(
      (file) =>
        !deleted.has(file) &&
        !unmerged.has(file) &&
        !unreadable.has(file) &&
        coveredPrefixes.some((prefix) => file.startsWith(prefix)) &&
        !accountedPaths.has(file)
    )
    .map((path) => ({
      path,
      reason: supportedSource(path) ? 'ground_path_mismatch' : 'unsupported_extension'
    }));
  for (const exclusion of unmatchedTargetFiles) {
    const target = targets.find(({ path }) => exclusion.path.startsWith(`${path}/`));
    target?.coverage.excluded_changed_files.push(exclusion);
  }
  const excluded = [
    ...new Map(
      [...targetExclusions, ...outsideTargets, ...unmatchedTargetFiles]
        .filter((exclusion) => !analyzedSet.has(exclusion.path))
        .map((exclusion) => [`${exclusion.path}:${exclusion.reason}`, exclusion])
    ).values()
  ];
  const findings = targets.flatMap((target) =>
    target.findings.map((finding) => ({ ...finding, target: target.path }))
  );
  const analyzable = analyzedSet.size;

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
  if (receipt.findings.length > 0) {
    lines.push('', '## Findings', '');
    for (const finding of receipt.findings) {
      const { target, type, path, files, ...evidence } = finding;
      lines.push(`- ${type ?? 'finding'}${target ? ` in ${target}` : ''}`);
      if (path) lines.push(`  - Path: ${path}`);
      if (Array.isArray(files) && files.length > 0) lines.push(`  - Files: ${files.join(', ')}`);
      if (Object.keys(evidence).length > 0) {
        lines.push(`  - Evidence: ${JSON.stringify(evidence)}`);
      }
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
    const deleted = deletedFiles(root, baseSha);
    const unmerged = unmergedFiles(root);
    const unreadable = unreadableFiles(root, files, deleted);
    const receipt = buildReceipt({
      root,
      base: options.base,
      baseSha,
      files,
      deleted,
      unmerged,
      unreadable,
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
