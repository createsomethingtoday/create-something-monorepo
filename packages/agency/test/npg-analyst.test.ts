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
import { load } from '../src/routes/delivery/abundance/healthcare-analyst/+page.server.ts';
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
      new URL('../migrations/0060_npg_private_analyst.sql', import.meta.url),
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

test('captured V8 judgment and 12 names retained exactly; no public runtime definition', () => {
  assert.equal(NPG_SOURCE.snapshot_version, 8);
  assert.equal(NPG_SOURCE.model, 'gpt-5.6-luna');
  assert.equal(NPG_SYSTEM_PROMPT.length, 8052);
  assert.equal(createHash('sha256').update(NPG_SYSTEM_PROMPT).digest('hex'), NPG_PROMPT_SHA256);
  assert.equal(NPG_TOOL_NAMES.length, 12);
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
      async () => load({ locals, setHeaders() {} } as any),
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
test('enrichment confirm flag is not approval; missing or unknown readiness fails closed', () =>
  database(async (store) => {
    for (const readiness of [
      undefined,
      { ready: true },
      { ready: true, provider: 'pdl', budget: { limit: 100 } }
    ]) {
      const c = await conversation(store),
        f = fixture(
          'enrich_candidate_profile',
          { npi: '1234567890', confirm_paid_enrichment: true, include_personal_contact: false },
          { readiness }
        );
      const out = await executeCommand(store, 'alice', message(c), () => f.p);
      assert.equal(out.pending, null);
      assert.equal(out.status, 'interrupted');
      assert.equal(f.calls.filter((c) => c.name === 'enrich_candidate_profile').length, 0);
    }
  }));
const ready = {
  ready: true,
  provider: 'pdl',
  budget: { currency: 'USD', limit: 100, spent: 2, reconciled: true },
  cost: { maximum_usd: 1 }
};
test('confirmed cost/allowance readiness is reviewed and rechecked; changes require new review', () =>
  database(async (store) => {
    const c = await conversation(store),
      f = fixture(
        'enrich_candidate_profile',
        { npi: '1234567890', confirm_paid_enrichment: true, include_personal_contact: false },
        { readiness: ready }
      ),
      v = await executeCommand(store, 'alice', message(c), () => f.p);
    assert.equal(v.status, 'review');
    assert.equal(f.calls.length, 1);
    const changed = fixture(
      'enrich_candidate_profile',
      {},
      { readiness: { ...ready, cost: { maximum_usd: 2 } } }
    );
    const out = await executeCommand(store, 'alice', approve(v), () => changed.p);
    assert.equal(out.status, 'interrupted');
    assert.equal(changed.calls.filter((c) => c.name === 'enrich_candidate_profile').length, 0);
    for (const data of [
      { ...ready, budget: { ...ready.budget, spent: 100 } },
      { ...ready, cost: { maximum_usd: null } },
      { ...ready, budget: { ...ready.budget, reconciled: false } }
    ])
      assert.throws(() => enrichmentReview(data, 'pdl'));
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
    await assert.rejects(() => store.acquirePaid('another-user-token'), { status: 409 });
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
  for (const path of [
    '../src/lib/npg/display.ts',
    '../src/routes/delivery/abundance/healthcare-analyst/+page.svelte'
  ]) {
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
test('Responses HTTP uses only server-selected model, bounded tokens, prior ID and no automatic retry', async () => {
  let request: any,
    attempts = 0;
  const p = createProviders(
    {
      OPENAI_API_KEY: 'fixture-openai-secret',
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
    assert.equal(init?.redirect, 'error');
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
      OPENAI_API_KEY: 'fixture-openai-secret',
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
test('returned unresolved paid outcome retains source semantics and blocks all further spending', () =>
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
    await assert.rejects(() => store.acquirePaid('another-user-token'), { status: 409 });
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
