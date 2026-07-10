import { afterEach, describe, expect, it } from 'vitest';

import { closeTestD1, createTestD1 } from './support/d1.js';

describe('template_documents FTS update trigger', () => {
  const databases: D1Database[] = [];

  afterEach(() => {
    for (const db of databases.splice(0)) closeTestD1(db);
  });

  it('does not rebuild FTS for mrp_id-only updates but refreshes indexed fields', async () => {
    const db = createTestD1();
    databases.push(db);

    await db
      .prepare(
        `INSERT INTO template_documents (id, template_slug, name, synced_at)
         VALUES (?, ?, ?, ?)`,
      )
      .bind('recSafeBackfill', 'safe-backfill-template', 'Original search name', '2026-07-10T00:00:00.000Z')
      .run();

    const trigger = await db
      .prepare(`SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'template_documents_au'`)
      .first<{ sql: string }>();
    const triggerSql = trigger?.sql.toLowerCase() ?? '';

    expect(triggerSql).toContain('after update of');
    expect(triggerSql).toContain('name');
    expect(triggerSql).toContain('description_short');
    expect(triggerSql).toContain('when');
    expect(triggerSql).not.toContain('mrp_id');

    const before = await db
      .prepare('SELECT name FROM template_documents_fts WHERE template_document_id = ?')
      .bind('recSafeBackfill')
      .first<{ name: string }>();

    await db.prepare('UPDATE template_documents SET mrp_id = ? WHERE id = ?').bind('mrp-safe', 'recSafeBackfill').run();

    const afterNonIndexedUpdate = await db
      .prepare('SELECT name FROM template_documents_fts WHERE template_document_id = ?')
      .bind('recSafeBackfill')
      .first<{ name: string }>();

    expect(afterNonIndexedUpdate).toEqual(before);

    await db.prepare('UPDATE template_documents SET name = ? WHERE id = ?').bind('Updated searchable name', 'recSafeBackfill').run();

    const afterIndexedUpdate = await db
      .prepare('SELECT name FROM template_documents_fts WHERE template_document_id = ?')
      .bind('recSafeBackfill')
      .first<{ name: string }>();

    expect(afterIndexedUpdate?.name).toBe('Updated searchable name');

    const match = await db
      .prepare(`SELECT template_document_id FROM template_documents_fts WHERE template_documents_fts MATCH 'Updated'`)
      .first<{ template_document_id: string }>();
    expect(match?.template_document_id).toBe('recSafeBackfill');
  });
});
