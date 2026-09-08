import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';

const { verifyCommitProof } = await import(
  new URL('../scripts/github-commit-proof.mjs', import.meta.url).href
);
const fixture = new URL('./fixtures/github-commit-proof', import.meta.url);

test('retained authenticated read proof reopens without replaying the source and rejects tampering', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'github-proof-test-'));
  try {
    const out = join(scratch, 'proof');
    await cp(fixture, out, { recursive: true });
    const key = join(out, 'trusted-public.pem');
    const before = await readFile(join(out, 'checkpoint.json'), 'utf8');
    const first = await verifyCommitProof(out, key);
    assert.equal(first.nextDisposition, 'wait');
    assert.equal(first.readDispatches, 1);
    assert.equal(first.restartNetworkCalls, 0);
    assert.deepEqual(await verifyCommitProof(out, key), first);
    assert.equal(await readFile(join(out, 'checkpoint.json'), 'utf8'), before);
    for (const [file, mutate] of [
      [
        'observation.json',
        (value: any) => {
          value.observation.response.sha = '0'.repeat(40);
        }
      ],
      [
        'policy.json',
        (value: any) => {
          value.readOnly = false;
        }
      ],
      [
        'checkpoint.json',
        (value: any) => {
          value.receipts[1].receiptSha256 = 'sha256:' + '0'.repeat(64);
        }
      ]
    ] as const) {
      const path = join(out, file);
      const saved = await readFile(path, 'utf8');
      const changed = JSON.parse(saved);
      mutate(changed);
      await writeFile(path, JSON.stringify(changed));
      await assert.rejects(() => verifyCommitProof(out, key));
      await writeFile(path, saved);
    }
    const wrongKey = join(scratch, 'wrong.pem');
    await writeFile(
      wrongKey,
      generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' })
    );
    await assert.rejects(() => verifyCommitProof(out, wrongKey));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
