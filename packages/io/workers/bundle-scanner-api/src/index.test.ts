import { afterEach, describe, expect, it, vi } from 'vitest';

import worker from './index';

// A minimal valid ZIP containing `src/app.js`. Precomputed to avoid a jszip
// dependency in the worker package (see bundle-scanner-core for zip building).
const BUNDLE_ZIP_BASE64 =
  'UEsDBAoAAAAAAOeD6FwAAAAAAAAAAAAAAAAEAAAAc3JjL1BLAwQKAAAAAADng+hcR4kZky0AAAAtAAAACgAAAHNyYy9hcHAuanNleHBvcnQgY29uc3QgaGVsbG8gPSAoKSA9PiBjb25zb2xlLmxvZygiaGkiKTtQSwECFAAKAAAAAADng+hcAAAAAAAAAAAAAAAABAAAAAAAAAAAABAAAAAAAAAAc3JjL1BLAQIUAAoAAAAAAOeD6FxHiRmTLQAAAC0AAAAKAAAAAAAAAAAAAAAAACIAAABzcmMvYXBwLmpzUEsFBgAAAAACAAIAagAAAHcAAAAAAA==';

function zipArrayBuffer(): ArrayBuffer {
  const binary = atob(BUNDLE_ZIP_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

type Env = {
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
  SCAN_WEBHOOK_SECRET?: string;
};

const SECRET = 'test-secret-value';

function env(overrides: Partial<Env> = {}): Env {
  return {
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS: 'https://createsomething.io',
    SCAN_WEBHOOK_SECRET: SECRET,
    ...overrides
  };
}

function scanRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://scanner-api.createsomething.io/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('bundle-scanner-api worker', () => {
  it('responds to /health without auth', async () => {
    const res = await worker.fetch(new Request('https://x/health'), env());
    expect(res.status).toBe(200);
    const data = (await res.json()) as { status: string };
    expect(data.status).toBe('ok');
  });

  it('rejects /scan without the shared secret', async () => {
    const res = await worker.fetch(
      scanRequest({ bundleUrl: 'https://example.com/app.zip' }),
      env()
    );
    expect(res.status).toBe(401);
  });

  it('fails closed in production when no secret is configured', async () => {
    const res = await worker.fetch(
      scanRequest({ bundleUrl: 'https://example.com/app.zip' }, { Authorization: 'Bearer anything' }),
      env({ ENVIRONMENT: 'production', SCAN_WEBHOOK_SECRET: undefined })
    );
    expect(res.status).toBe(500);
  });

  it('rejects private/loopback artifact hosts (SSRF guard)', async () => {
    const res = await worker.fetch(
      scanRequest({ bundleUrl: 'http://localhost/app.zip' }, { Authorization: `Bearer ${SECRET}` }),
      env()
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/public host/i);
  });

  it('returns 400 for missing bundleUrl', async () => {
    const res = await worker.fetch(
      scanRequest({}, { Authorization: `Bearer ${SECRET}` }),
      env()
    );
    expect(res.status).toBe(400);
  });

  it('scans a bundle end-to-end with a valid secret', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(zipArrayBuffer(), { status: 200, headers: { 'content-type': 'application/zip' } })
      )
    );

    const res = await worker.fetch(
      scanRequest(
        { bundleUrl: 'https://artifacts.example.com/app.zip', submissionId: 'sub-1' },
        { Authorization: `Bearer ${SECRET}` }
      ),
      env()
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      success: boolean;
      submissionId: string;
      report: { verdict: string };
      artifacts: { bundle: { sha256: string } };
    };
    expect(data.success).toBe(true);
    expect(data.submissionId).toBe('sub-1');
    expect(data.report.verdict).toBeTruthy();
    expect(data.artifacts.bundle.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});
