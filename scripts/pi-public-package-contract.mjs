#!/usr/bin/env node

import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPOSITORY_URL =
  'git+https://github.com/createsomethingtoday/create-something-monorepo.git';
const REQUIRED_FILES = ['README.md', 'LICENSE', 'CHANGELOG.md'];
const RESOURCE_KEYS = ['skills', 'prompts', 'extensions'];

async function pathExists(target) {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function isSafeRelativePath(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    value.split(/[\\/]/).every((segment) => segment && segment !== '.' && segment !== '..')
  );
}

async function walk(root, relative, output) {
  const absolute = path.join(root, relative);
  const stat = await lstat(absolute);
  if (stat.isSymbolicLink()) {
    throw new Error(`Published Pi packages may not contain symlinks: ${relative}`);
  }
  if (stat.isFile()) {
    output.add(relative.split(path.sep).join('/'));
    return;
  }
  if (!stat.isDirectory()) {
    throw new Error(`Unsupported package entry: ${relative}`);
  }
  for (const entry of await readdir(absolute)) {
    await walk(root, path.join(relative, entry), output);
  }
}

export async function collectDeclaredFiles(packageRoot) {
  const root = path.resolve(packageRoot);
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const output = new Set(['package.json']);
  for (const entry of packageJson.files ?? []) {
    if (!isSafeRelativePath(entry)) {
      throw new Error(`Unsafe package files entry: ${String(entry)}`);
    }
    if (!(await pathExists(path.join(root, entry)))) {
      throw new Error(`Declared package file does not exist: ${entry}`);
    }
    await walk(root, entry, output);
  }
  return [...output].sort();
}

export async function validatePiPackage(packageRoot) {
  const root = path.resolve(packageRoot);
  const issues = [];
  let packageJson;
  try {
    packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  } catch (error) {
    return [`package.json must be readable JSON: ${error.message}`];
  }

  if (!/^@create-something\/pi-[a-z0-9-]+$/.test(packageJson.name ?? '')) {
    issues.push('Package name must use the @create-something/pi-* public scope.');
  }
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageJson.version ?? '')) {
    issues.push('Package version must be an explicit semantic version.');
  }
  if (packageJson.license !== 'MIT') issues.push('Package license must be MIT.');
  if (packageJson.type !== 'module') issues.push('Package type must be module.');
  if (packageJson.private === true) issues.push('Public Pi package may not be private.');
  if (packageJson.publishConfig?.access !== 'public') {
    issues.push('publishConfig.access must be public.');
  }
  if (packageJson.publishConfig?.provenance !== true) {
    issues.push('publishConfig.provenance must be true.');
  }
  if (packageJson.repository?.type !== 'git' || packageJson.repository?.url !== REPOSITORY_URL) {
    issues.push(`Package repository must be ${REPOSITORY_URL}.`);
  }
  const expectedDirectory = `packages/${packageJson.name?.split('/').at(-1) ?? ''}`;
  if (packageJson.repository?.directory !== expectedDirectory) {
    issues.push(`repository.directory must be ${expectedDirectory}.`);
  }

  const declaredFiles = packageJson.files ?? [];
  for (const required of REQUIRED_FILES) {
    if (!declaredFiles.includes(required)) issues.push(`files must explicitly include ${required}.`);
    if (!(await pathExists(path.join(root, required)))) issues.push(`${required} must exist.`);
  }
  const changelog = (await pathExists(path.join(root, 'CHANGELOG.md')))
    ? await readFile(path.join(root, 'CHANGELOG.md'), 'utf8')
    : '';
  if (packageJson.version && !changelog.includes(`## ${packageJson.version}`)) {
    issues.push(`CHANGELOG.md must include ## ${packageJson.version}.`);
  }

  for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const [name, version] of Object.entries(packageJson[section] ?? {})) {
      if (String(version).startsWith('workspace:')) {
        issues.push(`${section}.${name} may not use workspace: in a public package.`);
      }
    }
  }

  const pi = packageJson.pi;
  if (!pi || typeof pi !== 'object') {
    issues.push('Package must declare Pi resource metadata.');
  } else {
    let resourceCount = 0;
    for (const key of RESOURCE_KEYS) {
      if (pi[key] === undefined) continue;
      if (!Array.isArray(pi[key]) || pi[key].length === 0) {
        issues.push(`pi.${key} must be a non-empty array.`);
        continue;
      }
      for (const resourcePath of pi[key]) {
        resourceCount += 1;
        const normalized = typeof resourcePath === 'string' ? resourcePath.replace(/^\.\//, '') : '';
        if (
          typeof resourcePath !== 'string' ||
          !resourcePath.startsWith('./') ||
          !isSafeRelativePath(normalized) ||
          !(await pathExists(path.join(root, normalized))) ||
          !declaredFiles.includes(normalized)
        ) {
          issues.push(`Invalid Pi resource path in pi.${key}: ${String(resourcePath)}.`);
        }
      }
    }
    if (resourceCount === 0) issues.push('Package must expose at least one Pi resource path.');
  }

  try {
    await collectDeclaredFiles(root);
  } catch (error) {
    issues.push(error.message);
  }
  return issues;
}

export async function readPackFiles(packageRoot) {
  const result = spawnSync(
    'npm',
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    { cwd: packageRoot, encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error(`npm pack --dry-run failed:\n${result.stderr || result.stdout}`);
  }
  const report = JSON.parse(result.stdout);
  return report[0].files.map((entry) => entry.path).sort();
}

async function main() {
  const args = process.argv.slice(2);
  const packageRoot = path.resolve(args.find((arg) => !arg.startsWith('--')) ?? '.');
  const verifyPack = args.includes('--pack');
  const issues = await validatePiPackage(packageRoot);
  if (issues.length > 0) {
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }
  if (verifyPack) {
    const expected = await collectDeclaredFiles(packageRoot);
    const actual = await readPackFiles(packageRoot);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      console.error('Packed files do not match the explicit package files contract.');
      console.error(`Expected: ${JSON.stringify(expected)}`);
      console.error(`Actual:   ${JSON.stringify(actual)}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Verified ${actual.length} packed files for ${path.basename(packageRoot)}.`);
    return;
  }
  console.log(`Validated public Pi package contract for ${path.basename(packageRoot)}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
