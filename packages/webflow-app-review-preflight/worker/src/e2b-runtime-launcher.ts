import type { Env } from './types';

const E2B_API_ORIGIN = 'https://api.e2b.app';
const RUNNER_PORT = 3000;
const SANDBOX_TIMEOUT_SECONDS = 15 * 60;
const SANDBOX_ID = /^[a-zA-Z0-9_-]{3,128}$/;
const IMMUTABLE_TEMPLATE_REF =
  /^[a-z0-9](?:[a-z0-9._/-]{0,126}[a-z0-9])?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type E2BRuntimeLaunchStage =
  | 'configuration'
  | 'sandbox_create'
  | 'runner_start';

export class E2BRuntimeLaunchError extends Error {
  constructor(readonly stage: E2BRuntimeLaunchStage) {
    super(stage);
  }
}

interface E2BSandboxResponse {
  templateID?: unknown;
  sandboxID?: unknown;
  trafficAccessToken?: unknown;
}

export interface E2BRuntimeLaunchInput {
  observationJobId: string;
  apiBaseUrl: string;
  capability: string;
}

async function discardSandbox(sandboxId: string, apiKey: string): Promise<void> {
  try {
    await fetch(`${E2B_API_ORIGIN}/sandboxes/${encodeURIComponent(sandboxId)}`, {
      method: 'DELETE',
      headers: { 'x-api-key': apiKey }
    });
  } catch {
    // The 15-minute sandbox TTL remains the final cleanup boundary.
  }
}

export async function launchRuntimeObservationInE2B(
  input: E2BRuntimeLaunchInput,
  env: Env
): Promise<{ sandboxId: string }> {
  const apiKey = env.E2B_API_KEY?.trim();
  const templateRef = env.E2B_RUNTIME_TEMPLATE_ID?.trim();
  if (!apiKey || !templateRef || !IMMUTABLE_TEMPLATE_REF.test(templateRef)) {
    throw new E2BRuntimeLaunchError('configuration');
  }

  let createResponse: Response;
  try {
    createResponse = await fetch(`${E2B_API_ORIGIN}/sandboxes`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        templateID: templateRef,
        timeout: SANDBOX_TIMEOUT_SECONDS,
        secure: true,
        allow_internet_access: true,
        network: { allowPublicTraffic: false },
        metadata: {
          lane: 'app_review_runtime_observation',
          observation_job_id: input.observationJobId,
          coordinator: 'webflow-app-review-preflight'
        }
      })
    });
  } catch {
    throw new E2BRuntimeLaunchError('sandbox_create');
  }

  if (!createResponse.ok) {
    throw new E2BRuntimeLaunchError('sandbox_create');
  }

  let sandbox: E2BSandboxResponse;
  try {
    sandbox = await createResponse.json<E2BSandboxResponse>();
  } catch {
    throw new E2BRuntimeLaunchError('sandbox_create');
  }
  const sandboxId = typeof sandbox.sandboxID === 'string' ? sandbox.sandboxID : '';
  const trafficAccessToken =
    typeof sandbox.trafficAccessToken === 'string' ? sandbox.trafficAccessToken : '';
  if (
    typeof sandbox.templateID !== 'string' ||
    sandbox.templateID.length < 3 ||
    !SANDBOX_ID.test(sandboxId) ||
    trafficAccessToken.length < 16
  ) {
    if (SANDBOX_ID.test(sandboxId)) await discardSandbox(sandboxId, apiKey);
    throw new E2BRuntimeLaunchError('sandbox_create');
  }

  let launchResponse: Response;
  try {
    launchResponse = await fetch(`https://${RUNNER_PORT}-${sandboxId}.e2b.app/run`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'e2b-traffic-access-token': trafficAccessToken
      },
      body: JSON.stringify(input)
    });
  } catch {
    await discardSandbox(sandboxId, apiKey);
    throw new E2BRuntimeLaunchError('runner_start');
  }
  if (launchResponse.status !== 202) {
    await discardSandbox(sandboxId, apiKey);
    throw new E2BRuntimeLaunchError('runner_start');
  }

  return { sandboxId };
}
