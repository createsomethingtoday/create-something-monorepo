import { DurableObject } from 'cloudflare:workers';

import {
  cancelJobRecord,
  completeJobRecord,
  createQueuedJobRecord,
  failJobRecord,
  startJobRecord
} from './template-review-jobs.js';
import type {
  RunTemplateReviewInput,
  TemplateReviewJobProgress,
  TemplateReviewJobRecord,
  TemplateReviewJobStatus,
  UnifiedTemplateReviewReport
} from './types.js';

type JobRow = {
  record: string;
};

type CountRow = {
  count: number;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS template_review_jobs (
  job_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  queued_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  record TEXT NOT NULL
);
`;

const STATUS_INDEX = `
CREATE INDEX IF NOT EXISTS template_review_jobs_status_queued_at_idx
ON template_review_jobs (status, queued_at);
`;

function normalizeLimit(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit)) return 20;
  return Math.max(1, Math.min(100, Math.trunc(limit)));
}

function parseJob(row: JobRow | undefined): TemplateReviewJobRecord | null {
  if (!row) return null;
  return JSON.parse(row.record) as TemplateReviewJobRecord;
}

function isTerminalStatus(status: TemplateReviewJobStatus): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'canceled';
}

export class TemplateReviewJobDurableObject extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(SCHEMA);
      this.ctx.storage.sql.exec(STATUS_INDEX);
    });
  }

  async enqueue(
    input: RunTemplateReviewInput,
    options: { maxQueueSize: number }
  ): Promise<TemplateReviewJobRecord> {
    if (this.countActiveJobs() >= options.maxQueueSize) {
      throw new Error('Template review queue is at capacity. Retry when active jobs complete.');
    }

    const record = createQueuedJobRecord(input);
    this.save(record);
    return record;
  }

  async get(jobId: string): Promise<TemplateReviewJobRecord | null> {
    return this.getJob(jobId);
  }

  async list(
    options: { status?: TemplateReviewJobStatus; limit?: number } = {}
  ): Promise<TemplateReviewJobRecord[]> {
    const limit = normalizeLimit(options.limit);
    const rows = options.status
      ? this.ctx.storage.sql
          .exec<JobRow>(
            'SELECT record FROM template_review_jobs WHERE status = ? ORDER BY queued_at DESC LIMIT ?',
            options.status,
            limit
          )
          .toArray()
      : this.ctx.storage.sql
          .exec<JobRow>(
            'SELECT record FROM template_review_jobs ORDER BY queued_at DESC LIMIT ?',
            limit
          )
          .toArray();

    return rows
      .map((row) => parseJob(row))
      .filter((job): job is TemplateReviewJobRecord => job != null);
  }

  async claimNext(options: { concurrency: number }): Promise<TemplateReviewJobRecord | null> {
    if (this.countRunningJobs() >= options.concurrency) return null;

    const row = this.ctx.storage.sql
      .exec<JobRow>(
        'SELECT record FROM template_review_jobs WHERE status = ? ORDER BY queued_at ASC LIMIT 1',
        'queued'
      )
      .toArray()[0];
    const job = parseJob(row);
    if (!job) return null;

    const started = startJobRecord(job);
    this.save(started);
    return started;
  }

  async updateProgress(
    jobId: string,
    progress: TemplateReviewJobProgress
  ): Promise<TemplateReviewJobRecord | null> {
    const job = this.getJob(jobId);
    if (!job || isTerminalStatus(job.status)) return job;

    const updated = { ...job, progress };
    this.save(updated);
    return updated;
  }

  async complete(
    jobId: string,
    result: UnifiedTemplateReviewReport
  ): Promise<TemplateReviewJobRecord | null> {
    const job = this.getJob(jobId);
    if (!job || job.status === 'canceled') return job;

    const completed = completeJobRecord(job, result);
    this.save(completed);
    return completed;
  }

  async fail(jobId: string, error: string): Promise<TemplateReviewJobRecord | null> {
    const job = this.getJob(jobId);
    if (!job || job.status === 'canceled') return job;

    const failed = failJobRecord(job, error);
    this.save(failed);
    return failed;
  }

  async cancel(jobId: string): Promise<TemplateReviewJobRecord | null> {
    const job = this.getJob(jobId);
    if (!job || isTerminalStatus(job.status)) return job;

    const canceled = cancelJobRecord(job);
    this.save(canceled);
    return canceled;
  }

  private getJob(jobId: string): TemplateReviewJobRecord | null {
    const row = this.ctx.storage.sql
      .exec<JobRow>('SELECT record FROM template_review_jobs WHERE job_id = ? LIMIT 1', jobId)
      .toArray()[0];
    return parseJob(row);
  }

  private save(record: TemplateReviewJobRecord): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO template_review_jobs (
        job_id,
        status,
        queued_at,
        started_at,
        completed_at,
        updated_at,
        record
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET
        status = excluded.status,
        queued_at = excluded.queued_at,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        updated_at = excluded.updated_at,
        record = excluded.record`,
      record.jobId,
      record.status,
      record.queuedAt,
      record.startedAt ?? null,
      record.completedAt ?? null,
      record.progress.updatedAt,
      JSON.stringify(record)
    );
  }

  private countActiveJobs(): number {
    return this.ctx.storage.sql
      .exec<CountRow>(
        "SELECT COUNT(*) AS count FROM template_review_jobs WHERE status IN ('queued', 'running')"
      )
      .one().count;
  }

  private countRunningJobs(): number {
    return this.ctx.storage.sql
      .exec<CountRow>("SELECT COUNT(*) AS count FROM template_review_jobs WHERE status = 'running'")
      .one().count;
  }
}
