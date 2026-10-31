#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PLATFORMS = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64', 'win32-x64'];
const REQUIRED_TOOLS = ['ground_analyze', 'ground_diff', 'ground_verify_fix'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
function checksums(text, name) {
  const entries = new Map();
  for (const line of text.trim().split(/\r?\n/)) {
    const match = line.match(/^([a-f0-9]{64})\s+\*?([A-Za-z0-9_.-]+)$/);
    assert(match && !['.', '..'].includes(match[2]), `${name}: malformed checksum entry`);
    assert(!entries.has(match[2]), `${name}: duplicate checksum for ${match[2]}`);
    entries.set(match[2], match[1]);
  }
  return entries;
}
function archiveBinaries(file, windows) {
  const run = (command, args, encoding) => execFileSync(command, args, {
    encoding, timeout: 30_000, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']
  });
  // Read members to stdout, never extract untrusted paths into the workspace.
  const members = run(windows ? 'unzip' : 'tar', windows ? ['-Z1', file] : ['-tzf', file], 'utf8')
    .trim().split(/\r?\n/).filter(member => member && member !== './');
  const expected = ['ground', 'ground-mcp'].map(binary => binary + (windows ? '.exe' : ''));
  assert.equal(members.length, 2, `${file}: archive must contain exactly two native binaries`);
  return Object.fromEntries(expected.map((name, index) => {
    const matching = members.filter(member => member === name || member === `./${name}`);
    assert.equal(matching.length, 1, `${file}: missing or duplicate archive member ${name}`);
    const bytes = run(windows ? 'unzip' : 'tar', windows ? ['-p', file, matching[0]] : ['-xOzf', file, matching[0]]);
    return [['ground', 'ground-mcp'][index], sha256(bytes)];
  }));
}

// This checks release consistency, not an independent publisher attestation.
// Each smoke receipt binds the tested executable bytes, then both receipt sets
// must agree with the downloaded archives and the expected source/npm identity.
export function verifyGroundReleaseEvidence({ directory, sourceSha, version, packageMetadata }) {
  assert.match(sourceSha, /^[a-f0-9]{40}$/, 'expected source SHA must be a full commit SHA');
  assert.match(version, /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/, 'expected version must be explicit');
  const read = name => {
    const file = join(directory, name);
    assert(lstatSync(file).isFile(), `${name}: expected a regular release asset`);
    return readFileSync(file);
  };
  const sums = checksums(read('SHA256SUMS').toString(), 'SHA256SUMS');
  const consumers = checksums(read('CONSUMER-SHA256SUMS').toString(), 'CONSUMER-SHA256SUMS');
  const verified = (name, manifest = sums) => {
    assert(manifest.has(name), `missing checksum for ${name}`);
    const bytes = read(name);
    assert.equal(sha256(bytes), manifest.get(name), `${name}: checksum mismatch`);
    return bytes;
  };
  const equal = (actual, expected, name) => assert.deepEqual(actual, expected, name);
  equal(packageMetadata.name, '@createsomething/ground-mcp', 'npm package name');
  equal(packageMetadata.version, version, 'npm version');
  equal(packageMetadata.gitHead, sourceSha, 'npm gitHead must match the release source');
  const integrity = packageMetadata['dist.integrity'] ?? packageMetadata.dist?.integrity;
  assert.match(integrity ?? '', /^sha512-[A-Za-z0-9+/]{86}==$/, 'npm dist.integrity must be a SHA-512 digest');
  const identity = (receipt, schema, name, platform) => {
    equal(receipt.schema_version, schema, `${name}: schema_version`);
    equal(receipt.source_sha, sourceSha, `${name}: source_sha`);
    equal(receipt.version, version, `${name}: version`);
    if (platform) {
      equal(receipt.platform, platform, `${name}: platform`);
      equal(receipt.ready, true, `${name}: ready`);
      equal(receipt.cli_version, `ground ${version}`, `${name}: cli_version`);
      equal(receipt.mcp?.initialized, true, `${name}: MCP initialization`);
      assert(Number.isInteger(receipt.mcp?.tool_count) && receipt.mcp.tool_count >= 21, `${name}: MCP tool_count`);
      for (const tool of REQUIRED_TOOLS) assert(receipt.mcp?.required_tools?.includes(tool), `${name}: missing ${tool}`);
      for (const language of ['typescript', 'javascript', 'svelte']) {
        const smoke = receipt.language_smokes?.[language];
        equal(smoke?.verification_status, 'FAIL', `${name}: ${language} positive-control status`);
        assert(typeof smoke?.finding === 'string' && smoke.finding.length > 0, `${name}: ${language} positive control missing`);
      }
    }
  };
  const calibrationName = 'ground-calibration-receipt.json';
  const calibration = JSON.parse(verified(calibrationName));
  identity(calibration, 'ground-calibration-release-receipt.v1', calibrationName);
  equal(calibration.release_tag, `ground-v${version}`, `${calibrationName}: release_tag`);
  equal(calibration.promotion?.ready, true, `${calibrationName}: promotion.ready`);
  equal(calibration.fixture_execution?.schema_version, 'ground-calibration-execution-receipt.v1', `${calibrationName}: execution schema`);
  equal(calibration.fixture_execution?.source_sha, sourceSha, `${calibrationName}: execution source_sha`);
  equal(calibration.fixture_execution?.result?.exit_code, 0, `${calibrationName}: execution exit_code`);
  equal(calibration.fixture_execution?.result?.failed, 0, `${calibrationName}: execution failed`);
  equal(calibration.fixture_execution?.ready, true, `${calibrationName}: execution ready`);
  for (const platform of PLATFORMS) {
    const windows = platform === 'win32-x64';
    const archive = `ground-${platform}.${windows ? 'zip' : 'tar.gz'}`;
    verified(archive);
    const hashes = archiveBinaries(join(directory, archive), windows);
    for (const consumer of [false, true]) {
      const name = `ground-${platform}-${consumer ? 'consumer-' : ''}smoke.json`;
      const receipt = JSON.parse(verified(name, consumer ? consumers : sums));
      identity(receipt, consumer ? 'ground-published-consumer-smoke.v1' : 'ground-native-release-smoke.v1', name, platform);
      for (const binary of ['ground', 'ground-mcp']) {
        assert.match(receipt.binaries?.[binary]?.sha256 ?? '', /^[a-f0-9]{64}$/, `${name}: missing binary hash for ${binary}; regenerate smoke evidence`);
        equal(receipt.binaries[binary].sha256, hashes[binary], `${name}: ${binary} binary hash mismatch`);
      }
      if (consumer) {
        equal(receipt.package?.name, packageMetadata.name, `${name}: package name`);
        equal(receipt.package?.spec, `${packageMetadata.name}@${version}`, `${name}: package spec`);
        equal(receipt.package?.integrity, integrity, `${name}: package integrity`);
        equal(receipt.package?.fresh_directory, true, `${name}: fresh_directory`);
        equal(receipt.package?.lifecycle_scripts_enabled, true, `${name}: lifecycle_scripts_enabled`);
      } else {
        for (const field of ['invalid_policy_rejected', 'stale_evidence_rejected', 'inferred_fixes_review_only', 'workspace_discovery_verified', 'policy_digest_verified']) {
          equal(receipt.trust_contract?.[field], true, `${name}: trust_contract.${field}`);
        }
      }
    }
  }
  return { ready: true, source_sha: sourceSha, version, platforms: PLATFORMS };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [directory, sourceSha, version, metadataFile, ...extra] = process.argv.slice(2);
    assert(directory && sourceSha && version && metadataFile && extra.length === 0,
      'Usage: ground-release-evidence.mjs ASSET_DIRECTORY SOURCE_SHA VERSION NPM_METADATA_JSON');
    console.log(JSON.stringify(verifyGroundReleaseEvidence({ directory: resolve(directory), sourceSha, version,
      packageMetadata: JSON.parse(readFileSync(metadataFile, 'utf8')) }), null, 2));
  } catch (error) {
    console.error(`Ground release evidence rejected: ${error.message}`);
    process.exitCode = 1;
  }
}
