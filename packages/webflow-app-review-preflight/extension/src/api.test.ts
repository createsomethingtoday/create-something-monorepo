import { afterEach, describe, expect, test, vi } from 'vitest';
import { createPreflightApi } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as typeof globalThis & { webflow?: unknown }).webflow;
});

describe('Preflight API', () => {
  test('explains when a runtime-run request reaches an older live Worker', async () => {
    (globalThis as typeof globalThis & { webflow?: { getIdToken: () => Promise<string> } }).webflow = {
      getIdToken: async () => 'designer-id-token'
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'not_found' }), { status: 404 }))
    );

    await expect(createPreflightApi().requestRuntimeObservationRun('runtime-package-1')).rejects.toThrow(
      'The live preflight service is out of date. Ask a reviewer to deploy the runtime-run update, then try again.'
    );
  });
});
