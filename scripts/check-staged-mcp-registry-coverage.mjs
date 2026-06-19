#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { posix as path } from 'node:path';
import { fileURLToPath } from 'node:url';

const COVERAGE_SCRIPT_PATH = 'scripts/mcp-registry-coverage.mjs';

export function extractPackageCoverageKeys(source) {
  const keys = [];
  let inCoverageBlock = false;

  for (const line of source.split('\n')) {
    if (!inCoverageBlock) {
      if (line.includes('const PACKAGE_COVERAGE = {')) {
        inCoverageBlock = true;
      }
      continue;
    }

    if (line === '};') {
      break;
    }

    const match = line.match(/^\s+'([^']+)':\s+\{$/);
    if (match) {
      keys.push(match[1]);
    }
  }

  if (!inCoverageBlock) {
    throw new Error(`Unable to locate PACKAGE_COVERAGE in ${COVERAGE_SCRIPT_PATH}.`);
  }

  return new Set(keys);
}

export function isMcpPackage(packageDir, packageName) {
  return /mcp/i.test(`${packageName ?? ''} ${packageDir}`);
}

export function findMissingCoverageForStagedFiles(stagedFiles, packageJsonByDir, coverageKeys) {
  const candidateDirs = new Set();

  for (const stagedPath of stagedFiles) {
    if (!stagedPath.startsWith('packages/')) continue;

    let currentDir = path.dirname(stagedPath);
    while (currentDir.startsWith('packages/')) {
      const packageName = packageJsonByDir[currentDir];
      if (packageName != null && isMcpPackage(currentDir, packageName)) {
        candidateDirs.add(currentDir);
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }
  }

  return [...candidateDirs].filter((packageDir) => !coverageKeys.has(packageDir)).sort();
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
  const output = runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  return output.split('\n').map((entry) => entry.trim()).filter(Boolean);
}

function readIndexOrHeadBlob(pathname) {
  return tryRunGit(['show', `:${pathname}`]) ?? tryRunGit(['show', `HEAD:${pathname}`]);
}

function buildPackageJsonByDir(stagedFiles) {
  const packageJsonByDir = {};

  for (const stagedPath of stagedFiles) {
    if (!stagedPath.startsWith('packages/')) continue;

    let currentDir = path.dirname(stagedPath);
    while (currentDir.startsWith('packages/')) {
      if (Object.hasOwn(packageJsonByDir, currentDir)) {
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break;
        currentDir = parentDir;
        continue;
      }

      const packageJsonText = readIndexOrHeadBlob(`${currentDir}/package.json`);
      if (packageJsonText == null) {
        packageJsonByDir[currentDir] = null;
      } else {
        const manifest = JSON.parse(packageJsonText);
        packageJsonByDir[currentDir] = manifest.name ?? '';
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }
  }

  return packageJsonByDir;
}

function printFailure(missingDirs) {
  console.error('Staged MCP package paths are missing PACKAGE_COVERAGE classification.');
  console.error('');
  console.error('Missing coverage entries:');
  for (const packageDir of missingDirs) {
    console.error(`- ${packageDir}`);
  }
  console.error('');
  console.error(`Update ${COVERAGE_SCRIPT_PATH} before committing.`);
  console.error('Recommended fix: pnpm mcp:registry:coverage and add the missing package path entries.');
}

function main() {
  const stagedFiles = readStagedFiles();
  const relevantStagedFiles = stagedFiles.filter(
    (pathname) => pathname.startsWith('packages/') || pathname === COVERAGE_SCRIPT_PATH,
  );

  if (relevantStagedFiles.length === 0) {
    return;
  }

  const coverageSource = readIndexOrHeadBlob(COVERAGE_SCRIPT_PATH);
  if (coverageSource == null) {
    throw new Error(`Unable to read ${COVERAGE_SCRIPT_PATH} from the index or HEAD.`);
  }

  const missingDirs = findMissingCoverageForStagedFiles(
    relevantStagedFiles,
    buildPackageJsonByDir(relevantStagedFiles),
    extractPackageCoverageKeys(coverageSource),
  );

  if (missingDirs.length === 0) {
    return;
  }

  printFailure(missingDirs);
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
