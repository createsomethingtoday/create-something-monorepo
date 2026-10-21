import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const ADVISORIES = ['GHSA-jmr9-qjv8-65gv', 'GHSA-7pqw-9j4j-h8q3'];
const INSTALL_ROOTS = ['workspace', 'standalone-motion-ontology'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// This is deliberately a single-package contract, not a generic advisory allowlist.
export function validateLocalRemediation(record) {
  assert.equal(record?.id, 'extract-zip-2.0.1-local-backport', 'Unknown local remediation');
  assert.equal(record.package, 'extract-zip');
  assert.equal(record.version, '2.0.1');
  assert.deepEqual(record.advisories, ADVISORIES, 'Both advisory identities are required');
  assert.deepEqual(record.installRoots, INSTALL_ROOTS, 'Complete installation coverage is required');
  assert.equal(record.suppressesScanner, false, 'Scanner suppression is forbidden');
  assert.equal(record.humanReviewRequired, true, 'Human review remains required');
  assert.equal(record.runtimeExposure, 'tooling-only');
  assert.match(record.owner ?? '', /\S/);
  assert.match(record.trackingIssue ?? '', /^CRE-\d+$/);
  assert.match(record.backportSourceCommit ?? '', /^[a-f0-9]{40}$/);
  for (const key of ['regressionSuiteSha256', 'historicalExceptionSha256']) assert.match(record[key] ?? '', /^[a-f0-9]{64}$/);
  assert.equal(record.historicalException, 'security/advisory-history/extract-zip-exception-expired-2026-10-20.json');
  assert.ok(Array.isArray(record.limitations) && record.limitations.length >= 3);
  assert.equal(record.provenance?.upstreamVersion, '2.0.1');
  assert.deepEqual(record.provenance?.advisories, ADVISORIES);
  for (const key of ['patchedIndexSha256', 'patchSha256', 'standaloneTarballSha256']) assert.match(record.provenance[key] ?? '', /^[a-f0-9]{64}$/);
  assert.match(record.provenance.upstreamSha512 ?? '', /^[A-Za-z0-9+/]{86}==$/);
}

export function verifyRecordFiles(root, record) {
  validateLocalRemediation(record);
  const read = path => readFileSync(join(root, path));
  assert.deepEqual(JSON.parse(read('security/extract-zip/provenance.json')), record.provenance, 'Provenance does not match the review record');
  assert.equal(sha(read('security/extract-zip/security.test.cjs')), record.regressionSuiteSha256, 'Regression suite changed; review record must be updated');
  assert.equal(sha(read(record.historicalException)), record.historicalExceptionSha256, 'Historical exception evidence changed');
  // verify-installed additionally checks upstream, patch, vendor archive and installed code bytes.
}

export function validateInstallReceipt(receipt, expected) {
  assert.equal(receipt?.sha256, expected, 'Installed bytes do not match remediation');
  assert.ok(Number.isSafeInteger(receipt.packagesChecked) && receipt.packagesChecked > 0, 'Missing dependency traversal');
  assert.ok(Array.isArray(receipt.verifiedExtractZip) && receipt.verifiedExtractZip.length > 0, 'No installed extractor verified');
}

export function verifyInstall(root, installation, expected) {
  // No caller-provided receipt or skip switch: generate evidence by executing the verifier.
  const output = execFileSync(process.execPath, [join(root, 'security/extract-zip/verify-installed.mjs'), installation], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  process.stdout.write(output);
  const receipt = JSON.parse(output.trim().split('\n').at(-1));
  validateInstallReceipt(receipt, expected);
  return receipt;
}

export async function verifyLocalRemediation(root, record) {
  verifyRecordFiles(root, record);
  // CI gates install from a fresh checkout, frozen lockfile, scripts disabled.
  const workspace = verifyInstall(root, root, record.provenance.patchedIndexSha256);
  const standalone = mkdtempSync(join(tmpdir(), 'extract-remediation-'));
  try {
    const source = join(root, 'packages/huggingface-spaces/motion-ontology');
    mkdirSync(join(standalone, 'vendor'));
    for (const file of ['package.json', 'package-lock.json', 'vendor/extract-zip-2.0.1-backport.tgz']) copyFileSync(join(source, file), join(standalone, file));
    // Isolated from workspace node_modules, and before any package lifecycle code.
    execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--ignore-scripts', '--no-fund'], { cwd: standalone, stdio: 'inherit', shell: process.platform === 'win32' });
    const installed = verifyInstall(root, standalone, record.provenance.patchedIndexSha256);
    console.log(JSON.stringify({ remediation: record.id, coverage: { workspace, standalone: installed }, humanReviewRequired: true, scannerSuppression: false }));
  } finally {
    rmSync(standalone, { recursive: true, force: true });
  }
}
