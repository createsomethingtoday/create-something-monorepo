import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateApprovalPacket, validateManifest } from '../operator-agent-omnigent-adapter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'operator-agent-omnigent-adapter.mjs');
const MANIFEST_PATH = path.join(REPO_ROOT, 'config', 'operator-agent', 'omnigent-a4-adapter.json');

function readManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function makeWorkspace(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'omnigent-adapter-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function validPacket() {
  return {
    authorityLevel: 'A4',
    approver: 'Micah Johnson',
    approvalSurface: 'Linear',
    target: 'create-something-internal-production',
    action: 'example high-risk action approved for fixture validation only',
    riskClass: 'high',
    namedRisks: [
      'credential-write',
      'billing-change',
      'client-production',
      'destructive-write',
      'irreversible-data-operation',
    ],
    forbiddenSideEffects: ['anything outside the packet target and action'],
    validation: ['run target-specific validation before execution'],
    rollback: ['run target-specific rollback after failed smoke'],
    postActionSmoke: ['run target-specific smoke after execution'],
    stopConditions: ['target mismatch', 'action mismatch', 'missing rollback'],
    evidenceTarget: 'Linear issue',
  };
}

test('Omnigent adapter manifest stays read-only/local-only before A4 approval', () => {
  const manifest = readManifest();
  const result = validateManifest(manifest);

  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(manifest.authority.a4Execution, 'blocked');
  assert.equal(manifest.authority.omnigentRole, 'transport-policy-host');
  assert.ok(manifest.allowedCommands.every((command) => ['A0', 'A1'].includes(command.autonomyLevel)));
  assert.ok(manifest.forbiddenCommands.includes('wrangler pages deploy'));
});

test('manifest check writes a local receipt and reports blocked A4 execution', (t) => {
  const root = makeWorkspace(t);
  const result = spawnSync(
    process.execPath,
    [SCRIPT, 'check', '--receipt-dir', root, '--json'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.a4Execution, 'blocked');
  assert.match(payload.receiptPath, /\.cache|omnigent-adapter-|operator-agent-omnigent/);
});

test('high-risk command exposure fails unless the command requires approval', () => {
  const manifest = readManifest();
  manifest.allowedCommands.push({
    id: 'bad-production-deploy',
    autonomyLevel: 'A1',
    command: 'wrangler pages deploy public --project-name=landing-page-filter',
    writes: true,
    writeScope: 'production',
    requiresApprovalPacket: false,
  });

  const result = validateManifest(manifest);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /requires an approval packet/);
});

test('A4 approval packet must name exact high-risk classes', () => {
  const manifest = readManifest();
  const packet = validPacket();
  packet.namedRisks = ['credential-write'];

  const result = validateApprovalPacket(packet, manifest);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /billing-change/);
  assert.match(result.errors.join('\n'), /client-production/);
});

test('valid A4 approval packet fixture passes deterministic packet validation', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);

  const result = spawnSync(
    process.execPath,
    [SCRIPT, 'approval-check', '--packet', packetPath, '--receipt-dir', root, '--json'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.match(payload.receiptPath, /approval-check\.json$/);
});
