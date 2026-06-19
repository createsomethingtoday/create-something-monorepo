#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const requiredFiles = [
  'AGENTS.md',
  '.devcontainer/devcontainer.json',
  '.nvmrc',
  '.ona/automations.yaml',
  '.ona/scripts/bootstrap.sh',
  '.ona/skills/create-something-monorepo-workflow/SKILL.md',
  'config/workspace-lanes.json',
  'docs/guides/ONA_CORE_ROLLOUT.md'
];

const requiredServices = ['agency-dev', 'product-dev', 'services-dev', 'platform-dev'];
const requiredTasks = ['bootstrap', 'agency-check', 'repo-lint', 'repo-check'];
const requiredScripts = ['dev:agency', 'dev:product', 'dev:services', 'dev:platform'];
const requiredLanes = ['product', 'services', 'platform'];

const failures = [];

function rel(filePath) {
  return filePath.split(path.sep).join('/');
}

function readText(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

for (const relativePath of requiredFiles) {
  if (!existsSync(path.join(repoRoot, relativePath))) {
    failures.push(`Missing required Ona rollout file: ${relativePath}`);
  }
}

if (failures.length === 0) {
  const packageJson = JSON.parse(readText('package.json'));
  const scripts =
    packageJson.scripts && typeof packageJson.scripts === 'object' ? packageJson.scripts : {};

  for (const scriptName of requiredScripts) {
    if (typeof scripts[scriptName] !== 'string') {
      failures.push(`Missing package script: ${scriptName}`);
    }
  }

  const nvmVersion = readText('.nvmrc').trim();
  if (nvmVersion !== '22.21.1') {
    failures.push(`Expected .nvmrc to pin Node 22.21.1, found ${nvmVersion || '(empty)'}`);
  }

  const devcontainer = readText('.devcontainer/devcontainer.json');
  for (const expected of ['"NODE_VERSION": "22.21.1"', '"PNPM_VERSION": "9.15.0"']) {
    if (!devcontainer.includes(expected)) {
      failures.push(`Missing devcontainer runtime pin: ${expected}`);
    }
  }

  const automations = readText('.ona/automations.yaml');
  for (const serviceName of requiredServices) {
    if (!automations.includes(`${serviceName}:`)) {
      failures.push(`Missing Ona service: ${serviceName}`);
    }
  }
  for (const taskName of requiredTasks) {
    if (!automations.includes(`${taskName}:`)) {
      failures.push(`Missing Ona task: ${taskName}`);
    }
  }

  const laneConfig = JSON.parse(readText('config/workspace-lanes.json'));
  for (const laneName of requiredLanes) {
    if (!Array.isArray(laneConfig?.lanes?.[laneName])) {
      failures.push(`Missing workspace lane: ${laneName}`);
    }
  }

  const guide = readText('docs/guides/ONA_CORE_ROLLOUT.md');
  for (const projectName of ['`agency`', '`product`', '`services`', '`platform`']) {
    if (!guide.includes(projectName)) {
      failures.push(`Ona rollout guide does not mention project ${projectName}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Ona rollout check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Ona rollout check passed.');
console.log(`Checked ${requiredFiles.length} files from ${rel(repoRoot)}.`);
