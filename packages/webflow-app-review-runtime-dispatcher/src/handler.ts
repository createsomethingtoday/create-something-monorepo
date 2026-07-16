export interface DispatcherEnv {
  DISPATCH_TOKEN: string;
  PREFLIGHT_API_BASE_URL: string;
  E2B_API_KEY: string;
}

export interface RuntimeObservationLaunchInput {
  observationJobId: string;
  apiBaseUrl: string;
  capability: string;
  e2bApiKey: string;
}

export interface RuntimeObservationLauncher {
  launch(input: RuntimeObservationLaunchInput): Promise<{ sandboxId: string }>;
}

type DispatchBody = {
  observationJobId: string;
  apiBaseUrl: string;
  capability: string;
};

function json(value: unknown, status: number): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

async function tokenMatches(actual: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(actual)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected))
  ]);
  const left = new Uint8Array(actualHash);
  const right = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index]! ^ right[index]!;
  }
  return difference === 0;
}

function safeBody(value: unknown, expectedOrigin: string): DispatchBody | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (
    typeof body.observationJobId !== 'string' ||
    !/^[a-f0-9-]{36}$/i.test(body.observationJobId) ||
    typeof body.apiBaseUrl !== 'string' ||
    typeof body.capability !== 'string' ||
    body.capability.length < 16 ||
    body.capability.length > 2048
  ) {
    return null;
  }
  try {
    const actual = new URL(body.apiBaseUrl);
    const expected = new URL(expectedOrigin);
    if (
      actual.origin !== expected.origin ||
      actual.pathname !== '/' ||
      actual.search ||
      actual.hash ||
      actual.protocol !== 'https:'
    ) {
      return null;
    }
  } catch {
    return null;
  }
  return body as DispatchBody;
}

export function createDispatcherHandler(launcher: RuntimeObservationLauncher) {
  return async (request: Request, env: DispatcherEnv): Promise<Response> => {
    if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
      return json({ ok: true }, 200);
    }
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/dispatch') {
      return json({ error: 'not_found' }, 404);
    }

    const authorization = request.headers.get('authorization') ?? '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token || !env.DISPATCH_TOKEN || !(await tokenMatches(token, env.DISPATCH_TOKEN))) {
      return json({ error: 'unauthorized' }, 401);
    }

    let body: DispatchBody | null = null;
    try {
      body = safeBody(await request.json(), env.PREFLIGHT_API_BASE_URL);
    } catch {
      // The public error deliberately contains no submitted values.
    }
    if (!body || !env.E2B_API_KEY) {
      return json({ error: 'invalid_dispatch' }, 400);
    }

    try {
      await launcher.launch({
        observationJobId: body.observationJobId,
        apiBaseUrl: body.apiBaseUrl,
        capability: body.capability,
        e2bApiKey: env.E2B_API_KEY
      });
      return json({ accepted: true }, 202);
    } catch {
      return json({ error: 'dispatch_failed' }, 502);
    }
  };
}
