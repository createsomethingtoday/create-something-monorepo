import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { reserveTravelCredits } from '../src/lib/server/abundance-travel-quota.ts';
test('concurrent reservations cannot exceed the rolling routing allowance', async () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec(
      readFileSync(
        new URL('../migrations/0050_abundance_travel_quota.sql', import.meta.url),
        'utf8'
      )
    );
    const db = {
      prepare: (sql: string) => ({
        bind: (...args: SQLInputValue[]) => ({
          first: async () => sqlite.prepare(sql).get(...args) ?? null
        })
      })
    } as unknown as D1Database;
    const results = await Promise.allSettled([
      reserveTravelCredits(db, 3, 4),
      reserveTravelCredits(db, 3, 4)
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(
      sqlite
        .prepare('SELECT sum(credits) AS credits FROM abundance_travel_credit_reservations')
        .get()?.credits,
      3
    );
    await assert.rejects(reserveTravelCredits(db, 1, 2501), /allowance/);
  } finally {
    sqlite.close();
  }
});
