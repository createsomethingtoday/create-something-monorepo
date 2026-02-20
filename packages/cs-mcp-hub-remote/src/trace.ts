import type { Env, InvocationTrace } from './types.js';
import {
  asRecord,
  createFallbackRequestId,
  getHeaderValue,
  normalizeTraceValue,
  readEnvString
} from './utils.js';

export function extractInvocationTrace(request: unknown, extra: unknown): InvocationTrace {
  const requestRecord = asRecord(request);
  const extraRecord = asRecord(extra);
  const meta = asRecord(extraRecord?._meta);
  const relatedTask = asRecord(meta?.['io.modelcontextprotocol/related-task']);

  const headerRequestId = getHeaderValue(extraRecord?.requestInfo, 'x-request-id');
  const requestId =
    headerRequestId ??
    normalizeTraceValue(extraRecord?.requestId) ??
    normalizeTraceValue(requestRecord?.id) ??
    createFallbackRequestId();

  const correlationId =
    getHeaderValue(extraRecord?.requestInfo, 'x-correlation-id') ??
    normalizeTraceValue(relatedTask?.taskId) ??
    normalizeTraceValue(meta?.progressToken) ??
    requestId;

  return {
    requestId,
    correlationId,
    transportRequestId: normalizeTraceValue(extraRecord?.requestId) ?? requestId
  };
}

export function resolveAccountId(extra: unknown, env: Env): string {
  const extraRecord = asRecord(extra);
  const authInfo = asRecord(extraRecord?.authInfo);
  const fromHeader =
    getHeaderValue(extraRecord?.requestInfo, 'x-account-id') ??
    getHeaderValue(extraRecord?.requestInfo, 'x-tenant-id') ??
    getHeaderValue(extraRecord?.requestInfo, 'x-hub-account-id');
  const fromAuth =
    normalizeTraceValue(authInfo?.accountId) ??
    normalizeTraceValue(authInfo?.tenantId) ??
    normalizeTraceValue(authInfo?.clientId) ??
    normalizeTraceValue(authInfo?.sub);
  return fromHeader ?? fromAuth ?? readEnvString(env, 'HUB_ACCOUNT_ID') ?? 'operator';
}

export function resolveTenantId(extra: unknown, env: Env): string {
  const extraRecord = asRecord(extra);
  const authInfo = asRecord(extraRecord?.authInfo);
  const fromHeader =
    getHeaderValue(extraRecord?.requestInfo, 'x-tenant-id') ??
    getHeaderValue(extraRecord?.requestInfo, 'x-account-id') ??
    getHeaderValue(extraRecord?.requestInfo, 'x-hub-account-id');

  const fromAuth =
    normalizeTraceValue(authInfo?.tenantId) ??
    normalizeTraceValue(authInfo?.accountId) ??
    normalizeTraceValue(authInfo?.clientId) ??
    normalizeTraceValue(authInfo?.sub);

  return fromHeader ?? fromAuth ?? readEnvString(env, 'HUB_ACCOUNT_ID') ?? 'operator';
}
