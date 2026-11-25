import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

test('Treg ledger upgrade preserves historical receipts and immutable one-use grants', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=ON');
    db.exec(readFileSync('migrations/0064_enrichment_budget.sql', 'utf8'));
    const id = 'a'.repeat(64);
    db.prepare('INSERT INTO npg_enrichment_requests VALUES(?,?,?,?)').run(id,'complete','1234567890','before');
    db.prepare('INSERT INTO npg_enrichment_grants VALUES(?,?,?,?)').run(id,'pdl','legacy-token-hash',1);
    db.prepare('INSERT INTO npg_enrichment_receipts(request_id,provider,event_id,status,actual_micros,recorded_at) VALUES(?,?,?,?,?,?)').run(id,'pdl','old-receipt','complete',123000,'before');
    assert.throws(() => db.prepare('INSERT INTO npg_enrichment_grants VALUES(?,?,?,?)').run(id,'treg','new-token-hash',0));
    db.exec('BEGIN');
    db.exec(readFileSync('migrations/0068_npg_treg_enrichment_provider.sql','utf8'));
    db.exec('COMMIT');
    assert.equal(db.prepare('SELECT actual_micros FROM npg_enrichment_receipts').get()!.actual_micros,123000);
    assert.equal(db.prepare('SELECT consumed FROM npg_enrichment_grants').get()!.consumed,1);
    db.prepare('INSERT INTO npg_enrichment_grants VALUES(?,?,?,?)').run(id,'treg','new-token-hash',0);
    assert.throws(() => db.exec('UPDATE npg_enrichment_grants SET consumed=0'));
    assert.throws(() => db.exec('UPDATE npg_enrichment_receipts SET actual_micros=0'));
    assert.throws(() => db.exec('DELETE FROM npg_enrichment_requests'));
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  } finally { db.close(); }
});
