import { Sandbox } from '@e2b/code-interpreter';
import runtimeRunnerSource from './generated/runtime-runner.txt';
import type { RuntimeObservationLauncher } from './handler';

const SANDBOX_TIMEOUT_MS = 900_000;
const REQUEST_TIMEOUT_MS = 30_000;
const WORK_DIR = '/tmp/webflow-app-review-runtime';

export const e2bRuntimeObservationLauncher: RuntimeObservationLauncher = {
  async launch(input) {
    const sandbox = await Sandbox.create({
      apiKey: input.e2bApiKey,
      timeoutMs: SANDBOX_TIMEOUT_MS,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      allowInternetAccess: true,
      envs: {},
      metadata: {
        lane: 'app_review_runtime_observation',
        observation_job_id: input.observationJobId,
        coordinator: 'webflow-app-review-runtime-dispatcher'
      }
    });

    try {
      await sandbox.commands.run(`mkdir -p ${WORK_DIR}`, {
        timeoutMs: 10_000,
        requestTimeoutMs: REQUEST_TIMEOUT_MS
      });
      await sandbox.files.write(`${WORK_DIR}/runner.mjs`, runtimeRunnerSource);
      await sandbox.commands.run(
        [
          `mkdir -p ${WORK_DIR}`,
          `cd ${WORK_DIR}`,
          'npm init -y >/dev/null 2>&1',
          'npm install --no-audit --no-fund --silent playwright@1.61.1',
          'npx playwright install chromium >/tmp/app-review-browser-install.log 2>&1',
          'node runner.mjs --api-base "$APP_REVIEW_API_BASE_URL" --job "$APP_REVIEW_OBSERVATION_JOB_ID" >/tmp/app-review-runtime.log 2>&1'
        ].join(' && '),
        {
          background: true,
          cwd: WORK_DIR,
          timeoutMs: SANDBOX_TIMEOUT_MS - 30_000,
          requestTimeoutMs: REQUEST_TIMEOUT_MS,
          envs: {
            RUNTIME_OBSERVATION_CAPABILITY: input.capability,
            APP_REVIEW_API_BASE_URL: input.apiBaseUrl,
            APP_REVIEW_OBSERVATION_JOB_ID: input.observationJobId
          }
        }
      );
    } catch (error) {
      await sandbox.kill().catch(() => undefined);
      throw error;
    }

    return { sandboxId: sandbox.sandboxId };
  }
};
