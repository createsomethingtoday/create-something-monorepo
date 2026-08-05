import { afterEach, describe, expect, test, vi } from 'vitest';
import { createPreflightApi } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as typeof globalThis & { webflow?: unknown }).webflow;
});

describe('Preflight API', () => {
  test('uploads the exact bundle and private source-map artifact together', async () => {
    (globalThis as typeof globalThis & { webflow?: { getIdToken: () => Promise<string> } }).webflow = {
      getIdToken: async () => 'designer-id-token'
    };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const form = init?.body as FormData;
      expect(form.get('bundle')).toMatchObject({ name: 'consent-pro.zip' });
      expect(form.get('sourceMaps')).toMatchObject({ name: 'consent-pro-source-maps.zip' });
      return new Response(JSON.stringify({ review: { id: 'review-1' } }), { status: 201 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const bundle = new File(['bundle'], 'consent-pro.zip', { type: 'application/zip' });
    const sourceMaps = new File(['maps'], 'consent-pro-source-maps.zip', {
      type: 'application/zip'
    });
    await createPreflightApi().createReview(bundle, sourceMaps);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

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
