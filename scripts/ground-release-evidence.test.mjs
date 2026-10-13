import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { verifyGroundReleaseEvidence } from './ground-release-evidence.mjs';

const sourceSha = 'a'.repeat(40);
const version = '0.5.1';
const platforms = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64', 'win32-x64'];
const digest = value => createHash('sha256').update(value).digest('hex');
function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'ground-release-evidence-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const metadata = { name: '@createsomething/ground-mcp', version, gitHead: sourceSha, 'dist.integrity': `sha512-${Buffer.alloc(64, 1).toString('base64')}` };
  const write = (name, data) => writeFileSync(join(directory, name), typeof data === 'string' ? data : JSON.stringify(data));
  const manifests = { SHA256SUMS: [], 'CONSUMER-SHA256SUMS': [] };
  const seal = (name, manifest = 'SHA256SUMS') => {
    manifests[manifest] = manifests[manifest].filter(line => !line.endsWith(`  ${name}`));
    manifests[manifest].push(`${digest(readFileSync(join(directory, name)))}  ${name}`);
    write(manifest, manifests[manifest].join('\n') + '\n');
  };
  for (const platform of platforms) {
    const ext = platform.startsWith('win32') ? '.exe' : '';
    const content = join(directory, `fixture-${platform}`); mkdirSync(content);
    const binaries = {};
    for (const binary of ['ground', 'ground-mcp']) {
      const bytes = `${platform} synthetic ${binary} bytes`;
      writeFileSync(join(content, binary + ext), bytes); binaries[binary] = { sha256: digest(bytes) };
    }
    const archive = `ground-${platform}.${ext ? 'zip' : 'tar.gz'}`;
    if (ext) execFileSync('zip', ['-q', join(directory, archive), 'ground.exe', 'ground-mcp.exe'], { cwd: content });
    else execFileSync('tar', ['-czf', join(directory, archive), '-C', content, '.']);
    const common = { platform, version, source_sha: sourceSha, binaries, cli_version: `ground ${version}`, ready: true,
      mcp: { initialized: true, tool_count: 21, required_tools: ['ground_analyze', 'ground_diff', 'ground_verify_fix'] },
      language_smokes: Object.fromEntries(['typescript', 'javascript', 'svelte'].map(language => [language, { verification_status: 'FAIL', finding: 'syntheticPositiveControl', framework: 'fixture' }])) };
    const native = `ground-${platform}-smoke.json`;
    write(native, { schema_version: 'ground-native-release-smoke.v1', ...common,
      trust_contract: { invalid_policy_rejected: true, stale_evidence_rejected: true, inferred_fixes_review_only: true, workspace_discovery_verified: true, policy_digest_verified: true } });
    const consumer = `ground-${platform}-consumer-smoke.json`;
    write(consumer, { schema_version: 'ground-published-consumer-smoke.v1', ...common,
      package: { name: metadata.name, spec: `${metadata.name}@${version}`, integrity: metadata['dist.integrity'], lifecycle_scripts_enabled: true, fresh_directory: true } });
    seal(archive); seal(native); seal(consumer, 'CONSUMER-SHA256SUMS');
  }
  write('ground-calibration-receipt.json', { schema_version: 'ground-calibration-release-receipt.v1', source_sha: sourceSha, version,
    release_tag: `ground-v${version}`, promotion: { ready: true }, fixture_execution: { schema_version: 'ground-calibration-execution-receipt.v1', source_sha: sourceSha, ready: true, result: { exit_code: 0, failed: 0 } } });
  seal('ground-calibration-receipt.json');
  return { directory, metadata, write, seal, verify: () => verifyGroundReleaseEvidence({ directory, sourceSha, version, packageMetadata: metadata }),
    edit: (name, fn) => { const data = JSON.parse(readFileSync(join(directory, name))); fn(data); write(name, data); } };
}

test('all five archives match independently checked native and consumer evidence', t => {
  const f = fixture(t); assert.equal(f.verify().platforms.length, 5);
});
for (const [name, mutate, pattern] of [
  ['archive bytes', f => f.write('ground-linux-x64.tar.gz', 'changed'), /checksum mismatch/],
  ['missing asset', f => rmSync(join(f.directory, 'ground-linux-x64-smoke.json')), /ground-linux-x64-smoke.json/],
  ['stale native source', f => { f.edit('ground-linux-x64-smoke.json', r => r.source_sha = 'b'.repeat(40)); f.seal('ground-linux-x64-smoke.json'); }, /source_sha/],
  ['unready smoke', f => { f.edit('ground-linux-x64-smoke.json', r => r.ready = false); f.seal('ground-linux-x64-smoke.json'); }, /ready/],
  ['missing binary binding', f => { f.edit('ground-linux-x64-smoke.json', r => delete r.binaries); f.seal('ground-linux-x64-smoke.json'); }, /binary hash/],
  ['wrong tested binary', f => { f.edit('ground-linux-x64-smoke.json', r => r.binaries.ground.sha256 = '0'.repeat(64)); f.seal('ground-linux-x64-smoke.json'); }, /binary hash mismatch/],
  ['wrong consumer binary', f => { f.edit('ground-linux-x64-consumer-smoke.json', r => r.binaries.ground.sha256 = '0'.repeat(64)); f.seal('ground-linux-x64-consumer-smoke.json', 'CONSUMER-SHA256SUMS'); }, /binary hash mismatch/],
  ['npm provenance', f => f.metadata.gitHead = 'b'.repeat(40), /npm gitHead/],
  ['npm integrity', f => f.metadata['dist.integrity'] = `sha512-${Buffer.alloc(64, 2).toString('base64')}`, /package integrity/],
  ['calibration source', f => { f.edit('ground-calibration-receipt.json', r => r.source_sha = 'b'.repeat(40)); f.seal('ground-calibration-receipt.json'); }, /source_sha/],
  ['duplicate checksum entry', f => f.write('SHA256SUMS', readFileSync(join(f.directory, 'SHA256SUMS'), 'utf8').repeat(2)), /duplicate checksum/],
]) test(`reject ${name} even when release asset names exist`, t => {
  const f = fixture(t); mutate(f); assert.throws(f.verify, pattern);
});

test('CLI rejects invalid evidence with an actionable nonzero result', t => {
  const f = fixture(t);
  f.write('npm.json', { ...f.metadata, gitHead: 'b'.repeat(40) });
  assert.throws(() => execFileSync(process.execPath, [
    new URL('./ground-release-evidence.mjs', import.meta.url).pathname,
    f.directory, sourceSha, version, join(f.directory, 'npm.json')
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), error =>
    error.status === 1 && error.stderr.includes('Ground release evidence rejected: npm gitHead'));
});
