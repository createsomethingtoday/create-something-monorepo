import type { Env, HubError } from './types.js';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

export function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

export function readEnvString(env: Env, key: string): string | undefined {
  const value = env[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function parseList(raw: string | undefined): string[] | null {
  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')) {
        return uniqueSortedStrings(parsed);
      }
      return [];
    } catch {
      return [];
    }
  }

  return uniqueSortedStrings(
    trimmed
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
  );
}

export function normalizeTraceValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 256) : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }
  return null;
}

export function createFallbackRequestId(): string {
  return `hub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getHeaderValue(requestInfo: unknown, name: string): string | null {
  const infoRecord = asRecord(requestInfo);
  const headers = infoRecord?.headers;
  if (!headers) return null;

  if (headers instanceof Headers) {
    const value = headers.get(name);
    return normalizeTraceValue(value);
  }

  if (Array.isArray(headers)) {
    for (const item of headers) {
      if (!Array.isArray(item) || item.length < 2) continue;
      if (String(item[0]).toLowerCase() !== name.toLowerCase()) continue;
      return normalizeTraceValue(item[1]);
    }
    return null;
  }

  const headerRecord = asRecord(headers);
  if (!headerRecord) return null;

  for (const [key, value] of Object.entries(headerRecord)) {
    if (key.toLowerCase() !== name.toLowerCase()) continue;
    if (typeof value === 'string') return normalizeTraceValue(value);
    if (Array.isArray(value)) {
      for (const item of value) {
        const normalized = normalizeTraceValue(item);
        if (normalized) return normalized;
      }
    }
  }

  return null;
}

export function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function sanitizeDotName(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .toLowerCase();
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function getRequestToken(request: Request): string | null {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken) {
    return queryToken;
  }

  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}

export function authorizeRequest(request: Request, env: Env): Response | null {
  const requiredToken = readEnvString(env, 'HUB_API_TOKEN');
  if (!requiredToken) {
    return null;
  }

  const providedToken = getRequestToken(request);
  if (!providedToken || !timingSafeEqual(providedToken, requiredToken)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  return null;
}

export function normalizeArgs(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) {
    return {};
  }
  return raw;
}

export function stringArg(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function numberArg(raw: unknown, fallback: number, min: number, max: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(raw)));
}

export function toJsonResult(payload: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload
  };
}

export function formatHubError(error: unknown): {
  code: string;
  message: string;
  meta?: Record<string, unknown>;
} {
  if (
    error &&
    typeof error === 'object' &&
    'name' in error &&
    (error as HubError).name === 'HubError'
  ) {
    const hubError = error as HubError;
    return {
      code: hubError.code,
      message: hubError.message,
      meta: hubError.meta
    };
  }

  return {
    code: 'HUB_DOWNSTREAM_FAILURE',
    message: error instanceof Error ? error.message : String(error)
  };
}

export function toErrorResult(
  message: string,
  code?: string,
  meta?: Record<string, unknown>
): {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
} {
  if (!code) {
    return {
      isError: true,
      content: [{ type: 'text' as const, text: message }]
    };
  }

  const payload: Record<string, unknown> = {
    error: {
      code,
      message,
      ...(meta ? { meta } : {})
    }
  };

  return {
    isError: true,
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload
  };
}

export function safeJsonStringify(value: Record<string, unknown> | undefined): string | null {
  if (!value || Object.keys(value).length === 0) {
    return null;
  }
  try {
    const serialized = JSON.stringify(value);
    return serialized.length > 4000 ? `${serialized.slice(0, 3997)}...` : serialized;
  } catch {
    return null;
  }
}

export function isMissingColumnError(message: string, column: string): boolean {
  return (
    message.includes(`no such column: ${column}`) || message.includes(`no column named ${column}`)
  );
}

export function isRetryableStatusCode(message: string): boolean {
  return /\b429\b|\b502\b|\b503\b|\b504\b/.test(message);
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
