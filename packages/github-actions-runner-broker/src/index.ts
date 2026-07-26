import { Container, getContainer } from '@cloudflare/containers';

import {
  classifyWorkflowJob,
  createInstallationToken,
  createJitConfiguration,
  parseAllowedRepositories,
  verifyWebhookSignature
} from './broker';
import type { RunnerLaunch } from './broker';

interface Env {
  RUNNER_CONTAINER: DurableObjectNamespace<RunnerContainer>;
  RECEIPTS: D1Database;
  ALLOWED_REPOSITORIES: string;
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY_PKCS8: string;
  GITHUB_WEBHOOK_SECRET: string;
  CONTROL_TOKEN: string;
}

interface StoredRunner {
  jobId: number;
  repository: string;
  runnerId: number;
  runnerName: string;
}

interface LaunchRequest extends StoredRunner {
  encodedJitConfig: string;
}

interface StopParams {
  exitCode: number;
  reason: 'exit' | 'runtime_signal';
}

export class RunnerContainer extends Container<Env> {
  sleepAfter = '30m';
  enableInternet = true;

  async launch(request: LaunchRequest): Promise<void> {
    await this.ctx.storage.put<StoredRunner>('runner', {
      jobId: request.jobId,
      repository: request.repository,
      runnerId: request.runnerId,
      runnerName: request.runnerName
    });
    await this.start({
      entrypoint: ['/bin/bash', '/runner/entrypoint.sh'],
      enableInternet: true,
      envVars: {
        JIT_CONFIG: request.encodedJitConfig
      }
    });
  }

  override async onStop(params: StopParams): Promise<void> {
    const runner = await this.ctx.storage.get<StoredRunner>('runner');
    if (!runner) return;
    await this.env.RECEIPTS.prepare(
      `UPDATE runner_receipts
       SET status = ?, completed_at = ?, exit_code = ?, error = NULL
       WHERE job_id = ?`
    )
      .bind(
        params.exitCode === 0 ? 'succeeded' : 'failed',
        new Date().toISOString(),
        params.exitCode,
        runner.jobId
      )
      .run();
    console.log(
      JSON.stringify({
        event: 'runner-stopped',
        jobId: runner.jobId,
        repository: runner.repository,
        runnerId: runner.runnerId,
        exitCode: params.exitCode,
        reason: params.reason
      })
    );
  }

  override async onError(error: unknown): Promise<void> {
    const runner = await this.ctx.storage.get<StoredRunner>('runner');
    const message = error instanceof Error ? error.message : String(error);
    if (runner) {
      await this.env.RECEIPTS.prepare(
        `UPDATE runner_receipts
         SET status = 'failed', completed_at = ?, error = ?
         WHERE job_id = ?`
      )
        .bind(new Date().toISOString(), message.slice(0, 1_000), runner.jobId)
        .run();
    }
    console.error(JSON.stringify({ event: 'runner-error', jobId: runner?.jobId, error: message }));
  }
}

async function findExistingReceipt(
  db: D1Database,
  jobId: number
): Promise<{ status: string } | null> {
  return db
    .prepare('SELECT status FROM runner_receipts WHERE job_id = ?')
    .bind(jobId)
    .first<{ status: string }>();
}

async function markReceived(
  db: D1Database,
  launch: RunnerLaunch,
  deliveryId: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO runner_receipts
       (job_id, delivery_id, repository, workflow_name, job_name, status, received_at, attempts)
       VALUES (?, ?, ?, ?, ?, 'received', ?, 1)
       ON CONFLICT(job_id) DO UPDATE SET
         delivery_id = excluded.delivery_id,
         status = 'received',
         received_at = excluded.received_at,
         attempts = runner_receipts.attempts + 1,
         error = NULL`
    )
    .bind(
      launch.jobId,
      deliveryId,
      launch.repository,
      launch.workflowName,
      launch.jobName,
      new Date().toISOString()
    )
    .run();
}

async function markFailure(db: D1Database, jobId: number, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await db
    .prepare(
      `UPDATE runner_receipts
       SET status = 'failed', completed_at = ?, error = ?
       WHERE job_id = ?`
    )
    .bind(new Date().toISOString(), message.slice(0, 1_000), jobId)
    .run();
}

async function launchRunner(env: Env, classification: RunnerLaunch): Promise<void> {
  try {
    const installationToken = await createInstallationToken(
      env.GITHUB_APP_ID,
      env.GITHUB_APP_PRIVATE_KEY_PKCS8,
      classification.installationId,
      classification.repositoryId
    );
    const jit = await createJitConfiguration(
      classification.repository,
      classification.jobId,
      installationToken
    );

    await env.RECEIPTS.prepare(
      `UPDATE runner_receipts
       SET status = 'starting', runner_id = ?, runner_name = ?, started_at = ?
       WHERE job_id = ?`
    )
      .bind(jit.runnerId, jit.runnerName, new Date().toISOString(), classification.jobId)
      .run();

    const container = getContainer(env.RUNNER_CONTAINER, `job-${classification.jobId}`);
    await container.launch({
      encodedJitConfig: jit.encodedJitConfig,
      jobId: classification.jobId,
      repository: classification.repository,
      runnerId: jit.runnerId,
      runnerName: jit.runnerName
    });

    await env.RECEIPTS.prepare("UPDATE runner_receipts SET status = 'running' WHERE job_id = ?")
      .bind(classification.jobId)
      .run();
  } catch (error) {
    await markFailure(env.RECEIPTS, classification.jobId, error);
    console.error(
      JSON.stringify({
        event: 'runner-launch-failed',
        jobId: classification.jobId,
        repository: classification.repository,
        error: error instanceof Error ? error.message : String(error)
      })
    );
  }
}

async function handleWebhook(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = await request.text();
  const validSignature = await verifyWebhookSignature(
    body,
    request.headers.get('X-Hub-Signature-256'),
    env.GITHUB_WEBHOOK_SECRET
  );
  if (!validSignature) return Response.json({ error: 'invalid signature' }, { status: 401 });

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const classification = classifyWorkflowJob(
    payload,
    parseAllowedRepositories(env.ALLOWED_REPOSITORIES)
  );
  if (classification.kind === 'ignore') {
    return Response.json({ accepted: false, reason: classification.reason }, { status: 202 });
  }

  const existing = await findExistingReceipt(env.RECEIPTS, classification.jobId);
  if (existing && existing.status !== 'failed') {
    return Response.json(
      { accepted: true, duplicate: true, status: existing.status },
      { status: 202 }
    );
  }

  const deliveryId = request.headers.get('X-GitHub-Delivery') ?? crypto.randomUUID();
  await markReceived(env.RECEIPTS, classification, deliveryId);

  ctx.waitUntil(launchRunner(env, classification));
  return Response.json({ accepted: true, jobId: classification.jobId }, { status: 202 });
}

function authorized(request: Request, token: string): boolean {
  return token.length > 0 && request.headers.get('Authorization') === `Bearer ${token}`;
}

async function listReceipts(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env.CONTROL_TOKEN)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const requestedLimit = Number.parseInt(
    new URL(request.url).searchParams.get('limit') ?? '50',
    10
  );
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  const result = await env.RECEIPTS.prepare(
    `SELECT job_id, delivery_id, repository, workflow_name, job_name, status,
            runner_id, runner_name, received_at, started_at, completed_at,
            exit_code, attempts, error
     FROM runner_receipts
     ORDER BY received_at DESC
     LIMIT ?`
  )
    .bind(limit)
    .all();
  return Response.json({ receipts: result.results });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({ status: 'healthy', runtime: 'cloudflare-containers-jit' });
    }
    if (request.method === 'GET' && url.pathname === '/receipts') {
      return listReceipts(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/github/webhook') {
      return handleWebhook(request, env, ctx);
    }
    return Response.json({ error: 'not found' }, { status: 404 });
  }
};
