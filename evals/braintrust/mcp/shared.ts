export type JsonRecord = Record<string, unknown>;

export type HttpProbeInput = {
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

export type HttpProbeResult = {
  ok: boolean;
  status: number | null;
  durationMs: number;
  json: JsonRecord | null;
  text: string;
  error?: string;
  skipped?: boolean;
};

export function readEnv(name: string, fallback = ''): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

export function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function bearerHeaders(token?: string): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function parseJsonRecord(value: string | undefined): JsonRecord | undefined {
  if (!value || value.trim().length === 0) return undefined;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as JsonRecord;
    }
  } catch {
    // Ignored: invalid JSON falls back to undefined.
  }

  return undefined;
}

export function getByPath(object: JsonRecord | null, path: string): unknown {
  if (!object || !path) return undefined;

  const segments = path.split('.').map((segment) => segment.trim()).filter(Boolean);
  let current: unknown = object;

  for (const segment of segments) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as JsonRecord)[segment];
  }

  return current;
}

export async function httpProbe(input: HttpProbeInput): Promise<HttpProbeResult> {
  if (!input.url) {
    return {
      ok: false,
      status: null,
      durationMs: 0,
      json: null,
      text: '',
      skipped: true,
      error: 'Missing URL',
    };
  }

  const controller = new AbortController();
  const timeoutMs = input.timeoutMs ?? 15_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(input.url, {
      method: input.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(input.headers ?? {}),
      },
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
      signal: controller.signal,
    });

    const text = await response.text();
    let json: JsonRecord | null = null;

    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        json = parsed as JsonRecord;
      }
    } catch {
      // Non-JSON response is acceptable for error-path probing.
    }

    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      json,
      text,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      durationMs: Date.now() - startedAt,
      json: null,
      text: '',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}
