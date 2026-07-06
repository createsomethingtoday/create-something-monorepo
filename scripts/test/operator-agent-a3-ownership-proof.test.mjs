import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { REQUIRED_PROOF, normalizeProof, validateProof } from '../operator-agent-a3-ownership-proof.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'operator-agent-a3-ownership-proof.mjs');

function makeWorkspace(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'operator-agent-a3-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('tracked proof satisfies A3 and keeps A4 behind an operator packet', () => {
  const proofPath = path.join(REPO_ROOT, 'packages', 'landing-page-filter', 'public', 'a3-autonomy-proof.json');
  const proof = JSON.parse(readFileSync(proofPath, 'utf8'));
  const result = validateProof(proof);

  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(proof.autonomyLevel, 'A3');
  assert.equal(proof.policy.target, 'create-something-internal-production');
  assert.match(proof.a4PromotionGate.name, /operator-authorized/);
  assert.ok(proof.a4PromotionGate.notAllowedWithoutPacket.includes('credential writes'));
});

test('deterministic heal repairs controlled drift without model output', (t) => {
  const root = makeWorkspace(t);
  const proofPath = path.join(root, 'proof.json');
  const receiptDir = path.join(root, 'receipts');
  writeFileSync(
    proofPath,
    JSON.stringify(
      {
        schemaVersion: 1,
        issue: 'CRE-1060',
        autonomyLevel: 'A3',
        surface: { project: 'landing-page-filter' },
        rollback: {},
      },
      null,
      2,
    ),
  );

  const result = spawnSync(
    process.execPath,
    [SCRIPT, 'heal', '--file', proofPath, '--receipt-dir', receiptDir, '--json'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.writesPerformed, 1);

  const healed = JSON.parse(readFileSync(proofPath, 'utf8'));
  assert.deepEqual(healed, normalizeProof(healed));
  assert.equal(validateProof(healed).ok, true);
});

test('A4 proof fails without the promotion packet boundary', () => {
  const proof = {
    ...REQUIRED_PROOF,
    autonomyLevel: 'A4',
  };
  const result = validateProof(proof);

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /A4 requires an operator approval packet/);
});
