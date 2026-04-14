import type {
  RunTemplateReviewInput,
  TemplateReviewJobProgress,
  TemplateReviewJobRecord,
  TemplateReviewJobStatus,
  UnifiedTemplateReviewReport,
} from '../../../src/types.js';

const DEFAULT_PROGRESS_TOTAL = 100;

export interface StoredTemplateReviewJob extends TemplateReviewJobRecord {
  attempts: number;
  retentionExpiresAt?: string;
}

function toIso(nowMs: number): string {
  return new Date(nowMs).toISOString();
}

export function createTemplateReviewProgress(
  phase: TemplateReviewJobProgress['phase'],
  progress: number,
  total: number,
  message: string,
  nowMs: number,
): TemplateReviewJobProgress {
  return {
    phase,
    progress,
    total,
    message,
    updatedAt: toIso(nowMs),
  };
}

export function createQueuedTemplateReviewJob(
  jobId: string,
  input: RunTemplateReviewInput,
  nowMs: number,
): StoredTemplateReviewJob {
  return {
    jobId,
    status: 'queued',
    input,
    queuedAt: toIso(nowMs),
    attempts: 0,
    progress: createTemplateReviewProgress(
      'queued',
      0,
      DEFAULT_PROGRESS_TOTAL,
      'Queued for execution',
      nowMs,
    ),
  };
}

export function countEnqueuedTemplateReviewJobs(jobs: StoredTemplateReviewJob[]): number {
  return jobs.filter((job) => job.status === 'queued' || job.status === 'running').length;
}

export function pruneExpiredTemplateReviewJobs(
  jobs: StoredTemplateReviewJob[],
  nowMs: number,
): {
  keptJobs: StoredTemplateReviewJob[];
  expiredJobIds: string[];
} {
  const keptJobs: StoredTemplateReviewJob[] = [];
  const expiredJobIds: string[] = [];

  for (const job of jobs) {
    if (!job.retentionExpiresAt) {
      keptJobs.push(job);
      continue;
    }

    const expiresAt = Date.parse(job.retentionExpiresAt);
    if (Number.isFinite(expiresAt) && expiresAt <= nowMs) {
      expiredJobIds.push(job.jobId);
      continue;
    }
    keptJobs.push(job);
  }

  return { keptJobs, expiredJobIds };
}

export function requeueStaleRunningTemplateReviewJobs(
  jobs: StoredTemplateReviewJob[],
  nowMs: number,
  staleAfterMs: number,
): string[] {
  const requeuedJobIds: string[] = [];

  for (const job of jobs) {
    if (job.status !== 'running') continue;

    const updatedAt = Date.parse(job.progress.updatedAt);
    if (!Number.isFinite(updatedAt) || nowMs - updatedAt < staleAfterMs) {
      continue;
    }

    job.status = 'queued';
    job.startedAt = undefined;
    job.completedAt = undefined;
    job.result = undefined;
    job.error = undefined;
    job.retentionExpiresAt = undefined;
    job.progress = createTemplateReviewProgress(
      'queued',
      0,
      DEFAULT_PROGRESS_TOTAL,
      'Retrying after interrupted worker execution',
      nowMs,
    );
    requeuedJobIds.push(job.jobId);
  }

  return requeuedJobIds;
}

export function claimQueuedTemplateReviewJobs(
  jobs: StoredTemplateReviewJob[],
  nowMs: number,
  concurrency: number,
): StoredTemplateReviewJob[] {
  const activeCount = jobs.filter((job) => job.status === 'running').length;
  const availableSlots = Math.max(0, concurrency - activeCount);
  if (availableSlots === 0) return [];

  const claimable = jobs
    .filter((job) => job.status === 'queued')
    .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))
    .slice(0, availableSlots);

  for (const job of claimable) {
    job.status = 'running';
    job.startedAt = toIso(nowMs);
    job.completedAt = undefined;
    job.result = undefined;
    job.error = undefined;
    job.retentionExpiresAt = undefined;
    job.attempts += 1;
    job.progress = createTemplateReviewProgress(
      'precheck',
      1,
      DEFAULT_PROGRESS_TOTAL,
      'Starting template review',
      nowMs,
    );
  }

  return claimable;
}

export function markTemplateReviewJobSucceeded(
  job: StoredTemplateReviewJob,
  result: UnifiedTemplateReviewReport,
  nowMs: number,
  retentionMs: number,
): void {
  const completedAt = toIso(nowMs);

  job.status = 'succeeded';
  job.completedAt = completedAt;
  job.retentionExpiresAt = toIso(nowMs + retentionMs);
  job.result = {
    ...result,
    jobId: job.jobId,
    status: 'succeeded',
    queuedAt: job.queuedAt,
    startedAt: job.startedAt,
    completedAt,
  };
  job.error = undefined;
  job.progress = createTemplateReviewProgress(
    'completed',
    DEFAULT_PROGRESS_TOTAL,
    DEFAULT_PROGRESS_TOTAL,
    'Template review completed',
    nowMs,
  );
}

export function markTemplateReviewJobFailed(
  job: StoredTemplateReviewJob,
  error: unknown,
  nowMs: number,
  retentionMs: number,
): void {
  const message = error instanceof Error ? error.message : String(error);

  job.status = 'failed';
  job.completedAt = toIso(nowMs);
  job.retentionExpiresAt = toIso(nowMs + retentionMs);
  job.result = undefined;
  job.error = message;
  job.progress = createTemplateReviewProgress(
    'failed',
    DEFAULT_PROGRESS_TOTAL,
    DEFAULT_PROGRESS_TOTAL,
    message,
    nowMs,
  );
}

export function shouldResumeTemplateReviewQueue(jobs: StoredTemplateReviewJob[]): boolean {
  return jobs.some((job) => job.status === 'queued' || job.status === 'running');
}

export function sanitizeTemplateReviewJob(
  job: StoredTemplateReviewJob,
): TemplateReviewJobRecord & { retentionExpiresAt?: string } {
  return {
    jobId: job.jobId,
    status: job.status,
    input: job.input,
    queuedAt: job.queuedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    progress: job.progress,
    error: job.error,
    result: job.result,
    retentionExpiresAt: job.retentionExpiresAt,
  };
}

export function listTemplateReviewJobsForResponse(
  jobs: StoredTemplateReviewJob[],
  options: { status?: TemplateReviewJobStatus; limit?: number } = {},
): Array<TemplateReviewJobRecord & { retentionExpiresAt?: string }> {
  const limit = Math.max(1, options.limit ?? 20);
  return jobs
    .filter((job) => (options.status ? job.status === options.status : true))
    .sort((left, right) => right.queuedAt.localeCompare(left.queuedAt))
    .slice(0, limit)
    .map((job) => sanitizeTemplateReviewJob(job));
}
