#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_NAME = '@create-something/workflow-compiler';
const REPOSITORY_URL = 'git+https://github.com/createsomethingtoday/create-something-monorepo.git';
const REPOSITORY_DIRECTORY = 'packages/workflow-compiler';
const REQUIRED_FILES = [
  'dist',
  'fixtures/release-promotion',
  'skills',
  'API.md',
  'CHANGELOG.md',
  'COMPATIBILITY.md',
  'LICENSE',
  'MIGRATING.md',
  'README.md',
  'RELEASING.md',
  'SYSTEM.md',
  'THREAT_MODEL.md'
];

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function hasEntries(value) {
  return value !== undefined && value !== null && Object.keys(value).length > 0;
}

export function validateReleaseManifest(manifest) {
  const issues = [];

  if (manifest.name !== PACKAGE_NAME) {
    issues.push(`name must equal ${PACKAGE_NAME}.`);
  }
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version ?? '')) {
    issues.push('version must be an explicit semantic version.');
  }
  if (manifest.type !== 'module') issues.push('type must equal module.');
  if (manifest.private === true) issues.push('the public package may not be private.');
  if (manifest.license !== 'MIT') issues.push('license must equal MIT.');
  if (
    manifest.repository?.type !== 'git' ||
    manifest.repository?.url !== REPOSITORY_URL ||
    manifest.repository?.directory !== REPOSITORY_DIRECTORY
  ) {
    issues.push('repository must target the workflow-compiler directory in the public monorepo.');
  }
  if (manifest.engines?.node !== '>=20') {
    issues.push('engines.node must equal >=20.');
  }
  if (manifest.publishConfig?.access !== 'public') {
    issues.push('publishConfig.access must be public.');
  }
  if (manifest.publishConfig?.provenance !== true) {
    issues.push('publishConfig.provenance must be true.');
  }
  if (
    hasEntries(manifest.dependencies) ||
    hasEntries(manifest.optionalDependencies) ||
    hasEntries(manifest.peerDependencies)
  ) {
    issues.push('The public package must have zero runtime dependencies.');
  }
  if (manifest.main !== 'dist/index.js' || manifest.types !== 'dist/index.d.ts') {
    issues.push('main and types must target the compiled public index.');
  }
  if (manifest.bin?.['workflow-compiler'] !== 'dist/cli.js') {
    issues.push('bin.workflow-compiler must target dist/cli.js.');
  }
  for (const required of REQUIRED_FILES) {
    if (!manifest.files?.includes(required)) {
      issues.push(`files must explicitly include ${required}.`);
    }
  }

  return issues;
}

export function validateReleaseLock(manifest, lock) {
  const issues = [];
  if (
    lock.name !== manifest.name ||
    lock.version !== manifest.version ||
    lock.lockfileVersion !== 3
  ) {
    issues.push('package-lock.json must bind the exact package name, version, and lockfile v3.');
  }
  const root = lock.packages?.[''];
  if (
    root?.name !== manifest.name ||
    root?.version !== manifest.version ||
    JSON.stringify(root?.devDependencies) !== JSON.stringify(manifest.devDependencies)
  ) {
    issues.push('package-lock.json root metadata must match the release manifest.');
  }
  for (const dependency of Object.keys(manifest.devDependencies ?? {}).sort()) {
    const locked = lock.packages?.[`node_modules/${dependency}`];
    if (
      !locked?.version ||
      typeof locked.resolved !== 'string' ||
      !locked.resolved.startsWith('https://registry.npmjs.org/') ||
      typeof locked.integrity !== 'string' ||
      locked.link === true
    ) {
      issues.push(
        `package-lock.json must pin ${dependency} to a registry artifact with integrity.`
      );
    }
  }
  return issues;
}

export function assertExactPackageInventory(actual, expected) {
  const normalizedActual = [...actual].sort();
  const normalizedExpected = [...expected].sort();
  if (JSON.stringify(normalizedActual) !== JSON.stringify(normalizedExpected)) {
    throw new Error(
      [
        'Packed files do not match the committed inventory.',
        `Expected: ${JSON.stringify(normalizedExpected)}`,
        `Actual:   ${JSON.stringify(normalizedActual)}`
      ].join('\n')
    );
  }
}

export async function assertSafePackageSourceInventory(root, files) {
  for (const file of files) {
    const segments = typeof file === 'string' ? file.split('/') : [];
    if (
      segments.length === 0 ||
      isAbsolute(file) ||
      file.includes('\\') ||
      segments.some((segment) => !segment || segment === '.' || segment === '..')
    ) {
      throw new Error(`Unsafe package inventory path: ${String(file)}`);
    }
    let current = root;
    for (const [index, segment] of segments.entries()) {
      current = join(current, segment);
      const metadata = await lstat(current);
      if (metadata.isSymbolicLink()) {
        throw new Error(`Package inventory may not traverse a symbolic link: ${file}`);
      }
      const final = index === segments.length - 1;
      if ((!final && !metadata.isDirectory()) || (final && !metadata.isFile())) {
        throw new Error(`Package inventory path has an invalid source type: ${file}`);
      }
    }
  }
}

function readPackFiles() {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: packageRoot,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error(`npm pack --dry-run failed:\n${result.stderr || result.stdout}`);
  }
  const report = JSON.parse(result.stdout);
  return report[0].files.map((entry) => entry.path).sort();
}

async function main() {
  const manifest = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(resolve(packageRoot, 'package-lock.json'), 'utf8'));
  const inventory = JSON.parse(await readFile(resolve(packageRoot, 'package-files.json'), 'utf8'));
  const issues = validateReleaseManifest(manifest);
  issues.push(...validateReleaseLock(manifest, lock));
  if (inventory.schemaVersion !== 'workflow_compiler_package_inventory.v1') {
    issues.push('package-files.json must use workflow_compiler_package_inventory.v1.');
  }
  if (inventory.packageVersion !== manifest.version) {
    issues.push('package-files.json packageVersion must equal package.json version.');
  }
  const changelog = await readFile(resolve(packageRoot, 'CHANGELOG.md'), 'utf8');
  if (!changelog.includes(`## ${manifest.version}`)) {
    issues.push(`CHANGELOG.md must include ## ${manifest.version}.`);
  }
  if (issues.length > 0) {
    throw new Error(issues.join('\n'));
  }
  await assertSafePackageSourceInventory(packageRoot, inventory.files);
  const actual = readPackFiles();
  assertExactPackageInventory(actual, inventory.files);
  process.stdout.write(
    `${JSON.stringify({ ok: true, package: manifest.name, version: manifest.version, files: actual.length })}\n`
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
