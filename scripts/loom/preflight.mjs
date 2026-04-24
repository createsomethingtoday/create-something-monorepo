#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const IS_WINDOWS = process.platform === 'win32';
const LM_FILENAME = IS_WINDOWS ? 'lm.exe' : 'lm';
const CARGO_FILENAME = IS_WINDOWS ? 'cargo.exe' : 'cargo';
const MANIFEST_PATH = path.join(ROOT, 'packages', 'loom', 'Cargo.toml');
const DEFAULT_REMOTE_ENDPOINT = 'https://loom.mcp.createsomething.agency/mcp';
const BOOTSTRAP_BINARY_PATH = path.join(ROOT, 'packages', 'loom', 'npm', 'bin', LM_FILENAME);

function isExecutable(filePath) {
  if (!filePath) {
    return false;
  }

  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function findOnPath(filename) {
  const pathEntries = (process.env.PATH ?? '')
    .split(path.delimiter)
    .filter(Boolean);

  for (const entry of pathEntries) {
    const candidate = path.join(entry, filename);
    if (isExecutable(candidate)) {
      return candidate;
    }
  }

  return null;
}

function detectLocalRunner() {
  const envLm = process.env.LM_BIN;
  if (isExecutable(envLm)) {
    return { mode: 'env', command: envLm };
  }

  if (isExecutable(BOOTSTRAP_BINARY_PATH)) {
    return { mode: 'repo-bootstrap', command: BOOTSTRAP_BINARY_PATH };
  }

  const repoReleaseBinary = path.join(ROOT, 'packages', 'loom', 'target', 'release', LM_FILENAME);
  if (isExecutable(repoReleaseBinary)) {
    return { mode: 'repo-release', command: repoReleaseBinary };
  }

  const workspaceReleaseBinary = path.join(ROOT, 'target', 'release', LM_FILENAME);
  if (isExecutable(workspaceReleaseBinary)) {
    return { mode: 'workspace-release', command: workspaceReleaseBinary };
  }

  const pathLm = findOnPath(LM_FILENAME);
  if (pathLm) {
    return { mode: 'path', command: pathLm };
  }

  const cargo = findOnPath(CARGO_FILENAME);
  if (cargo && fs.existsSync(MANIFEST_PATH)) {
    return {
      mode: 'cargo',
      command: cargo,
      args: ['run', '--quiet', '--manifest-path', MANIFEST_PATH, '--bin', 'lm', '--'],
    };
  }

  return null;
}

function main() {
  const json = process.argv.includes('--json');
  const localRunner = detectLocalRunner();
  const remoteEndpoint = process.env.LOOM_REMOTE_ENDPOINT || DEFAULT_REMOTE_ENDPOINT;
  const remoteTokenPresent = Boolean(process.env.LOOM_MCP_API_TOKEN);
  const localLoomDir = path.join(ROOT, '.loom');

  const summary = {
    repoRoot: ROOT,
    local: {
      loomDir: localLoomDir,
      loomDirPresent: fs.existsSync(localLoomDir),
      runnerAvailable: Boolean(localRunner),
      runner: localRunner,
      bootstrapCommand: 'pnpm loom:local:bootstrap',
      recommendedCommand: 'pnpm loom:local ready',
    },
    remote: {
      endpoint: remoteEndpoint,
      tokenPresent: remoteTokenPresent,
      recommendedCommand: 'pnpm loom:remote ready',
    },
    recommendation: remoteTokenPresent
      ? 'Use remote Loom for shared coordination; use local Loom only for local-only workflows, migration/export, or rollback.'
      : localRunner
        ? 'Remote Loom is not configured here; local Loom is available for local-only workflows.'
        : 'Neither remote Loom nor local Loom is ready in this environment. Run `pnpm loom:local:bootstrap` to install a repo-local binary, or configure `LOOM_MCP_API_TOKEN` for remote Loom.',
  };

  if (json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log('Loom preflight');
    console.log(`- repo root: ${summary.repoRoot}`);
    console.log(`- local .loom data: ${summary.local.loomDirPresent ? `present (${summary.local.loomDir})` : 'missing'}`);
    console.log(
      `- local Loom runner: ${
        summary.local.runnerAvailable
          ? `${summary.local.runner.mode}${summary.local.runner.command ? ` (${summary.local.runner.command})` : ''}`
          : 'unavailable'
      }`,
    );
    console.log(`- remote Loom token: ${summary.remote.tokenPresent ? 'present' : 'missing'}`);
    console.log(`- remote Loom endpoint: ${summary.remote.endpoint}`);
    console.log('');
    console.log('Recommended commands');
    console.log(`- shared lanes: ${summary.remote.recommendedCommand}`);
    console.log(`- local-only lanes: ${summary.local.recommendedCommand}`);
    console.log('');
    console.log(summary.recommendation);
  }

  const ok = remoteTokenPresent || Boolean(localRunner);
  process.exit(ok ? 0 : 1);
}

main();
