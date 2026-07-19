import assert from 'node:assert/strict';
import test from 'node:test';

import runtimeWorker from '../src/index.js';

import {
  MemoryControlRunRepository,
  createControlRunService,
  type ControlActivationAuthority,
  type ControlScope,
  type FrozenControlActivation
} from '../src/control.js';
import {
  ControlIdentityUnavailableError,
  type ControlIdentityResolver
} from '../src/control-identity.js';
import {
  CONTROL_RUN_API_OPERATIONS,
  CONTROL_RUN_MCP_OPERATIONS,
  createControlRunWorker
} from '../src/control-worker.js';

const scope: ControlScope = { accountId: 'account-a', tenantId: 'tenant-a', workspaceAccountId: 'workspace-a' };
const activation: FrozenControlActivation = {
  id: 'activation-a', activationVersion: 1, activationKind: 'initial', status: 'active', ...scope,
  mapId: 'map-a', mapVersionId: 'map-version-a', mapVersion: 1,
  mapCanvasSha256: '1'.repeat(64), handoffId: 'handoff-a', handoffReceiptSha256: '2'.repeat(64),
  buildReleaseId: 'release-a', buildManifestSha256: '3'.repeat(64), buildArtifactSetSha256: '4'.repeat(64),
  buildAcceptanceReceiptId: 'acceptance-a', buildAcceptanceReceiptSha256: '5'.repeat(64),
  policyVersion: 'policy-v1', policySha256: '6'.repeat(64), contractSha256: '7'.repeat(64),
  entitlementSnapshotSha256: '8'.repeat(64), allowedTools: ['mcp:read'], allowedResources: []
};

const authority: ControlActivationAuthority = {
  async findActive(target, id) {
    return id === activation.id && JSON.stringify(target) === JSON.stringify(scope) ? activation : undefined;
  }
};

const identity: ControlIdentityResolver = {
  async resolve(request) {
    const token = request.headers.get('authorization');
    if (token === 'Bearer owner') return { scope, actor: { subject: 'owner-a', role: 'account_owner' }, credentialSource: 'bearer' as const };
    if (token === 'Bearer scheduler') return {
      scope,
      actor: { subject: 'scheduler-a', role: 'control_scheduler' },
      credentialSource: 'bearer' as const,
      schedulerActivationId: activation.id
    };
    if (token === 'Bearer other') return {
      scope: { ...scope, tenantId: 'tenant-b' }, actor: { subject: 'owner-b', role: 'account_owner' }, credentialSource: 'bearer' as const
    };
    return undefined;
  }
};

function worker() {
  let id = 0;
  const service = createControlRunService({
    repository: new MemoryControlRunRepository(),
    activations: authority,
    executor: { supports: () => true, async execute() { return { type: 'completed', outcome: 'done', verifier: 'golden-task' }; } },
    id: () => `id-${++id}`,
    clock: () => new Date(`2026-07-19T02:00:${String(id).padStart(2, '0')}.000Z`)
  });
  return createControlRunWorker({ identity, service });
}

test('API and MCP share the same tenant-scoped run service and operation contract', async () => {
  assert.deepEqual(CONTROL_RUN_MCP_OPERATIONS, CONTROL_RUN_API_OPERATIONS);
  const runtime = worker();
  const started = await runtime.fetch(new Request('https://runtime.example/v1/control/runs', {
    method: 'POST',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({
      activation_id: activation.id,
      idempotency_key: 'start-1',
      requested_tools: ['mcp:read'],
      requested_resources: [],
      concurrency_key: 'exclusive'
    })
  }));
  assert.equal(started?.status, 202);
  const startedBody = await started!.json() as { run: { id: string; status: string } };

  const mcp = await runtime.fetch(new Request('https://runtime.example/mcp', {
    method: 'POST',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name: 'control_run_get', arguments: { run_id: startedBody.run.id } }
    })
  }));
  const mcpBody = await mcp!.json() as { result: { structuredContent: { run: { id: string } } } };
  assert.equal(mcpBody.result.structuredContent.run.id, startedBody.run.id);
});

test('MCP preserves JSON-RPC framing for denial, service errors, and admission limits', async () => {
  const runtime = worker();
  const call = (id: number, authorization?: string) => new Request('https://runtime.example/mcp', {
    method: 'POST',
    headers: {
      ...(authorization ? { authorization } : {}),
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0', id, method: 'tools/call',
      params: { name: 'control_run_get', arguments: { run_id: 'missing' } }
    })
  });

  const unauthorized = await runtime.fetch(call(41));
  assert.equal(unauthorized?.status, 401);
  assert.deepEqual(await unauthorized!.json(), {
    jsonrpc: '2.0', id: 41, error: { code: -32001, message: 'unauthorized' }
  });

  const missing = await runtime.fetch(call(42, 'Bearer owner'));
  assert.equal(missing?.status, 200);
  assert.deepEqual(await missing!.json(), {
    jsonrpc: '2.0', id: 42, error: { code: -32004, message: 'control_run_not_found' }
  });

  const limited = createControlRunWorker({
    identity,
    service: createControlRunService({
      repository: new MemoryControlRunRepository(),
      activations: authority,
      executor: { supports: () => true, async execute() { return { type: 'completed', outcome: 'done', verifier: 'test' }; } }
    }),
    admission: { async check() { return 'rate_limited'; } }
  });
  const rateLimited = await limited.fetch(call(43, 'Bearer owner'));
  assert.equal(rateLimited?.status, 429);
  assert.equal(rateLimited?.headers.get('retry-after'), '60');
  assert.deepEqual(await rateLimited!.json(), {
    jsonrpc: '2.0', id: 43, error: { code: -32029, message: 'rate_limited' }
  });
});

test('MCP advertises action-specific required fields', async () => {
  const listed = await worker().fetch(new Request('https://runtime.example/mcp', {
    method: 'POST',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 51, method: 'tools/list' })
  }));
  const body = await listed!.json() as {
    result: { tools: Array<{ name: string; inputSchema: { oneOf?: Array<{ properties: { action: { const: string } }; required: string[] }> } }> };
  };
  const action = body.result.tools.find((tool) => tool.name === 'control_run_action');
  assert.ok(action?.inputSchema.oneOf);
  assert.equal(action.inputSchema.oneOf.length, 8);
  const byAction = new Map(action.inputSchema.oneOf.map((schema) => [schema.properties.action.const, schema.required]));
  assert.ok(byAction.get('approve')?.includes('reason'));
  assert.ok(byAction.get('begin_recovery')?.includes('recovery'));
  assert.ok(byAction.get('finish_recovery')?.includes('outcome'));
  assert.deepEqual(byAction.get('retry'), ['run_id', 'action', 'idempotency_key']);
});

test('anonymous, cross-tenant, and header-forged identities never receive run data', async () => {
  const runtime = worker();
  const start = await runtime.fetch(new Request('https://runtime.example/v1/control/runs', {
    method: 'POST', headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ activation_id: activation.id, idempotency_key: 'start', concurrency_key: 'x' })
  }));
  const runId = ((await start!.json()) as { run: { id: string } }).run.id;

  const anonymous = await runtime.fetch(new Request(`https://runtime.example/v1/control/runs/${runId}`));
  assert.equal(anonymous?.status, 401);
  const other = await runtime.fetch(new Request(`https://runtime.example/v1/control/runs/${runId}`, {
    headers: { authorization: 'Bearer other' }
  }));
  assert.equal(other?.status, 404);
  const forged = await runtime.fetch(new Request(`https://runtime.example/v1/control/runs/${runId}/process`, {
    method: 'POST',
    headers: {
      authorization: 'Bearer owner',
      'content-type': 'application/json',
      'x-control-role': 'control_scheduler'
    },
    body: JSON.stringify({ idempotency_key: 'process' })
  }));
  assert.equal(forged?.status, 404);
});

test('Identity infrastructure outages remain retryable across REST and MCP framing', async () => {
  const unavailableIdentity: ControlIdentityResolver = {
    async resolve() {
      throw new ControlIdentityUnavailableError();
    }
  };
  const runtime = createControlRunWorker({
    identity: unavailableIdentity,
    service: createControlRunService({
      repository: new MemoryControlRunRepository(),
      activations: authority,
      executor: {
        supports: () => true,
        async execute() {
          return { type: 'completed', outcome: 'done', verifier: 'test' };
        }
      }
    })
  });

  const rest = await runtime.fetch(new Request('https://runtime.example/v1/control/runs/missing'));
  assert.equal(rest?.status, 503);
  assert.deepEqual(await rest!.json(), { error: 'control_identity_unavailable' });

  const mcp = await runtime.fetch(new Request('https://runtime.example/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 61, method: 'initialize' })
  }));
  assert.equal(mcp?.status, 503);
  assert.deepEqual(await mcp!.json(), {
    jsonrpc: '2.0',
    id: 61,
    error: { code: -32000, message: 'control_identity_unavailable' }
  });
});

test('scheduler processing is isolated and admission fails closed before state', async () => {
  let admitted = false;
  const service = createControlRunService({
    repository: new MemoryControlRunRepository(),
    activations: authority,
    executor: { supports: () => true, async execute() { return { type: 'completed', outcome: 'done', verifier: 'test' }; } }
  });
  const runtime = createControlRunWorker({
    identity,
    service,
    admission: {
      async check() {
        admitted = true;
        throw new Error('limiter unavailable');
      }
    }
  });
  const denied = await runtime.fetch(new Request('https://runtime.example/v1/control/runs', {
    method: 'POST', headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ activation_id: activation.id, idempotency_key: 'start', concurrency_key: 'x' })
  }));
  assert.equal(admitted, true);
  assert.equal(denied?.status, 503);
  assert.deepEqual(await denied!.json(), { error: 'admission_unavailable' });
});

test('scheduler can finish recovery through the shared action contract', async () => {
  let id = 0;
  const service = createControlRunService({
    repository: new MemoryControlRunRepository(),
    activations: authority,
    executor: {
      supports: () => true,
      async execute() {
        return { type: 'dependency_failed', reason: 'dependency unavailable', fallback: 'manual restore' };
      }
    },
    id: () => `recovery-${++id}`
  });
  const runtime = createControlRunWorker({ identity, service });
  const json = (authorization: string, body: unknown) => ({
    method: 'POST',
    headers: { authorization, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const started = await runtime.fetch(new Request('https://runtime.example/v1/control/runs', json('Bearer owner', {
    activation_id: activation.id,
    idempotency_key: 'start-recovery',
    concurrency_key: 'recovery'
  })));
  const runId = ((await started!.json()) as { run: { id: string } }).run.id;
  const failed = await runtime.fetch(new Request(
    `https://runtime.example/v1/control/runs/${runId}/process`,
    json('Bearer scheduler', { idempotency_key: 'process-recovery' })
  ));
  assert.equal(((await failed!.json()) as { run: { status: string } }).run.status, 'fallback_required');
  const recovering = await runtime.fetch(new Request(
    `https://runtime.example/v1/control/runs/${runId}/actions`,
    json('Bearer owner', {
      action: 'begin_recovery',
      idempotency_key: 'begin-recovery',
      recovery: 'manual restore'
    })
  ));
  assert.equal(((await recovering!.json()) as { run: { status: string } }).run.status, 'recovering');
  const recovered = await runtime.fetch(new Request(
    `https://runtime.example/v1/control/runs/${runId}/actions`,
    json('Bearer scheduler', {
      action: 'finish_recovery',
      idempotency_key: 'finish-recovery',
      outcome: 'dependency restored and verified'
    })
  ));
  assert.equal(((await recovered!.json()) as { run: { status: string } }).run.status, 'recovered');
});

test('top-level MCP setup failures preserve JSON-RPC framing', async () => {
  const response = await runtimeWorker.fetch(new Request('https://runtime.example/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 71, method: 'tools/list' })
  }), {} as never);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    jsonrpc: '2.0',
    id: 71,
    error: { code: -32000, message: 'control_identity_unconfigured' }
  });
});
