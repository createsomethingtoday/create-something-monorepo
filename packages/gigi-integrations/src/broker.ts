import { Data, Effect, Either } from 'effect';
import { LoginError } from './auth.ts';

export type SourceProvider = 'gmail' | 'googlecalendar';
export type ConnectionState = 'disconnected' | 'pending' | 'connected' | 'attention';

export interface ConnectionStatus {
  provider: SourceProvider;
  state: ConnectionState;
  connectedAccountId?: string;
  scopes?: string[];
  reconnectable?: boolean;
  recovery?: 'operator_review';
}

export interface BeginConnectionResult {
  provider: SourceProvider;
  status: 'awaiting_consent' | 'readback_required';
  attemptId: string;
  connectedAccountId?: string;
  url?: string;
  expiresAt?: string;
}

export interface SourceRecord {
  externalId: string;
  kind: 'message' | 'event';
  observedAt: string;
  data: Record<string, unknown>;
}

export interface SourcePage {
  provider: SourceProvider;
  connectedAccountId: string;
  records: SourceRecord[];
  nextCursor: string | null;
}

export class IntegrationError extends Data.TaggedError('IntegrationError')<{
  readonly operation: string;
  readonly reason: 'invalid_configuration' | 'unauthorized' | 'unavailable' | 'invalid_readback';
  readonly cause?: unknown;
}> {}

export interface BrokerOptions {
  /** The broker verifies this token and derives the owner; callers never supply owner IDs. */
  getAccessToken: () => Promise<string>;
  baseUrl: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface BrokerClient {
  connectionStatus(provider: SourceProvider, signal?: AbortSignal): Promise<ConnectionStatus>;
  beginConnection(provider: SourceProvider, requestId: string, signal?: AbortSignal): Promise<BeginConnectionResult>;
  reconcileConnection(provider: SourceProvider, connectedAccountId: string, signal?: AbortSignal): Promise<ConnectionStatus>;
  readSourcePage(provider: SourceProvider, connectedAccountId: string, cursor?: string, signal?: AbortSignal): Promise<SourcePage>;
}

export function createBrokerClient(options: BrokerOptions): BrokerClient {
  const url = new URL(options.baseUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new IntegrationError({ operation: 'configure', reason: 'invalid_configuration' });
  }
  const request = options.fetch ?? fetch;
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 10_000, 1_000), 30_000);

  async function call(path: string, operation: string, method: 'GET' | 'POST', body?: unknown, signal?: AbortSignal): Promise<unknown> {
    const effect = Effect.tryPromise({
      try: async () => {
        const token = await options.getAccessToken();
        if (!token || /[\r\n]/u.test(token)) throw new Error('invalid access token');
        const endpoint = new URL(path, url);
        const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
        const response = await request(new Request(endpoint, {
          method,
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
          redirect: 'error',
          signal: requestSignal,
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }));
        if (response.status === 401 || response.status === 403) {
          throw new IntegrationError({ operation, reason: 'unauthorized' });
        }
        if (!response.ok) throw new IntegrationError({ operation, reason: 'unavailable' });
        const value = await readBoundedJson(response);
        return value;
      },
      catch: (cause) => cause instanceof IntegrationError || cause instanceof LoginError ? cause : new IntegrationError({ operation, reason: 'unavailable', cause }),
    });
    const outcome = await Effect.runPromise(Effect.either(effect));
    if (Either.isLeft(outcome)) throw outcome.left;
    return outcome.right;
  }

  return {
    async connectionStatus(provider, signal) {
      requireProvider(provider);
      const wire = await call(`/v1/gigi/connections/${provider}`, 'connection_status', 'GET', undefined, signal);
      return decodeConnectionStatus(wire, provider);
    },
    async beginConnection(provider, requestId, signal) {
      requireProvider(provider);
      requireId(requestId);
      const wire = await call(`/v1/gigi/connections/${provider}/link`, 'begin_connection', 'POST', { requestId }, signal);
      return decodeBeginConnection(wire, provider);
    },
    async reconcileConnection(provider, connectedAccountId, signal) {
      requireProvider(provider);
      requireId(connectedAccountId);
      const wire = await call(`/v1/gigi/connections/${provider}/${encodeURIComponent(connectedAccountId)}`, 'reconcile_connection', 'GET', undefined, signal);
      const result = decodeConnectionStatus(wire, provider);
      if (result.connectedAccountId !== connectedAccountId) throw invalidReadback('reconcile_connection');
      return result;
    },
    async readSourcePage(provider, connectedAccountId, cursor, signal) {
      requireProvider(provider);
      requireId(connectedAccountId);
      if (cursor !== undefined && (cursor.length > 512 || !/^[A-Za-z0-9._:=-]+$/u.test(cursor))) throw new IntegrationError({ operation: 'read_source_page', reason: 'invalid_configuration' });
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      const wire = await call(`/v1/gigi/sources/${provider}/${encodeURIComponent(connectedAccountId)}/page${query}`, 'read_source_page', 'GET', undefined, signal);
      return decodeSourcePage(wire, provider, connectedAccountId);
    },
  };
}

function requireProvider(provider: SourceProvider): void {
  if (provider !== 'gmail' && provider !== 'googlecalendar') {
    throw new IntegrationError({ operation: 'provider', reason: 'invalid_configuration' });
  }
}

function requireId(value: string): void {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u.test(value)) {
    throw new IntegrationError({ operation: 'identifier', reason: 'invalid_configuration' });
  }
}

function decodeConnectionStatus(value: unknown, provider: SourceProvider): ConnectionStatus {
  if (!value || typeof value !== 'object') throw invalidReadback('connection_status');
  const data = value as Record<string, unknown>;
  if (data.provider !== provider || !['disconnected', 'pending', 'connected', 'attention'].includes(String(data.state))) {
    throw invalidReadback('connection_status');
  }
  if (data.connectedAccountId !== undefined && (typeof data.connectedAccountId !== 'string' || !data.connectedAccountId)) {
    throw invalidReadback('connection_status');
  }
  if (data.state === 'connected' && typeof data.connectedAccountId !== 'string') throw invalidReadback('connection_status');
  if (data.scopes !== undefined && (!Array.isArray(data.scopes) || !data.scopes.every((scope) => typeof scope === 'string'))) {
    throw invalidReadback('connection_status');
  }
  if (data.reconnectable !== undefined && (data.reconnectable !== true || data.state !== 'attention')) throw invalidReadback('connection_status');
  if (data.recovery !== undefined && (data.recovery !== 'operator_review' || data.state !== 'attention')) throw invalidReadback('connection_status');
  return data as unknown as ConnectionStatus;
}

function invalidReadback(operation: string): IntegrationError {
  return new IntegrationError({ operation, reason: 'invalid_readback' });
}

function decodeBeginConnection(value: unknown, provider: SourceProvider): BeginConnectionResult {
  if (!value || typeof value !== 'object') throw invalidReadback('begin_connection');
  const data = value as Record<string, unknown>;
  if (data.provider !== provider || !['awaiting_consent', 'readback_required'].includes(String(data.status))) throw invalidReadback('begin_connection');
  requireId(String(data.attemptId ?? ''));
  if (data.status === 'awaiting_consent') {
    if (typeof data.url !== 'string' || typeof data.expiresAt !== 'string' ||
        typeof data.connectedAccountId !== 'string' || !/^ca_[A-Za-z0-9_-]{1,128}$/u.test(data.connectedAccountId)) throw invalidReadback('begin_connection');
    const consent = new URL(data.url);
    if (consent.protocol !== 'https:' || consent.hostname !== 'connect.composio.dev' || consent.username || consent.password || consent.hash || !Number.isFinite(Date.parse(data.expiresAt))) throw invalidReadback('begin_connection');
  }
  return data as unknown as BeginConnectionResult;
}

function decodeSourcePage(value: unknown, provider: SourceProvider, connectedAccountId: string): SourcePage {
  if (!value || typeof value !== 'object') throw invalidReadback('read_source_page');
  const data = value as Record<string, unknown>;
  if (data.provider !== provider || data.connectedAccountId !== connectedAccountId || !Array.isArray(data.records) || data.records.length > 25 ||
    !(data.nextCursor === null || (typeof data.nextCursor === 'string' && data.nextCursor.length <= 512))) throw invalidReadback('read_source_page');
  for (const item of data.records) {
    if (!item || typeof item !== 'object') throw invalidReadback('read_source_page');
    const record = item as Record<string, unknown>;
    if (typeof record.externalId !== 'string' || !record.externalId || !['message', 'event'].includes(String(record.kind)) ||
      typeof record.observedAt !== 'string' || !Number.isFinite(Date.parse(record.observedAt)) ||
      !record.data || typeof record.data !== 'object' || Array.isArray(record.data)) throw invalidReadback('read_source_page');
  }
  return data as unknown as SourcePage;
}

async function readBoundedJson(response: Response): Promise<unknown> {
  if (!response.body) throw invalidReadback('broker_response');
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 131_072) throw invalidReadback('broker_response');
      parts.push(next.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw invalidReadback('broker_response'); }
}
