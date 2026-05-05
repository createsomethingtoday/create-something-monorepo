import type {
  RunTemplateReviewInput,
  TemplateReviewJobProgress,
  TemplateReviewJobRecord,
  TemplateReviewJobStatus,
  UnifiedTemplateReviewReport
} from './types.js';

type JobExecutor = (
  input: RunTemplateReviewInput,
  context: {
    jobId: string;
    reportProgress?: (progress: number, total: number, message: string) => Promise<void>;
  }
) => Promise<UnifiedTemplateReviewReport>;

export interface TemplateReviewJobManagerConfig {
  concurrency: number;
  maxQueueSize: number;
}

export interface TemplateReviewJobStoreEnqueueOptions {
  maxQueueSize: number;
}

export interface TemplateReviewJobStoreClaimOptions {
  concurrency: number;
}

export interface TemplateReviewJobStore {
  enqueue(
    input: RunTemplateReviewInput,
    options: TemplateReviewJobStoreEnqueueOptions
  ): Promise<TemplateReviewJobRecord>;
  get(jobId: string): Promise<TemplateReviewJobRecord | null>;
  list(options?: {
    status?: TemplateReviewJobStatus;
    limit?: number;
  }): Promise<TemplateReviewJobRecord[]>;
  claimNext(options: TemplateReviewJobStoreClaimOptions): Promise<TemplateReviewJobRecord | null>;
  updateProgress(
    jobId: string,
    progress: TemplateReviewJobProgress
  ): Promise<TemplateReviewJobRecord | null>;
  complete(
    jobId: string,
    result: UnifiedTemplateReviewReport
  ): Promise<TemplateReviewJobRecord | null>;
  fail(jobId: string, error: string): Promise<TemplateReviewJobRecord | null>;
  cancel(jobId: string): Promise<TemplateReviewJobRecord | null>;
}

export interface TemplateReviewJobDurableObjectStub {
  enqueue(
    input: RunTemplateReviewInput,
    options: TemplateReviewJobStoreEnqueueOptions
  ): Promise<TemplateReviewJobRecord>;
  get(jobId: string): Promise<TemplateReviewJobRecord | null>;
  list(options?: {
    status?: TemplateReviewJobStatus;
    limit?: number;
  }): Promise<TemplateReviewJobRecord[]>;
  claimNext(options: TemplateReviewJobStoreClaimOptions): Promise<TemplateReviewJobRecord | null>;
  updateProgress(
    jobId: string,
    progress: TemplateReviewJobProgress
  ): Promise<TemplateReviewJobRecord | null>;
  complete(
    jobId: string,
    result: UnifiedTemplateReviewReport
  ): Promise<TemplateReviewJobRecord | null>;
  fail(jobId: string, error: string): Promise<TemplateReviewJobRecord | null>;
  cancel(jobId: string): Promise<TemplateReviewJobRecord | null>;
}

export interface TemplateReviewJobDurableObjectNamespace {
  getByName(name: string): TemplateReviewJobDurableObjectStub;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createProgress(
  phase: TemplateReviewJobProgress['phase'],
  progress: number,
  total: number,
  message: string
): TemplateReviewJobProgress {
  return {
    phase,
    progress,
    total,
    message,
    updatedAt: nowIso()
  };
}

export function derivePhase(progress: number, total: number): TemplateReviewJobProgress['phase'] {
  if (progress <= 0) return 'queued';
  const ratio = total > 0 ? progress / total : 0;
  if (ratio < 0.1) return 'precheck';
  if (ratio < 0.35) return 'designer';
  if (ratio < 0.92) return 'published';
  if (ratio < 1) return 'normalizing';
  return 'completed';
}

function createJobId(): string {
  const cryptoLike = globalThis.crypto as { randomUUID?: () => string } | undefined;
  const suffix =
    cryptoLike?.randomUUID?.().replaceAll('-', '').slice(0, 8) ??
    Math.random().toString(36).slice(2, 10);
  return `template-review-${Date.now()}-${suffix}`;
}

export function createQueuedJobRecord(input: RunTemplateReviewInput): TemplateReviewJobRecord {
  const queuedAt = nowIso();
  return {
    jobId: createJobId(),
    status: 'queued',
    input,
    queuedAt,
    progress: createProgress('queued', 0, 100, 'Queued for execution')
  };
}

export function startJobRecord(job: TemplateReviewJobRecord): TemplateReviewJobRecord {
  return {
    ...job,
    status: 'running',
    startedAt: job.startedAt ?? nowIso(),
    progress: createProgress('precheck', 1, 100, 'Starting template review')
  };
}

export function completeJobRecord(
  job: TemplateReviewJobRecord,
  result: UnifiedTemplateReviewReport
): TemplateReviewJobRecord {
  const completedAt = nowIso();
  return {
    ...job,
    status: 'succeeded',
    completedAt,
    result: {
      ...result,
      jobId: job.jobId,
      status: 'succeeded',
      queuedAt: job.queuedAt,
      startedAt: job.startedAt,
      completedAt
    },
    progress: createProgress('completed', 100, 100, 'Template review completed')
  };
}

export function failJobRecord(
  job: TemplateReviewJobRecord,
  error: string
): TemplateReviewJobRecord {
  return {
    ...job,
    status: 'failed',
    completedAt: nowIso(),
    error,
    progress: createProgress('failed', 100, 100, error)
  };
}

export function cancelJobRecord(job: TemplateReviewJobRecord): TemplateReviewJobRecord {
  return {
    ...job,
    status: 'canceled',
    completedAt: nowIso(),
    progress: createProgress('canceled', 100, 100, 'Template review canceled')
  };
}

function isTerminalStatus(status: TemplateReviewJobStatus): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'canceled';
}

export class InMemoryTemplateReviewJobStore implements TemplateReviewJobStore {
  private readonly jobs = new Map<string, TemplateReviewJobRecord>();

  async enqueue(
    input: RunTemplateReviewInput,
    options: TemplateReviewJobStoreEnqueueOptions
  ): Promise<TemplateReviewJobRecord> {
    if (this.countActiveJobs() >= options.maxQueueSize) {
      throw new Error('Template review queue is at capacity. Retry when active jobs complete.');
    }

    const record = createQueuedJobRecord(input);
    this.jobs.set(record.jobId, record);
    return record;
  }

  async get(jobId: string): Promise<TemplateReviewJobRecord | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async list(
    options: { status?: TemplateReviewJobStatus; limit?: number } = {}
  ): Promise<TemplateReviewJobRecord[]> {
    const limit = Math.max(1, options.limit ?? 20);
    return Array.from(this.jobs.values())
      .filter((job) => (options.status ? job.status === options.status : true))
      .sort((a, b) => b.queuedAt.localeCompare(a.queuedAt))
      .slice(0, limit);
  }

  async claimNext(
    options: TemplateReviewJobStoreClaimOptions
  ): Promise<TemplateReviewJobRecord | null> {
    if (this.countRunningJobs() >= options.concurrency) return null;

    const job = Array.from(this.jobs.values())
      .filter((candidate) => candidate.status === 'queued')
      .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))[0];

    if (!job) return null;

    const started = startJobRecord(job);
    this.jobs.set(started.jobId, started);
    return started;
  }

  async updateProgress(
    jobId: string,
    progress: TemplateReviewJobProgress
  ): Promise<TemplateReviewJobRecord | null> {
    const job = this.jobs.get(jobId);
    if (!job || isTerminalStatus(job.status)) return job ?? null;

    const updated = { ...job, progress };
    this.jobs.set(jobId, updated);
    return updated;
  }

  async complete(
    jobId: string,
    result: UnifiedTemplateReviewReport
  ): Promise<TemplateReviewJobRecord | null> {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'canceled') return job ?? null;

    const completed = completeJobRecord(job, result);
    this.jobs.set(jobId, completed);
    return completed;
  }

  async fail(jobId: string, error: string): Promise<TemplateReviewJobRecord | null> {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'canceled') return job ?? null;

    const failed = failJobRecord(job, error);
    this.jobs.set(jobId, failed);
    return failed;
  }

  async cancel(jobId: string): Promise<TemplateReviewJobRecord | null> {
    const job = this.jobs.get(jobId);
    if (!job || isTerminalStatus(job.status)) return job ?? null;

    const canceled = cancelJobRecord(job);
    this.jobs.set(jobId, canceled);
    return canceled;
  }

  private countActiveJobs(): number {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'queued' || job.status === 'running') count += 1;
    }
    return count;
  }

  private countRunningJobs(): number {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'running') count += 1;
    }
    return count;
  }
}

export class DurableObjectTemplateReviewJobStore implements TemplateReviewJobStore {
  constructor(
    private readonly namespace: TemplateReviewJobDurableObjectNamespace,
    private readonly objectName = 'template-review-jobs'
  ) {}

  async enqueue(
    input: RunTemplateReviewInput,
    options: TemplateReviewJobStoreEnqueueOptions
  ): Promise<TemplateReviewJobRecord> {
    return this.stub().enqueue(input, options);
  }

  async get(jobId: string): Promise<TemplateReviewJobRecord | null> {
    return this.stub().get(jobId);
  }

  async list(
    options: { status?: TemplateReviewJobStatus; limit?: number } = {}
  ): Promise<TemplateReviewJobRecord[]> {
    return this.stub().list(options);
  }

  async claimNext(
    options: TemplateReviewJobStoreClaimOptions
  ): Promise<TemplateReviewJobRecord | null> {
    return this.stub().claimNext(options);
  }

  async updateProgress(
    jobId: string,
    progress: TemplateReviewJobProgress
  ): Promise<TemplateReviewJobRecord | null> {
    return this.stub().updateProgress(jobId, progress);
  }

  async complete(
    jobId: string,
    result: UnifiedTemplateReviewReport
  ): Promise<TemplateReviewJobRecord | null> {
    return this.stub().complete(jobId, result);
  }

  async fail(jobId: string, error: string): Promise<TemplateReviewJobRecord | null> {
    return this.stub().fail(jobId, error);
  }

  async cancel(jobId: string): Promise<TemplateReviewJobRecord | null> {
    return this.stub().cancel(jobId);
  }

  private stub(): TemplateReviewJobDurableObjectStub {
    return this.namespace.getByName(this.objectName);
  }
}

export class TemplateReviewJobManager {
  private scheduling = false;
  private scheduleAgain = false;

  constructor(
    private readonly execute: JobExecutor,
    private readonly config: TemplateReviewJobManagerConfig,
    private readonly store: TemplateReviewJobStore = new InMemoryTemplateReviewJobStore()
  ) {}

  async enqueue(input: RunTemplateReviewInput): Promise<TemplateReviewJobRecord> {
    const record = await this.store.enqueue(input, {
      maxQueueSize: this.config.maxQueueSize
    });
    await this.schedule();
    return (await this.store.get(record.jobId)) ?? record;
  }

  async get(jobId: string): Promise<TemplateReviewJobRecord | null> {
    return this.store.get(jobId);
  }

  async list(
    options: { status?: TemplateReviewJobStatus; limit?: number } = {}
  ): Promise<TemplateReviewJobRecord[]> {
    return this.store.list(options);
  }

  async cancel(jobId: string): Promise<TemplateReviewJobRecord | null> {
    const canceled = await this.store.cancel(jobId);
    await this.schedule();
    return canceled;
  }

  private async schedule(): Promise<void> {
    if (this.scheduling) {
      this.scheduleAgain = true;
      return;
    }
    this.scheduling = true;

    try {
      do {
        this.scheduleAgain = false;
        while (true) {
          const job = await this.store.claimNext({
            concurrency: this.config.concurrency
          });
          if (!job) break;
          void this.run(job);
        }
      } while (this.scheduleAgain);
    } finally {
      this.scheduling = false;
      if (this.scheduleAgain) {
        void this.schedule();
      }
    }
  }

  private async run(job: TemplateReviewJobRecord): Promise<void> {
    try {
      const result = await this.execute(job.input, {
        jobId: job.jobId,
        reportProgress: async (progress, total, message) => {
          await this.store.updateProgress(
            job.jobId,
            createProgress(derivePhase(progress, total), progress, total, message)
          );
        }
      });

      await this.store.complete(job.jobId, result);
    } catch (error) {
      await this.store.fail(job.jobId, error instanceof Error ? error.message : String(error));
    } finally {
      await this.schedule();
    }
  }
}
