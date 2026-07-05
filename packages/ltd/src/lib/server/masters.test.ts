import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fallbackMasters, loadMasterProfile, loadMasters } from './masters';
import type { Master } from '$lib/types';

function missingSchemaDb(): D1Database {
  return {
    prepare() {
      throw new Error('D1_ERROR: no such table: masters: SQLITE_ERROR');
    }
  } as unknown as D1Database;
}

function listDb(masters: Master[]): D1Database {
  return {
    prepare() {
      return {
        all: async () => ({ results: masters })
      };
    }
  } as unknown as D1Database;
}

test('loads canonical masters when D1 is unavailable', async () => {
  const masters = await loadMasters(undefined);

  assert.ok(masters.length >= 7);
  assert.equal(masters[0].slug, 'dieter-rams');
  assert.ok(masters.some((master) => master.slug === 'mies-van-der-rohe'));
  assert.ok(masters.some((master) => master.slug === 'jony-ive'));
  assert.equal(
    masters.some((master) => master.id === 'arena-taste'),
    false
  );
});

test('falls back to canonical masters when D1 schema is missing', async () => {
  const masters = await loadMasters(missingSchemaDb());

  assert.deepEqual(
    masters.map((master) => master.slug),
    fallbackMasters.map((master) => master.slug)
  );
});

test('prefers D1 masters when the table is populated', async () => {
  const [dieterRams] = fallbackMasters;
  const masters = await loadMasters(
    listDb([
      {
        ...dieterRams,
        name: 'D1 Dieter Rams'
      }
    ])
  );

  assert.equal(masters.length, 1);
  assert.equal(masters[0].name, 'D1 Dieter Rams');
});

test('loads canonical detail content when D1 is unavailable', async () => {
  const profile = await loadMasterProfile(undefined, 'dieter-rams');

  assert.equal(profile.master?.name, 'Dieter Rams');
  assert.equal(profile.principles.length, 10);
  assert.ok(profile.quotes.some((quote) => quote.quote_text.includes('Less, but better')));
});

test('returns no fallback detail for non-canonical slugs', async () => {
  const profile = await loadMasterProfile(undefined, 'not-in-canon');

  assert.equal(profile.master, null);
  assert.equal(profile.principles.length, 0);
});
