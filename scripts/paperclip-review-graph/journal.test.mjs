import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { durableJournal } from './journal.mjs';
test('journal durable exclusive creation preserves original intent', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'review-journal-'));
  try {
    const path = join(dir, 'intent.json');
    const journal = durableJournal(path);
    assert.equal(await journal.loadIntent(), null);
    await journal.saveIntent({ first: true });
    await assert.rejects(journal.saveIntent({ first: false }), { code: 'EEXIST' });
    assert.deepEqual(await journal.loadIntent(), { first: true });
    assert.equal((await stat(path)).mode & 0o777, 0o600);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
