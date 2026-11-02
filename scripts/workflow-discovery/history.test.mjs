import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { collectHistory } from './history.mjs';

const sessionId = 'a459cf2a-5559-893f-b3d7-2a18375b89a1';
const eventId = '9e22018c-765f-864d-8ad8-7619fd4a121f';
const hit = (id = eventId) => ({
  ctx_session_id: sessionId,
  ctx_event_id: id,
  snippet: 'PRIVATE BODY'
});
const search = (results = [hit()]) =>
  JSON.stringify({ schema_version: 2, payload_type: 'search_results', results });
const show = (id = eventId) =>
  JSON.stringify({
    schema_version: 1,
    payload_type: 'event_window',
    ctx_session_id: sessionId,
    ctx_event_id: id,
    event: { ctx_session_id: sessionId, ctx_event_id: id, text: 'PRIVATE BODY' },
    events: [{ ctx_session_id: sessionId, ctx_event_id: id, text: 'PRIVATE BODY' }]
  });

test('fixed bounded local queries produce only canonical references and exact evidence hashes', async () => {
  const calls = [];
  const output = await collectHistory({
    repoRoot: '/private/repo',
    runCtx: async (args) => {
      calls.push(args);
      return args[0] === 'search' ? search([hit(), hit()]) : show();
    }
  });
  assert.equal(output.schema, 'workflow-discovery-history@1');
  assert.equal(output.coverage, 'bounded_existing_index');
  assert.ok(Number.isFinite(Date.parse(output.observedAt)));
  assert.deepEqual(
    calls.filter((a) => a[0] === 'search'),
    [
      [
        'search',
        'package validation tests build',
        '--workspace',
        'repo',
        '--primary-only',
        '--refresh',
        'off',
        '--format',
        'json',
        '--limit',
        '4'
      ],
      [
        'search',
        'release evidence deployment verification',
        '--workspace',
        'repo',
        '--primary-only',
        '--refresh',
        'off',
        '--format',
        'json',
        '--limit',
        '4'
      ],
      [
        'search',
        'workflow contract historical context reconciliation',
        '--workspace',
        'repo',
        '--primary-only',
        '--refresh',
        'off',
        '--format',
        'json',
        '--limit',
        '4'
      ]
    ]
  );
  assert.deepEqual(
    calls.filter((a) => a[0] === 'show'),
    Array(3).fill(['show', 'event', eventId, '--window', '0', '--format', 'json'])
  );
  assert.deepEqual(
    output.events.map((e) => e.pattern),
    ['package-validation', 'release-evidence', 'contract-reconciliation']
  );
  for (const event of output.events)
    assert.deepEqual(
      Object.keys(event).sort(),
      ['pattern', 'sessionId', 'eventId', 'evidenceSha256'].sort()
    );
  assert.equal(
    output.events[0].evidenceSha256,
    `sha256:${createHash('sha256').update(show()).digest('hex')}`
  );
  assert.ok(!JSON.stringify(output).includes('PRIVATE'));
});

test('at most twelve events are shown across fixed searches', async () => {
  let shown = 0;
  const ids = Array.from({ length: 4 }, (_, i) => eventId.slice(0, -1) + i);
  const result = await collectHistory({
    repoRoot: '/',
    runCtx: async (a) => {
      if (a[0] === 'search') {
        assert.equal(a[3], 'create-something-monorepo');
        return search(ids.map(hit));
      }
      shown++;
      return show(a[2]);
    }
  });
  assert.equal(shown, 12);
  assert.equal(result.events.length, 12);
});

test('empty known response is allowed', async () => {
  assert.deepEqual(
    (await collectHistory({ repoRoot: '/repo', runCtx: async () => search([]) })).events,
    []
  );
});

for (const [name, response] of [
  ['malformed JSON', 'PRIVATE BODY'],
  ['unknown response', JSON.stringify({ results: [] })],
  [
    'unknown schema',
    JSON.stringify({ schema_version: 99, payload_type: 'search_results', results: [] })
  ],
  ['invalid ID', search([hit('$(PRIVATE BODY)')])],
  ['uppercase ID', search([hit(eventId.toUpperCase())])],
  ['too many hits', search(Array(5).fill(hit()))],
  ['oversized response', 'x'.repeat(1048577)]
])
  test(`rejects ${name} before showing and without exposing payload`, async () => {
    let shows = 0;
    await assert.rejects(
      collectHistory({
        repoRoot: '/repo',
        runCtx: async (a) => {
          if (a[0] === 'show') shows++;
          return response;
        }
      }),
      (e) => !e.message.includes('PRIVATE')
    );
    assert.equal(shows, 0);
  });

for (const response of [
  'PRIVATE BODY',
  JSON.stringify({ schema_version: 1, payload_type: 'unknown' }),
  show(eventId.slice(0, -1) + '0')
]) {
  test('rejects malformed or mismatched event responses privately', async () => {
    await assert.rejects(
      collectHistory({
        repoRoot: '/repo',
        runCtx: async (a) => (a[0] === 'search' ? search() : response)
      }),
      (e) => !e.message.includes('PRIVATE')
    );
  });
}

test('sanitizes invocation failures', async () => {
  await assert.rejects(
    collectHistory({
      repoRoot: '/repo',
      runCtx: async () => {
        throw new Error('PRIVATE BODY');
      }
    }),
    (e) => !e.message.includes('PRIVATE')
  );
});
