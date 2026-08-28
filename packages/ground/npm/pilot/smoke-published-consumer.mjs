#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pilotDirectory = dirname(fileURLToPath(import.meta.url));
const [packageSpec, platformId, expectedSourceSha, outputPath] = process.argv.slice(2);

assert(
  packageSpec && platformId && expectedSourceSha && outputPath,
  [
    'Usage: node smoke-published-consumer.mjs',
    '<package-spec> <platform-id> <expected-source-sha> <receipt-path>'
  ].join(' ')
);
assert.match(expectedSourceSha, /^[0-9a-f]{40}$/);

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    ...options
  });
}

async function installPublishedPackage(directory) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  let lastResult;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    if (attempt > 1) {
      rmSync(join(directory, 'node_modules'), { recursive: true, force: true });
      rmSync(join(directory, 'package-lock.json'), { force: true });
    }
    lastResult = run(
      npmCommand,
      ['install', '--ignore-scripts=false', '--no-audit', '--no-fund', '--save-exact', packageSpec],
      { cwd: directory, shell: process.platform === 'win32' }
    );
    if (lastResult.status === 0) return;
    if (attempt < 8) await new Promise((resolveDelay) => setTimeout(resolveDelay, 15_000));
  }
  assert.fail(
    `npm install ${packageSpec} failed (${lastResult?.status}): ${lastResult?.stderr ?? ''}`
  );
}

const consumerDirectory = mkdtempSync(join(tmpdir(), 'ground-published-consumer-'));
const intermediateReceipt = join(consumerDirectory, 'native-smoke.json');
try {
  writeFileSync(
    join(consumerDirectory, 'package.json'),
    `${JSON.stringify({ name: 'ground-ga-consumer', private: true, version: '1.0.0' }, null, 2)}\n`
  );
  await installPublishedPackage(consumerDirectory);

  const installedPackageDirectory = join(
    consumerDirectory,
    'node_modules',
    '@createsomething',
    'ground-mcp'
  );
  const installedManifest = JSON.parse(
    readFileSync(join(installedPackageDirectory, 'package.json'), 'utf8')
  );
  const packageLock = JSON.parse(
    readFileSync(join(consumerDirectory, 'package-lock.json'), 'utf8')
  );
  const lockEntry = packageLock.packages?.['node_modules/@createsomething/ground-mcp'];
  const smokeResult = run(process.execPath, [
    resolve(pilotDirectory, 'smoke-native-release.mjs'),
    join(installedPackageDirectory, 'bin', 'ground.js'),
    join(installedPackageDirectory, 'bin', 'ground-mcp.js'),
    platformId,
    intermediateReceipt
  ]);
  assert.equal(
    smokeResult.status,
    0,
    `published package smoke failed (${smokeResult.status}): ${smokeResult.stderr}`
  );
  const nativeReceipt = JSON.parse(readFileSync(intermediateReceipt, 'utf8'));
  assert.equal(nativeReceipt.source_sha, expectedSourceSha);
  assert.equal(nativeReceipt.version, installedManifest.version);
  assert.equal(installedManifest.name, '@createsomething/ground-mcp');
  assert.match(lockEntry?.integrity ?? '', /^sha512-/);

  const receipt = {
    schema_version: 'ground-published-consumer-smoke.v1',
    platform: platformId,
    version: installedManifest.version,
    source_sha: nativeReceipt.source_sha,
    package: {
      name: installedManifest.name,
      spec: packageSpec,
      integrity: lockEntry.integrity,
      lifecycle_scripts_enabled: true,
      fresh_directory: true
    },
    cli_version: nativeReceipt.cli_version,
    mcp: nativeReceipt.mcp,
    language_smokes: nativeReceipt.language_smokes,
    ready: true
  };
  writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
} finally {
  rmSync(consumerDirectory, { recursive: true, force: true });
}
