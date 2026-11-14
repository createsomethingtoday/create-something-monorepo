import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { NpgStore, type State } from '../src/lib/server/npg/store.ts';
import {
  executeCommand,
  parseCommand,
  enrichmentReview,
  checkPaidScope,
  type Command
} from '../src/lib/server/npg/runner.ts';
import {
  cleanResult,
  createProviders,
  validateArguments,
  type Providers,
  type Tool
} from '../src/lib/server/npg/providers.ts';
import {
  NPG_SOURCE,
  NPG_PROMPT_SHA256,
  NPG_SYSTEM_PROMPT,
  NPG_TOOL_NAMES
} from '../src/lib/server/npg/policy.ts';
import {
  requireNpgUser,
  requireSameOrigin,
  readHealthcareAnalystUrl
} from '../src/lib/server/npg/access.ts';
import { safeLink, sourceLinks, linkParts } from '../src/lib/npg/display.ts';
import { GET, POST } from '../src/routes/delivery/abundance/healthcare-analyst/api/+server.ts';
import { GET as documentGET } from '../src/routes/delivery/abundance/healthcare-analyst/+server.ts';
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const travelArgs = {
  npis: ['1234567890'],
  clinics: [{ id: 'clinic1', address: '123 Main Street, Springfield, MO 65804' }],
  max_minutes: 30,
  clinic_match: 'any'
};
const catalog: Tool[] = [
  {
    name: 'search_registry_sourcing',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'estimate_registry_travel',
    inputSchema: {
      type: 'object',
      required: ['npis', 'clinics', 'max_minutes', 'clinic_match'],
      properties: {
        npis: {
          type: 'array',
          minItems: 1,
          maxItems: 50,
          items: { type: 'string', pattern: '^[0-9]{10}$' }
        },
        clinics: { type: 'array', minItems: 1, maxItems: 3 },
        max_minutes: { enum: [30, 45] },
        clinic_match: { enum: ['any', 'all'] }
      },
      additionalProperties: false
    }
  },
  {
    name: 'enrich_candidate_profile',
    inputSchema: {
      type: 'object',
      properties: {
        npi: { type: 'string' },
        confirm_paid_enrichment: { const: true },
        include_personal_contact: { type: 'boolean' }
      },
      required: ['npi', 'confirm_paid_enrichment'],
      additionalProperties: false
    }
  }
];
function fixture(
  name: string,
  args: unknown,
  options: { fail?: boolean; unknown?: boolean; readiness?: unknown } = {}
) {
  let responses = 0;
  const calls: Array<{ name: string; args: unknown }> = [];
  const tools = options.readiness
    ? [
        ...catalog,
        {
          name: 'get_enrichment_readiness',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false }
        }
      ]
    : catalog;
  const p: Providers = {
    async tools() {
      return tools;
    },
    async call(name, args) {
      calls.push({ name, args });
      if (options.fail) throw new Error('SECRET fixture provider error');
      if (name === 'get_enrichment_readiness') return options.readiness;
      return {
        run_id: 'abnationalrun_fixture',
        snapshot: 'snapshot fixture',
        source_fetched_at: '2026-11-10',
        total: 231,
        results: [{ npi: '1234567890', practice_phone: 'unverified', certification: 'unknown' }],
        taxonomy_scope: ['363LF0000X', '363LA2200X', '363LG0600X'],
        unresolved_count: 17,
        csv_download_url:
          'https://createsomething.agency/delivery/abundance/sourcing.csv?run_id=abnationalrun_fixture&taxonomy_code=363LF0000X%2C363LA2200X&license_state=MO'
      };
    },
    async respond() {
      responses++;
      return responses === 1
        ? {
            id: 'resp_fixture',
            text: '',
            call: {
              name: options.unknown ? 'send_email' : name,
              arguments: JSON.stringify(args),
              call_id: 'call_fixture'
            }
          }
        : { id: 'resp_done', text: '231 matching candidates. Qualifications remain unknown.' };
    },
    async close() {}
  };
  return { p, calls };
}
async function database(fn: (store: NpgStore, advance: (ms: number) => void) => Promise<void>) {
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch(){ return new Response("fixture"); } }',
    compatibilityDate: '2025-11-15',
    d1Databases: ['DB']
  });
  try {
    const db: D1Database = await mf.getD1Database('DB');
    for (const sql of readFileSync(
      new URL('../migrations/0062_npg_private_analyst.sql', import.meta.url),
      'utf8'
    ).match(/CREATE TRIGGER[\s\S]*?END;|CREATE (?:TABLE|INDEX)[\s\S]*?;/g) ?? [])
      await db.prepare(sql).run();
    let now = Date.now();
    await fn(new NpgStore(db, () => now), (ms) => {
      now += ms;
    });
  } finally {
    await mf.dispose();
  }
}
async function conversation(store: NpgStore, owner = 'alice') {
  return store.create(owner);
}
test('history titles project only the owner first question, without exposing full state', async () => {
  await database(async (store) => {
    const alice = await store.create('alice');
    const bob = await store.create('bob');
    await store.db
      .prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?')
      .bind(
        JSON.stringify({
          messages: [
            { role: 'assistant', text: 'ignore this' },
            { role: 'user', text: '  Find family NPs\nnear Springfield  ' },
            { role: 'user', text: 'later question' }
          ],
          sources: [],
          responseId: 'private-chain'
        }),
        alice.id
      )
      .run();
    const rows = await store.list('alice');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, alice.id);
    assert.equal((rows[0] as any).title, 'Find family NPs near Springfield');
    assert.ok(!JSON.stringify(rows).includes('private-chain'));
    assert.ok(!JSON.stringify(rows).includes(bob.id));
    assert.deepEqual(Object.keys(rows[0]).sort(), ['id', 'status', 'title', 'updated_at']);
    assert.equal((await store.list('bob'))[0].title, 'New conversation');
  });
});
const message = (c: { id: string; version: number }): Command => ({
  type: 'message',
  id: c.id,
  version: c.version,
  text: 'Find candidates. Selected NPI 1234567890. Clinic address: 123 Main Street, Springfield, MO 65804. Use 30 minutes, any clinic.'
});
const approve = (v: any): Extract<Command, { type: 'approve' | 'reject' }> => ({
  type: 'approve',
  id: v.id,
  version: v.version,
  actionId: v.pending.id
});

test('captured V8 judgment retained with additive Skip Trace allowlist; no public runtime definition', () => {
  assert.equal(NPG_SOURCE.snapshot_version, 8);
  assert.equal(NPG_SOURCE.model, 'gpt-5.6-luna');
  assert.equal(NPG_SYSTEM_PROMPT.length, 8052);
  assert.equal(createHash('sha256').update(NPG_SYSTEM_PROMPT).digest('hex'), NPG_PROMPT_SHA256);
  assert.equal(NPG_TOOL_NAMES.length, 14);
  assert.ok(NPG_TOOL_NAMES.includes('enrich_candidate_skip_trace'));
  for (const phrase of [
    'get_enrichment_readiness',
    'USD100 TOTAL',
    'selected_npis_only',
    'public_registry_unverified',
    'Family taxonomy',
    'OR, never',
    'none_on_record',
    'failure_kind',
    'complete authenticated CSV'
  ])
    assert.ok(NPG_SYSTEM_PROMPT.includes(phrase), phrase);
});
test('verified Identity subject and existing NPG access only', () => {
  assert.throws(() => requireNpgUser({}, undefined), { status: 401 });
  assert.throws(
    () => requireNpgUser({ user: { id: 'bob', email: 'bob@outside.invalid' } } as any, undefined),
    { status: 403 }
  );
  for (const email of ['a@thenpgroup.com', 'a@thenursepractitionergroup.com'])
    assert.equal(requireNpgUser({ user: { id: 'alice', email } } as any, undefined), 'alice');
  assert.equal(
    requireNpgUser(
      { user: { id: 'operator', email: 'op@createsomething.io' } } as any,
      { env: { AGENCY_OPERATOR_EMAILS: 'op@createsomething.io' } } as any
    ),
    'operator'
  );
  assert.throws(() => requireNpgUser({ user: { email: 'a@thenpgroup.com' } } as any, undefined), {
    status: 401
  });
});
test('mutations require exact same Origin, JSON and same-origin fetch metadata', () => {
  const url = new URL('https://createsomething.agency/delivery/abundance/healthcare-analyst/api');
  for (const origin of [undefined, 'https://evil.invalid', 'null'])
    assert.throws(
      () =>
        requireSameOrigin(
          new Request(url, {
            method: 'POST',
            headers: { ...(origin ? { origin } : {}), 'content-type': 'application/json' }
          }),
          url
        ),
      { status: 403 }
    );
  assert.throws(
    () =>
      requireSameOrigin(
        new Request(url, {
          method: 'POST',
          headers: { origin: url.origin, 'content-type': 'text/plain' }
        }),
        url
      ),
    { status: 415 }
  );
  assert.throws(
    () =>
      requireSameOrigin(
        new Request(url, {
          method: 'POST',
          headers: {
            origin: url.origin,
            'content-type': 'application/json',
            'sec-fetch-site': 'cross-site'
          }
        }),
        url
      ),
    { status: 403 }
  );
  requireSameOrigin(
    new Request(url, {
      method: 'POST',
      headers: { origin: url.origin, 'content-type': 'application/json' }
    }),
    url
  );
});
test('API and page deny anonymous/disallowed reads and mutations even outside hooks', async () => {
  const url = new URL('https://createsomething.agency/delivery/abundance/healthcare-analyst/api');
  for (const locals of [{}, { user: { id: 'bob', email: 'bob@outside.invalid' } }]) {
    for (const handler of [GET, POST])
      await assert.rejects(
        async () =>
          handler({
            locals,
            platform: undefined,
            url,
            request: new Request(url, { method: handler === POST ? 'POST' : 'GET' })
          } as any),
        (e: any) => [401, 403].includes(e.status)
      );
    await assert.rejects(
      async () => documentGET({ locals, setHeaders() {} } as any),
      (e: any) => [401, 403].includes(e.status)
    );
  }
});
test('fallback retains fixed https udify agent URL; disabled API is closed', async () => {
  assert.equal(
    readHealthcareAnalystUrl({
      env: { NPG_HEALTHCARE_ANALYST_URL: 'https://udify.app/agent/retained' }
    } as any),
    'https://udify.app/agent/retained'
  );
  for (const url of ['http://udify.app/agent/a', 'https://evil.invalid/agent/a'])
    assert.throws(
      () => readHealthcareAnalystUrl({ env: { NPG_HEALTHCARE_ANALYST_URL: url } } as any),
      { status: 503 }
    );
  await assert.rejects(
    async () =>
      GET({
        locals: { user: { id: 'alice', email: 'a@thenpgroup.com' } },
        platform: { env: { NPG_HEALTHCARE_CHAT_ENABLED: 'false' } },
        url: new URL('https://createsomething.agency')
      } as any),
    { status: 503 }
  );
});
test('client cannot inject tool, model, provider IDs, response state, or altered approval args', () => {
  for (const extra of [
    { responseId: 'resp_injected' },
    { tool: 'enrich_candidate_profile' },
    { model: 'cheap' },
    { arguments: travelArgs },
    { previous_response_id: 'resp_foo' }
  ])
    assert.throws(() =>
      parseCommand({ type: 'message', id: crypto.randomUUID(), version: 0, text: 'x', ...extra })
    );
  assert.throws(() =>
    parseCommand({ type: 'message', id: crypto.randomUUID(), version: 0, text: 'x'.repeat(6001) })
  );
  assert.throws(() =>
    parseCommand({
      type: 'approve',
      id: crypto.randomUUID(),
      version: 0,
      actionId: crypto.randomUUID(),
      arguments: travelArgs
    })
  );
});
test('owner isolation, server IDs, complete sourcing CSV and source snapshot survive model summary', () =>
  database(async (store) => {
    const c = await conversation(store),
      f = fixture('search_registry_sourcing', {});
    assert.match(c.id, /^[a-f0-9-]{36}$/);
    await assert.rejects(() => store.view('bob', c.id), { status: 404 });
    await assert.rejects(() => executeCommand(store, 'bob', message(c), () => f.p), {
      status: 404
    });
    const v = await executeCommand(store, 'alice', message(c), () => f.p);
    assert.equal(v.status, 'idle');
    assert.equal(v.sources.length, 1);
    const s = v.sources[0].data as any;
    assert.equal(s.total, 231);
    assert.equal(s.unresolved_count, 17);
    assert.equal(s.run_id, 'abnationalrun_fixture');
    assert.equal(s.results.length, 1);
    assert.equal(s.taxonomy_scope.length, 3);
    assert.equal(new URL(s.csv_download_url).searchParams.has('license_state'), true);
    assert.equal(sourceLinks(s)[0].includes('run_id=abnationalrun_fixture'), true);
    assert.equal(
      (await store.db.prepare('SELECT count(*) n FROM npg_analyst_receipts').first<any>())!.n,
      1
    );
    await assert.rejects(() =>
      store.db.prepare("UPDATE npg_analyst_receipts SET outcome='changed'").run()
    );
  }));
test('paid travel pauses, exact args immutable, owner/version bound, one-use approval', () =>
  database(async (store) => {
    const c = await conversation(store),
      f = fixture('estimate_registry_travel', travelArgs);
    const v = await executeCommand(store, 'alice', message(c), () => f.p);
    assert.equal(f.calls.length, 0);
    assert.equal(v.status, 'review');
    assert.deepEqual(v.pending?.arguments, travelArgs);
    assert.match(JSON.stringify(v.pending?.review), /credit/);
    await assert.rejects(() => store.action('bob', v.pending!.id), { status: 404 });
    await assert.rejects(() => executeCommand(store, 'bob', approve(v), () => f.p), {
      status: 404
    });
    await assert.rejects(() =>
      store.db
        .prepare("UPDATE npg_analyst_actions SET arguments_json='{}' WHERE id=?")
        .bind(v.pending!.id)
        .run()
    );
    await assert.rejects(
      () => executeCommand(store, 'alice', { ...approve(v), version: 0 }, () => f.p),
      { status: 409 }
    );
    const done = await executeCommand(store, 'alice', approve(v), () => f.p);
    assert.equal(done.status, 'idle');
    assert.equal(f.calls.length, 1);
    assert.deepEqual(f.calls[0].args, travelArgs);
    await assert.rejects(() => executeCommand(store, 'alice', approve(v), () => f.p), {
      status: 409
    });
    assert.equal(f.calls.length, 1);
  }));
test('approval cannot cross conversations and rejection closes the provider chain without spending', () =>
  database(async (store) => {
    const c = await conversation(store),
      f = fixture('estimate_registry_travel', travelArgs),
      v = await executeCommand(store, 'alice', message(c), () => f.p),
      c2 = await conversation(store);
    await assert.rejects(
      () =>
        executeCommand(
          store,
          'alice',
          { type: 'approve', id: c2.id, version: 0, actionId: v.pending!.id },
          () => f.p
        ),
      { status: 409 }
    );
    const out = await executeCommand(store, 'alice', { ...approve(v), type: 'reject' }, () => f.p);
    assert.equal(out.status, 'idle');
    assert.equal(out.pending, null);
    assert.equal(f.calls.length, 0);
    assert.equal(JSON.parse((await store.read('alice', c.id)).state_json).responseId, undefined);
  }));
test('expired action is consumed safely without any paid dispatch', () =>
  database(async (store, advance) => {
    const c = await conversation(store),
      f = fixture('estimate_registry_travel', travelArgs),
      v = await executeCommand(store, 'alice', message(c), () => f.p);
    advance(11 * 60000);
    const out = await executeCommand(store, 'alice', approve(v), () => f.p);
    assert.equal(out.status, 'idle');
    assert.equal(f.calls.length, 0);
    assert.equal((await store.action('alice', v.pending!.id)).status, 'expired');
  }));
test('simultaneous approvals dispatch at most once; admission applies across conversations', () =>
  database(async (store) => {
    const c = await conversation(store),
      f = fixture('estimate_registry_travel', travelArgs),
      v = await executeCommand(store, 'alice', message(c), () => f.p);
    const results = await Promise.allSettled([
      executeCommand(store, 'alice', approve(v), () => f.p),
      executeCommand(store, 'alice', approve(v), () => f.p)
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(f.calls.length, 1);
    const token = await store.admit('bob');
    await assert.rejects(() => store.admit('bob'), { status: 429 });
    await store.release('bob', token);
  }));
test('missing or unknown estimates still require explicit candidate review before dispatch', () =>
  database(async (store) => {
    for (const readiness of [
      undefined,
      { ready: true },
      { ready: false, provider: 'pdl', cost: { estimated_usd: null } }
    ]) {
      const c = await conversation(store);
      const f = fixture(
        'enrich_candidate_profile',
        { npi: '1234567890', confirm_paid_enrichment: true, include_personal_contact: false },
        { readiness }
      );
      const out = await executeCommand(store, 'alice', message(c), () => f.p);
      assert.equal(out.status, 'review');
      assert.ok(out.pending);
      assert.equal(f.calls.filter((c) => c.name === 'enrich_candidate_profile').length, 0);
    }
  }));
const ready = {
  ready: true,
  provider: 'pdl',
  budget: { currency: 'USD', limit: 100, spent: 2, reconciled: true },
  cost: { maximum_usd: 1 }
};
test('estimate changes do not invalidate an exact candidate approval', () =>
  database(async (store) => {
    const c = await conversation(store);
    const f = fixture(
      'enrich_candidate_profile',
      { npi: '1234567890', confirm_paid_enrichment: true, include_personal_contact: false },
      { readiness: ready }
    );
    const v = await executeCommand(store, 'alice', message(c), () => f.p);
    const changed = fixture(
      'enrich_candidate_profile',
      {},
      { readiness: { ready: false, cost: { estimated_usd: null } } }
    );
    changed.p.respond = async () => ({ id: 'resp_done', text: 'Provider result retained.' });
    const out = await executeCommand(store, 'alice', approve(v), () => changed.p);
    assert.equal(out.status, 'idle');
    assert.equal(changed.calls.filter((c) => c.name === 'enrich_candidate_profile').length, 1);
    assert.equal(enrichmentReview({ cost: { estimated_usd: null } }, 'pdl').estimatedUsd, null);
  }));

test('uncertain paid dispatch is terminal ambiguous, never retried; errors contain no provider secrets', () =>
  database(async (store) => {
    const c = await conversation(store),
      f = fixture('estimate_registry_travel', travelArgs),
      v = await executeCommand(store, 'alice', message(c), () => f.p),
      failed = fixture('estimate_registry_travel', travelArgs, { fail: true });
    const out = await executeCommand(store, 'alice', approve(v), () => failed.p);
    assert.equal(out.status, 'ambiguous');
    assert.equal(failed.calls.length, 1);
    assert.ok(!JSON.stringify(out).includes('SECRET'));
    assert.equal((await store.action('alice', v.pending!.id)).status, 'ambiguous');
    await store.acquirePaid('another-user-token');
    await store.releasePaid('another-user-token');
    await assert.rejects(() => executeCommand(store, 'alice', message(out), () => failed.p), {
      status: 409
    });
    assert.equal(failed.calls.length, 1);
  }));
test('expired lease recovers to interrupted/ambiguous and rejects late writes or dispatch', () =>
  database(async (store, advance) => {
    for (const paid of [false, true]) {
      const c = await conversation(store),
        row = await store.start('alice', c.id, 0, 'lease');
      if (paid) await store.markPaid(row);
      advance(150001);
      assert.equal((await store.read('alice', c.id)).status, paid ? 'ambiguous' : 'interrupted');
      await assert.rejects(() => store.markPaid(row), { status: 409 });
      await assert.rejects(() => store.finish(row, { messages: [], sources: [] }, 'idle', 0), {
        status: 409
      });
    }
  }));
test('unknown tool and malformed args never dispatch; free errors do not retry', () =>
  database(async (store) => {
    for (const f of [
      fixture('search_registry_sourcing', {}, { unknown: true }),
      fixture('estimate_registry_travel', { ...travelArgs, npis: [] }),
      fixture('search_registry_sourcing', {}, { fail: true })
    ]) {
      const c = await conversation(store),
        out = await executeCommand(store, 'alice', message(c), () => f.p);
      assert.equal(out.status, 'interrupted');
      assert.ok(f.calls.length <= 1);
      assert.ok(!JSON.stringify(out).includes('SECRET'));
    }
    assert.throws(() => validateArguments(catalog[1], { ...travelArgs, max_minutes: 60 }));
  }));
test('rate/window and conversation length bounds stop before a provider call', () =>
  database(async (store, advance) => {
    for (let i = 0; i < 10; i++) {
      const t = await store.admit('rate');
      await store.release('rate', t);
    }
    await assert.rejects(() => store.admit('rate'), { status: 429 });
    advance(60001);
    await store.release('rate', await store.admit('rate'));
    const c = await conversation(store);
    await store.db
      .prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?')
      .bind(
        JSON.stringify({
          messages: Array.from({ length: 60 }, () => ({ role: 'user', text: 'x' })),
          sources: []
        }),
        c.id
      )
      .run();
    let called = false;
    await assert.rejects(
      () =>
        executeCommand(store, 'alice', message(c), () => {
          called = true;
          throw new Error();
        }),
      { status: 409 }
    );
    assert.equal(called, false);
  }));
test('browser view contains no owner/provider state; sensitive fields and unsafe links are suppressed', () =>
  database(async (store) => {
    const c = await conversation(store),
      v = await store.view('alice', c.id);
    for (const key of [
      'owner_id',
      'responseId',
      'state_json',
      'lease_token',
      'OPENAI_API_KEY',
      'model'
    ])
      assert.ok(!(key in v));
    assert.deepEqual(
      cleanResult(
        {
          api_key: 'secret',
          nested: { authorization: 'Bearer secret', evidence: 'contains secret' }
        },
        ['secret']
      ),
      { nested: { evidence: 'contains [redacted]' } }
    );
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,test',
      'https://user:pass@example.com',
      'https://example.com?api_key=secret',
      'https://api.openai.com/v1/responses'
    ])
      assert.equal(safeLink(url), null);
    assert.ok(
      safeLink(
        'https://createsomething.agency/delivery/abundance/sourcing.csv?run_id=original&offset=0'
      )
    );
    assert.deepEqual(linkParts('<script>alert(1)</script>'), [
      { text: '<script>alert(1)</script>' }
    ]);
  }));
test('browser modules carry no MCP endpoint, credentials or model configuration', () => {
  for (const path of ['../src/lib/npg/display.ts', '../src/lib/npg/astryx/Workspace.tsx']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    for (const forbidden of [
      'abundance-healthcare-mcp.createsomething.workers.dev',
      'OPENAI_API_KEY',
      'ABUNDANCE_HEALTHCARE_MCP_API_KEY',
      'NPG_HEALTHCARE_MODEL',
      'previous_response_id'
    ])
      assert.ok(!source.includes(forbidden), forbidden);
  }
});
test('NPG cannot silently use a shared Agency credential or an unselected model', () => {
  const signal = AbortSignal.timeout(2000);
  assert.throws(
    () =>
      createProviders(
        {
          OPENAI_API_KEY: 'unrelated-agency-key',
          ABUNDANCE_HEALTHCARE_MCP_API_KEY: 'fixture-mcp-secret',
          NPG_HEALTHCARE_MODEL: NPG_SOURCE.model
        } as never,
        signal
      ),
    { status: 503 }
  );
  assert.throws(
    () =>
      createProviders(
        {
          NPG_HEALTHCARE_OPENAI_API_KEY: 'fixture-openai-secret',
          ABUNDANCE_HEALTHCARE_MCP_API_KEY: 'fixture-mcp-secret'
        },
        signal
      ),
    { status: 503 }
  );
});
test('Responses HTTP uses only server-selected model, bounded tokens, prior ID and no automatic retry', async () => {
  let request: any,
    attempts = 0;
  const p = createProviders(
    {
      NPG_HEALTHCARE_OPENAI_API_KEY: 'fixture-openai-secret',
      NPG_HEALTHCARE_MODEL: NPG_SOURCE.model,
      ABUNDANCE_HEALTHCARE_MCP_API_KEY: 'fixture-mcp-secret'
    },
    AbortSignal.timeout(2000),
    async (url, init) => {
      attempts++;
      assert.equal(String(url), 'https://api.openai.com/v1/responses');
      request = JSON.parse(init!.body as string);
      return Response.json({
        id: 'resp_test',
        status: 'completed',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: 'Safe fixture-openai-secret' }]
          }
        ]
      });
    }
  );
  const result = await p.respond([{ role: 'user', content: 'fixture' }], 'resp_server', catalog);
  assert.equal(request.previous_response_id, 'resp_server');
  assert.equal(request.model, 'gpt-5.6-luna');
  assert.equal(request.max_output_tokens, 3000);
  assert.equal(request.parallel_tool_calls, false);
  assert.match(
    request.instructions,
    /Current custom-host policy supersedes all Dify spend restrictions/
  );
  assert.match(request.instructions, /Skip Trace review emit enrich_candidate_skip_trace/);
  assert.match(request.instructions, /confirm_paid_enrichment=true.*host proposal, not approval/s);
  assert.equal(result.text, 'Safe [redacted]');
  assert.equal(attempts, 1);
  await p.close();
});
test('paid readiness/dispatch lease serializes the shared allowance across different users', () =>
  database(async (store, advance) => {
    await store.acquirePaid('alice-token');
    await assert.rejects(() => store.acquirePaid('bob-token'), { status: 409 });
    await store.releasePaid('wrong-token');
    await assert.rejects(() => store.acquirePaid('bob-token'), { status: 409 });
    await store.releasePaid('alice-token');
    await store.acquirePaid('bob-token');
    advance(150001);
    await store.acquirePaid('next-token');
  }));
test('MCP transport uses fixed bearer endpoint, bounded allowlist and advertised optional readiness schema', async () => {
  const requests: any[] = [];
  const mock: typeof fetch = async (url, init) => {
    assert.equal(String(url), 'https://abundance-healthcare-mcp.createsomething.workers.dev/mcp');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer fixture-mcp-secret');
    assert.equal(init?.redirect, 'manual');
    if (init?.method === 'GET' || init?.method === 'DELETE')
      return new Response(null, { status: 405 });
    const rpc = JSON.parse(String(init?.body));
    requests.push(rpc);
    if (rpc.method === 'notifications/initialized') return new Response(null, { status: 202 });
    const result =
      rpc.method === 'initialize'
        ? {
            protocolVersion: '2025-03-26',
            capabilities: { tools: {} },
            serverInfo: { name: 'fixture', version: '1' }
          }
        : rpc.method === 'tools/list'
          ? {
              tools: [
                ...catalog,
                {
                  name: 'get_enrichment_readiness',
                  inputSchema: { type: 'object', properties: {} }
                },
                { name: 'send_email', inputSchema: { type: 'object' } }
              ]
            }
          : {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    status: 'ambiguous',
                    contact_availability: 'not_checked',
                    api_key: 'secret',
                    failure_kind: 'fixture',
                    source: 'NPPES'
                  })
                }
              ]
            };
    return Response.json({ jsonrpc: '2.0', id: rpc.id, result });
  };
  const p = createProviders(
    {
      NPG_HEALTHCARE_OPENAI_API_KEY: 'fixture-openai-secret',
      NPG_HEALTHCARE_MODEL: NPG_SOURCE.model,
      ABUNDANCE_HEALTHCARE_MCP_API_KEY: 'fixture-mcp-secret'
    },
    AbortSignal.timeout(2000),
    mock
  );
  try {
    const tools = await p.tools();
    assert.ok(tools.some((t) => t.name === 'get_enrichment_readiness'));
    assert.ok(!tools.some((t) => t.name === 'send_email'));
    const result = (await p.call('search_registry_sourcing', {})) as any;
    assert.equal(result.status, 'ambiguous');
    assert.equal(result.contact_availability, 'not_checked');
    assert.equal(result.failure_kind, 'fixture');
    assert.equal(result.api_key, undefined);
    await assert.rejects(() => p.call('send_email', {}));
    assert.equal(requests.filter((r) => r.method === 'tools/call').length, 1);
  } finally {
    await p.close();
  }
});
test('same-origin route fixture creates private state with no CORS and returns only browser-safe view', () =>
  database(async (store) => {
    const url = new URL('https://createsomething.agency/delivery/abundance/healthcare-analyst/api');
    const context = {
      locals: { user: { id: 'alice', email: 'alice@thenpgroup.com' } },
      platform: { env: { DB: store.db, NPG_HEALTHCARE_CHAT_ENABLED: 'true' } },
      url
    };
    const response = await POST({
      ...context,
      request: new Request(url, {
        method: 'POST',
        headers: { origin: url.origin, 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'create' })
      })
    } as any);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.has('access-control-allow-origin'), false);
    const v = (await response.json()) as any;
    assert.match(v.id, /^[a-f0-9-]{36}$/);
    assert.equal(v.owner_id, undefined);
    assert.equal(v.responseId, undefined);
    const read = await GET({ ...context, url: new URL(url + '?id=' + v.id) } as any);
    assert.equal(read.status, 200);
    const denied = await GET({
      ...context,
      locals: { user: { id: 'bob', email: 'bob@thenpgroup.com' } },
      url: new URL(url + '?id=' + v.id)
    } as any);
    assert.equal(denied.status, 404);
    await assert.rejects(
      async () =>
        POST({
          ...context,
          request: new Request(url, {
            method: 'POST',
            headers: { origin: 'https://outside.invalid', 'content-type': 'application/json' },
            body: '{"type":"create"}'
          })
        } as any),
      { status: 403 }
    );
  }));
test('paid proposal rejects invented NPIs and clinics before review or vendor dispatch', () =>
  database(async (store) => {
    for (const args of [
      { ...travelArgs, npis: ['9999999999'] },
      {
        ...travelArgs,
        clinics: [{ id: 'invented', address: '999 Invented Street, Dallas, TX 75201' }]
      }
    ]) {
      const c = await conversation(store),
        f = fixture('estimate_registry_travel', args),
        out = await executeCommand(store, 'alice', message(c), () => f.p);
      assert.equal(out.status, 'interrupted');
      assert.equal(out.pending, null);
      assert.equal(f.calls.length, 0);
    }
  }));
test('interrupted process retains checkpointed user request; terminal recovery does not invoke providers', () =>
  database(async (store, advance) => {
    const c = await conversation(store),
      row = await store.start('alice', c.id, 0, 'lost-process');
    await store.checkpoint(row, {
      messages: [{ role: 'user', text: 'The actual accepted request' }],
      sources: []
    });
    advance(150001);
    const out = await store.view('alice', c.id);
    assert.equal(out.status, 'interrupted');
    assert.equal(out.messages[0].text, 'The actual accepted request');
  }));
test('returned unresolved paid outcome retains source semantics and requires same-operation recovery', () =>
  database(async (store) => {
    const c = await conversation(store),
      f = fixture('estimate_registry_travel', travelArgs),
      v = await executeCommand(store, 'alice', message(c), () => f.p);
    f.p.call = async () => ({
      status: 'unavailable',
      failure_kind: 'provider_timeout',
      contact_availability: 'not_checked',
      attempted_at: '2026-11-11T16:00:00Z'
    });
    const out = await executeCommand(store, 'alice', approve(v), () => f.p);
    assert.equal(out.status, 'ambiguous');
    assert.equal((out.sources[0].data as any).failure_kind, 'provider_timeout');
    assert.equal((out.sources[0].data as any).contact_availability, 'not_checked');
    await store.acquirePaid('another-user-token');
    await store.releasePaid('another-user-token');
  }));

test('personal-contact scope cannot default silently into an enrichment approval', () =>
  database(async (store) => {
    const c = await conversation(store),
      f = fixture(
        'enrich_candidate_profile',
        { npi: '1234567890', confirm_paid_enrichment: true },
        { readiness: ready }
      );
    const out = await executeCommand(store, 'alice', message(c), () => f.p);
    assert.equal(out.pending, null);
    assert.equal(f.calls.length, 0);
    assert.match(out.messages.at(-1)!.text, /scope must be explicitly/);
  }));

test('read-only evidence is durable before the next model response', () =>
  database(async (store) => {
    const c = await conversation(store),
      f = fixture('search_registry_sourcing', {});
    const respond = f.p.respond;
    let responses = 0;
    f.p.respond = async (...args) => {
      if (++responses === 2) {
        const saved: State = JSON.parse((await store.read('alice', c.id)).state_json);
        assert.equal(saved.sources.length, 1);
        assert.equal((saved.sources[0].data as any).total, 231);
      }
      return respond(...args);
    };
    const out = await executeCommand(store, 'alice', message(c), () => f.p);
    assert.equal(out.status, 'idle');
  }));

test('travel cannot review incomplete clinic locations even when supplied by the operator', () => {
  for (const address of [
    '123 Main',
    '123 Main Street',
    '123 Main Street, Springfield',
    '123 Main Street, MO'
  ]) {
    const args = { ...travelArgs, clinics: [{ id: 'clinic1', address }] };
    assert.throws(
      () =>
        checkPaidScope('estimate_registry_travel', args, {
          messages: [{ role: 'user', text: `NPI 1234567890 clinic ${address}` }],
          sources: []
        }),
      /street addresses/
    );
  }
  checkPaidScope('estimate_registry_travel', travelArgs, {
    messages: [{ role: 'user', text: `NPI 1234567890 clinic ${travelArgs.clinics[0].address}` }],
    sources: []
  });
});

test('uncertain Clay webhook delivery preserves the uncertain operation receipt', () =>
  database(async (store) => {
    const c = await conversation(store),
      f = fixture(
        'enrich_candidate_profile',
        { npi: '1234567890', confirm_paid_enrichment: true, include_personal_contact: false },
        { readiness: ready }
      );
    const v = await executeCommand(store, 'alice', message(c), () => f.p);
    const call = f.p.call;
    f.p.call = async (name, args) =>
      name === 'get_enrichment_readiness'
        ? call(name, args)
        : {
            id: 'npgclay_fixture',
            npi: '1234567890',
            status: 'delivery_unknown',
            result: null,
            cache_hit: false
          };
    const out = await executeCommand(store, 'alice', approve(v), () => f.p);
    assert.equal(out.status, 'ambiguous');
    assert.equal((out.sources[0].data as any).status, 'delivery_unknown');
    assert.equal((await store.action('alice', v.pending!.id)).status, 'ambiguous');
    await store.acquirePaid('another-user-token');
    await store.releasePaid('another-user-token');
  }));

for (const decision of ['approve', 'reject', 'expire'] as const) {
  test(`pending review can ${decision} at the conversation message limit`, () =>
    database(async (store, advance) => {
      const c = await conversation(store),
        f = fixture('estimate_registry_travel', travelArgs);
      const history: State = {
        messages: Array.from({ length: 58 }, (_, i) => ({
          role: i % 2 ? ('assistant' as const) : ('user' as const),
          text: `Earlier message ${i}`
        })),
        sources: []
      };
      await store.db
        .prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?')
        .bind(JSON.stringify(history), c.id)
        .run();
      const v = await executeCommand(store, 'alice', message(c), () => f.p);
      assert.equal(v.status, 'review');
      assert.equal(v.messages.length, 60);
      assert.equal(f.calls.length, 0);
      if (decision === 'expire') advance(11 * 60000);
      const out = await executeCommand(
        store,
        'alice',
        {
          ...approve(v),
          type: decision === 'reject' ? 'reject' : 'approve'
        },
        () => f.p
      );
      assert.equal(out.status, 'idle');
      assert.equal(out.pending, null);
      assert.equal(f.calls.length, decision === 'approve' ? 1 : 0);
      assert.equal(
        (await store.action('alice', v.pending!.id)).status,
        decision === 'approve' ? 'completed' : decision === 'reject' ? 'rejected' : 'expired'
      );
      await assert.rejects(() => executeCommand(store, 'alice', message(out), () => f.p), {
        status: 409,
        message: 'Conversation is full. Start a new conversation.'
      });
    }));
}

test('Skip Trace review without generic readiness is rejectable without provider dispatch', () =>
  database(async (store) => {
    const args = { npi: '1234567890', confirm_paid_enrichment: true };
    const f = fixture('enrich_candidate_skip_trace', args);
    f.p.tools = async () => [
      {
        name: 'enrich_candidate_skip_trace',
        inputSchema: {
          type: 'object',
          properties: { npi: { type: 'string' }, confirm_paid_enrichment: { const: true } },
          required: ['npi', 'confirm_paid_enrichment'],
          additionalProperties: false
        }
      }
    ];
    const c = await conversation(store);
    const proposed = await executeCommand(store, 'alice', message(c), () => f.p);
    assert.equal(proposed.status, 'review');
    assert.deepEqual(proposed.pending!.arguments, args);
    assert.match(JSON.stringify(proposed.pending!.review), /without an application limit/);
    assert.equal(f.calls.length, 0);
    const rejected = await executeCommand(
      store,
      'alice',
      {
        ...approve(proposed),
        type: 'reject'
      },
      () => {
        throw new Error('Rejection must not initialize providers');
      }
    );
    assert.equal(rejected.status, 'idle');
    assert.equal(rejected.pending, null);
    assert.match(rejected.messages.at(-1)!.text, /Action rejected/);
    assert.equal((await store.action('alice', proposed.pending!.id)).status, 'rejected');
    assert.equal(f.calls.length, 0);
  }));

test('known Skip Trace pending can reconcile through chat without another paid approval or global lock', () =>
  database(async (store) => {
    const f = fixture('enrich_candidate_skip_trace', {
      npi: '1234567890',
      confirm_paid_enrichment: true
    });
    const baseTools = await f.p.tools();
    f.p.tools = async () => [
      ...baseTools,
      {
        name: 'enrich_candidate_skip_trace',
        inputSchema: {
          type: 'object',
          properties: { npi: { type: 'string' }, confirm_paid_enrichment: { const: true } },
          required: ['npi', 'confirm_paid_enrichment'],
          additionalProperties: false
        }
      }
    ];
    let calls = 0;
    f.p.call = async (name, args) => {
      calls++;
      if (calls === 1)
        return { status: 'pending', id: 'a'.repeat(64), run_id: 'run1', npi: '1234567890' };
      assert.deepEqual(args, {
        npi: '1234567890',
        confirm_paid_enrichment: true,
        reconcile_receipt: { id: 'a'.repeat(64), run_id: 'run1' }
      });
      return {
        status: 'review_required',
        id: 'a'.repeat(64),
        run_id: 'run1',
        npi: '1234567890',
        contacts: { emails: ['synthetic@example.test'] }
      };
    };
    const c = await conversation(store);
    const proposal = await executeCommand(store, 'alice', message(c), () => f.p);
    const pending = await executeCommand(store, 'alice', approve(proposal), () => f.p);
    assert.equal(pending.status, 'idle');
    assert.match(pending.messages.at(-1)!.text, /Refresh Skip Trace/);
    await store.acquirePaid('unrelated');
    await store.releasePaid('unrelated');
    const other = fixture(
      'enrich_candidate_profile',
      { npi: '1234567890', confirm_paid_enrichment: true, include_personal_contact: false },
      { readiness: ready }
    );
    const otherC = await conversation(store, 'carol');
    const otherReview = await executeCommand(store, 'carol', message(otherC), () => other.p);
    const otherDone = await executeCommand(store, 'carol', approve(otherReview), () => other.p);
    assert.equal(otherDone.status, 'idle');
    assert.equal(other.calls.filter((c) => c.name === 'enrich_candidate_profile').length, 1);
    await assert.rejects(() =>
      executeCommand(
        store,
        'bob',
        { type: 'message', id: pending.id, version: pending.version, text: 'Refresh Skip Trace' },
        () => f.p
      )
    );
    assert.equal(calls, 1);
    const done = await executeCommand(
      store,
      'alice',
      { type: 'message', id: pending.id, version: pending.version, text: 'Refresh Skip Trace' },
      () => f.p
    );
    assert.equal(done.status, 'idle');
    assert.equal(calls, 2);
    assert.match(JSON.stringify(done.sources), /synthetic@example.test/);
    let replay: unknown;
    f.p.respond = async (input, previous) => {
      assert.equal(previous, undefined);
      replay = input;
      return { id: 'followup', text: 'Recovered evidence received.' };
    };
    await executeCommand(
      store,
      'alice',
      { type: 'message', id: done.id, version: done.version, text: 'Which emails were returned?' },
      () => f.p
    );
    assert.match(JSON.stringify(replay), /synthetic@example.test/);
    assert.match(JSON.stringify(replay), /untrusted source evidence/i);
    assert.equal(calls, 2);
  }));
test('Skip Trace unknown dispatch remains a per-operation hold and refresh cannot bypass it', () =>
  database(async (store) => {
    const f = fixture('enrich_candidate_skip_trace', {
      npi: '1234567890',
      confirm_paid_enrichment: true
    });
    const tools = await f.p.tools();
    f.p.tools = async () => [
      ...tools,
      {
        name: 'enrich_candidate_skip_trace',
        inputSchema: {
          type: 'object',
          properties: { npi: { type: 'string' }, confirm_paid_enrichment: { const: true } },
          required: ['npi', 'confirm_paid_enrichment'],
          additionalProperties: false
        }
      }
    ];
    let calls = 0;
    f.p.call = async () => {
      calls++;
      return { status: 'delivery_unknown', id: 'a'.repeat(64), npi: '1234567890' };
    };
    const c = await conversation(store);
    const proposed = await executeCommand(store, 'alice', message(c), () => f.p);
    const unknown = await executeCommand(store, 'alice', approve(proposed), () => f.p);
    assert.equal(unknown.status, 'ambiguous');
    await store.acquirePaid('unrelated');
    await store.releasePaid('unrelated');
    await assert.rejects(() =>
      executeCommand(
        store,
        'alice',
        { type: 'message', id: unknown.id, version: unknown.version, text: 'Refresh Skip Trace' },
        () => f.p
      )
    );
    assert.equal(calls, 1);
  }));

test('Skip Trace refresh survives full history and repeated pending reads without unbounded growth', () =>
  database(async (store) => {
    const f = fixture('enrich_candidate_skip_trace', {
      npi: '1234567890',
      confirm_paid_enrichment: true
    });
    const baseTools = await f.p.tools();
    f.p.tools = async () => [
      ...baseTools,
      {
        name: 'enrich_candidate_skip_trace',
        inputSchema: {
          type: 'object',
          properties: { npi: { type: 'string' }, confirm_paid_enrichment: { const: true } },
          required: ['npi', 'confirm_paid_enrichment'],
          additionalProperties: false
        }
      }
    ];
    let calls = 0;
    f.p.call = async (name, args) => {
      calls++;
      if (calls === 1)
        return { status: 'pending', id: 'a'.repeat(64), run_id: 'run1', npi: '1234567890' };
      assert.deepEqual(args, {
        npi: '1234567890',
        confirm_paid_enrichment: true,
        reconcile_receipt: { id: 'a'.repeat(64), run_id: 'run1' }
      });
      return {
        ...(calls === 2 ? { oversized: 'x'.repeat(300000) } : {}),
        status: calls < 5 ? 'pending' : 'review_required',
        id: 'a'.repeat(64),
        run_id: 'run1',
        npi: '1234567890',
        contacts: { emails: ['synthetic@example.test'] }
      };
    };
    const c = await conversation(store);
    const proposal = await executeCommand(store, 'alice', message(c), () => f.p);
    const pending = await executeCommand(store, 'alice', approve(proposal), () => f.p);
    assert.equal(pending.status, 'idle');
    assert.match(pending.messages.at(-1)!.text, /Refresh Skip Trace/);
    await store.acquirePaid('unrelated');
    await store.releasePaid('unrelated');
    const other = fixture(
      'enrich_candidate_profile',
      { npi: '1234567890', confirm_paid_enrichment: true, include_personal_contact: false },
      { readiness: ready }
    );
    const otherC = await conversation(store, 'carol');
    const otherReview = await executeCommand(store, 'carol', message(otherC), () => other.p);
    const otherDone = await executeCommand(store, 'carol', approve(otherReview), () => other.p);
    assert.equal(otherDone.status, 'idle');
    assert.equal(other.calls.filter((c) => c.name === 'enrich_candidate_profile').length, 1);
    await assert.rejects(() =>
      executeCommand(
        store,
        'bob',
        { type: 'message', id: pending.id, version: pending.version, text: 'Refresh Skip Trace' },
        () => f.p
      )
    );
    assert.equal(calls, 1);
    const stored = await store.read('alice', pending.id);
    const full = JSON.parse(stored.state_json) as State;
    full.sources.push({ tool: 'old_source', data: 'x'.repeat(300000) });
    full.messages = Array.from({ length: 60 }, () => ({
      role: 'assistant',
      text: 'x'.repeat(5000)
    }));
    await store.db
      .prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?')
      .bind(JSON.stringify(full), pending.id)
      .run();
    let current = pending;
    for (let i = 0; i < 3; i++) {
      current = await executeCommand(
        store,
        'alice',
        { type: 'message', id: current.id, version: current.version, text: 'Refresh Skip Trace' },
        () => f.p
      );
      assert.equal(current.status, 'idle');
      assert.ok(current.messages.length <= 60);
      assert.equal(
        current.sources.filter((s) => s.tool === 'enrich_candidate_skip_trace').length,
        1
      );
      assert.ok((await store.read('alice', current.id)).state_json.length <= 260000);
    }
    const done = await executeCommand(
      store,
      'alice',
      { type: 'message', id: current.id, version: current.version, text: 'Refresh Skip Trace' },
      () => f.p
    );
    assert.equal(done.status, 'idle');
    assert.equal(calls, 5);
    assert.match(JSON.stringify(done.sources), /synthetic@example.test/);
  }));

for (const initialStatus of ['pending', 'no_contact'])
  test(`real MCP refresh initializes transport and retains ${initialStatus} receipt until billing settles`, () =>
    database(async (store) => {
      const f = fixture('enrich_candidate_skip_trace', {
        npi: '1234567890',
        confirm_paid_enrichment: true
      });
      const originalTools = await f.p.tools();
      const skipTool = {
        name: 'enrich_candidate_skip_trace',
        inputSchema: {
          type: 'object',
          properties: { npi: { type: 'string' }, confirm_paid_enrichment: { const: true } },
          required: ['npi', 'confirm_paid_enrichment'],
          additionalProperties: false
        }
      };
      f.p.tools = async () => [...originalTools, skipTool];
      f.p.call = async () => ({
        status: initialStatus,
        id: 'a'.repeat(64),
        run_id: 'run1',
        npi: '1234567890',
        charge_reconciled: false
      });
      const c = await conversation(store);
      const proposal = await executeCommand(store, 'alice', message(c), () => f.p);
      let current = await executeCommand(store, 'alice', approve(proposal), () => f.p);
      const methods: string[] = [];
      let calls = 0;
      const make = () =>
        createProviders(
          {
            NPG_HEALTHCARE_OPENAI_API_KEY: 'fixture-openai-secret',
            NPG_HEALTHCARE_MODEL: NPG_SOURCE.model,
            ABUNDANCE_HEALTHCARE_MCP_API_KEY: 'fixture-mcp-secret'
          },
          AbortSignal.timeout(10000),
          async (url, init) => {
            assert.equal(
              String(url),
              'https://abundance-healthcare-mcp.createsomething.workers.dev/mcp'
            );
            if (init?.method === 'GET' || init?.method === 'DELETE')
              return new Response(null, { status: 405 });
            const rpc = JSON.parse(String(init?.body));
            methods.push(rpc.method);
            if (rpc.method === 'notifications/initialized')
              return new Response(null, { status: 202 });
            let result;
            if (rpc.method === 'initialize')
              result = {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {} },
                serverInfo: { name: 'fixture', version: '1' }
              };
            else if (rpc.method === 'tools/list') result = { tools: [skipTool] };
            else {
              assert.equal(rpc.method, 'tools/call');
              assert.deepEqual(rpc.params.arguments.reconcile_receipt, {
                id: 'a'.repeat(64),
                run_id: 'run1'
              });
              calls++;
              result = {
                content: [],
                structuredContent: {
                  status: 'no_contact',
                  id: 'a'.repeat(64),
                  run_id: 'run1',
                  npi: '1234567890',
                  charge_reconciled: calls === 2
                }
              };
            }
            return Response.json({ jsonrpc: '2.0', id: rpc.id, result });
          }
        );
      for (let i = 0; i < 2; i++) {
        current = await executeCommand(
          store,
          'alice',
          { type: 'message', id: current.id, version: current.version, text: 'Refresh Skip Trace' },
          make
        );
        assert.equal(calls, i + 1);
        const state = JSON.parse((await store.read('alice', current.id)).state_json) as State;
        assert.equal(Boolean(state.skipTracePending), i === 0);
        assert.equal(current.status, 'idle');
      }
      const settledVersion = current.version;
      await assert.rejects(
        () =>
          executeCommand(
            store,
            'alice',
            {
              type: 'message',
              id: current.id,
              version: current.version,
              text: 'Refresh Skip Trace'
            },
            make
          ),
        /no known Skip Trace/i
      );
      const after = await store.view('alice', current.id);
      assert.equal(after.status, 'idle');
      assert.equal(after.version, settledVersion);
      assert.equal(calls, 2);
      assert.equal(methods.filter((m) => m === 'initialize').length, 2);
      assert.equal(methods.filter((m) => m === 'tools/list').length, 2);
    }));

test('refresh without a receipt leaves an idle conversation usable', () =>
  database(async (store) => {
    const c = await conversation(store);
    let made = false;
    await assert.rejects(
      () =>
        executeCommand(
          store,
          'alice',
          { type: 'message', id: c.id, version: c.version, text: 'Refresh Skip Trace' },
          () => {
            made = true;
            throw new Error('unexpected provider');
          }
        ),
      /no known Skip Trace/i
    );
    const after = await store.view('alice', c.id);
    assert.equal(after.status, 'idle');
    assert.equal(after.version, c.version);
    assert.equal(made, false);
    const f = fixture('search_registry_sourcing', {});
    const done = await executeCommand(store, 'alice', message(after), () => f.p);
    assert.notEqual(done.status, 'interrupted');
  }));
for (const failure of ['privacy_blocked_review', 'association_failure', 'billing_review'])
  test(`failed refresh replaces stale contact evidence: ${failure}`, () =>
    database(async (store) => {
      const f = fixture('enrich_candidate_skip_trace', {
        npi: '1234567890',
        confirm_paid_enrichment: true
      });
      const base = await f.p.tools();
      f.p.tools = async () => [
        ...base,
        {
          name: 'enrich_candidate_skip_trace',
          inputSchema: {
            type: 'object',
            properties: { npi: { type: 'string' }, confirm_paid_enrichment: { const: true } },
            required: ['npi', 'confirm_paid_enrichment'],
            additionalProperties: false
          }
        }
      ];
      let calls = 0;
      f.p.call = async () => ({
        status: ++calls === 1 ? 'review_required' : failure,
        id: 'a'.repeat(64),
        run_id: 'run1',
        npi: '1234567890',
        charge_reconciled: false,
        ...(calls === 1 ? { contacts: { emails: ['stale@example.test'] } } : {})
      });
      const c = await conversation(store);
      const proposal = await executeCommand(store, 'alice', message(c), () => f.p);
      const pending = await executeCommand(store, 'alice', approve(proposal), () => f.p);
      const failed = await executeCommand(
        store,
        'alice',
        { type: 'message', id: pending.id, version: pending.version, text: 'Refresh Skip Trace' },
        () => f.p
      );
      assert.equal(failed.status, 'ambiguous');
      assert.doesNotMatch(JSON.stringify(failed.sources), /stale@example.test/);
      assert.match(JSON.stringify(failed.sources), new RegExp(failure));
      await store.acquirePaid('unrelated');
      await store.releasePaid('unrelated');
    }));

const completeArgs = { npi: '1234567890', confirm_paid_enrichment: true };
function completeFixture(
  result: unknown = {
    status: 'complete',
    npi: completeArgs.npi,
    uncertain_dispatch: false,
    providers: {
      pdl: { status: 'matched' },
      clay: { status: 'pending', id: 'clay-job' },
      exa: { status: 'matched' },
      apify: { status: 'no_contact' }
    }
  },
  blocked = ''
) {
  const f = fixture('enrich_candidate_complete_profile', completeArgs);
  f.p.tools = async () => [
    ...catalog,
    {
      name: 'enrich_candidate_complete_profile',
      inputSchema: {
        type: 'object',
        properties: {
          npi: { type: 'string', pattern: '^[0-9]{10}$' },
          confirm_paid_enrichment: { const: true },
          maximum_shared_usd: { type: 'number', minimum: 0, maximum: 100 },
          operation_id: { type: 'string', format: 'uuid' }
        },
        required: ['npi', 'confirm_paid_enrichment'],
        additionalProperties: false
      }
    },
    {
      name: 'get_enrichment_readiness',
      inputSchema: {
        type: 'object',
        properties: { provider: { enum: ['pdl', 'clay', 'exa'] } },
        required: ['provider'],
        additionalProperties: false
      }
    }
  ];
  f.p.call = async (name, args) => {
    f.calls.push({ name, args });
    if (name === 'get_enrichment_readiness')
      return {
        ...ready,
        provider: args.provider,
        ready: args.provider !== blocked,
        reason: args.provider === blocked ? 'Missing access' : null,
        budget: { ...ready.budget, reserved: 0, remaining: 98 }
      };
    return result;
  };
  return f;
}
test('complete profile covers all four providers and exact one-use approval', () =>
  database(async (store) => {
    const f = completeFixture();
    const c = await conversation(store);
    const proposed = await executeCommand(store, 'alice', message(c), () => f.p);
    assert.equal(proposed.status, 'review');
    assert.equal((proposed.pending!.review as any).maximumCost, undefined);
    assert.equal((proposed.pending!.arguments as any).operation_id, proposed.pending!.id);
    assert.deepEqual(
      f.calls.map((c) => (c.args as any).provider),
      ['pdl', 'clay', 'exa']
    );
    const approved = await executeCommand(store, 'alice', approve(proposed), () => f.p);
    assert.equal(approved.status, 'idle');
    assert.equal(f.calls.filter((c) => c.name === 'enrich_candidate_complete_profile').length, 1);
    assert.ok(approved.sources.some((s) => s.tool === 'enrich_candidate_complete_profile'));
    await assert.rejects(() => executeCommand(store, 'alice', approve(proposed), () => f.p));
  }));
test('unavailable providers are advisory and complete approval still attempts the source', () =>
  database(async (store) => {
    const f = completeFixture(undefined, 'clay');
    const c = await conversation(store);
    const out = await executeCommand(store, 'alice', message(c), () => f.p);
    assert.equal(out.status, 'review');
    assert.ok(out.pending);
    assert.equal(f.calls.filter((c) => c.name === 'enrich_candidate_complete_profile').length, 0);
    const done = await executeCommand(store, 'alice', approve(out), () => f.p);
    assert.equal(done.status, 'idle');
    assert.equal(f.calls.filter((c) => c.name === 'enrich_candidate_complete_profile').length, 1);
  }));

test('complete-profile uncertain partial receipt holds paid work and preserves evidence', () =>
  database(async (store) => {
    const result = {
      status: 'partial',
      npi: completeArgs.npi,
      uncertain_dispatch: true,
      providers: {
        pdl: { status: 'matched' },
        clay: { status: 'delivery_unknown', id: 'clay-unknown' }
      },
      unstarted: ['exa', 'apify']
    };
    const f = completeFixture(result);
    const c = await conversation(store);
    const proposed = await executeCommand(store, 'alice', message(c), () => f.p);
    const out = await executeCommand(store, 'alice', approve(proposed), () => f.p);
    assert.equal(out.status, 'ambiguous');
    assert.deepEqual(out.sources.at(-1)!.data, result);
    await store.acquirePaid('another');
    await store.releasePaid('another');
    assert.equal(f.calls.filter((c) => c.name === 'enrich_candidate_complete_profile').length, 1);
  }));

test('complete-profile leases remain active beyond the single-provider window', () =>
  database(async (store, advance) => {
    const c = await conversation(store);
    const token = await store.admit('alice');
    const row = await store.start('alice', c.id, c.version, token);
    await store.extendCompleteProfileLease(row);
    await store.acquirePaid(token, '', 450000);
    advance(300000);
    assert.equal((await store.read('alice', c.id)).status, 'running');
    await store.assertLease(row);
    await assert.rejects(() => store.admit('alice'), { status: 429 });
    await assert.rejects(() => store.acquirePaid('another'), { status: 409 });
    await store.releasePaid(token);
    await store.release('alice', token);
  }));
test('known pending complete-profile receipts remain partial without an uncertain dispatch hold', () =>
  database(async (store) => {
    const result = {
      status: 'partial',
      npi: completeArgs.npi,
      uncertain_dispatch: false,
      billing_reconciliation_required: true,
      providers: {
        pdl: { status: 'matched' },
        clay: { status: 'pending', id: 'clay-job' },
        exa: { status: 'matched' },
        apify: { status: 'pending', id: 'skip-job', run_id: 'skip-run' }
      },
      unstarted: []
    };
    const f = completeFixture(result);
    const c = await conversation(store);
    const proposed = await executeCommand(store, 'alice', message(c), () => f.p);
    const out = await executeCommand(store, 'alice', approve(proposed), () => f.p);
    assert.equal(out.status, 'idle');
    assert.deepEqual(out.sources.at(-1)!.data, result);
    assert.match(out.messages.at(-1)!.text, /incomplete.*reconciliation.*do not repeat/s);
    assert.equal((await store.action('alice', proposed.pending!.id)).status, 'completed');
  }));

test('configured estimate changes do not impose a cost ceiling', () =>
  database(async (store) => {
    const f = completeFixture();
    const c = await conversation(store);
    const proposed = await executeCommand(store, 'alice', message(c), () => f.p);
    const call = f.p.call;
    f.p.call = async (name, args) =>
      name === 'get_enrichment_readiness' ? { cost: { estimated_usd: 200 } } : call(name, args);
    const out = await executeCommand(store, 'alice', approve(proposed), () => f.p);
    assert.equal(out.status, 'idle');
    assert.equal(f.calls.filter((c) => c.name === 'enrich_candidate_complete_profile').length, 1);
  }));

test('host operation identity replaces model operation and removes legacy financial cap', () =>
  database(async (store) => {
    const f = completeFixture();
    const respond = f.p.respond;
    f.p.respond = async (...input) => {
      const result = await respond(...input);
      if (result.call)
        result.call.arguments = JSON.stringify({
          ...completeArgs,
          operation_id: crypto.randomUUID(),
          maximum_shared_usd: 99
        });
      return result;
    };
    const c = await conversation(store);
    const out = await executeCommand(store, 'alice', message(c), () => f.p);
    assert.equal(out.status, 'review');
    assert.equal((out.pending!.arguments as any).operation_id, out.pending!.id);
    assert.equal((out.pending!.arguments as any).maximum_shared_usd, undefined);
  }));

const nestedSkipReceipt = {
  npi: completeArgs.npi,
  id: 'b'.repeat(64),
  run_id: 'CompleteSkipRun',
  status: 'pending',
  charge_reconciled: false
};
function pendingCompleteFixture() {
  return completeFixture({
    status: 'partial',
    npi: completeArgs.npi,
    uncertain_dispatch: false,
    billing_reconciliation_required: true,
    providers: {
      pdl: { status: 'matched' },
      clay: { status: 'pending', id: 'clay-job' },
      exa: { status: 'no_match' },
      apify: nestedSkipReceipt
    },
    profile: { provider_results: { apify: nestedSkipReceipt }, verification: 'unverified' },
    unstarted: []
  });
}
async function completePending(store: NpgStore) {
  const f = pendingCompleteFixture();
  const c = await conversation(store);
  const proposed = await executeCommand(store, 'alice', message(c), () => f.p);
  const pending = await executeCommand(store, 'alice', approve(proposed), () => f.p);
  return { f, proposed, pending };
}
function refreshCommand(view: { id: string; version: number }) {
  return {
    type: 'message' as const,
    id: view.id,
    version: view.version,
    text: 'Refresh Skip Trace'
  };
}
test('combined Skip Trace receipt refreshes only its original run and retains shared billing reconciliation', () =>
  database(async (store) => {
    const { f, pending } = await completePending(store);
    const terminal = { ...nestedSkipReceipt, status: 'no_contact', charge_reconciled: true };
    const tools = f.p.tools;
    f.p.tools = async () => [
      ...(await tools()),
      { name: 'enrich_candidate_skip_trace', inputSchema: { type: 'object', properties: {} } }
    ];
    const call = f.p.call;
    f.p.call = async (name, args) =>
      name === 'enrich_candidate_skip_trace'
        ? (f.calls.push({ name, args }), terminal)
        : call(name, args);
    const out = await executeCommand(store, 'alice', refreshCommand(pending), () => f.p);
    assert.equal(out.status, 'idle');
    assert.equal(f.calls.filter((c) => c.name === 'enrich_candidate_complete_profile').length, 1);
    assert.deepEqual(f.calls.find((c) => c.name === 'enrich_candidate_skip_trace')!.args, {
      npi: completeArgs.npi,
      confirm_paid_enrichment: true,
      reconcile_receipt: { id: nestedSkipReceipt.id, run_id: nestedSkipReceipt.run_id }
    });
    const composite = out.sources.find((s) => s.tool === 'enrich_candidate_complete_profile')!
      .data as any;
    assert.deepEqual(composite.providers.apify, {
      ...terminal,
      operation_cache_hit: false,
      operation_charge_usd: null
    });
    assert.deepEqual(composite.profile.provider_results.apify, composite.providers.apify);
    assert.equal(composite.billing_reconciliation_required, true);
    assert.match(out.messages.at(-1)!.text, /Other provider billing.*receipt reconciliation/i);
    assert.equal(
      JSON.parse((await store.read('alice', out.id)).state_json).skipTracePending,
      undefined
    );
  }));
test('combined receipt recovery rejects cross-owner and action mismatch before source calls', () =>
  database(async (store) => {
    const { f, pending } = await completePending(store);
    await assert.rejects(() => executeCommand(store, 'bob', refreshCommand(pending), () => f.p));
    const row = await store.read('alice', pending.id);
    const state = JSON.parse(row.state_json);
    assert.ok(state.skipTracePending);
    state.skipTracePending.actionId = crypto.randomUUID();
    await store.db
      .prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?')
      .bind(JSON.stringify(state), pending.id)
      .run();
    const count = f.calls.length;
    const out = await executeCommand(store, 'alice', refreshCommand(pending), () => f.p);
    assert.equal(out.status, 'interrupted');
    assert.equal(f.calls.length, count);
  }));
test('failed nested Skip Trace refresh removes every stale composite contact copy', () =>
  database(async (store) => {
    const { f, pending } = await completePending(store);
    const row = await store.read('alice', pending.id);
    const state = JSON.parse(row.state_json);
    const composite = state.sources.find(
      (s: any) => s.tool === 'enrich_candidate_complete_profile'
    );
    const old = {
      ...nestedSkipReceipt,
      status: 'review_required',
      contacts: { emails: ['stale-nested@example.invalid'] },
      provenance: { source: 'Apify one-api/skip-trace' }
    };
    composite.data.providers.apify = old;
    composite.data.profile.provider_results.apify = old;
    await store.db
      .prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?')
      .bind(JSON.stringify(state), pending.id)
      .run();
    const tools = f.p.tools;
    f.p.tools = async () => [
      ...(await tools()),
      { name: 'enrich_candidate_skip_trace', inputSchema: { type: 'object', properties: {} } }
    ];
    const call = f.p.call;
    f.p.call = async (name, args) =>
      name === 'enrich_candidate_skip_trace'
        ? (f.calls.push({ name, args }),
          {
            ...nestedSkipReceipt,
            status: 'privacy_blocked_review',
            contacts: { emails: ['unsafe-new@example.invalid'] }
          })
        : call(name, args);
    const out = await executeCommand(store, 'alice', refreshCommand(pending), () => f.p);
    assert.equal(out.status, 'ambiguous');
    const receipt = out.sources.find((s) => s.tool === 'enrich_candidate_complete_profile')!
      .data as any;
    assert.equal(receipt.providers.apify.status, 'privacy_blocked_review');
    assert.deepEqual(receipt.providers.apify, receipt.profile.provider_results.apify);
    assert.equal(receipt.billing_reconciliation_required, true);
    assert.ok(!JSON.stringify(out).includes('stale-nested@example.invalid'));
    assert.ok(!JSON.stringify(out).includes('unsafe-new@example.invalid'));
    assert.equal(f.calls.filter((c) => c.name === 'enrich_candidate_complete_profile').length, 1);
    await store.acquirePaid('other');
    await store.releasePaid('other');
  }));
test('combined receipt recovery validates exact source action anchor', () =>
  database(async (store) => {
    const { f, pending } = await completePending(store);
    const row = await store.read('alice', pending.id);
    const state = JSON.parse(row.state_json);
    state.sources.find((s: any) => s.tool === 'enrich_candidate_complete_profile').actionId =
      crypto.randomUUID();
    await store.db
      .prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?')
      .bind(JSON.stringify(state), pending.id)
      .run();
    const count = f.calls.length;
    const out = await executeCommand(store, 'alice', refreshCommand(pending), () => f.p);
    assert.equal(out.status, 'interrupted');
    assert.equal(f.calls.length, count);
    assert.match(out.messages.at(-1)!.text, /approved receipt is unavailable/i);
  }));

test('unknown enrichment estimates permit exact four-provider approval without financial caps', () =>
  database(async (store) => {
    const f = completeFixture();
    const call = f.p.call;
    f.p.call = async (name, args) =>
      name === 'get_enrichment_readiness'
        ? {
            provider: args.provider,
            ready: false,
            reason: 'Estimate unavailable',
            cost: { estimated_usd: null },
            spend: {
              currency: 'USD',
              confirmed_usd: 2,
              estimated_usd: null,
              pending_count: 4,
              history_complete: false,
              historical_usd: null
            }
          }
        : call(name, args);
    const c = await conversation(store);
    const proposed = await executeCommand(store, 'alice', message(c), () => f.p);
    assert.equal(proposed.status, 'review');
    const args = proposed.pending!.arguments as any;
    assert.equal(args.operation_id, proposed.pending!.id);
    assert.equal(args.maximum_shared_usd, undefined);
    assert.equal((proposed.pending!.review as any).confirmedTrackedUsd, 2);
    assert.equal((proposed.pending!.review as any).pendingReceipts, 4);
    const out = await executeCommand(store, 'alice', approve(proposed), () => f.p);
    assert.equal(out.status, 'idle');
    assert.equal(f.calls.filter((c) => c.name === 'enrich_candidate_complete_profile').length, 1);
  }));
test('uncertain enrichment does not create a financial hold on unrelated candidate operations', () =>
  database(async (store) => {
    const { f, pending } = await completePending(store);
    const original = await store.action(
      'alice',
      JSON.parse((await store.read('alice', pending.id)).state_json).skipTracePending.actionId
    );
    await store.db
      .prepare("UPDATE npg_analyst_actions SET status='ambiguous' WHERE id=?")
      .bind(original.id)
      .run();
    const otherId = crypto.randomUUID();
    await store.db
      .prepare(
        'INSERT INTO npg_analyst_actions(id,conversation_id,owner_id,version,tool,arguments_json,call_id,response_id,review_json,expires_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)'
      )
      .bind(
        otherId,
        original.conversation_id,
        'alice',
        0,
        original.tool,
        JSON.stringify({ npi: '9999999999', confirm_paid_enrichment: true, operation_id: otherId }),
        'call-other',
        'resp-other',
        '{}',
        Date.now() + 60000,
        'dispatching'
      )
      .run();
    await store.acquirePaid('unrelated', otherId);
    await store.releasePaid('unrelated');
    await assert.rejects(() => store.acquirePaid('same', original.id), { status: 409 });
  }));
test('nested refresh updates recorded operation USD and preserves prior charge on cached reads', () =>
  database(async (store) => {
    const { f, pending } = await completePending(store);
    const row = await store.read('alice', pending.id);
    const state = JSON.parse(row.state_json);
    const composite = state.sources.find(
      (s: any) => s.tool === 'enrich_candidate_complete_profile'
    );
    composite.data.spend_tracking = {
      operation_id: composite.actionId,
      actual_usd: 0.207,
      estimated_usd: null,
      pending_receipts: 2,
      historical_status: 'unknown'
    };
    composite.data.providers.apify = { ...nestedSkipReceipt, charge_usd: 0.007 };
    composite.data.profile.provider_results.apify = composite.data.providers.apify;
    await store.db
      .prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?')
      .bind(JSON.stringify(state), pending.id)
      .run();
    const tools = f.p.tools;
    f.p.tools = async () => [
      ...(await tools()),
      { name: 'enrich_candidate_skip_trace', inputSchema: { type: 'object', properties: {} } }
    ];
    f.p.call = async () => ({
      ...nestedSkipReceipt,
      status: 'no_contact',
      cached: true,
      charge_usd: 0.007,
      charge_reconciled: true
    });
    const out = await executeCommand(store, 'alice', refreshCommand(pending), () => f.p);
    const result = out.sources.find((s) => s.tool === 'enrich_candidate_complete_profile')!
      .data as any;
    assert.equal(result.spend_tracking.actual_usd, 0.207);
    assert.equal(result.providers.apify.operation_charge_usd, 0.007);
    assert.equal(result.spend_tracking.pending_receipts, 2);
  }));
test('uncertain combined operation can reconcile its known Skip receipt without clearing other uncertainty', () =>
  database(async (store) => {
    const f = completeFixture({
      status: 'partial',
      npi: completeArgs.npi,
      uncertain_dispatch: true,
      billing_reconciliation_required: true,
      providers: {
        pdl: { status: 'unavailable' },
        clay: { status: 'pending' },
        exa: { status: 'no_match' },
        apify: nestedSkipReceipt
      },
      profile: { provider_results: { apify: nestedSkipReceipt } },
      unstarted: []
    });
    const c = await conversation(store);
    const proposed = await executeCommand(store, 'alice', message(c), () => f.p);
    const pending = await executeCommand(store, 'alice', approve(proposed), () => f.p);
    assert.equal(pending.status, 'ambiguous');
    const tools = f.p.tools;
    f.p.tools = async () => [
      ...(await tools()),
      { name: 'enrich_candidate_skip_trace', inputSchema: { type: 'object', properties: {} } }
    ];
    const call = f.p.call;
    f.p.call = async (name, args) =>
      name === 'enrich_candidate_skip_trace'
        ? (f.calls.push({ name, args }),
          { ...nestedSkipReceipt, status: 'no_contact', charge_reconciled: true })
        : call(name, args);
    const out = await executeCommand(store, 'alice', refreshCommand(pending), () => f.p);
    assert.equal(out.status, 'ambiguous');
    assert.equal(
      (out.sources.find((s) => s.tool === 'enrich_candidate_complete_profile')!.data as any)
        .providers.apify.status,
      'no_contact'
    );
    assert.equal((await store.action('alice', proposed.pending!.id)).status, 'ambiguous');
    assert.equal(f.calls.filter((c) => c.name === 'enrich_candidate_complete_profile').length, 1);
  }));
test('Skip refresh uses increased actual receipt while keeping original cache-only operation free', () =>
  database(async (store) => {
    for (const cacheOnly of [false, true]) {
      const { f, pending } = await completePending(store);
      const row = await store.read('alice', pending.id);
      const state = JSON.parse(row.state_json);
      const composite = state.sources.find(
        (s: any) => s.tool === 'enrich_candidate_complete_profile'
      );
      composite.data.spend_tracking = {
        actual_usd: cacheOnly ? 0.2 : 0.207,
        estimated_usd: null,
        pending_receipts: 2
      };
      composite.data.providers.apify = {
        ...nestedSkipReceipt,
        operation_cache_hit: cacheOnly,
        operation_charge_usd: cacheOnly ? 0 : 0.007,
        charge_usd: 0.007
      };
      composite.data.profile.provider_results.apify = composite.data.providers.apify;
      await store.db
        .prepare('UPDATE npg_analyst_conversations SET state_json=? WHERE id=?')
        .bind(JSON.stringify(state), pending.id)
        .run();
      const tools = f.p.tools;
      f.p.tools = async () => [
        ...(await tools()),
        { name: 'enrich_candidate_skip_trace', inputSchema: { type: 'object', properties: {} } }
      ];
      f.p.call = async () => ({
        ...nestedSkipReceipt,
        status: 'no_contact',
        cached: true,
        charge_usd: 0.01,
        charge_reconciled: true
      });
      const out = await executeCommand(store, 'alice', refreshCommand(pending), () => f.p);
      const result = out.sources.find((s) => s.tool === 'enrich_candidate_complete_profile')!
        .data as any;
      assert.equal(result.spend_tracking.actual_usd, cacheOnly ? 0.2 : 0.21);
      assert.equal(result.providers.apify.operation_charge_usd, cacheOnly ? 0 : 0.01);
      assert.equal(result.providers.apify.operation_cache_hit, cacheOnly);
    }
  }));
