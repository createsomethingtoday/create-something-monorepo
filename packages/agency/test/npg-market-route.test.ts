import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../src/routes/delivery/abundance/sourcing.csv/+server.ts';
function fixture(options: { telemetryFails?: boolean; exportFails?: boolean } = {}) {
  const events: Array<{ sql: string; args: unknown[] }> = [];
  const DB = {
    prepare(sql: string) {
      let args: unknown[] = [];
      return {
        bind(...values: unknown[]) {
          args = values;
          return this;
        },
        async run() {
          if (sql.includes('npg_registry_export_events')) {
            if (options.telemetryFails) throw Error('telemetry unavailable');
            events.push({ sql, args });
          }
          return { meta: { changes: 1 } };
        },
        async first() {
          if (options.exportFails) throw Error('snapshot unavailable');
          return {
            id: 'run',
            taxonomy_scope: 'all_np_taxonomies',
            source_published_at: '2026-11-01'
          };
        },
        async all() {
          return { results: [] };
        }
      };
    }
  };
  const event = {
    url: new URL(
      'https://createsomething.agency/delivery/abundance/sourcing.csv?city=Austin&state=TX'
    ),
    locals: { user: { id: 'alice', email: 'alice@thenpgroup.com' } },
    platform: { env: { DB } }
  };
  return { event, events };
}
test('authorized CSV requests record owner-private requested and prepared, not downloaded', async () => {
  const f = fixture();
  const response = await GET(f.event as any);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /NPI/i);
  assert.equal(f.events.length, 2);
  assert.equal(f.events[0].args[1], 'alice');
  assert.equal(f.events[0].args[2], 'Austin, TX');
  assert.match(f.events[1].sql, /prepared/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});
test('export errors record failed, telemetry failure never blocks working export', async () => {
  const bad = fixture({ exportFails: true });
  await assert.rejects(async () => GET(bad.event as any));
  assert.match(bad.events[1].sql, /failed/);
  const telemetry = fixture({ telemetryFails: true });
  const response = await GET(telemetry.event as any);
  assert.equal(response.status, 200);
  await response.text();
  assert.equal(telemetry.events.length, 0);
});
test('anonymous and unrelated users never reach telemetry or export', async () => {
  const f = fixture();
  f.event.locals.user = null as any;
  await assert.rejects(async () => GET(f.event as any));
  f.event.locals.user = { id: 'other', email: 'other@example.com' };
  await assert.rejects(async () => GET(f.event as any));
  assert.equal(f.events.length, 0);
});
test('parsed radius exports retain radius without street address in telemetry', async () => {
  const f = fixture({ exportFails: true });
  f.event.url = new URL(
    'https://createsomething.agency/delivery/abundance/sourcing.csv?center_address=123+Main+Street,+Austin,+TX&radius_miles=30'
  );
  await assert.rejects(async () => GET(f.event as any));
  assert.equal(f.events[0].args[2], 'Radius search (30 mi)');
  assert.equal(JSON.stringify(f.events).includes('123 Main'), false);
});
