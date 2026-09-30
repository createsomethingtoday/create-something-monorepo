import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';

import { createBrokerClient, IntegrationError, type SourceProvider } from './broker.ts';
import { createCtxClient, CtxError } from './ctx.ts';
import { getSessionAccessToken, login, LoginError } from './auth.ts';
import { mapSourcePage } from './import-adapter.ts';

const BROKER_RESOURCE = 'https://gigi-connector.createsomething.workers.dev';

export type RunnerRequest = { operation: string; input: Record<string, unknown> };
export type RunnerResult = { ok: true; value: unknown } | { ok: false; error: { operation: string; reason: string } };
export interface RunnerOptions {
  dataDir?: string;
  fetch?: typeof fetch;
  ctxBinary?: string;
  signal?: AbortSignal;
}

export async function runOperation(request: RunnerRequest, options: RunnerOptions = {}): Promise<RunnerResult> {
  const operation = typeof request?.operation === 'string' ? request.operation : 'unknown';
  const input = request?.input && typeof request.input === 'object' && !Array.isArray(request.input) ? request.input : {};
  try {
    const dataDir = options.dataDir ?? process.env.GIGI_DATA_DIR;
    if (!dataDir || !isAbsolute(dataDir)) return failure(operation, 'unconfigured');
    if (operation === 'auth.login') return success(await login({ dataDir, signal: options.signal, fetch: options.fetch }));
    if (operation.startsWith('connections.')) {
      const broker = createBrokerClient({
        baseUrl: BROKER_RESOURCE,
        getAccessToken: () => getSessionAccessToken({ dataDir, signal: options.signal, fetch: options.fetch }),
        fetch: options.fetch,
      });
      const provider = requireProvider(input.provider);
      switch (operation) {
        case 'connections.status': return success(await broker.connectionStatus(provider, options.signal));
        case 'connections.begin': return success(await broker.beginConnection(provider, requireString(input.requestId), options.signal));
        case 'connections.reconcile': return success(await broker.reconcileConnection(provider, requireString(input.connectedAccountId), options.signal));
        case 'connections.import': {
          const page = await broker.readSourcePage(provider, requireString(input.connectedAccountId), optionalString(input.cursor), options.signal);
          return success({ provider: page.provider, connectedAccountId: page.connectedAccountId,
            records: mapSourcePage(requireString(input.workspaceId), page), nextCursor: page.nextCursor });
        }
        default: return failure(operation, 'unknown_operation');
      }
    }
    if (operation.startsWith('context.')) {
      const ctx = createCtxClient({
        dataRoot: join(dataDir, 'ctx'),
        importRoot: join(dataDir, 'imports'),
        binary: options.ctxBinary ?? discoverCtxBinary(),
      });
      switch (operation) {
        case 'context.search': return success(await ctx.search(requireString(input.query), { limit: optionalNumber(input.limit), signal: options.signal }));
        case 'context.sync': await ctx.importHistory(join(dataDir, 'imports', 'gigi-history.jsonl'), options.signal); return success({ imported: true });
        case 'context.import': await ctx.importHistory(requireString(input.path), options.signal); return success({ imported: true });
        default: return failure(operation, 'unknown_operation');
      }
    }
    return failure(operation, 'unknown_operation');
  } catch (error) {
    if (error instanceof RunnerInputError) return failure(operation, 'invalid_request');
    if (error instanceof LoginError) return failure(operation, error.reason);
    if (error instanceof IntegrationError || error instanceof CtxError) return failure(operation, error.reason);
    return failure(operation, 'unavailable');
  }
}

function discoverCtxBinary(): string {
  const bundled = join(dirname(process.execPath), 'ctx');
  return existsSync(bundled) ? bundled : 'ctx';
}

function success(value: unknown): RunnerResult { return { ok: true, value }; }
function failure(operation: string, reason: string): RunnerResult { return { ok: false, error: { operation, reason } }; }

class RunnerInputError extends Error {}

function requireString(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 512) throw new RunnerInputError();
  return value;
}
function optionalString(value: unknown): string | undefined {
  return value === undefined ? undefined : requireString(value);
}
function optionalNumber(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new RunnerInputError();
  return value;
}
function requireProvider(value: unknown): SourceProvider {
  if (value === 'gmail' || value === 'googlecalendar') return value;
  throw new RunnerInputError();
}
