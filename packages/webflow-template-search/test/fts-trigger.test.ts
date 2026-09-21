import { afterEach, describe, expect, it } from 'vitest';
import { closeTestD1, createTestD1 } from './support/d1.js';

const databases: D1Database[] = [];
afterEach(() => databases.splice(0).forEach(closeTestD1));

async function fixture() {
  const db = createTestD1();
  databases.push(db);
  await db.exec(`INSERT INTO template_documents (id, template_slug, name, synced_at)
    VALUES ('target', 'target', 'originalword', '2026-09-21'),
           ('anchor', 'anchor', 'anchorword', '2026-09-21');`);
  return db;
}

async function targetRow(db: D1Database) {
  return db.prepare("SELECT rowid, * FROM template_documents_fts WHERE template_document_id = 'target'").first();
}

describe('scoped full-text update trigger', () => {
  it('does not rewrite the index for metadata-only maintenance', async () => {
    const db = await fixture();
    const before = await targetRow(db);
    await db.exec(`UPDATE template_documents SET creator_name = 'Creator',
      thumbnail_image_url = 'https://example.test/image.png', price = 49,
      popularity_score = 12, synced_at = '2026-09-22' WHERE id = 'target';`);
    expect(await targetRow(db)).toEqual(before);
  });

  it('does not rewrite unchanged indexed values in a full upsert', async () => {
    const db = await fixture();
    const before = await targetRow(db);
    await db.exec(`INSERT INTO template_documents (id, template_slug, name, synced_at)
      VALUES ('target', 'target', 'originalword', '2026-09-22')
      ON CONFLICT(id) DO UPDATE SET name = excluded.name,
        description_short = '', description_long_text = '', category_groups_text = '',
        child_categories_text = '', styles_text = '', tags_text = '', synced_at = excluded.synced_at;`);
    expect(await targetRow(db)).toEqual(before);
  });

  for (const column of ['name', 'description_short', 'description_long_text',
    'category_groups_text', 'child_categories_text', 'styles_text', 'tags_text']) {
    it(`keeps changed ${column} searchable without duplicate index rows`, async () => {
      const db = await fixture();
      await db.exec(`UPDATE template_documents SET ${column} = 'replacementword' WHERE id = 'target';`);
      const match = await db.prepare("SELECT template_document_id FROM template_documents_fts WHERE template_documents_fts MATCH 'replacementword'").all();
      expect(match.results).toEqual([{ template_document_id: 'target' }]);
      const count = await db.prepare("SELECT COUNT(*) AS n FROM template_documents_fts WHERE template_document_id = 'target'").first();
      expect(count).toEqual({ n: 1 });
      await db.exec(`UPDATE template_documents SET ${column} = 'anotherword' WHERE id = 'target';`);
      expect((await db.prepare("SELECT template_document_id FROM template_documents_fts WHERE template_documents_fts MATCH 'replacementword'").all()).results).toEqual([]);
    });
  }

  it('moves the index key when the document ID changes and retains delete cleanup', async () => {
    const db = await fixture();
    await db.exec("UPDATE template_documents SET id = 'renamed' WHERE id = 'target';");
    expect(await targetRow(db)).toBeNull();
    expect((await db.prepare("SELECT template_document_id FROM template_documents_fts WHERE template_documents_fts MATCH 'originalword'").all()).results).toEqual([{ template_document_id: 'renamed' }]);
    await db.exec("DELETE FROM template_documents WHERE id = 'renamed';");
    expect((await db.prepare("SELECT template_document_id FROM template_documents_fts WHERE template_documents_fts MATCH 'originalword'").all()).results).toEqual([]);
  });
});
