import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skipTrace, type SkipIdentity } from '../src/skip-trace.js';
import type { PdlStore } from '../src/pdl.js';
const input: SkipIdentity = {
  npi: '1234567890',
  first: 'Synthetic',
  last: 'Example',
  practice_city: 'Austin',
  practice_state: 'TX',
  confirm_paid_enrichment: true
};
function store(): PdlStore {
  const m = new Map<string, unknown>();
  let tail = Promise.resolve();
  const s: PdlStore = {
    get: async <T>(k: string) => m.get(k) as T | undefined,
    put: async (k, v) => {
      m.set(k, structuredClone(v));
    },
    transaction: (fn) => {
      const r = tail.then(() => fn(s));
      tail = r.then(
        () => {},
        () => {}
      );
      return r;
    }
  };
  return s;
}
function provider(row: Record<string, unknown>[] = []) {
  let posts = 0;
  const fetchFn = (async (url, init) => {
    if (String(url).endsWith('/users/me')) return Response.json({ data: { id: 'owner' } });
    if (String(url).includes('/datasets/sentinel/items?'))
      return init?.headers ? Response.json([]) : denial();
    if (String(url).endsWith('/datasets/sentinel'))
      return init?.headers
        ? Response.json({
            data: {
              id: 'sentinel',
              itemCount: 0,
              generalAccess: 'FOLLOW_USER_SETTING',
              userId: 'owner'
            }
          })
        : new Response(null, { status: 403 });
    if (init?.method === 'POST') {
      posts++;
      return Response.json({ data: { id: 'run1', userId: 'owner', defaultDatasetId: 'dataset1' } });
    }
    if (init?.method === 'PUT') return Response.json({ data: {} });
    if (String(url).endsWith('/datasets/dataset1'))
      return Response.json({
        data: { id: 'dataset1', userId: 'owner', generalAccess: 'RESTRICTED' }
      });
    if (String(url).includes('/items?')) return Response.json(row);
    return Response.json({
      data: {
        generalAccess: 'RESTRICTED',
        userId: 'owner',
        id: 'run1',
        actId: 'vmf6h5lxPAkB1W2gT',
        defaultDatasetId: 'dataset1',
        buildNumber: '0.0.192',
        status: 'SUCCEEDED',
        chargedEventCounts: { result: 1 },
        accountedChargedEventCounts: { result: 1 },
        usageTotalUsd: 0.07
      }
    });
  }) as typeof fetch;
  return { fetchFn, posts: () => posts };
}
const row = {
  'Search Option': 'Name+CityStateZip Search',
  'Person Link': 'https://www.example.test/person/synthetic',
  'Input Given': 'Synthetic Example; Austin, TX',
  'First Name': 'Synthetic',
  'Last Name': 'Example',
  'Address Region': 'TX',
  'Address Locality': 'Austin',
  'Email-1': 'synthetic@example.test',
  'Phone-1': '(512) 555-0100',
  'Phone-1 Last Reported': 'provider text',
  DOB: 'FORBIDDEN',
  Relatives: ['FORBIDDEN']
};
test('allowlisted projection and provenance; cached reuse', async () => {
  const p = provider([row]);
  const options = {
    token: 'synthetic',
    store: store(),
    privacyDatasetId: 'sentinel',
    fetchFn: p.fetchFn
  };
  const r = await skipTrace(input, options);
  assert.equal(r.status, 'review_required');
  assert.deepEqual(r.contacts?.phones, ['+15125550100']);
  assert.equal(r.provenance.readiness, 'blocked');
  assert.equal(r.charge_usd, 0.07);
  assert.equal(r.charge_reconciled, false);
  assert.ok(!JSON.stringify(r).includes('FORBIDDEN'));
  await skipTrace(input, options);
  assert.equal(p.posts(), 1);
});
for (const [label, rows, status] of [
  ['no contact', [], 'no_contact'],
  ['name conflict', [{ ...row, 'Last Name': 'Other' }], 'blocked_review'],
  ['state conflict', [{ ...row, 'Address Region': 'MO' }], 'blocked_review'],
  ['fallback', [{ ...row, 'Name Match': 'fallback' }], 'blocked_review'],
  ['association', [{ ...row, 'Input Given': 'Other' }], 'blocked_review'],
  ['duplicates', [row, row], 'blocked_review']
] as const)
  test(label, async () => {
    const p = provider([...rows]);
    assert.equal(
      (
        await skipTrace(input, {
          token: 'synthetic',
          store: store(),
          privacyDatasetId: 'sentinel',
          fetchFn: p.fetchFn
        })
      ).status,
      status
    );
  });
test('confirmation and missing secret', async () => {
  await assert.rejects(() =>
    skipTrace({ ...input, confirm_paid_enrichment: false } as never, { store: store() })
  );
  await assert.rejects(() => skipTrace(input, { store: store() }));
});
test('global reservation and concurrent duplicate dispatch', async () => {
  const p = provider();
  const options = {
    token: 'synthetic',
    store: store(),
    privacyDatasetId: 'sentinel',
    fetchFn: p.fetchFn,
    dailyBudgetUsd: 0.1
  };
  await Promise.all([skipTrace(input, options), skipTrace(input, options)]);
  assert.equal(p.posts(), 1);
  await assert.rejects(() => skipTrace({ ...input, npi: '1234567891' }, options), /budget/);
});
test('uncertain dispatch never retried', async () => {
  let calls = 0;
  const options = {
    token: 'synthetic',
    store: store(),
    privacyDatasetId: 'sentinel',
    fetchFn: (async (u, i) => {
      if (String(u).endsWith('/users/me')) return Response.json({ data: { id: 'owner' } });
      if (String(u).includes('/datasets/sentinel/items?'))
        return i?.headers ? Response.json([]) : denial();
      if (String(u).endsWith('/datasets/sentinel'))
        return i?.headers
          ? Response.json({
              data: {
                id: 'sentinel',
                itemCount: 0,
                generalAccess: 'FOLLOW_USER_SETTING',
                userId: 'owner'
              }
            })
          : new Response(null, { status: 403 });
      calls++;
      throw new Error('timeout');
    }) as typeof fetch
  };
  assert.equal((await skipTrace(input, options)).status, 'delivery_unknown');
  await skipTrace(input, options);
  assert.equal(calls, 1);
});

test('documented limited permissions parameter', async () => {
  let permission = '';
  const p = provider();
  await skipTrace(input, {
    token: 'synthetic',
    store: store(),
    privacyDatasetId: 'sentinel',
    fetchFn: (async (u, i) => {
      if (i?.method === 'POST')
        permission = new URL(String(u)).searchParams.get('forcePermissionLevel') ?? '';
      return p.fetchFn(u, i);
    }) as typeof fetch
  });
  assert.equal(permission, 'LIMITED_PERMISSIONS');
});
test('late billing readback changes receipt without another POST and detects anomaly', async () => {
  const p = provider([row]);
  let charge = 0;
  const s = store();
  let now = 1000;
  const fetchFn = (async (u, i) => {
    const r = await p.fetchFn(u, i);
    if (String(u).includes('actor-runs/') && !i?.method?.includes('PUT')) {
      const b = (await r.json()) as any;
      b.data.usageTotalUsd = charge;
      return Response.json(b);
    }
    return r;
  }) as typeof fetch;
  const options = () => ({
    token: 'synthetic',
    store: s,
    privacyDatasetId: 'sentinel',
    fetchFn,
    now
  });
  assert.equal((await skipTrace(input, options())).charge_usd, 0);
  charge = 0.07;
  now += 61000;
  assert.equal((await skipTrace(input, options())).charge_reconciled, false);
  now += 61000;
  assert.equal((await skipTrace(input, options())).charge_reconciled, true);
  charge = 0.11;
  now += 61000;
  assert.equal((await skipTrace(input, options())).status, 'billing_review');
  assert.equal(p.posts(), 1);
  await assert.rejects(() => skipTrace({ ...input, npi: '9999999999' }, options()), /billing/);
});
test('privacy preflight fails before paid dispatch and is recoverable', async () => {
  const p = provider();
  const s = store();
  const result = await skipTrace(input, { token: 'synthetic', store: s, fetchFn: p.fetchFn });
  assert.equal(result.status, 'privacy_blocked');
  assert.equal(p.posts(), 0);
  await skipTrace(input, {
    token: 'synthetic',
    store: s,
    privacyDatasetId: 'sentinel',
    fetchFn: p.fetchFn
  });
  assert.equal(p.posts(), 1);
});
test('unrecognized phone text is omitted without interpreting freshness', async () => {
  const p = provider([{ ...row, 'Phone-1': 'unknown provider text' }]);
  const r = await skipTrace(input, {
    token: 'synthetic',
    store: store(),
    privacyDatasetId: 'sentinel',
    fetchFn: p.fetchFn
  });
  assert.deepEqual(r.contacts?.phones, []);
  assert.equal(r.person_link, 'https://www.example.test/person/synthetic');
});
test('public MCP invocation preserves registry middle name and exact pilot conventions', async () => {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
  const { createAbundanceHealthcareServer } = await import('../src/index.js');
  const p = provider([{ ...row, 'Input Given': 'Synthetic Middle Example; Austin, TX' }]);
  const s = store();
  const server = createAbundanceHealthcareServer({
    agencyApiKey: 'synthetic',
    fetchFn: async () =>
      Response.json({
        success: true,
        data: {
          report: {
            persona: {},
            evaluated_at: '2026-11-11',
            market_coverage_status: 'ok',
            direct_outreach_status: 'blocked',
            recruiting_pipeline: {
              coverage_candidate_count: 1,
              recruiter_ready_count: 0,
              required_evidence_kinds: []
            },
            provider_count: 1,
            source: { coverage_limit_reached: false }
          },
          providers: [
            {
              npi: input.npi,
              name: 'Synthetic Middle Example',
              first_name: 'Synthetic',
              middle_name: 'Middle',
              last_name: 'Example',
              practice_city: 'Austin',
              practice_state: 'TX'
            }
          ],
          readiness: [],
          total: 1,
          limit: 1,
          offset: 0
        }
      }),
    skipTrace: async (identity) => {
      assert.equal(identity.full_name, 'Synthetic Middle Example');
      return skipTrace(identity, {
        token: 'synthetic',
        store: s,
        privacyDatasetId: 'sentinel',
        fetchFn: p.fetchFn
      });
    }
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b);
  const client = new Client({ name: 'synthetic-test', version: '1' });
  await client.connect(a);
  try {
    const r = await client.callTool({
      name: 'enrich_candidate_skip_trace',
      arguments: { npi: input.npi, confirm_paid_enrichment: true }
    });
    assert.equal(r.isError, undefined);
    assert.match(JSON.stringify(r), /review_required/);
    assert.match(JSON.stringify(r), /https:\/\/www.example.test/);
    const denied = await client.callTool({
      name: 'enrich_candidate_skip_trace',
      arguments: { npi: input.npi, confirm_paid_enrichment: false }
    });
    assert.equal(denied.isError, true);
    assert.equal(p.posts(), 1);
  } finally {
    await client.close();
    await server.close();
  }
});
for (const terminal of ['FAILED', 'ABORTED', 'TIMED-OUT'])
  test('provider terminal ' + terminal, async () => {
    const p = provider();
    const fetchFn = (async (u, i) => {
      const r = await p.fetchFn(u, i);
      if (String(u).includes('/actor-runs/') && i?.method !== 'PUT') {
        const b = (await r.json()) as any;
        b.data.status = terminal;
        return Response.json(b);
      }
      return r;
    }) as typeof fetch;
    const r = await skipTrace(input, {
      token: 'synthetic',
      store: store(),
      privacyDatasetId: 'sentinel',
      fetchFn
    });
    assert.equal(
      r.status,
      terminal === 'FAILED'
        ? 'provider_failed'
        : terminal === 'ABORTED'
          ? 'provider_aborted'
          : 'provider_timeout'
    );
    assert.equal(r.contacts, undefined);
  });
test('known run recovers after poll transport failure without redispatch', async () => {
  const p = provider([row]);
  let fail = true;
  const fetchFn = (async (u, i) => {
    if (String(u).includes('/actor-runs/') && i?.method !== 'PUT' && fail)
      throw new Error('network');
    return p.fetchFn(u, i);
  }) as typeof fetch;
  const options = { token: 'synthetic', store: store(), privacyDatasetId: 'sentinel', fetchFn };
  assert.equal((await skipTrace(input, options)).status, 'pending');
  fail = false;
  assert.equal((await skipTrace(input, options)).status, 'review_required');
  assert.equal(p.posts(), 1);
});
test('concurrent known pollers serialize and preserve terminal receipt', async () => {
  const p = provider([row]);
  const options = {
    token: 'synthetic',
    store: store(),
    privacyDatasetId: 'sentinel',
    fetchFn: p.fetchFn
  };
  await skipTrace(input, options);
  const r = await Promise.all([skipTrace(input, options), skipTrace(input, options)]);
  assert.ok(r.every((v) => v.status === 'review_required'));
  assert.equal(p.posts(), 1);
});
test('expired poll lease cannot overwrite a newer terminal receipt', async () => {
  const p = provider([row]);
  const s = store();
  const options = {
    token: 'synthetic',
    store: s,
    privacyDatasetId: 'sentinel',
    fetchFn: p.fetchFn,
    now: 1000
  };
  await skipTrace(input, options);
  let release!: () => void;
  let entered!: () => void;
  const ready = new Promise<void>((r) => (entered = r));
  const gate = new Promise<void>((r) => (release = r));
  let block = true;
  const stale = skipTrace(input, {
    ...options,
    now: 2000,
    fetchFn: (async (u, i) => {
      if (block && String(u).includes('/actor-runs/') && i?.method !== 'PUT') {
        block = false;
        entered();
        await gate;
        return Response.json({
          data: {
            generalAccess: 'RESTRICTED',
            id: 'run1',
            actId: 'vmf6h5lxPAkB1W2gT',
            defaultDatasetId: 'dataset1',
            buildNumber: '0.0.192',
            status: 'RUNNING'
          }
        });
      }
      return p.fetchFn(u, i);
    }) as typeof fetch
  });
  await ready;
  const newer = await skipTrace(input, { ...options, now: 123000 });
  release();
  const old = await stale;
  assert.equal(old.revision, newer.revision);
  assert.equal(old.status, 'review_required');
  assert.equal(p.posts(), 1);
});
test('unrestricted sentinel and failed private readback withhold contacts', async () => {
  for (const phase of ['sentinel', 'readback']) {
    const p = provider([row]);
    const fetchFn = (async (u, i) => {
      if (phase === 'sentinel' && String(u).includes('/datasets/sentinel/items?') && !i?.headers)
        return Response.json({});
      if (phase === 'readback' && String(u).endsWith('/datasets/dataset1') && i?.method !== 'PUT')
        return Response.json({ data: { generalAccess: 'ANYONE_WITH_ID_CAN_READ' } });
      return p.fetchFn(u, i);
    }) as typeof fetch;
    const r = await skipTrace(input, {
      token: 'synthetic',
      store: store(),
      privacyDatasetId: 'sentinel',
      fetchFn
    });
    assert.equal(r.contacts, undefined);
    assert.equal(r.status, phase === 'sentinel' ? 'privacy_blocked' : 'privacy_blocked_review');
    assert.equal(p.posts(), phase === 'sentinel' ? 0 : 1);
  }
});

const denial = () =>
  Response.json(
    {
      error: {
        type: 'insufficient-permissions',
        message:
          "Insufficient permissions for the dataset. Make sure you're passing a correct API token and that it has the required permissions."
      }
    },
    { status: 403 }
  );
function reviewedProvider(rows: Record<string, unknown>[] = [row]) {
  const p = provider(rows);
  const fetchFn = (async (u, i) => {
    const path = new URL(String(u)).pathname;
    if (path === '/v2/users/me') return Response.json({ data: { id: 'owner' } });
    if (path === '/v2/datasets/sentinel')
      return i?.headers
        ? Response.json({
            data: {
              id: 'sentinel',
              userId: 'owner',
              generalAccess: 'FOLLOW_USER_SETTING',
              itemCount: 0
            }
          })
        : denial();
    if (path === '/v2/datasets/sentinel/items') return i?.headers ? Response.json([]) : denial();
    const r = await p.fetchFn(u, i);
    if (path === '/v2/datasets/dataset1' && i?.method !== 'PUT')
      return Response.json({
        data: { id: 'dataset1', userId: 'owner', generalAccess: 'RESTRICTED' }
      });
    if (path.includes('/actor-runs/') && i?.method !== 'PUT') {
      const b = (await r.json()) as any;
      return Response.json({ data: { ...b.data, userId: 'owner' } });
    }
    return r;
  }) as typeof fetch;
  return { ...p, fetchFn };
}
test('review blocker 1: generic anonymous denial must not authorize paid dispatch', async () => {
  for (const response of [
    new Response(null, { status: 403 }),
    Response.json({ error: { type: 'not-found' } }, { status: 404 }),
    new Response('<html>Forbidden</html>', { status: 403 }),
    Response.json({ error: { type: 'insufficient-permissions' } }, { status: 401 })
  ]) {
    const p = reviewedProvider();
    const r = await skipTrace(input, {
      token: 'synthetic',
      store: store(),
      privacyDatasetId: 'sentinel',
      fetchFn: (async (u, i) => {
        if (!i?.headers) return response;
        return p.fetchFn(u, i);
      }) as typeof fetch
    });
    assert.equal(r.status, 'privacy_blocked');
    assert.equal(p.posts(), 0);
  }
});
test('review blocker 2: delayed charge after zero reservation pruning restores cap', async () => {
  const p = reviewedProvider();
  const s = store();
  let now = 1000,
    charge = 0;
  const options = () => ({
    token: 'synthetic',
    store: s,
    privacyDatasetId: 'sentinel',
    now,
    dailyBudgetUsd: 0.1,
    fetchFn: (async (u, i) => {
      const r = await p.fetchFn(u, i);
      if (String(u).includes('/actor-runs/') && i?.method !== 'PUT') {
        const b = (await r.json()) as any;
        b.data.usageTotalUsd = charge;
        return Response.json(b);
      }
      return r;
    }) as typeof fetch
  });
  const original = await skipTrace(input, options());
  now += 61000;
  await skipTrace(input, options());
  now += 86400001;
  await skipTrace({ ...input, npi: '1234567891' }, options());
  assert.equal((await s.get<any[]>('skip:budget'))?.length, 1);
  charge = 0.07;
  await skipTrace(input, options());
  const entries = await s.get<any[]>('skip:budget');
  assert.equal(entries?.length, 2);
  assert.ok(entries?.some((r) => r.id === original.id && r.cents === 10 && r.reconciled === false));
  await assert.rejects(() => skipTrace({ ...input, npi: '1234567892' }, options()), /budget/);
});
test('review blocker 3: exact search mode required even with matching identity', async () => {
  for (const mode of [undefined, 'Name Search', 'Phone Search', 'name']) {
    const p = reviewedProvider([{ ...row, 'Search Option': mode }]);
    const r = await skipTrace(input, {
      token: 'synthetic',
      store: store(),
      privacyDatasetId: 'sentinel',
      fetchFn: p.fetchFn
    });
    assert.equal(r.status, 'blocked_review');
    assert.equal(r.contacts, undefined);
  }
});
test('review blocker 4: coerced missing dataset receipt must not form URL', async () => {
  const p = reviewedProvider();
  const paths: string[] = [];
  const r = await skipTrace(input, {
    token: 'synthetic',
    store: store(),
    privacyDatasetId: 'sentinel',
    fetchFn: (async (u, i) => {
      paths.push(String(u));
      if (i?.method === 'POST') return Response.json({ data: { id: 'run1', userId: 'owner' } });
      return p.fetchFn(u, i);
    }) as typeof fetch
  });
  assert.equal(r.run_id, undefined);
  assert.ok(!paths.some((p) => p.includes('/datasets/undefined')));
});
test('provider identifiers are strict bounded strings at account, sentinel, receipt and resume boundaries', async () => {
  for (const bad of [undefined, null, 17, true, [], {}, '', 'has/slash', 'x'.repeat(65)]) {
    for (const field of [
      'account',
      'sentinel_id',
      'sentinel_owner',
      'run_id',
      'dataset_id',
      'run_owner'
    ]) {
      const p = reviewedProvider();
      const calls: string[] = [];
      const fetchFn = (async (u, i) => {
        calls.push(String(u));
        const r = await p.fetchFn(u, i);
        const path = new URL(String(u)).pathname;
        if (field === 'account' && path === '/v2/users/me')
          return Response.json({ data: { id: bad } });
        if (
          path === '/v2/datasets/sentinel' &&
          (field === 'sentinel_id' || field === 'sentinel_owner')
        ) {
          const b = (await r.json()) as any;
          b.data[field === 'sentinel_id' ? 'id' : 'userId'] = bad;
          return Response.json(b);
        }
        if (i?.method === 'POST' && ['run_id', 'dataset_id', 'run_owner'].includes(field)) {
          const b = (await r.json()) as any;
          b.data[
            field === 'run_id' ? 'id' : field === 'dataset_id' ? 'defaultDatasetId' : 'userId'
          ] = bad;
          return Response.json(b);
        }
        return r;
      }) as typeof fetch;
      const result = await skipTrace(input, {
        token: 'synthetic',
        store: store(),
        privacyDatasetId: 'sentinel',
        fetchFn
      });
      assert.equal(result.contacts, undefined, field);
      assert.equal(result.run_id, undefined, field);
      assert.ok(
        !calls.some((c) => c.includes('/undefined') || c.includes('/null') || c.includes('[object'))
      );
      if (['account', 'sentinel_id', 'sentinel_owner'].includes(field)) assert.equal(p.posts(), 0);
    }
    for (const field of ['run_id', 'dataset_id', 'owner_id']) {
      const p = reviewedProvider();
      const s = store();
      const options = {
        token: 'synthetic',
        store: s,
        privacyDatasetId: 'sentinel',
        fetchFn: p.fetchFn
      };
      const result = await skipTrace(input, options);
      await s.put('skip:' + result.id, { ...result, [field]: bad });
      let calls = 0;
      const blocked = await skipTrace(input, {
        ...options,
        fetchFn: (async () => {
          calls++;
          throw new Error('must not fetch');
        }) as typeof fetch
      });
      assert.equal(blocked.status, 'association_failure');
      assert.equal(blocked.contacts, undefined);
      assert.equal(blocked[field as 'run_id' | 'dataset_id' | 'owner_id'], undefined);
      assert.equal(calls, 0);
    }
  }
});
test('sentinel exact identity, empty items and account ownership required; specific dataset denial only', async () => {
  for (const mode of [
    'wrong_id',
    'wrong_owner',
    'nonempty',
    'nonempty_items',
    'wrong_error',
    'wrong_message',
    'network'
  ]) {
    const p = reviewedProvider();
    const result = await skipTrace(input, {
      token: 'synthetic',
      store: store(),
      privacyDatasetId: 'sentinel',
      fetchFn: (async (u, i) => {
        const path = new URL(String(u)).pathname;
        if (path === '/v2/datasets/sentinel') {
          return Response.json({
            data: {
              id: mode === 'wrong_id' ? 'other' : 'sentinel',
              userId: mode === 'wrong_owner' ? 'other' : 'owner',
              generalAccess: 'FOLLOW_USER_SETTING',
              itemCount: mode === 'nonempty' ? 1 : 0
            }
          });
        }
        if (path.endsWith('/sentinel/items')) {
          if (i?.headers && mode === 'nonempty_items') return Response.json([{ synthetic: true }]);
          if (!i?.headers) {
            if (mode === 'network') throw new Error('network');
            if (mode === 'wrong_error')
              return Response.json({ error: { type: 'not-found' } }, { status: 403 });
            if (mode === 'wrong_message')
              return Response.json(
                { error: { type: 'insufficient-permissions', message: 'Generic forbidden' } },
                { status: 403 }
              );
          }
        }
        return p.fetchFn(u, i);
      }) as typeof fetch
    });
    assert.equal(result.status, 'privacy_blocked', mode);
    assert.equal(p.posts(), 0, mode);
  }
});
test('cached zero-charge success is invalidated on every reconciliation failure boundary', async () => {
  for (const boundary of ['account', 'run', 'put', 'readback', 'items']) {
    const p = reviewedProvider();
    const s = store();
    let now = 1000,
      fail = false;
    let runReads = 0,
      charge = 0;
    const options = () => ({
      token: 'synthetic',
      store: s,
      privacyDatasetId: 'sentinel',
      now,
      fetchFn: (async (u, i) => {
        const path = new URL(String(u)).pathname;
        if (
          fail &&
          ((boundary === 'account' && path.endsWith('/users/me')) ||
            (boundary === 'run' && path.includes('/actor-runs/') && i?.method !== 'PUT') ||
            (boundary === 'put' && i?.method === 'PUT') ||
            (boundary === 'items' && path.endsWith('/dataset1/items')) ||
            (boundary === 'readback' &&
              path.includes('/actor-runs/') &&
              i?.method !== 'PUT' &&
              ++runReads > 1))
        )
          return new Response(null, { status: 403 });
        const r = await p.fetchFn(u, i);
        if (path.includes('/actor-runs/') && i?.method !== 'PUT') {
          const b = (await r.json()) as any;
          b.data.usageTotalUsd = charge;
          return Response.json(b);
        }
        return r;
      }) as typeof fetch
    });
    await skipTrace(input, options());
    now += 61000;
    assert.equal((await skipTrace(input, options())).charge_reconciled, true);
    fail = true;
    charge = 0.1;
    now += 1000;
    const result = await skipTrace(input, options());
    assert.equal(result.status, 'pending');
    assert.equal(result.contacts, undefined);
    assert.equal(result.charge_reconciled, false);
    assert.equal((await s.get<any[]>('skip:budget'))?.[0].cents, 10, boundary);
    assert.equal(p.posts(), 1);
    fail = false;
    now += 1000;
    const recovered = await skipTrace(input, options());
    assert.equal(recovered.status, 'review_required');
    assert.equal(recovered.charge_reconciled, false);
    now += 61000;
    assert.equal((await skipTrace(input, options())).charge_reconciled, true);
    assert.equal(p.posts(), 1);
  }
});
test('same-receipt reads cannot authorize creation on cache miss or changed identity', async () => {
  const p = reviewedProvider();
  const s = store();
  const options = {
    token: 'synthetic',
    store: s,
    privacyDatasetId: 'sentinel',
    fetchFn: p.fetchFn
  };
  await assert.rejects(
    () =>
      skipTrace({ ...input, reconcile_receipt: { id: 'a'.repeat(64), run_id: 'run1' } }, options),
    /receipt/
  );
  assert.equal(p.posts(), 0);
  const receipt = await skipTrace(input, options);
  await skipTrace(
    { ...input, reconcile_receipt: { id: receipt.id, run_id: receipt.run_id! } },
    options
  );
  assert.equal(p.posts(), 1);
  await assert.rejects(() =>
    skipTrace(
      {
        ...input,
        practice_city: 'Other',
        reconcile_receipt: { id: receipt.id, run_id: receipt.run_id! }
      },
      options
    )
  );
  assert.equal(p.posts(), 1);
  await assert.rejects(() =>
    skipTrace(
      {
        ...input,
        confirm_paid_enrichment: false,
        reconcile_receipt: { id: receipt.id, run_id: receipt.run_id! }
      } as never,
      options
    )
  );
});
