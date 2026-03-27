#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '..');
const workspaceRoot = path.resolve(packageRoot, '..', '..');
const remoteRoot = path.join(packageRoot, 'workers', 'remote');
const runtimeDir = path.join(remoteRoot, 'runtime');

function run(command, args, cwd = workspaceRoot) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resetRuntimeDirectory() {
  fs.rmSync(runtimeDir, { recursive: true, force: true });
  fs.mkdirSync(runtimeDir, { recursive: true });
}

function pruneRuntimeDirectory() {
  const keep = new Set(['dist', 'node_modules', 'package.json']);
  for (const entry of fs.readdirSync(runtimeDir)) {
    if (keep.has(entry)) continue;
    fs.rmSync(path.join(runtimeDir, entry), { recursive: true, force: true });
  }
}

resetRuntimeDirectory();
run('pnpm', ['--filter', '@create-something/observability', 'build']);
run('pnpm', ['--filter', '@create-something/webflow-site-analyzer-mcp', 'build']);
run('pnpm', ['--filter', '@create-something/webflow-site-analyzer-mcp', '--prod', 'deploy', runtimeDir]);
pruneRuntimeDirectory();

console.log(`[prepare-remote-runtime] runtime prepared at ${path.relative(workspaceRoot, runtimeDir)}`);
