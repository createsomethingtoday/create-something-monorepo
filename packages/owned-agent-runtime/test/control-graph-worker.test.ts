import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createControlRunService,
  type ControlScope,
  type ControlRunRecord,
  type FrozenControlActivation
} from '../src/control.js';
import {
  createControlRunWorker,
  CONTROL_RUN_API_OPERATIONS,
  CONTROL_RUN_MCP_OPERATIONS
} from '../src/control-worker.js';
import type { ControlGraphExplanationReader } from '../src/control-graph-explanation.js';

// Synthetic transport fixtures: no authenticated live session or recorded run is claimed.
const scope: ControlScope = {
  accountId: 'fixture-account',
  tenantId: 'fixture-tenant',
  workspaceAccountId: 'fixture-workspace'
};
const activation: FrozenControlActivation = {
  ...scope,
  id: 'fixture-activation',
  activationVersion: 1,
  activationKind: 'initial',
  status: 'active',
  mapId: 'fixture-map',
  mapVersionId: 'fixture-map-version',
  mapVersion: 1,
  mapCanvasSha256: '1'.repeat(64),
  handoffId: 'fixture-handoff',
  handoffReceiptSha256: '2'.repeat(64),
  buildReleaseId: 'fixture-build',
  buildManifestSha256: '3'.repeat(64),
  buildArtifactSetSha256: '4'.repeat(64),
  buildAcceptanceReceiptId: 'fixture-acceptance',
  buildAcceptanceReceiptSha256: '5'.repeat(64),
  policyVersion: 'fixture-policy',
  policySha256: '6'.repeat(64),
  contractSha256: '7'.repeat(64),
  entitlementSnapshotSha256: '8'.repeat(64),
  allowedTools: [],
  allowedResources: []
};
const run: ControlRunRecord = {
  ...scope,
  id: 'fixture-run',
  activation,
  status: 'waiting_for_approval',
  version: 3,
  attempt: 1,
  concurrencyKey: 'fixture-concurrency',
  requestedTools: [],
  requestedResources: [],
  pendingApprovalKind: 'fixture-policy',
  recovery: null,
  lastError: null,
  createdBy: 'fixture-owner',
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
  receipts: []
};
const explanation: NonNullable<Awaited<ReturnType<ControlGraphExplanationReader['find']>>> = {
  schema: 'create-something/control-graph-explanation@1',
  authority: 'read_only',
  scopeProvenance: 'identity_and_scoped_control_reader',
  authorization: 'owning_host_required',
  asOf: '2026-11-02T00:00:00.000Z',
  run: { id: run.id, version: run.version, status: run.status },
  runtime: {
    runVersion: 2,
    status: 'waiting_for_approval',
    runtimeManifestSha256: `sha256:${'a'.repeat(64)}`,
    artifactManifestSha256: `sha256:${'b'.repeat(64)}`,
    buildBindingSha256: `sha256:${'c'.repeat(64)}`
  },
  reason: { code: 'pending_approval', detail: 'observed' },
  frontier: null,
  nextOwner: { state: 'unknown', id: null, source: null },
  requiredActorRoles: [],
  requirements: [],
  links: { linear: null, substrate: null },
  relationships: [],
  evidence: { proofSha256: `sha256:${'d'.repeat(64)}`, receipts: [], bindingSha256: null },
  unresolved: []
};

function fixture(
  mode: 'configured' | 'missing' | 'empty' | 'wrong-run' = 'configured',
  rateLimited = false
) {
  const calls = {
    reads: 0,
    explanations: 0,
    mutations: 0,
    operations: [] as string[],
    scopes: [] as ControlScope[]
  };
  const noMutation = async (): Promise<never> => {
    calls.mutations += 1;
    throw new Error('Unexpected mutation');
  };
  const service = createControlRunService({
    repository: {
      async find(candidate, runId) {
        calls.reads += 1;
        return JSON.stringify(candidate) === JSON.stringify(scope) && runId === run.id
          ? structuredClone(run)
          : undefined;
      },
      replay: noMutation,
      apply: noMutation
    },
    activations: { findActive: noMutation },
    executor: {
      supports() {
        calls.mutations += 1;
        throw new Error('Unexpected execution');
      },
      execute: noMutation
    }
  });
  const worker = createControlRunWorker({
    service,
    identity: {
      async resolve(request) {
        const token = request.headers.get('authorization');
        if (!token) return undefined;
        const role =
          token === 'Bearer reader'
            ? 'account_reader'
            : token.startsWith('Bearer scheduler')
              ? 'control_scheduler'
              : 'account_owner';
        return {
          scope: token === 'Bearer other-tenant' ? { ...scope, tenantId: 'other-tenant' } : scope,
          actor: { subject: 'fixture-subject', role },
          credentialSource: 'bearer',
          ...(role === 'control_scheduler'
            ? {
                schedulerActivationId:
                  token === 'Bearer scheduler' ? activation.id : 'other-activation'
              }
            : {})
        };
      }
    },
    admission: {
      async check(input) {
        calls.operations.push(input.operation);
        return rateLimited ? 'rate_limited' : 'allowed';
      }
    },
    ...(mode === 'missing'
      ? {}
      : {
          explanations: {
            async find(input: { scope: ControlScope; runId: string }) {
              calls.explanations += 1;
              calls.scopes.push(structuredClone(input.scope));
              assert.equal(input.runId, run.id);
              if (mode === 'empty') return undefined;
              return mode === 'wrong-run'
                ? { ...explanation, run: { ...explanation.run, id: 'another-run' } }
                : explanation;
            }
          }
        })
  });
  return { worker, calls };
}
function rest(token: string | null = 'owner', suffix = '') {
  return new Request(`https://runtime.example/v1/control/runs/${run.id}/explanation${suffix}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {}
  });
}
function mcp(
  token: string | null = 'owner',
  args: Record<string, unknown> = { run_id: run.id },
  method = 'tools/call'
) {
  return new Request('https://runtime.example/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 71,
      method,
      params: { name: 'control_run_explain', arguments: args }
    })
  });
}

test('REST and MCP explanation reads preserve exact identity scope and return the same read-only result', async () => {
  for (const role of ['owner', 'reader', 'scheduler']) {
    const { worker, calls } = fixture();
    const response = await worker.fetch(rest(role));
    assert.equal(response?.status, 200);
    assert.deepEqual(await response!.json(), { explanation });
    const rpc = await worker.fetch(mcp(role));
    assert.equal(rpc?.status, 200);
    const body = (await rpc!.json()) as {
      result: { structuredContent: unknown; content: Array<{ text: string }> };
    };
    assert.deepEqual(body.result.structuredContent, { explanation });
    assert.deepEqual(JSON.parse(body.result.content[0].text), { explanation });
    assert.deepEqual(calls.scopes, [scope, scope]);
    assert.deepEqual(calls.operations, ['explain', 'mcp:control_run_explain']);
    assert.equal(calls.reads, 2);
    assert.equal(calls.explanations, 2);
    assert.equal(calls.mutations, 0);
  }
});

test('anonymous, wrong-scope, missing run and unbound scheduler never reach the explanation reader', async () => {
  const { worker, calls } = fixture();
  assert.equal((await worker.fetch(rest(null)))?.status, 401);
  const anonymousRpc = await worker.fetch(mcp(null));
  assert.equal(anonymousRpc?.status, 401);
  assert.deepEqual(await anonymousRpc!.json(), {
    jsonrpc: '2.0',
    id: 71,
    error: { code: -32001, message: 'unauthorized' }
  });
  const wrongScope = await worker.fetch(rest('other-tenant'));
  const missing = await worker.fetch(
    new Request('https://runtime.example/v1/control/runs/missing/explanation', {
      headers: { authorization: 'Bearer owner' }
    })
  );
  assert.equal(wrongScope?.status, 404);
  assert.equal(missing?.status, 404);
  assert.deepEqual(await wrongScope!.json(), await missing!.json());
  assert.equal((await worker.fetch(rest('scheduler-other')))?.status, 404);
  const deniedRpc = await worker.fetch(mcp('other-tenant'));
  assert.deepEqual(await deniedRpc!.json(), {
    jsonrpc: '2.0',
    id: 71,
    error: { code: -32004, message: 'control_run_not_found' }
  });
  assert.equal(calls.explanations, 0);
  assert.equal(calls.mutations, 0);
});

test('missing or mismatched explanation returns unavailable without leaking a different run', async () => {
  for (const mode of ['missing', 'empty', 'wrong-run'] as const) {
    const { worker } = fixture(mode);
    const response = await worker.fetch(rest());
    assert.equal(response?.status, 503);
    assert.deepEqual(await response!.json(), { error: 'control_explanation_unavailable' });
    const rpc = await worker.fetch(mcp());
    assert.equal(rpc?.status, 503);
    assert.deepEqual(await rpc!.json(), {
      jsonrpc: '2.0',
      id: 71,
      error: { code: -32603, message: 'control_explanation_unavailable' }
    });
  }
});

test('query scope overrides and unknown MCP fields are rejected before evidence is read', async () => {
  const { worker, calls } = fixture();
  assert.equal((await worker.fetch(rest('owner', '?tenant_id=other')))?.status, 400);
  for (const args of [
    { run_id: run.id, scope },
    { run_id: run.id, execute: true },
    { run_id: ' ' },
    { run_id: run.id, tenant_id: 'other' }
  ]) {
    const response = await worker.fetch(mcp('owner', args));
    const body = (await response!.json()) as { error: { code: number } };
    assert.equal(body.error.code, -32602);
  }
  assert.equal(calls.explanations, 0);
  assert.equal(calls.mutations, 0);
});

test('the explanation route cannot turn a request body into a source or command input', async () => {
  const { worker, calls } = fixture();
  const response = await worker.fetch(
    new Request(`https://runtime.example/v1/control/runs/${run.id}/explanation`, {
      method: 'POST',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'approve', scope: { ...scope, tenantId: 'other' } })
    })
  );
  assert.equal(response?.status, 404);
  assert.equal(calls.reads, 0);
  assert.equal(calls.explanations, 0);
  assert.equal(calls.mutations, 0);
});

test('explanation reads respect admission and expose only a strict read-only MCP tool', async () => {
  const limited = fixture('configured', true);
  assert.equal((await limited.worker.fetch(rest()))?.status, 429);
  assert.equal((await limited.worker.fetch(mcp()))?.status, 429);
  assert.equal(limited.calls.reads, 0);
  assert.equal(limited.calls.explanations, 0);
  const { worker } = fixture();
  const toolsResponse = await worker.fetch(mcp('owner', {}, 'tools/list'));
  const body = (await toolsResponse!.json()) as {
    result: {
      tools: Array<{
        name: string;
        annotations: Record<string, boolean>;
        inputSchema: Record<string, unknown>;
      }>;
    };
  };
  const tool = body.result.tools.find((item) => item.name === 'control_run_explain');
  assert.ok(tool);
  assert.equal(tool.annotations.readOnlyHint, true);
  assert.equal(tool.inputSchema.additionalProperties, false);
  assert.ok(CONTROL_RUN_API_OPERATIONS.includes('explain'));
  assert.deepEqual(CONTROL_RUN_API_OPERATIONS, CONTROL_RUN_MCP_OPERATIONS);
});
