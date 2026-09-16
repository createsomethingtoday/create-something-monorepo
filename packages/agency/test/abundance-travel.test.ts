import test from 'node:test';
import assert from 'node:assert/strict';
import { estimatePracticeTravel } from '../src/lib/server/abundance-travel.ts';

test('driving estimates keep per-clinic time bands and distinguish any from all clinics', async () => {
  const input = {
    origins: [{ id: 'provider-local-id', latitude: 42.65, longitude: -73.75 }],
    clinics: [
      { id: 'albany', latitude: 42.7, longitude: -73.8 },
      { id: 'troy', latitude: 42.8, longitude: -73.7 }
    ],
    maxMinutes: 45 as const,
    match: 'any' as const
  };
  let reserved = 0;
  const options = {
    apiKey: 'test-key',
    reserveCredits: async (n: number) => {
      reserved += n;
    },
    fetchFn: async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.mode, 'driving');
      assert.equal(body.max_duration, undefined, 'do not hide unknown versus over-limit routes');
      assert.equal(
        JSON.stringify(body).includes('provider-local-id'),
        false,
        'send only opaque ids'
      );
      return Response.json({
        mode: 'driving',
        results: [
          {
            origin: { id: 'o0' },
            destinations: [
              { id: 'c1', distance_miles: 40, duration_seconds: 2800 },
              { id: 'c0', distance_miles: 12, duration_seconds: 1800 }
            ]
          }
        ]
      });
    }
  };
  const any = await estimatePracticeTravel(input, options);
  assert.equal(reserved, 4);
  assert.equal(any.results[0].match, 'within_limit');
  assert.deepEqual(
    any.results[0].routes.map((r) => r.band),
    ['within_30_minutes', 'over_45_minutes']
  );
  assert.equal(any.basis, 'registered_practice_to_clinic_typical_traffic');
  const all = await estimatePracticeTravel({ ...input, match: 'all' }, options);
  assert.equal(all.results[0].match, 'outside_limit');
});

test('missing routes remain unresolved and quota denial prevents vendor calls', async () => {
  const input = {
    origins: [{ id: 'p', latitude: 42, longitude: -73 }],
    clinics: [{ id: 'c', latitude: 43, longitude: -74 }],
    maxMinutes: 30 as const,
    match: 'all' as const
  };
  const result = await estimatePracticeTravel(input, {
    apiKey: 'test',
    reserveCredits: async () => {},
    fetchFn: async () => Response.json({ mode: 'driving', results: [] })
  });
  assert.equal(result.results[0].match, 'unresolved');
  assert.equal(result.results[0].routes[0].duration_seconds, null);
  let called = false;
  await assert.rejects(
    estimatePracticeTravel(input, {
      apiKey: 'test',
      reserveCredits: async () => {
        throw new Error('Daily routing allowance exhausted');
      },
      fetchFn: async () => {
        called = true;
        return Response.json({});
      }
    }),
    /allowance/
  );
  assert.equal(called, false);
});

test('vendor failures cannot expose credential-bearing error messages', async () => {
  const input = {
    origins: [{ id: 'p', latitude: 42, longitude: -73 }],
    clinics: [{ id: 'c', latitude: 43, longitude: -74 }],
    maxMinutes: 45 as const,
    match: 'any' as const
  };
  await assert.rejects(
    estimatePracticeTravel(input, {
      apiKey: 'DO-NOT-EXPOSE',
      reserveCredits: async () => {},
      fetchFn: async () => {
        throw new Error('network failed at ?api_key=DO-NOT-EXPOSE');
      }
    }),
    (e) =>
      e instanceof Error && !e.message.includes('DO-NOT-EXPOSE') && /unavailable/.test(e.message)
  );
  await assert.rejects(
    estimatePracticeTravel(
      {
        ...input,
        origins: Array.from({ length: 51 }, (_, i) => ({ ...input.origins[0], id: String(i) }))
      },
      {
        apiKey: 'test',
        reserveCredits: async () => {
          throw new Error('Should not reserve');
        }
      }
    ),
    /1–50/
  );
});
