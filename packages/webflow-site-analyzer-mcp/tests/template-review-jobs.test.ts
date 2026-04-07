import assert from 'node:assert/strict';
import test from 'node:test';

import { TemplateReviewJobManager } from '../src/template-review-jobs.ts';
import type { TemplateReviewJobRecord, UnifiedTemplateReviewReport } from '../src/types.ts';

function createReport(): UnifiedTemplateReviewReport {
  return {
    generatedAt: '2026-04-07T00:00:00.000Z',
    provider: 'steel',
    previewUrl: 'https://preview.webflow.com/preview/demo',
    publishedUrl: 'https://demo.webflow.io/',
    precheck: {} as UnifiedTemplateReviewReport['precheck'],
    providerMetrics: {} as UnifiedTemplateReviewReport['providerMetrics'],
    summary: {
      pass: 0,
      fail: 0,
      partial: 0,
      manual: 0,
      automated: 0,
      humanInLoop: 0,
    },
    designer: {} as UnifiedTemplateReviewReport['designer'],
    published: {} as UnifiedTemplateReviewReport['published'],
    rows: [],
  };
}

async function waitForJob(
  manager: TemplateReviewJobManager,
  jobId: string,
  predicate: (job: TemplateReviewJobRecord) => boolean,
  timeoutMs = 1_000,
): Promise<TemplateReviewJobRecord> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const job = manager.get(jobId);
    if (job && predicate(job)) return job;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Timed out waiting for job ${jobId}`);
}

test('TemplateReviewJobManager preserves explicit progress phases and exposes diagnostics', async () => {
  let releaseFirstJob: (() => void) | undefined;
  const firstJobGate = new Promise<void>((resolve) => {
    releaseFirstJob = resolve;
  });

  const manager = new TemplateReviewJobManager(
    async (_input, { reportProgress }) => {
      await reportProgress?.('designer', 10, 100, 'Running Designer checklist extraction');
      await firstJobGate;
      await reportProgress?.('normalizing', 92, 100, 'Normalizing unified checklist rows');
      return createReport();
    },
    {
      concurrency: 1,
      maxQueueSize: 10,
    },
  );

  const queued = manager.enqueue({
    previewUrl: 'https://preview.webflow.com/preview/demo',
    publishedUrl: 'https://demo.webflow.io/',
  });

  assert.equal(queued.diagnostics?.stateScope, 'runtime-memory');
  assert.match(queued.diagnostics?.runtimeInstanceId ?? '', /^template-review-runtime-/);

  const running = await waitForJob(
    manager,
    queued.jobId,
    (job) => job.status === 'running' && job.progress.phase === 'designer',
  );

  assert.equal(running.progress.message, 'Running Designer checklist extraction');
  assert.equal(running.diagnostics?.queuePosition, null);
  assert.equal(running.diagnostics?.activeJobs, 1);

  releaseFirstJob?.();

  const completed = await waitForJob(
    manager,
    queued.jobId,
    (job) => job.status === 'succeeded' && job.progress.phase === 'completed',
  );

  assert.equal(completed.diagnostics?.activeJobs, 0);
  assert.equal(completed.diagnostics?.queuedJobs, 0);
});

test('TemplateReviewJobManager reports queued job position while another job is running', async () => {
  let releaseFirstJob: (() => void) | undefined;
  const firstJobGate = new Promise<void>((resolve) => {
    releaseFirstJob = resolve;
  });

  let executionCount = 0;
  const manager = new TemplateReviewJobManager(
    async (_input, { reportProgress }) => {
      executionCount += 1;
      await reportProgress?.('published', 57, 100, `Published crawl run ${executionCount}`);
      if (executionCount === 1) {
        await firstJobGate;
      }
      return createReport();
    },
    {
      concurrency: 1,
      maxQueueSize: 10,
    },
  );

  const first = manager.enqueue({
    previewUrl: 'https://preview.webflow.com/preview/demo-one',
    publishedUrl: 'https://demo-one.webflow.io/',
  });
  const second = manager.enqueue({
    previewUrl: 'https://preview.webflow.com/preview/demo-two',
    publishedUrl: 'https://demo-two.webflow.io/',
  });

  await waitForJob(manager, first.jobId, (job) => job.status === 'running');

  const queuedSecond = manager.get(second.jobId);
  assert.ok(queuedSecond);
  assert.equal(queuedSecond.status, 'queued');
  assert.equal(queuedSecond.diagnostics?.queuePosition, 1);
  assert.equal(queuedSecond.diagnostics?.queuedJobs, 1);
  assert.equal(queuedSecond.diagnostics?.activeJobs, 1);

  releaseFirstJob?.();

  await waitForJob(manager, second.jobId, (job) => job.status === 'succeeded');
});
