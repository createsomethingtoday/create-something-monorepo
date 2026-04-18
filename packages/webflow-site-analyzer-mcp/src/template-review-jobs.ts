import type {
  RunTemplateReviewInput,
  TemplateReviewJobProgress,
  TemplateReviewJobRecord,
  TemplateReviewJobStatus,
  UnifiedTemplateReviewReport,
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

function nowIso(): string {
  return new Date().toISOString();
}

function createProgress(
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
    updatedAt: nowIso(),
  };
}

function derivePhase(progress: number, total: number): TemplateReviewJobProgress['phase'] {
  if (progress <= 0) return 'queued';
  const ratio = total > 0 ? progress / total : 0;
  if (ratio < 0.1) return 'precheck';
  if (ratio < 0.35) return 'designer';
  if (ratio < 0.92) return 'published';
  if (ratio < 1) return 'normalizing';
  return 'completed';
}

export class TemplateReviewJobManager {
  private readonly jobs = new Map<string, TemplateReviewJobRecord>();
  private readonly queue: string[] = [];
  private activeCount = 0;

  constructor(
    private readonly execute: JobExecutor,
    private readonly config: TemplateReviewJobManagerConfig
  ) {}

  enqueue(input: RunTemplateReviewInput): TemplateReviewJobRecord {
    if (this.queue.length + this.activeCount >= this.config.maxQueueSize) {
      throw new Error('Template review queue is at capacity. Retry when active jobs complete.');
    }

    const jobId = `template-review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const queuedAt = nowIso();
    const record: TemplateReviewJobRecord = {
      jobId,
      status: 'queued',
      input,
      queuedAt,
      progress: createProgress('queued', 0, 100, 'Queued for execution'),
    };

    this.jobs.set(jobId, record);
    this.queue.push(jobId);
    this.schedule();
    return record;
  }

  get(jobId: string): TemplateReviewJobRecord | null {
    return this.jobs.get(jobId) ?? null;
  }

  list(options: { templateVersionId?: string; status?: TemplateReviewJobStatus; limit?: number } = {}): TemplateReviewJobRecord[] {
    const limit = Math.max(1, options.limit ?? 20);
    return Array.from(this.jobs.values())
      .filter((job) =>
        options.templateVersionId ? job.input.templateVersionId === options.templateVersionId : true,
      )
      .filter((job) => (options.status ? job.status === options.status : true))
      .sort((a, b) => b.queuedAt.localeCompare(a.queuedAt))
      .slice(0, limit);
  }

  private schedule(): void {
    while (this.activeCount < this.config.concurrency && this.queue.length > 0) {
      const jobId = this.queue.shift();
      if (!jobId) break;
      void this.run(jobId);
    }
  }

  private async run(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    this.activeCount += 1;
    job.status = 'running';
    job.startedAt = nowIso();
    job.progress = createProgress('precheck', 1, 100, 'Starting template review');

    try {
      const result = await this.execute(job.input, {
        jobId,
        reportProgress: async (progress, total, message) => {
          job.progress = createProgress(derivePhase(progress, total), progress, total, message);
        },
      });

      job.status = 'succeeded';
      job.completedAt = nowIso();
      job.result = {
        ...result,
        jobId,
        status: 'succeeded',
        queuedAt: job.queuedAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      };
      job.progress = createProgress('completed', 100, 100, 'Template review completed');
    } catch (error) {
      job.status = 'failed';
      job.completedAt = nowIso();
      job.error = error instanceof Error ? error.message : String(error);
      job.progress = createProgress('failed', 100, 100, job.error);
    } finally {
      this.activeCount -= 1;
      this.schedule();
    }
  }
}
