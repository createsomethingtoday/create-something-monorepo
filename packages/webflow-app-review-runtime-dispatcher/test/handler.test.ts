import { describe, expect, it, vi } from 'vitest';
import { createDispatcherHandler, type RuntimeObservationLauncher } from '../src/handler';

const body = {
  observationJobId: '7615de67-693e-467c-8b3c-947dbcbc308c',
  apiBaseUrl: 'https://webflow-app-review-preflight.createsomething.workers.dev',
  capability: 'job-scoped-secret-capability'
};

function request(overrides: Partial<typeof body> = {}, token = 'dispatch-token') {
  return new Request('https://dispatcher.test/dispatch', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ ...body, ...overrides })
  });
}

function launcher(): RuntimeObservationLauncher & { launch: ReturnType<typeof vi.fn> } {
  return {
    launch: vi.fn().mockResolvedValue({ sandboxId: 'sandbox-123' })
  };
}

const env = {
  DISPATCH_TOKEN: 'dispatch-token',
  PREFLIGHT_API_BASE_URL: body.apiBaseUrl,
  E2B_API_KEY: 'e2b-secret'
};

describe('runtime observation dispatcher', () => {
  it('rejects requests without the server dispatch token', async () => {
    const runtimeLauncher = launcher();
    const response = await createDispatcherHandler(runtimeLauncher)(request({}, 'wrong'), env);

    expect(response.status).toBe(401);
    expect(runtimeLauncher.launch).not.toHaveBeenCalled();
  });

  it('rejects an API origin outside the configured preflight service', async () => {
    const runtimeLauncher = launcher();
    const response = await createDispatcherHandler(runtimeLauncher)(
      request({ apiBaseUrl: 'https://attacker.example' }),
      env
    );

    expect(response.status).toBe(400);
    expect(runtimeLauncher.launch).not.toHaveBeenCalled();
  });

  it('launches a bounded job without returning its capability', async () => {
    const runtimeLauncher = launcher();
    const response = await createDispatcherHandler(runtimeLauncher)(request(), env);
    const text = await response.text();

    expect(response.status).toBe(202);
    expect(text).not.toContain(body.capability);
    expect(JSON.parse(text)).toEqual({ accepted: true });
    expect(runtimeLauncher.launch).toHaveBeenCalledWith({
      observationJobId: body.observationJobId,
      apiBaseUrl: body.apiBaseUrl,
      capability: body.capability,
      e2bApiKey: env.E2B_API_KEY
    });
  });

  it('fails closed when E2B does not accept the job', async () => {
    const runtimeLauncher = launcher();
    runtimeLauncher.launch.mockRejectedValue(new Error(`failed ${body.capability}`));

    const response = await createDispatcherHandler(runtimeLauncher)(request(), env);
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(text).not.toContain(body.capability);
    expect(JSON.parse(text)).toEqual({ error: 'dispatch_failed' });
  });
});
