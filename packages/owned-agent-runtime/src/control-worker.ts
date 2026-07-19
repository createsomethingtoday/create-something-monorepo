import { z } from 'zod';

import {
  ControlRunAccessError,
  ControlRunConflictError,
  ControlRunPolicyError,
  ControlRunValidationError,
  type createControlRunService
} from './control.js';
import {
  ControlIdentityUnavailableError,
  type ControlIdentityResolver,
  type ControlRequestContext
} from './control-identity.js';

type ControlRunService = ReturnType<typeof createControlRunService>;

export const CONTROL_RUN_API_OPERATIONS = Object.freeze([
  'get',
  'start',
  'approve',
  'reject',
  'stop',
  'cancel',
  'retry',
  'begin_recovery',
  'finish_recovery',
  'terminate'
] as const);

export const CONTROL_RUN_MCP_OPERATIONS = Object.freeze([...CONTROL_RUN_API_OPERATIONS] as const);

export interface ControlRunAdmission {
  check(input: {
    request: Request;
    context: ControlRequestContext;
    operation: string;
  }): Promise<'allowed' | 'rate_limited'>;
}

const startInput = z.object({
  activation_id: z.string().trim().min(1).max(240),
  idempotency_key: z.string().trim().min(1).max(180),
  requested_tools: z.array(z.string()).max(100).default([]),
  requested_resources: z.array(z.string()).max(100).default([]),
  concurrency_key: z.string().trim().min(1).max(180)
});

const CONTROL_ACTIONS = [
  'approve',
  'reject',
  'stop',
  'cancel',
  'retry',
  'begin_recovery',
  'finish_recovery',
  'terminate'
] as const;

const actionInput = z.object({
  action: z.enum(CONTROL_ACTIONS),
  idempotency_key: z.string().trim().min(1).max(180),
  reason: z.string().trim().min(1).max(1000).optional(),
  recovery: z.string().trim().min(1).max(240).optional(),
  outcome: z.string().trim().min(1).max(1000).optional()
}).superRefine((value, context) => {
  if (['approve', 'reject', 'stop', 'cancel', 'terminate'].includes(value.action) && !value.reason) {
    context.addIssue({ code: 'custom', path: ['reason'], message: `${value.action} requires an explicit reason` });
  }
  if (value.action === 'begin_recovery' && !value.recovery) {
    context.addIssue({ code: 'custom', path: ['recovery'], message: 'begin_recovery requires an explicit path' });
  }
  if (value.action === 'finish_recovery' && !value.outcome) {
    context.addIssue({ code: 'custom', path: ['outcome'], message: 'finish_recovery requires an explicit outcome' });
  }
});

const processInput = z.object({
  idempotency_key: z.string().trim().min(1).max(180)
});

const mcpRequest = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional()
});

function response(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff'
    }
  });
}

function rpc(id: string | number | null | undefined, result: unknown): Response {
  return response({ jsonrpc: '2.0', id: id ?? null, result });
}

function rpcError(
  id: string | number | null | undefined,
  code: number,
  message: string,
  status = 200
): Response {
  return response({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, status);
}

async function rpcDenied(
  id: string | number | null | undefined,
  access: { denied: Response; retryAfter?: true }
) {
  const payload = await access.denied.clone().json().catch(() => ({})) as { error?: string };
  const code = access.denied.status === 401
    ? -32001
    : access.denied.status === 403
      ? -32003
      : access.denied.status === 429
        ? -32029
        : -32000;
  const denied = rpcError(id, code, payload.error ?? 'request_denied', access.denied.status);
  if (access.retryAfter) denied.headers.set('retry-after', '60');
  return denied;
}

function rpcControlError(id: string | number | null | undefined, error: unknown) {
  if (error instanceof ControlRunAccessError) return rpcError(id, -32004, error.code);
  if (error instanceof ControlRunPolicyError) return rpcError(id, -32003, error.code);
  if (error instanceof ControlRunValidationError) return rpcError(id, -32602, error.code);
  if (error instanceof ControlRunConflictError) return rpcError(id, -32009, error.code);
  return rpcError(id, -32603, 'control_state_unavailable');
}

function toolResult(run: unknown) {
  return {
    content: [{ type: 'text', text: JSON.stringify(run) }],
    structuredContent: { run },
    isError: false
  };
}

async function parsedJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

async function runAction(
  service: ControlRunService,
  context: ControlRequestContext,
  runId: string,
  input: z.infer<typeof actionInput>
) {
  const { scope, actor } = context;
  switch (input.action) {
    case 'approve':
      return service.approve(scope, actor, runId, input.idempotency_key, input.reason!);
    case 'reject':
      return service.reject(scope, actor, runId, input.idempotency_key, input.reason!);
    case 'stop':
      return service.stop(scope, actor, runId, input.idempotency_key, input.reason!);
    case 'cancel':
      return service.cancel(scope, actor, runId, input.idempotency_key, input.reason!);
    case 'retry':
      return service.retry(scope, actor, runId, input.idempotency_key);
    case 'begin_recovery':
      return service.beginRecovery(
        scope,
        actor,
        runId,
        input.idempotency_key,
        input.recovery!
      );
    case 'finish_recovery':
      return service.finishRecovery(
        scope,
        actor,
        runId,
        input.idempotency_key,
        input.outcome!,
        context.schedulerActivationId
      );
    case 'terminate':
      return service.terminate(scope, actor, runId, input.idempotency_key, input.reason!);
  }
}

function toolDefinitions() {
  const actionSchemas = CONTROL_ACTIONS.map((action) => {
    const properties: Record<string, unknown> = {
      run_id: { type: 'string' },
      action: { type: 'string', const: action },
      idempotency_key: { type: 'string' }
    };
    const required = ['run_id', 'action', 'idempotency_key'];
    if (['approve', 'reject', 'stop', 'cancel', 'terminate'].includes(action)) {
      properties.reason = { type: 'string' };
      required.push('reason');
    } else if (action === 'begin_recovery') {
      properties.recovery = { type: 'string' };
      required.push('recovery');
    } else if (action === 'finish_recovery') {
      properties.outcome = { type: 'string' };
      required.push('outcome');
    }
    return { type: 'object', properties, required, additionalProperties: false };
  });
  return [
    {
      name: 'control_run_get',
      description: 'Read one Control run inside the authenticated tenant scope.',
      inputSchema: {
        type: 'object',
        properties: { run_id: { type: 'string' } },
        required: ['run_id'],
        additionalProperties: false
      }
    },
    {
      name: 'control_run_start',
      description: 'Queue a run against an active frozen Control activation.',
      inputSchema: {
        type: 'object',
        properties: {
          activation_id: { type: 'string' },
          idempotency_key: { type: 'string' },
          requested_tools: { type: 'array', items: { type: 'string' } },
          requested_resources: { type: 'array', items: { type: 'string' } },
          concurrency_key: { type: 'string' }
        },
        required: ['activation_id', 'idempotency_key', 'concurrency_key'],
        additionalProperties: false
      }
    },
    {
      name: 'control_run_action',
      description: 'Apply an approval, stop, cancellation, retry, recovery, or termination command.',
      inputSchema: { oneOf: actionSchemas }
    }
  ];
}

export function createControlRunWorker(dependencies: {
  identity: ControlIdentityResolver;
  service: ControlRunService;
  admission?: ControlRunAdmission;
}) {
  async function context(request: Request, operation: string) {
    let resolved: ControlRequestContext | undefined;
    try {
      resolved = await dependencies.identity.resolve(request);
    } catch (error) {
      if (error instanceof ControlIdentityUnavailableError) {
        return { denied: response({ error: 'control_identity_unavailable' }, 503) } as const;
      }
      throw error;
    }
    if (!resolved) return { denied: response({ error: 'unauthorized' }, 401) } as const;
    if (dependencies.admission) {
      try {
        const decision = await dependencies.admission.check({ request, context: resolved, operation });
        if (decision === 'rate_limited') {
          return {
            denied: response({ error: 'rate_limited' }, 429),
            retryAfter: true
          } as const;
        }
      } catch {
        return { denied: response({ error: 'admission_unavailable' }, 503) } as const;
      }
    }
    return { resolved } as const;
  }

  async function api(request: Request, url: URL): Promise<Response | undefined> {
    if (!url.pathname.startsWith('/v1/control/')) return undefined;
    const runRoute = url.pathname.match(/^\/v1\/control\/runs\/([^/]+)$/);
    const actionRoute = url.pathname.match(/^\/v1\/control\/runs\/([^/]+)\/actions$/);
    const processRoute = url.pathname.match(/^\/v1\/control\/runs\/([^/]+)\/process$/);
    const operation = request.method === 'POST' && url.pathname === '/v1/control/runs'
      ? 'start'
      : processRoute ? 'process' : actionRoute ? 'action' : 'get';
    const access = await context(request, operation);
    if ('denied' in access) {
      if (access.retryAfter) access.denied.headers.set('retry-after', '60');
      return access.denied;
    }
    const { scope, actor } = access.resolved;

    if (request.method === 'GET' && runRoute) {
      return response({
        run: await dependencies.service.get(
          scope,
          actor,
          decodeURIComponent(runRoute[1]),
          access.resolved.schedulerActivationId
        )
      });
    }
    if (request.method === 'POST' && url.pathname === '/v1/control/runs') {
      const parsed = startInput.safeParse(await parsedJson(request));
      if (!parsed.success) return response({ error: 'invalid_request', issues: parsed.error.issues }, 400);
      const run = await dependencies.service.start(scope, actor, {
        activationId: parsed.data.activation_id,
        idempotencyKey: parsed.data.idempotency_key,
        requestedTools: parsed.data.requested_tools,
        requestedResources: parsed.data.requested_resources,
        concurrencyKey: parsed.data.concurrency_key
      });
      return response({ run }, 202);
    }
    if (request.method === 'POST' && actionRoute) {
      const parsed = actionInput.safeParse(await parsedJson(request));
      if (!parsed.success) return response({ error: 'invalid_request', issues: parsed.error.issues }, 400);
      return response({
        run: await runAction(dependencies.service, access.resolved, decodeURIComponent(actionRoute[1]), parsed.data)
      });
    }
    if (request.method === 'POST' && processRoute) {
      const parsed = processInput.safeParse(await parsedJson(request));
      if (!parsed.success) return response({ error: 'invalid_request', issues: parsed.error.issues }, 400);
      return response({
        run: await dependencies.service.process(
          scope,
          actor,
          decodeURIComponent(processRoute[1]),
          parsed.data.idempotency_key,
          access.resolved.schedulerActivationId
        )
      });
    }
    return response({ error: 'not_found' }, 404);
  }

  async function mcp(request: Request, url: URL): Promise<Response | undefined> {
    if (url.pathname !== '/mcp') return undefined;
    if (request.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);
    const parsed = mcpRequest.safeParse(await parsedJson(request));
    if (!parsed.success) return rpcError(null, -32600, 'Invalid Request', 400);
    const message = parsed.data;
    const name = typeof message.params?.name === 'string' ? message.params.name : '';
    const operation = message.method === 'tools/call' && name
      ? `mcp:${name}`
      : `mcp:${message.method}`;
    const access = await context(request, operation);
    if ('denied' in access && access.denied) {
      return rpcDenied(message.id, {
        denied: access.denied,
        ...(access.retryAfter ? { retryAfter: true as const } : {})
      });
    }
    try {
      if (message.method === 'initialize') {
        return rpc(message.id, {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'create-something-control-runtime', version: '1.0.0' }
        });
      }
      if (message.method === 'tools/list') return rpc(message.id, { tools: toolDefinitions() });
      if (message.method !== 'tools/call') return rpcError(message.id, -32601, 'Method not found');
      const args = message.params?.arguments;
      if (!args || typeof args !== 'object' || Array.isArray(args)) {
        return rpcError(message.id, -32602, 'Invalid tool arguments');
      }
      const values = args as Record<string, unknown>;
      if (name === 'control_run_get' && typeof values.run_id === 'string') {
        return rpc(message.id, toolResult(await dependencies.service.get(
          access.resolved.scope,
          access.resolved.actor,
          values.run_id,
          access.resolved.schedulerActivationId
        )));
      }
      if (name === 'control_run_start') {
        const validated = startInput.safeParse(values);
        if (!validated.success) return rpcError(message.id, -32602, 'Invalid tool arguments');
        const run = await dependencies.service.start(access.resolved.scope, access.resolved.actor, {
          activationId: validated.data.activation_id,
          idempotencyKey: validated.data.idempotency_key,
          requestedTools: validated.data.requested_tools,
          requestedResources: validated.data.requested_resources,
          concurrencyKey: validated.data.concurrency_key
        });
        return rpc(message.id, toolResult(run));
      }
      if (name === 'control_run_action' && typeof values.run_id === 'string') {
        const validated = actionInput.safeParse(values);
        if (!validated.success) return rpcError(message.id, -32602, 'Invalid tool arguments');
        return rpc(message.id, toolResult(await runAction(
          dependencies.service,
          access.resolved,
          values.run_id,
          validated.data
        )));
      }
      return rpcError(message.id, -32602, 'Unknown tool or invalid arguments');
    } catch (error) {
      return rpcControlError(message.id, error);
    }
  }

  return {
    async fetch(request: Request): Promise<Response | undefined> {
      try {
        const url = new URL(request.url);
        return (await api(request, url)) ?? (await mcp(request, url));
      } catch (error) {
        if (error instanceof ControlRunAccessError) return response({ error: error.code }, 404);
        if (error instanceof ControlRunPolicyError) return response({ error: error.code }, 403);
        if (error instanceof ControlRunValidationError) return response({ error: error.code }, 400);
        if (error instanceof ControlRunConflictError) return response({ error: error.code }, 409);
        return response({ error: 'control_state_unavailable' }, 503);
      }
    }
  };
}
