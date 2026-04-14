import assert from 'node:assert/strict';
import test from 'node:test';

import {
  claimQueuedTemplateReviewJobs,
  createQueuedTemplateReviewJob,
  listTemplateReviewJobsForResponse,
  markTemplateReviewJobFailed,
  markTemplateReviewJobSucceeded,
  pruneExpiredTemplateReviewJobs,
  requeueStaleRunningTemplateReviewJobs,
  shouldResumeTemplateReviewQueue,
  type StoredTemplateReviewJob,
} from './template-review-jobs.js';

function createInput(suffix: string) {
  return {
    previewUrl: `https://preview.example.com/${suffix}`,
    publishedUrl: `https://published.example.com/${suffix}`,
  };
}

test('claimQueuedTemplateReviewJobs respects concurrency and queued order', () => {
  const jobs = [
    createQueuedTemplateReviewJob('job-a', createInput('a'), Date.parse('2026-04-14T10:00:00.000Z')),
    createQueuedTemplateReviewJob('job-b', createInput('b'), Date.parse('2026-04-14T10:01:00.000Z')),
    createQueuedTemplateReviewJob('job-c', createInput('c'), Date.parse('2026-04-14T10:02:00.000Z')),
  ];

  const claimed = claimQueuedTemplateReviewJobs(jobs, Date.parse('2026-04-14T10:05:00.000Z'), 2);

  assert.deepEqual(
    claimed.map((job) => job.jobId),
    ['job-a', 'job-b'],
  );
  assert.equal(jobs[0]?.status, 'running');
  assert.equal(jobs[1]?.status, 'running');
  assert.equal(jobs[2]?.status, 'queued');
  assert.equal(jobs[0]?.attempts, 1);
  assert.equal(jobs[1]?.attempts, 1);
});

test('requeueStaleRunningTemplateReviewJobs only requeues stale jobs', () => {
  const staleJob = createQueuedTemplateReviewJob('job-stale', createInput('stale'), Date.parse('2026-04-14T10:00:00.000Z'));
  const freshJob = createQueuedTemplateReviewJob('job-fresh', createInput('fresh'), Date.parse('2026-04-14T10:01:00.000Z'));

  claimQueuedTemplateReviewJobs([staleJob], Date.parse('2026-04-14T10:02:00.000Z'), 1);
  claimQueuedTemplateReviewJobs([freshJob], Date.parse('2026-04-14T10:11:00.000Z'), 1);

  const requeued = requeueStaleRunningTemplateReviewJobs(
    [staleJob, freshJob],
    Date.parse('2026-04-14T10:20:00.000Z'),
    10 * 60 * 1000,
  );

  assert.deepEqual(requeued, ['job-stale']);
  assert.equal(staleJob.status, 'queued');
  assert.equal(staleJob.progress.message, 'Retrying after interrupted worker execution');
  assert.equal(freshJob.status, 'running');
});

test('completed jobs retain results until expiration and then prune cleanly', () => {
  const job = createQueuedTemplateReviewJob('job-result', createInput('result'), Date.parse('2026-04-14T10:00:00.000Z'));
  claimQueuedTemplateReviewJobs([job], Date.parse('2026-04-14T10:01:00.000Z'), 1);

  markTemplateReviewJobSucceeded(
    job,
    {
      generatedAt: '2026-04-14T10:02:00.000Z',
      provider: 'steel',
      previewUrl: job.input.previewUrl,
      publishedUrl: job.input.publishedUrl,
      summary: {
        totalRows: 0,
        pass: 0,
        fail: 0,
        partial: 0,
        manual: 0,
        info: 0,
        overallScore: 100,
        grade: 'A',
        coverage: {
          totalKnownPages: 0,
          crawledPages: 0,
          skippedPages: 0,
          coveragePercent: 100,
        },
      },
      designer: {},
      published: {},
      rows: [],
    } as unknown as Parameters<typeof markTemplateReviewJobSucceeded>[1],
    Date.parse('2026-04-14T10:02:00.000Z'),
    60_000,
  );

  let pruned = pruneExpiredTemplateReviewJobs([job], Date.parse('2026-04-14T10:02:30.000Z'));
  assert.deepEqual(pruned.expiredJobIds, []);
  assert.equal(pruned.keptJobs.length, 1);
  assert.equal(pruned.keptJobs[0]?.status, 'succeeded');
  assert.ok(pruned.keptJobs[0]?.retentionExpiresAt);

  pruned = pruneExpiredTemplateReviewJobs([job], Date.parse('2026-04-14T10:03:30.000Z'));
  assert.deepEqual(pruned.expiredJobIds, ['job-result']);
  assert.equal(pruned.keptJobs.length, 0);
});

test('failed jobs remain listable during retention and preserve public response shape', () => {
  const runningJob = createQueuedTemplateReviewJob('job-running', createInput('running'), Date.parse('2026-04-14T10:00:00.000Z'));
  const failedJob = createQueuedTemplateReviewJob('job-failed', createInput('failed'), Date.parse('2026-04-14T10:01:00.000Z'));

  claimQueuedTemplateReviewJobs([runningJob], Date.parse('2026-04-14T10:02:00.000Z'), 1);
  claimQueuedTemplateReviewJobs([failedJob], Date.parse('2026-04-14T10:03:00.000Z'), 1);
  markTemplateReviewJobFailed(
    failedJob,
    new Error('Provider session failed'),
    Date.parse('2026-04-14T10:04:00.000Z'),
    60_000,
  );

  const response = listTemplateReviewJobsForResponse(
    [runningJob, failedJob] as StoredTemplateReviewJob[],
    { limit: 2 },
  );

  assert.deepEqual(
    response.map((job) => job.jobId),
    ['job-failed', 'job-running'],
  );
  assert.equal(response[0]?.status, 'failed');
  assert.equal(response[0]?.error, 'Provider session failed');
  assert.ok(response[0]?.retentionExpiresAt);
  assert.equal(shouldResumeTemplateReviewQueue([runningJob, failedJob]), true);
});
