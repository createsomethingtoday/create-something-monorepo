import { afterEach, describe, expect, it, vi } from 'vitest';

import worker from '../src/index.js';
import type { Env } from '../src/types.js';

function createEnv(overrides: Partial<Env> = {}): Env {
  return {
    ALLOWED_ORIGINS: 'https://metadata.test',
    ...overrides,
  };
}

async function callWorker(path: string, init: RequestInit, env = createEnv()): Promise<Response> {
  return worker.fetch(new Request(`https://metadata.test${path}`, init), env);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('webflow-metadata-manager worker', () => {
  it('serves the runtime override script', async () => {
    const response = await callWorker('/metadata-overrides.js', { method: 'GET' });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/javascript');

    const body = await response.text();
    expect(body).toContain('window.location.pathname');
    expect(body).toContain('/templates/category/real-estate-websites');
    expect(body).toContain('document.title = match.seoTitle');
  });

  it('serves the current override list as JSON', async () => {
    const response = await callWorker('/metadata-overrides.json', { method: 'GET' });
    expect(response.status).toBe(200);

    const payload = await response.json() as {
      count: number;
      overrides: Array<{ path: string; seoTitle?: string }>;
    };

    expect(payload.count).toBe(2);
    expect(payload.overrides[0].path).toBe('/templates/category/real-estate-websites');
  });

  it('uses DEFAULT_OVERRIDES_JSON when supplied', async () => {
    const env = createEnv({
      DEFAULT_OVERRIDES_JSON: JSON.stringify([
        {
          path: '/templates/category/food-websites',
          seoTitle: 'Food Website Templates | Webflow',
          seoDescription: 'Food metadata override.',
          updatedAt: '2026-04-10T00:00:00.000Z',
        },
      ]),
    });

    const response = await callWorker('/metadata-overrides.json', { method: 'GET' }, env);
    const payload = await response.json() as {
      count: number;
      overrides: Array<{ path: string }>;
    };

    expect(payload.count).toBe(1);
    expect(payload.overrides[0].path).toBe('/templates/category/food-websites');
  });
});
