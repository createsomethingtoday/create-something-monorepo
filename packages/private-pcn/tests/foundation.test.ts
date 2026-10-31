import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { load } from '../src/routes/start/+page.server';

const pathId = '101f0d7f-25c0-433b-b41f-04ecc7e89b88';
let db: DatabaseSync;
function statement(sql: string, values: any[] = []): any {
  return {
    bind: (...args: any[]) => statement(sql, args),
    first: async () => db.prepare(sql).get(...values),
    all: async () => ({ results: db.prepare(sql).all(...values) })
  };
}
function event(role: string | null = 'member', networkId = 'default', status = 'active'): any {
  return {
    locals: {
      identity: role ? { subject: 'member', role } : null,
      network: { id: networkId, status }
    },
    platform: { env: { DB: { prepare: statement } } }
  };
}
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  for (const migration of ['0001_private_pcn', '0002_network_ownership', '0015_guided_learning']) {
    db.exec(readFileSync(new URL(`../migrations/${migration}.sql`, import.meta.url), 'utf8'));
  }
  db.prepare(
    "INSERT INTO videos(id,stream_uid,title,access,visibility,ingest_status) VALUES('lesson','stream','Foundation','members','published','ready')"
  ).run();
  db.prepare(
    "INSERT INTO learning_paths(id,network_id,title,outcome,prerequisites,estimated_minutes,lesson_ids,visibility) VALUES(?,'default','How CREATE SOMETHING works with agents','Learn the practice','',15,'[\"lesson\"]','published')"
  ).run(pathId);
});
afterEach(() => db.close());
it('offers the existing foundation as the admitted default member starting point', async () => {
  expect(await load(event())).toMatchObject({
    foundation: { id: pathId, title: 'How CREATE SOMETHING works with agents' }
  });
});
it.each([null, 'blocked'])(
  'does not offer private foundation metadata to %s visitors',
  async (role) => {
    expect(await load(event(role))).toEqual({ foundation: null });
  }
);
it('preserves other-network entry and denies inactive default membership', async () => {
  expect(await load(event('member', 'another-network'))).toEqual({ foundation: null });
  expect(await load(event('member', 'default', 'suspended'))).toEqual({ foundation: null });
});
it.each(['draft', 'archived'])(
  'hides a %s target even from the administrator starting point',
  async (visibility) => {
    db.prepare('UPDATE learning_paths SET visibility=?').run(visibility);
    expect(await load(event())).toEqual({ foundation: null });
    expect(await load(event('admin'))).toEqual({ foundation: null });
  }
);
it('hides missing, unpublished and unready lessons and recovers on republish', async () => {
  db.exec("UPDATE videos SET visibility='draft'");
  expect(await load(event())).toEqual({ foundation: null });
  db.exec("UPDATE videos SET visibility='published',ingest_status='processing'");
  expect(await load(event())).toEqual({ foundation: null });
  db.exec("UPDATE videos SET ingest_status='ready'");
  expect(await load(event())).toMatchObject({ foundation: { id: pathId } });
  db.exec('DELETE FROM videos');
  expect(await load(event())).toEqual({ foundation: null });
});
it('hides a removed target without selecting a different course', async () => {
  db.exec('DELETE FROM learning_paths');
  expect(await load(event())).toEqual({ foundation: null });
});
