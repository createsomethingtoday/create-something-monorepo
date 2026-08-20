#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: process.cwd(),
  encoding: 'utf8'
}).trim();
const packageArgument = process.argv.indexOf('--package');
const packagePath = packageArgument >= 0 ? process.argv[packageArgument + 1] : null;
const approvedPackages = new Set(['packages/mcp-authz', 'packages/mcp-core']);
const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts']);

if (packageArgument < 0 || !packagePath) throw new Error('Usage: --package <pilot-package-path>');
if (!approvedPackages.has(packagePath)) throw new Error(`Not an approved evidence-lint pilot package: ${packagePath}`);

const config = resolve(root, packagePath, 'eslint.evidence.config.mjs');
const entrypoint = resolve(root, packagePath, 'src/index.ts');
if (!existsSync(config) || !existsSync(entrypoint)) throw new Error(`Incomplete pilot configuration for ${packagePath}`);

const runEslint = (argumentsList, options = {}) => {
  const result = spawnSync('pnpm', ['exec', 'eslint', ...argumentsList], {
    cwd: root,
    encoding: 'utf8',
    stdio: options.silent ? 'pipe' : 'inherit'
  });
  if (result.status !== 0) throw new Error(`ESLint failed for ${packagePath}`);
};

// Always resolve the config so an empty changed-file set cannot disguise a broken pilot.
runEslint(['--config', config, '--print-config', entrypoint], { silent: true });

const changed = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', 'origin/main', '--', `${packagePath}/src`], {
  cwd: root,
  encoding: 'utf8'
})
  .split('\n')
  .filter(Boolean)
  .filter((path) => sourceExtensions.has(path.slice(path.lastIndexOf('.'))));

if (changed.length === 0) {
  console.log(`Evidence lint pilot: ${packagePath} has no changed owned source files against origin/main.`);
  process.exit(0);
}

runEslint(['--config', config, ...changed]);
