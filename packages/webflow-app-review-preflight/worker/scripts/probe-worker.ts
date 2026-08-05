import { launchRuntimeObservationInE2B } from '../src/e2b-runtime-launcher';
import type { Env } from '../src/types';

interface ProbeEnv extends Env {
  PROBE_OBSERVATION_JOB_ID: string;
  PROBE_CAPABILITY: string;
}

export default {
  async fetch(_request: Request, env: ProbeEnv): Promise<Response> {
    const result = await launchRuntimeObservationInE2B(
      {
        observationJobId: env.PROBE_OBSERVATION_JOB_ID,
        apiBaseUrl: 'https://webflow-app-review-preflight.createsomething.workers.dev',
        capability: env.PROBE_CAPABILITY
      },
      env
    );
    return Response.json({ sandboxId: result.sandboxId });
  }
};
