#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DEPENDENCY_KEYS = ['dependencies', 'devDependencies', 'optionalDependencies'];
const ROOT_PNPM_KEYS = ['overrides', 'patchedDependencies'];

function sortRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return {};
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function stableJson(value) {
  return JSON.stringify(value, null, 2);
}

function createEmptyManifestSnapshot(pathname) {
  const snapshot = Object.fromEntries(DEPENDENCY_KEYS.map((key) => [key, {}]));

  if (pathname === 'package.json') {
    snapshot.pnpm = Object.fromEntries(ROOT_PNPM_KEYS.map((key) => [key, {}]));
  }

  return snapshot;
}

function readManifestSnapshot(pathname, text) {
  if (text == null) return createEmptyManifestSnapshot(pathname);

  const manifest = JSON.parse(text);
  const snapshot = Object.fromEntries(
    DEPENDENCY_KEYS.map((key) => [key, sortRecord(manifest[key])]),
  );

  if (pathname === 'package.json') {
    const pnpmConfig = manifest.pnpm && typeof manifest.pnpm === 'object' ? manifest.pnpm : {};
    snapshot.pnpm = Object.fromEntries(
      ROOT_PNPM_KEYS.map((key) => [key, sortRecord(pnpmConfig[key])]),
    );
  }

  return snapshot;
}

export function manifestsRequireLockfileUpdate(pathname, previousText, nextText) {
  return (
    stableJson(readManifestSnapshot(pathname, previousText)) !==
    stableJson(readManifestSnapshot(pathname, nextText))
  );
}

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trimEnd();
}

function tryRunGit(args) {
  try {
    return runGit(args);
  } catch {
    return null;
  }
}

function readStagedFiles() {
  const output = runGit(['diff', '--cached', '--name-only', '--diff-filter=ACDMR']);
  return output.split('\n').map((entry) => entry.trim()).filter(Boolean);
}

function readGitBlob(spec) {
  return tryRunGit(['show', spec]);
}

function isPackageManifest(pathname) {
  return pathname === 'package.json' || pathname.endsWith('/package.json');
}

function printFailure(changedManifests) {
  console.error('Dependency-relevant package manifest changes are staged without pnpm-lock.yaml.');
  console.error('');
  console.error('Affected manifests:');
  for (const pathname of changedManifests) {
    console.error(`- ${pathname}`);
  }
  console.error('');
  console.error('Update and stage the lockfile before committing.');
  console.error('Recommended fix: pnpm install --lockfile-only --ignore-scripts');
}

function main() {
  const stagedFiles = readStagedFiles();
  const manifestFiles = stagedFiles.filter(isPackageManifest);

  if (manifestFiles.length === 0) {
    return;
  }

  const changedDependencyManifests = manifestFiles.filter((pathname) =>
    manifestsRequireLockfileUpdate(
      pathname,
      readGitBlob(`HEAD:${pathname}`),
      readGitBlob(`:${pathname}`),
    ),
  );

  if (changedDependencyManifests.length === 0) {
    return;
  }

  if (stagedFiles.includes('pnpm-lock.yaml')) {
    return;
  }

  printFailure(changedDependencyManifests);
  process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
