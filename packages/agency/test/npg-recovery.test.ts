import assert from 'node:assert/strict';
import test from 'node:test';
import { recomputeProfile, recoveryFor } from '../src/lib/server/npg/recovery.ts';
test('completed reads replace stale partial status without settling unknown billing', () => {
  const result = recomputeProfile({
    status: 'partial',
    providers: {
      pdl: { status: 'matched' },
      clay: { status: 'review_required' },
      exa: { status: 'complete' },
      apify: { status: 'no_contact', charge_reconciled: false }
    },
    profile: { provider_results: { apify: { status: 'pending' } } },
    spend_tracking: { actual_usd: null }
  });
  assert.equal(result.status, 'complete');
  assert.equal(result.billing_reconciliation_required, true);
  assert.equal(result.profile.provider_results.apify.status, 'no_contact');
});
test('identity holds remain blocked independent of billing', () => {
  assert.equal(
    recomputeProfile({
      providers: {
        pdl: { status: 'matched' },
        clay: { status: 'review_required' },
        exa: { status: 'complete' },
        apify: { status: 'blocked_review', charge_reconciled: false }
      }
    }).status,
    'blocked'
  );
});
test('legacy exact receipts yield bounded persisted recovery anchors', () => {
  const source = {
    tool: 'enrich_candidate_complete_profile',
    actionId: 'a',
    data: {
      npi: '1234567890',
      providers: {
        clay: {
          id: 'npgclay_12345678-1234-1234-1234-123456789abc',
          npi: '1234567890',
          status: 'pending'
        }
      }
    }
  };
  const job = recoveryFor(source, 1000);
  assert.equal(job, undefined);
});

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { NpgStore, type State } from '../src/lib/server/npg/store.ts';
import { runRecoveryBatch } from '../src/lib/server/npg/recovery.ts';
import { executeCommand } from '../src/lib/server/npg/runner.ts';
import type { Providers } from '../src/lib/server/npg/providers.ts';
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
async function fixture(fn: (store: NpgStore, advance: (n: number) => void) => Promise<void>) {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: '2025-11-15',
    d1Databases: ['DB']
  });
  try {
    const db = await mf.getD1Database('DB');
    for (const sql of readFileSync(
      new URL('../migrations/0062_npg_private_analyst.sql', import.meta.url),
      'utf8'
    ).match(/CREATE TRIGGER[\s\S]*?END;|CREATE (?:TABLE|INDEX)[\s\S]*?;/g) ?? [])
      await db.prepare(sql).run();
    let now = 1000000;
    await fn(new NpgStore(db, () => now), (n) => (now += n));
  } finally {
    await mf.dispose();
  }
}
async function pending(store: NpgStore) {
  const c = await store.create('alice');
  const actionId = crypto.randomUUID();
  const clay = {
    id: 'npgclay_12345678-1234-1234-1234-123456789abc',
    npi: '1234567890',
    status: 'pending'
  };
  const skip = {
    id: 'a'.repeat(64),
    run_id: 'exactRun',
    npi: clay.npi,
    status: 'pending',
    charge_reconciled: false
  };
  const state: State = {
    messages: [],
    sources: [
      {
        tool: 'enrich_candidate_complete_profile',
        actionId,
        data: {
          npi: clay.npi,
          providers: { pdl: { status: 'matched' }, exa: { status: 'complete' }, clay, apify: skip }
        }
      }
    ]
  };
  await store.db
    .prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?')
    .bind(JSON.stringify(state), c.id)
    .run();
  await store.db
    .prepare(
      `INSERT INTO npg_analyst_actions(id,conversation_id,owner_id,version,tool,arguments_json,call_id,response_id,review_json,expires_at,status) VALUES(?,?,?,0,?,?,?,?,?,0,'completed')`
    )
    .bind(
      actionId,
      c.id,
      'alice',
      'enrich_candidate_complete_profile',
      JSON.stringify({ operation_id: actionId, npi: clay.npi, confirm_paid_enrichment: true }),
      'call',
      'resp',
      '{}'
    )
    .run();
  return { c, actionId, clay, skip };
}
test('durable cron resumes exact receipts without creation, serializes chat, and does not replay after reload', () =>
  fixture(async (store) => {
    const { c, clay, skip } = await pending(store);
    const calls: string[] = [];
    const p: Providers = {
      tools: async () => [],
      respond: async () => {
        throw Error('model forbidden');
      },
      close: async () => {},
      call: async (name, args) => {
        calls.push(name);
        await assert.rejects(store.start('alice', c.id, 0, 'other'), /changed or stopped/);
        if (name === 'get_professional_contact_enrichment') {
          assert.deepEqual(args, { id: clay.id });
          return { ...clay, status: 'review_required' };
        }
        assert.equal(name, 'enrich_candidate_skip_trace');
        assert.deepEqual(args.reconcile_receipt, { id: skip.id, run_id: skip.run_id });
        return { ...skip, status: 'no_contact', charge_reconciled: true, charge_usd: 0.01 };
      }
    };
    await Promise.all([runRecoveryBatch(store, () => p), runRecoveryBatch(store, () => p)]);
    assert.equal(calls.length, 1);
    const view = await store.view('alice', c.id);
    assert.equal(view.enrichmentRecovery[0].status, 'complete');
    assert.equal((view.sources[0].data as any).status, 'retired');
    await runRecoveryBatch(new NpgStore(store.db, store.now), () => p);
    assert.equal(calls.length, 1);
    await assert.rejects(store.view('bob', c.id), /not found/);
  }));
test('an unrelated chat interruption does not strand approved receipt recovery after restart', () =>
  fixture(async (store, advance) => {
    const { c, actionId, skip } = await pending(store);
    const approved = await store.action('alice', actionId);
    let reads = 0;
    const receipts: Providers = {
      tools: async () => [], close: async () => {},
      respond: async () => { throw Error('Recovery must never restart the chat model'); },
      call: async (name, args) => {
        assert.equal(name, 'enrich_candidate_skip_trace');
        assert.deepEqual(args.reconcile_receipt, { id: skip.id, run_id: skip.run_id });
        assert.equal(args.npi, skip.npi);
        reads++;
        return reads === 1 ? skip : { ...skip, status: 'no_contact', charge_reconciled: true };
      }
    };
    await runRecoveryBatch(store, () => receipts);
    const before = await store.read('alice', c.id);
    const interrupted = await executeCommand(store, 'alice', {
      type: 'message', id: c.id, version: before.version, text: 'Explain these existing results.'
    }, () => ({
      tools: async () => [], close: async () => {},
      call: async () => { throw Error('No new provider lookup is allowed'); },
      respond: async () => { throw Error('Synthetic later model failure'); }
    }));
    assert.equal(interrupted.status, 'interrupted');
    assert.equal(interrupted.enrichmentRecovery[0].status, 'pending');
    assert.equal(interrupted.enrichmentRecovery[0].attempts, 1);
    const failedChat = await store.read('alice', c.id);
    const savedMessages = JSON.parse(failedChat.state_json).messages;

    const restarted = new NpgStore(store.db, store.now);
    assert.deepEqual(await runRecoveryBatch(restarted, () => receipts), { processed: 0 });
    assert.equal(reads, 1, 'The original backoff still applies after interruption');
    advance(60000);
    assert.deepEqual(await runRecoveryBatch(restarted, () => receipts), { processed: 1 });
    assert.equal(reads, 2);
    const after = await restarted.read('alice', c.id);
    const recovered: State = JSON.parse(after.state_json);
    assert.equal(after.status, 'interrupted', 'Receipt recovery does not reopen the interrupted chat');
    assert.equal(after.paid_dispatched, 0);
    assert.deepEqual(recovered.messages, savedMessages);
    assert.equal(recovered.enrichmentRecovery![0].status, 'complete');
    assert.equal(recovered.enrichmentRecovery![0].attempts, 2);
    assert.equal((recovered.sources[0].data as any).providers.apify.run_id, skip.run_id);
    assert.equal((recovered.sources[0].data as any).providers.apify.status, 'no_contact');
    assert.deepEqual(await store.action('alice', actionId), approved);
    assert.deepEqual(await runRecoveryBatch(restarted, () => receipts), { processed: 0 });
    assert.equal(reads, 2, 'Completed receipt must not be read again');
  }));
for (const outcome of ['pending', 'no_contact'] as const) {
  test(`stale review snapshot cannot overwrite ${outcome} recovery or bypass its backoff`, () =>
    fixture(async (store) => {
      const { c, skip } = await pending(store);
      const initial = await store.read('alice', c.id);
      const state: State = JSON.parse(initial.state_json);
      state.pendingId = 'pending-human-review';
      await store.db.prepare("UPDATE npg_analyst_conversations SET status='review',state_json=? WHERE id=?")
        .bind(JSON.stringify(state), c.id).run();

      let selected!: () => void;
      let release!: () => void;
      const selectedSnapshot = new Promise<void>((resolve) => { selected = resolve; });
      const releaseSnapshot = new Promise<void>((resolve) => { release = resolve; });
      // Freeze one SELECT result until a competing batch has saved its new state and
      // released the lease. Unlike idle conversations, review keeps its version.
      const pauseSelection = (statement: D1PreparedStatement): D1PreparedStatement =>
        new Proxy(statement, {
          get(target, property) {
            if (property === 'bind') return (...args: unknown[]) => pauseSelection(target.bind(...args));
            if (property === 'all') return async () => {
              const result = await target.all();
              selected();
              await releaseSnapshot;
              return result;
            };
            const value = Reflect.get(target, property);
            return typeof value === 'function' ? value.bind(target) : value;
          }
        });
      const delayedDb = new Proxy(store.db, {
        get(target, property) {
          if (property === 'prepare') return (sql: string) => {
            const statement = target.prepare(sql);
            return sql.startsWith('SELECT * FROM npg_analyst_conversations WHERE scope=')
              ? pauseSelection(statement) : statement;
          };
          const value = Reflect.get(target, property);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
      let reads = 0;
      const providers: Providers = {
        tools: async () => [], close: async () => {},
        respond: async () => { throw Error('model forbidden'); },
        call: async (name, args) => {
          assert.equal(name, 'enrich_candidate_skip_trace');
          assert.deepEqual(args.reconcile_receipt, { id: skip.id, run_id: skip.run_id });
          reads++;
          return { ...skip, status: outcome, charge_reconciled: outcome === 'no_contact' };
        }
      };
      const staleBatch = runRecoveryBatch(new NpgStore(delayedDb, store.now), () => providers);
      await selectedSnapshot;
      let saved: Awaited<ReturnType<NpgStore['read']>>;
      try {
        assert.deepEqual(await runRecoveryBatch(store, () => providers), { processed: 1 });
        saved = await store.read('alice', c.id);
      } finally {
        release();
      }
      assert.deepEqual(await staleBatch, { processed: 0 });
      assert.equal(reads, 1, 'A stale snapshot must never trigger another receipt read');
      const after = await store.read('alice', c.id);
      assert.equal(after.version, initial.version, 'The pending approval version stays valid');
      assert.equal(after.state_json, saved.state_json, 'Recovered evidence and backoff remain intact');
      const recovered: State = JSON.parse(after.state_json);
      assert.equal(recovered.pendingId, 'pending-human-review');
      assert.equal(recovered.enrichmentRecovery![0].attempts, 1);
      assert.equal(recovered.enrichmentRecovery![0].status, outcome === 'pending' ? 'pending' : 'complete');
      if (outcome === 'pending') assert.equal(recovered.enrichmentRecovery![0].nextAttemptAt, store.now() + 60000);
    }));
}
test('catalog failure and restart persist attempts/backoff and reach exhaustion', () =>
  fixture(async (store, advance) => {
    const { c } = await pending(store);
    let catalogs = 0;
    const p: Providers = {
      tools: async () => {
        catalogs++;
        throw Error('unavailable');
      },
      respond: async () => {
        throw Error();
      },
      close: async () => {},
      call: async () => {
        throw Error('offline');
      }
    };
    await runRecoveryBatch(store, () => p);
    let view = await store.view('alice', c.id);
    assert.equal(view.enrichmentRecovery[0].attempts, 1);
    assert.equal(view.enrichmentRecovery[0].nextAttemptAt, 1060000);
    await runRecoveryBatch(store, () => p);
    assert.equal(catalogs, 1);
    advance(86400000);
    await runRecoveryBatch(store, () => p);
    view = await store.view('alice', c.id);
    assert.equal(view.enrichmentRecovery[0].status, 'exhausted');
    assert.equal(catalogs, 2);
  }));
test('Skip association failure withholds stale contacts and preserves retired audit receipt', () =>
  fixture(async (store) => {
    const { c, clay, skip } = await pending(store);
    const p: Providers = {
      tools: async () => [],
      close: async () => {},
      respond: async () => {
        throw Error();
      },
      call: async (name) =>
        name === 'enrich_candidate_skip_trace'
          ? { ...skip, npi:'9999999999', contacts:['withheld'] }
          : assert.fail('retired provider must not be read')
    };
    await runRecoveryBatch(store, () => p);
    const view = await store.view('alice', c.id);
    assert.equal(view.enrichmentRecovery[0].status, 'blocked');
    assert.equal((view.sources[0].data as any).providers.apify.status, 'association_failure');
    assert.equal((view.sources[0].data as any).providers.clay.contacts, undefined);
    assert.equal((view.sources[0].data as any).status, 'blocked');
  }));
test('unknown provider status cannot become complete or expose contacts', () =>
  fixture(async (store) => {
    const { c, clay, skip } = await pending(store);
    const p: Providers = {
      tools: async () => [],
      close: async () => {},
      respond: async () => {
        throw Error();
      },
      call: async (name) =>
        name === 'get_professional_contact_enrichment'
          ? { ...clay, status: 'new_unknown_status', contacts: ['withheld'] }
          : { ...skip, status: 'blocked_review', charge_reconciled: false }
    };
    await runRecoveryBatch(store, () => p);
    const view = await store.view('alice', c.id);
    assert.equal(view.enrichmentRecovery[0].status, 'pending');
    assert.equal((view.sources[0].data as any).providers.clay.contacts, undefined);
    assert.equal((view.sources[0].data as any).status, 'blocked');
  }));
test('due job cannot bypass another saved job backoff or attempt count', () =>
  fixture(async (store) => {
    const { c, actionId, clay, skip } = await pending(store);
    const state: State = JSON.parse((await store.read('alice', c.id)).state_json);
    state.enrichmentRecovery = [
      {
        actionId,
        npi: clay.npi,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: store.now(),
        deadlineAt: store.now() + 86400000
      },
      {
        actionId: 'not-due-action',
        npi: '9999999999',
        status: 'pending',
        attempts: 23,
        nextAttemptAt: store.now() + 3600000,
        deadlineAt: store.now() + 86400000
      }
    ];
    await store.db
      .prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?')
      .bind(JSON.stringify(state), c.id)
      .run();
    const p: Providers = {
      tools: async () => [],
      close: async () => {},
      respond: async () => {
        throw Error();
      },
      call: async (name) =>
        name === 'get_professional_contact_enrichment'
          ? { ...clay, status: 'pending' }
          : { ...skip, status: 'pending' }
    };
    await runRecoveryBatch(store, () => p);
    const view = await store.view('alice', c.id);
    assert.equal(view.enrichmentRecovery[1].attempts, 23);
    assert.equal(view.enrichmentRecovery[1].nextAttemptAt, 4600000);
    assert.equal(view.enrichmentRecovery[1].status, 'pending');
  }));
test('crash before provider creation consumes a persisted attempt', () =>
  fixture(async (store) => {
    const { c } = await pending(store);
    await runRecoveryBatch(store, () => {
      throw Error('process unavailable');
    });
    const view = await store.view('alice', c.id);
    assert.equal(view.enrichmentRecovery[0].attempts, 1);
    assert.equal(view.enrichmentRecovery[0].nextAttemptAt, 1060000);
  }));
test('wrong approved candidate association blocks before receipt reads', () =>
  fixture(async (store) => {
    const { c } = await pending(store);
    const state: State = JSON.parse((await store.read('alice', c.id)).state_json);
    (state.sources[0].data as any).npi = '9999999999';
    (state.sources[0].data as any).providers.apify.npi = '9999999999';
    await store.db
      .prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?')
      .bind(JSON.stringify(state), c.id)
      .run();
    const p: Providers = {
      tools: async () => [],
      close: async () => {},
      respond: async () => {
        throw Error();
      },
      call: async () => {
        assert.fail('must not call source');
      }
    };
    await runRecoveryBatch(store, () => p);
    const view = await store.view('alice', c.id);
    assert.equal(view.enrichmentRecovery[0].status, 'blocked');
  }));
test('pending candidate receipt holds paid creation across owners while unrelated candidates remain available', () =>
  fixture(async (store) => {
    await pending(store);
    const bob = await store.create('bob');
    for (const [id, npi] of [
      ['same', '1234567890'],
      ['different', '9999999999']
    ]) {
      await store.db
        .prepare(
          `INSERT INTO npg_analyst_actions(id,conversation_id,owner_id,version,tool,arguments_json,call_id,response_id,review_json,expires_at) VALUES(?,?,?,0,?,?,?,?,?,0)`
        )
        .bind(
          id,
          bob.id,
          'bob',
          'enrich_candidate_complete_profile',
          JSON.stringify({ npi }),
          'call',
          'resp',
          '{}'
        )
        .run();
    }
    await assert.rejects(store.acquirePaid('token', 'same'), /existing provider receipts/);
    await store.acquirePaid('token', 'different');
    await store.releasePaid('token');
  }));
test('actual Exa shape completes, while unknown synchronous result remains incomplete', () => {
  const providers = {
    pdl: { status: 'matched' },
    clay: { status: 'review_required' },
    apify: { status: 'no_contact' },
    exa: {
      match_status: 'plausible_match',
      contact_route_status: 'unverified_enrichment_candidate'
    }
  };
  assert.equal(recomputeProfile({ providers }).status, 'complete');
  assert.equal(
    recomputeProfile({ providers: { ...providers, pdl: { status: 'unrecognized' } } }).status,
    'partial'
  );
  assert.equal(
    recomputeProfile({
      providers: { ...providers, exa: { ...providers.exa, match_status: 'ambiguous' } }
    }).status,
    'blocked'
  );
});
test('cron preserves pending human review version and exact approval action', () =>
  fixture(async (store) => {
    const { c, clay, skip } = await pending(store);
    const before = await store.read('alice', c.id);
    const state: State = JSON.parse(before.state_json);
    state.pendingId = 'pending-human-review';
    await store.db
      .prepare("UPDATE npg_analyst_conversations SET status='review',state_json=? WHERE id=?")
      .bind(JSON.stringify(state), c.id)
      .run();
    await store.db
      .prepare(
        `INSERT INTO npg_analyst_actions(id,conversation_id,owner_id,version,tool,arguments_json,call_id,response_id,review_json,expires_at) VALUES(?,?,?,0,?,?,?,?,?,?)`
      )
      .bind(
        'pending-human-review',
        c.id,
        'alice',
        'enrich_candidate_complete_profile',
        '{}',
        'call',
        'resp',
        '{}',
        store.now() + 600000
      )
      .run();
    assert.deepEqual(
      await runRecoveryBatch(store, () => ({
        tools: async () => [],
        close: async () => {},
        respond: async () => {
          throw Error('model forbidden');
        },
        call: async (name) =>
          name === 'get_professional_contact_enrichment'
            ? { ...clay, status: 'review_required' }
            : { ...skip, status: 'no_contact', charge_reconciled: true }
      })),
      { processed: 1 }
    );
    const after = await store.read('alice', c.id);
    assert.equal(after.version, before.version);
    assert.equal(JSON.parse(after.state_json).enrichmentRecovery[0].status, 'complete');
    assert.equal(JSON.parse(after.state_json).pendingId, 'pending-human-review');
    const action = await store.action('alice', 'pending-human-review');
    const started = await store.start('alice', c.id, after.version, 'approval-token');
    assert.equal(await store.consume(started, action, 'approve'), 'dispatching');
  }));
test('status normalization retains large original evidence once when no profile container exists', () => {
  const providers = {
    pdl: { status: 'matched', evidence: 'x'.repeat(200000) },
    clay: { status: 'review_required' },
    exa: { status: 'matched' },
    apify: { status: 'blocked_review' }
  };
  const result = recomputeProfile({ status: 'complete', providers });
  assert.equal(result.status, 'blocked');
  assert.equal(result.profile, undefined);
  assert.equal(result.providers, providers);
  assert.ok(JSON.stringify(result).length < 201000);
});
test('cached Clay historical receipt costs never change this operation spend during recovery', async () => {
  for (const historical of [0.05, null])
    await fixture(async (store) => {
      const { c, clay, skip } = await pending(store);
      const state: State = JSON.parse((await store.read('alice', c.id)).state_json);
      const data = state.sources[0].data as any;
      data.providers.clay = { ...clay, cache_hit: true, actual_cost_usd: historical };
      data.providers.apify = {
        ...skip,
        status: 'no_contact',
        charge_reconciled: true,
        operation_charge_usd: 0
      };
      data.spend_tracking = { actual_usd: 0, pending_receipts: historical === null ? 1 : 0 };
      await store.db
        .prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?')
        .bind(JSON.stringify(state), c.id)
        .run();
      await runRecoveryBatch(store, () => ({
        tools: async () => [],
        close: async () => {},
        respond: async () => {
          throw Error();
        },
        call: async (name) => {
          assert.equal(name, 'get_professional_contact_enrichment');
          return { ...clay, status: 'review_required', actual_cost_usd: 0.08 };
        }
      }));
      const result = (await store.view('alice', c.id)).sources[0].data as any;
      assert.equal(result.spend_tracking.actual_usd, 0);
      assert.equal(result.providers.clay.actual_cost_usd,historical);
      assert.equal(result.providers.clay.status,'pending');
      assert.equal(result.status,'retired');
    });
});
test('initial spend fallback recognizes both cache markers but honors explicit operation false', () => {
  for (const marker of ['cached', 'cache_hit']) {
    const result = recomputeProfile({
      providers: {
        pdl: { status: 'matched', operation_charge_usd: 0 },
        clay: { status: 'review_required', [marker]: true, actual_cost_usd: 0.05 },
        exa: { status: 'matched', operation_charge_usd: 0 },
        apify: { status: 'no_contact', cached: true, operation_cache_hit: false, charge_usd: 0.007 }
      },
      spend_tracking: { actual_usd: null }
    });
    assert.equal(result.spend_tracking.actual_usd, 0.007);
  }
});
test('successful exact Clay recovery clears its stale delivery uncertainty and completes aggregate', () =>
  fixture(async (store) => {
    const { c, clay, skip } = await pending(store);
    const state: State = JSON.parse((await store.read('alice', c.id)).state_json);
    const data = state.sources[0].data as any;
    data.uncertain_dispatch = true;
    data.providers.clay = { ...clay, status: 'delivery_unknown' };
    data.providers.apify = {
      ...skip,
      status: 'no_contact',
      charge_reconciled: true,
      charge_usd: 0
    };
    data.spend_tracking = { actual_usd: 0, pending_receipts: 1 };
    await store.db
      .prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?')
      .bind(JSON.stringify(state), c.id)
      .run();
    await runRecoveryBatch(store, () => ({
      tools: async () => [],
      close: async () => {},
      respond: async () => {
        throw Error();
      },
      call: async () => ({ ...clay, status: 'review_required', actual_cost_usd: 0.05 })
    }));
    const view = await store.view('alice', c.id);
    const result = view.sources[0].data as any;
    assert.equal(result.uncertain_dispatch, false);
    assert.equal(result.status, 'retired');
    assert.equal(view.enrichmentRecovery.length, 0);
    assert.equal(result.providers.clay.status,'delivery_unknown');
    assert.equal(result.spend_tracking.pending_receipts, 1);
  }));
test('current unresolved providers and unstarted attempts retain explicit incomplete outcomes', () => {
  const base = {
    pdl: { status: 'matched' },
    clay: { status: 'review_required' },
    exa: { status: 'complete' },
    apify: { status: 'no_contact' }
  };
  assert.equal(
    recomputeProfile({
      providers: { ...base, pdl: { status: 'unresolved' } },
      uncertain_dispatch: false
    }).uncertain_dispatch,
    true
  );
  assert.equal(
    recomputeProfile({
      providers: { ...base, exa: { status: 'unavailable' } },
      uncertain_dispatch: false
    }).status,
    'partial'
  );
  assert.equal(
    recomputeProfile({
      providers: { ...base, exa: { status: 'not_attempted' } },
      uncertain_dispatch: false
    }).status,
    'partial'
  );
  assert.equal(
    recomputeProfile({ providers: base, unstarted: ['exa'], uncertain_dispatch: false }).status,
    'partial'
  );
});
test('configured unavailable Clay settles only new three-provider profiles, preserving historical pending receipts', () => {
  const base = { pdl:{status:'matched'}, exa:{status:'complete'}, apify:{status:'no_contact'} };
  const disabled = {status:'unavailable',availability:'disabled',failure_kind:'plan_unavailable',actual_cost_usd:0};
  assert.equal(recomputeProfile({active_providers:['pdl','exa','apify'],providers:{...base,clay:disabled}}).status,'retired');
  assert.equal(recomputeProfile({providers:{...base,clay:{status:'pending',id:'npgclay_11111111-1111-4111-8111-111111111111'}}}).status,'retired');
  assert.equal(recomputeProfile({providers:{...base,clay:{status:'unavailable'}}}).status,'retired');
});

test('blocked Skip identity review reconciles exact billing without lifting hold or exposing contacts',()=>fixture(async(store)=>{
 const {c,skip}=await pending(store);const state:State=JSON.parse((await store.read('alice',c.id)).state_json);
 const data=state.sources[0].data as any;data.providers.apify={...skip,status:'blocked_review',contacts:['withheld']};
 await store.db.prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?').bind(JSON.stringify(state),c.id).run();
 let reads=0;await runRecoveryBatch(store,()=>({tools:async()=>[],close:async()=>{},respond:async()=>{throw Error('forbidden')},call:async(name,args)=>{
 assert.equal(name,'enrich_candidate_skip_trace');assert.deepEqual(args.reconcile_receipt,{id:skip.id,run_id:skip.run_id});reads++;
 return {...skip,status:'no_contact',charge_reconciled:true,charge_usd:0.007,contacts:['must not expose']};}}));
 const result=(await store.view('alice',c.id)).sources[0].data as any;
 assert.equal(reads,1);assert.equal(result.providers.apify.charge_reconciled,true);assert.equal(result.providers.apify.status,'blocked_review');assert.equal(result.providers.apify.contacts,undefined);assert.equal(result.status,'blocked');
}));
test('retired-only Clay receipt does not hold a new same-candidate three-provider operation',()=>fixture(async(store)=>{
 const {c,actionId,skip}=await pending(store);const state:State=JSON.parse((await store.read('alice',c.id)).state_json);
 const data=state.sources[0].data as any;data.providers.apify={...skip,status:'no_contact',charge_reconciled:true};
 await store.db.prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?').bind(JSON.stringify(state),c.id).run();
 await store.db.prepare("UPDATE npg_analyst_actions SET status='ambiguous' WHERE id=?").bind(actionId).run();
 const original=await store.action('alice',actionId),id=crypto.randomUUID();
 await store.db.prepare("INSERT INTO npg_analyst_actions(id,conversation_id,owner_id,version,tool,arguments_json,call_id,response_id,review_json,expires_at,status) VALUES(?,?,?,0,?,?,?,?,?,0,'dispatching')").bind(id,c.id,'alice',original.tool,JSON.stringify({npi:skip.npi,operation_id:id,confirm_paid_enrichment:true}),'newcall','newresp','{}').run();
 await store.acquirePaid('fresh-three',id);await store.releasePaid('fresh-three');
 assert.equal((await store.view('alice',c.id)).sources[0].data && data.providers.clay.status,'pending');
}));
