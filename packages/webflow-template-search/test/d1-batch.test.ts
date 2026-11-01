import { describe, expect, it } from 'vitest';
import { closeTestD1, createTestD1 } from './support/d1.js';

describe('test D1 batch contract', () => {
  it('preserves statement order, bound values and per-statement change counts', async () => {
    const db = createTestD1();
    try {
      await db.exec('CREATE TABLE batch_fixture (id INTEGER PRIMARY KEY, value TEXT)');
      const results = await db.batch([
        db.prepare('INSERT INTO batch_fixture (id, value) VALUES (?, ?)').bind(1, "quote's\nline"),
        db.prepare('UPDATE batch_fixture SET value = ? WHERE id = ?').bind('updated', 1),
        db.prepare('UPDATE batch_fixture SET value = ? WHERE id = ?').bind('missing', 2),
      ]);
      expect(results.map(result => result.meta.changes)).toEqual([1, 1, 0]);
      expect(results.every(result => result.success)).toBe(true);
      expect(await db.prepare('SELECT value FROM batch_fixture WHERE id = 1').first()).toEqual({ value: 'updated' });
      expect(await db.batch([])).toEqual([]);
    } finally { closeTestD1(db); }
  });

  it('rolls back the batch on an error and retains the binding limit', async () => {
    const db = createTestD1();
    try {
      await db.exec('CREATE TABLE batch_fixture (id INTEGER PRIMARY KEY)');
      await expect(db.batch([
        db.prepare('INSERT INTO batch_fixture VALUES (?)').bind(1),
        db.prepare('INSERT INTO batch_fixture VALUES (?)').bind(1),
      ])).rejects.toThrow();
      expect(await db.prepare('SELECT COUNT(*) AS count FROM batch_fixture').first()).toEqual({ count: 0 });
      expect(() => db.prepare('SELECT 1').bind(...Array(101).fill(1))).toThrow('too many SQL variables');
    } finally { closeTestD1(db); }
  });
});
