import { describe, expect, it, vi } from 'vitest';
import {
  E2BRuntimeLaunchError,
  launchRuntimeObservationInE2B
} from '../src/e2b-runtime-launcher';
import type { Env } from '../src/types';

const input = {
  observationJobId: '7615de67-693e-467c-8b3c-947dbcbc308c',
  apiBaseUrl: 'https://webflow-app-review-preflight.createsomething.workers.dev',
  capability: 'job-scoped-secret-capability'
};

describe('E2B runtime launcher', () => {
  it('rejects a mutable template name or tag before contacting E2B', async () => {
    const request = vi.fn();
    vi.stubGlobal('fetch', request);
    const env = {
      E2B_API_KEY: 'e2b-test-key',
      E2B_RUNTIME_TEMPLATE_ID: 'app-review-companion-runtime:latest'
    } as Env;

    try {
      await expect(launchRuntimeObservationInE2B(input, env)).rejects.toEqual(
        new E2BRuntimeLaunchError('configuration')
      );
      expect(request).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('deletes a partially launched sandbox and exposes only the safe start stage', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          {
            templateID: '040h2lvinyukiy8eym45',
            sandboxID: 'sandbox-partial-123',
            trafficAccessToken: 'traffic-access-token'
          },
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(new Response(`provider rejected ${input.capability}`, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', request);
    const env = {
      E2B_API_KEY: 'e2b-test-key',
      E2B_RUNTIME_TEMPLATE_ID:
        'app-review-companion-runtime:f47ac10b-58cc-4372-a567-0e02b2c3d479'
    } as Env;

    try {
      const failure = await launchRuntimeObservationInE2B(input, env).catch(
        (error: unknown) => error
      );
      expect(failure).toEqual(new E2BRuntimeLaunchError('runner_start'));
      expect(String(failure)).not.toContain(input.capability);
      expect(request).toHaveBeenCalledTimes(3);
      expect(request.mock.calls[2]?.[0]).toBe(
        'https://api.e2b.app/sandboxes/sandbox-partial-123'
      );
      expect(request.mock.calls[2]?.[1]).toMatchObject({ method: 'DELETE' });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
