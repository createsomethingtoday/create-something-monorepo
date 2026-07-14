#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import fastGlob from 'fast-glob';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(SCRIPT_DIR, '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '../..');
const APPROVAL_ENV = 'WEBFLOW_LIBRARY_SHARE_APPROVED';
const ALLOW_DIRTY_ENV = 'WEBFLOW_LIBRARY_SHARE_ALLOW_DIRTY';

const DEFAULT_RELEVANT_PREFIXES = [
  'packages/webflow-components/src/',
  'packages/webflow-components/test/',
  'packages/webflow-components/scripts/',
  'packages/webflow-components/dist/',
  'packages/webflow-components/webflow.json',
  'packages/webflow-components/webflow.cato.json',
  'packages/webflow-components/webflow.marketplace.json',
  'packages/webflow-components/package.json',
  'packages/webflow-components/README.md'
];

export function parseArgs(argv) {
  const options = {
    approvalEnv: APPROVAL_ENV,
    allowDirty: process.env[ALLOW_DIRTY_ENV] === '1',
    fetch: true,
    manifest: 'webflow.json',
    forbid: [],
    json: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    } else if (arg === '--manifest') {
      index += 1;
      options.manifest = readOptionValue(arg, argv[index]);
    } else if (arg.startsWith('--manifest=')) {
      options.manifest = arg.slice('--manifest='.length);
    } else if (arg === '--forbid') {
      index += 1;
      options.forbid = parseForbidList(readOptionValue(arg, argv[index]));
    } else if (arg.startsWith('--forbid=')) {
      options.forbid = parseForbidList(arg.slice('--forbid='.length));
    } else if (arg === '--allow-dirty') {
      options.allowDirty = true;
    } else if (arg === '--no-fetch') {
      options.fetch = false;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function readOptionValue(flag, value) {
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
  return value;
}

export function readManifest(manifestPath, { packageRoot = PACKAGE_ROOT } = {}) {
  const absolutePath = path.resolve(packageRoot, manifestPath);
  const manifest = JSON.parse(readFileSync(absolutePath, 'utf8'));
  const componentGlobs = [
    ...(typeof manifest.components === 'string' ? [manifest.components] : []),
    ...(Array.isArray(manifest.library?.components) ? manifest.library.components : [])
  ];
  return {
    path: path.relative(packageRoot, absolutePath),
    libraryId: manifest.library?.id ?? null,
    libraryName: manifest.library?.name ?? manifest.name ?? null,
    componentGlobs: Array.from(new Set(componentGlobs))
  };
}

export function parseForbidList(value) {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function resolveManifestComponents(componentGlobs, { packageRoot = PACKAGE_ROOT } = {}) {
  const matches = new Set();
  for (const pattern of componentGlobs) {
    for (const match of fastGlob.sync(pattern, { cwd: packageRoot })) {
      matches.add(String(match).replace(/\\/g, '/').replace(/^\.\//, ''));
    }
  }
  return Array.from(matches).sort();
}

// Fails closed on manifest scope: the resolved component set must be non-empty
// and must not include any file under a forbidden component directory. This is
// what prevents a catch-all glob from shipping client (cato) or internal
// (control/business) components to an external workspace.
export function evaluateManifestScope({ matches, forbid }) {
  const failures = [];

  if (matches.length === 0) {
    failures.push('Manifest component globs resolve to zero files; the share would publish an empty library.');
  }

  if (forbid.length > 0) {
    const forbiddenPattern = new RegExp(`(^|/)components/(${forbid.join('|')})/`);
    const offenders = matches.filter((match) => forbiddenPattern.test(match));
    if (offenders.length > 0) {
      failures.push(
        `Manifest resolves ${offenders.length} component(s) under forbidden director${offenders.length === 1 ? 'y' : 'ies'} [${forbid.join(', ')}]: ${offenders.slice(0, 5).join(', ')}${offenders.length > 5 ? ', …' : ''}`
      );
    }
  }

  return { ok: failures.length === 0, failures };
}

export function parseGitPorcelain(statusText) {
  return statusText
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const renamed = line.slice(3).split(' -> ').at(-1);
      return {
        raw: line,
        code: line.slice(0, 2),
        path: renamed
      };
    });
}

export function relevantDirtyEntries(entries, prefixes = DEFAULT_RELEVANT_PREFIXES) {
  return entries.filter((entry) =>
    prefixes.some((prefix) => entry.path === prefix || entry.path.startsWith(prefix))
  );
}

export function parseAheadBehind(output) {
  const [aheadText, behindText] = output.trim().split(/\s+/);
  return {
    ahead: Number(aheadText || 0),
    behind: Number(behindText || 0)
  };
}

export function evaluatePreflight({ approvalValue, dirtyEntries, divergence, upstream, allowDirty }) {
  const failures = [];
  const warnings = [];

  if (approvalValue !== '1') {
    failures.push(
      `Set ${APPROVAL_ENV}=1 only after explicit approval to share the Webflow library.`
    );
  }

  if (!upstream) {
    failures.push('No upstream branch is configured; cannot prove source authority freshness.');
  }

  if (divergence.behind > 0) {
    failures.push(
      `Local branch is behind upstream by ${divergence.behind} commit(s); fetch/rebase before sharing.`
    );
  }

  if (divergence.ahead > 0) {
    warnings.push(
      `Local branch is ahead of upstream by ${divergence.ahead} commit(s); record the exact commit in the share evidence.`
    );
  }

  if (dirtyEntries.length > 0 && !allowDirty) {
    failures.push(
      `Relevant package files are dirty (${dirtyEntries.length}); use --allow-dirty or ${ALLOW_DIRTY_ENV}=1 only for an explicitly scoped approved share.`
    );
  } else if (dirtyEntries.length > 0) {
    warnings.push(
      `Proceeding with ${dirtyEntries.length} dirty relevant file(s) because --allow-dirty was supplied.`
    );
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings
  };
}

function runGit(args, { cwd = REPO_ROOT, okStatuses = [0] } = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10
  });
  const ok = okStatuses.includes(result.status ?? 1);
  return {
    ok,
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    command: ['git', ...args].join(' ')
  };
}

function usage() {
  console.log(`Usage:
  node scripts/share-preflight.mjs [--manifest webflow.json] [--forbid cato,control] [--allow-dirty] [--no-fetch] [--json]

Fails closed before Webflow Code Component library sharing unless:
- ${APPROVAL_ENV}=1 is set after explicit approval
- the current branch has an upstream and is not behind it
- relevant webflow-components files are clean, unless --allow-dirty or ${ALLOW_DIRTY_ENV}=1 is intentionally supplied
- when --forbid is supplied: the manifest resolves at least one component and none under the forbidden component directories

This command does not mutate Webflow. It may run git fetch unless --no-fetch is supplied.`);
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }

  const manifest = readManifest(options.manifest);
  const manifestScope =
    options.forbid.length > 0
      ? evaluateManifestScope({
          matches: resolveManifestComponents(manifest.componentGlobs),
          forbid: options.forbid
        })
      : { ok: true, failures: [] };

  if (options.fetch) {
    const fetch = runGit(['fetch', '--quiet']);
    if (!fetch.ok) {
      throw new Error(`git fetch failed:\n${fetch.stderr || fetch.stdout}`.trim());
    }
  }

  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!branch.ok) throw new Error(`Could not read current branch:\n${branch.stderr}`.trim());

  const upstreamResult = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], {
    okStatuses: [0, 128]
  });
  const upstream = upstreamResult.ok && upstreamResult.status === 0 ? upstreamResult.stdout.trim() : '';

  const divergence = upstream
    ? parseAheadBehind(runGit(['rev-list', '--left-right', '--count', 'HEAD...@{u}']).stdout)
    : { ahead: 0, behind: 0 };

  const status = runGit(['status', '--porcelain=v1', '--', 'packages/webflow-components']);
  if (!status.ok) throw new Error(`Could not inspect package status:\n${status.stderr}`.trim());
  const dirtyEntries = relevantDirtyEntries(parseGitPorcelain(status.stdout));

  const result = {
    package: '@create-something/webflow-components',
    branch: branch.stdout.trim(),
    upstream,
    manifest,
    divergence,
    dirtyRelevantFiles: dirtyEntries.map((entry) => entry.raw),
    approvalEnv: options.approvalEnv,
    ...evaluatePreflight({
      approvalValue: process.env[options.approvalEnv],
      dirtyEntries,
      divergence,
      upstream,
      allowDirty: options.allowDirty
    })
  };

  if (!manifestScope.ok) {
    result.failures.unshift(...manifestScope.failures);
    result.ok = false;
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Webflow library preflight: ${manifest.libraryName} (${manifest.libraryId})`);
    console.log(`Branch: ${result.branch}${upstream ? ` -> ${upstream}` : ' (no upstream)'}`);
    console.log(`Divergence: ahead=${divergence.ahead} behind=${divergence.behind}`);
    console.log(`Dirty relevant files: ${dirtyEntries.length}`);
    for (const warning of result.warnings) console.warn(`WARN ${warning}`);
    for (const failure of result.failures) console.error(`FAIL ${failure}`);
  }

  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
