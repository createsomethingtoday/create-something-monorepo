type JsonRecord = Record<string, unknown>;

export type AnalyzerJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

export interface AnalyzerRowSummary {
  id?: string;
  label?: string;
  status?: string;
  severity?: string;
  pagePath?: string;
  confidence?: number;
  evidence: string[];
  fixHint?: string;
}

export interface AnalyzerReviewSummary {
  automated?: number;
  humanInLoop?: number;
  overallScore?: number;
  grade?: string;
  coveragePercent?: number;
  passedChecks: number;
  failedChecks: number;
  partialChecks: number;
  manualChecks: number;
  topFailures: AnalyzerRowSummary[];
}

export interface AnalyzerReport {
  jobId?: string;
  status?: AnalyzerJobStatus;
  queuedAt?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  generatedAt: string;
  provider: string;
  previewUrl?: string;
  publishedUrl: string;
  summary?: {
    automated?: number;
    humanInLoop?: number;
    overallScore?: number;
    grade?: string;
    coverage?: {
      totalKnownPages?: number;
      crawledPages?: number;
      skippedPages?: number;
      coveragePercent?: number;
    };
  };
  rows?: AnalyzerRowSummary[];
}

export interface AnalyzerJobRecord {
  jobId: string;
  status: AnalyzerJobStatus;
  input: {
    publishedUrl: string;
    previewUrl?: string;
    [key: string]: unknown;
  };
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  progress?: {
    phase?: string;
    progress?: number;
    total?: number;
    message?: string;
    updatedAt?: string;
  };
  error?: string;
  result?: AnalyzerReport;
}

export interface TrackedAnalyzerReview {
  versionId: string;
  assetId?: string;
  templateName?: string;
  jobId: string;
  status: AnalyzerJobStatus;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  publishedUrl: string;
  previewUrl?: string;
  analyzerUrl: string;
  reviewMode: 'published-only';
  summary?: AnalyzerReviewSummary;
  job?: AnalyzerJobRecord;
}

export interface AnalyzerHealthSnapshot {
  configured: boolean;
  reachable: boolean;
  browserAutomationSupported?: boolean;
  toolNames?: string[];
  error?: string;
  url?: string;
}

export interface EnqueueTrackedAnalyzerReviewInput {
  versionId: string;
  assetId?: string;
  templateName?: string;
  publishedUrl: string;
  previewUrl?: string;
  timeout?: number;
  crawlMaxPages?: number;
  crawlMaxDepth?: number;
  includeManual?: boolean;
}

export interface ListTrackedAnalyzerReviewsInput {
  versionId: string;
  limit?: number;
  refresh?: boolean;
}

export interface TemplateReviewAnalyzer {
  isConfigured(): boolean;
  getHealth(): Promise<AnalyzerHealthSnapshot>;
  enqueueReview(input: EnqueueTrackedAnalyzerReviewInput): Promise<TrackedAnalyzerReview>;
  getReview(jobId: string, versionId?: string): Promise<TrackedAnalyzerReview>;
  listTrackedReviews(input: ListTrackedAnalyzerReviewsInput): Promise<TrackedAnalyzerReview[]>;
}

export interface TemplateReviewAnalyzerClientOptions {
  url: string;
  apiKey: string;
  fetchFn?: typeof fetch;
}

interface AnalyzerReviewMetadata {
  versionId: string;
  assetId?: string;
  templateName?: string;
  publishedUrl: string;
  previewUrl?: string;
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === 'object' && value !== null ? (value as JsonRecord) : {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item : null))
    .filter((item): item is string => Boolean(item));
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseToolJson(result: unknown): unknown {
  const record = asRecord(result);
  const structuredContent = record.structuredContent;
  const content = Array.isArray(record.content) ? record.content : [];
  const rawText = content
    .map((entry) => asRecord(entry))
    .filter((entry) => entry.type === 'text' && typeof entry.text === 'string')
    .map((entry) => entry.text as string)
    .join('\n')
    .trim();

  let parsed: unknown = structuredContent;
  if (parsed == null && rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }

  if (record.isError === true) {
    const parsedRecord = asRecord(parsed);
    const message =
      (typeof parsedRecord.error === 'string' ? parsedRecord.error : null) ??
      (typeof parsedRecord.message === 'string' ? parsedRecord.message : null) ??
      rawText ??
      'Analyzer tool call failed.';
    throw new Error(message);
  }

  return parsed;
}

function normalizeAnalyzerRow(value: unknown): AnalyzerRowSummary | null {
  const record = asRecord(value);
  const evidence = asStringArray(record.evidence);
  const hasCore =
    typeof record.status === 'string' ||
    typeof record.severity === 'string' ||
    typeof record.label === 'string' ||
    typeof record.id === 'string';
  if (!hasCore) return null;

  return {
    ...(typeof record.id === 'string' ? { id: record.id } : {}),
    ...(typeof record.label === 'string' ? { label: record.label } : {}),
    ...(typeof record.status === 'string' ? { status: record.status } : {}),
    ...(typeof record.severity === 'string' ? { severity: record.severity } : {}),
    ...(typeof record.pagePath === 'string' ? { pagePath: record.pagePath } : {}),
    ...(typeof record.confidence === 'number' ? { confidence: record.confidence } : {}),
    evidence,
    ...(typeof record.fixHint === 'string' ? { fixHint: record.fixHint } : {}),
  };
}

export function normalizeUnifiedTemplateReviewReport(value: unknown, depth = 0): AnalyzerReport | null {
  if (depth > 3) return null;

  const record = asRecord(value);
  const hasCoreFields =
    typeof record.generatedAt === 'string' &&
    typeof record.provider === 'string' &&
    typeof record.publishedUrl === 'string';

  if (hasCoreFields) {
    const rows = Array.isArray(record.rows)
      ? record.rows.map((row) => normalizeAnalyzerRow(row)).filter((row): row is AnalyzerRowSummary => Boolean(row))
      : undefined;

    const summaryRecord = asRecord(record.summary);
    const coverageRecord = asRecord(summaryRecord.coverage);

    return {
      ...(typeof record.jobId === 'string' ? { jobId: record.jobId } : {}),
      ...(typeof record.status === 'string' ? { status: record.status as AnalyzerJobStatus } : {}),
      ...(typeof record.queuedAt === 'string' ? { queuedAt: record.queuedAt } : {}),
      ...(typeof record.startedAt === 'string' ? { startedAt: record.startedAt } : {}),
      ...(typeof record.completedAt === 'string' ? { completedAt: record.completedAt } : {}),
      ...(typeof record.durationMs === 'number' ? { durationMs: record.durationMs } : {}),
      generatedAt: record.generatedAt as string,
      provider: record.provider as string,
      ...(typeof record.previewUrl === 'string' ? { previewUrl: record.previewUrl } : {}),
      publishedUrl: record.publishedUrl as string,
      summary: Object.keys(summaryRecord).length
        ? {
            ...(typeof summaryRecord.automated === 'number' ? { automated: summaryRecord.automated } : {}),
            ...(typeof summaryRecord.humanInLoop === 'number' ? { humanInLoop: summaryRecord.humanInLoop } : {}),
            ...(typeof summaryRecord.overallScore === 'number' ? { overallScore: summaryRecord.overallScore } : {}),
            ...(typeof summaryRecord.grade === 'string' ? { grade: summaryRecord.grade } : {}),
            coverage: Object.keys(coverageRecord).length
              ? {
                  ...(typeof coverageRecord.totalKnownPages === 'number'
                    ? { totalKnownPages: coverageRecord.totalKnownPages }
                    : {}),
                  ...(typeof coverageRecord.crawledPages === 'number'
                    ? { crawledPages: coverageRecord.crawledPages }
                    : {}),
                  ...(typeof coverageRecord.skippedPages === 'number'
                    ? { skippedPages: coverageRecord.skippedPages }
                    : {}),
                  ...(typeof coverageRecord.coveragePercent === 'number'
                    ? { coveragePercent: coverageRecord.coveragePercent }
                    : {}),
                }
              : undefined,
          }
        : undefined,
      ...(rows ? { rows } : {}),
    };
  }

  if (record.result) {
    const nested = normalizeUnifiedTemplateReviewReport(record.result, depth + 1);
    if (nested) return nested;
  }

  if (record.report) {
    const nested = normalizeUnifiedTemplateReviewReport(record.report, depth + 1);
    if (nested) return nested;
  }

  return null;
}

export function normalizeTemplateReviewJobRecord(value: unknown, depth = 0): AnalyzerJobRecord | null {
  if (depth > 3) return null;

  const record = asRecord(value);
  const inputRecord = asRecord(record.input);
  const hasCoreFields =
    typeof record.jobId === 'string' &&
    typeof record.status === 'string' &&
    typeof record.queuedAt === 'string' &&
    typeof inputRecord.publishedUrl === 'string';

  if (hasCoreFields) {
    const result = normalizeUnifiedTemplateReviewReport(record.result);
    const progressRecord = asRecord(record.progress);
    return {
      jobId: record.jobId as string,
      status: record.status as AnalyzerJobStatus,
      input: {
        publishedUrl: inputRecord.publishedUrl as string,
        ...(typeof inputRecord.previewUrl === 'string' ? { previewUrl: inputRecord.previewUrl } : {}),
        ...Object.fromEntries(
          Object.entries(inputRecord).filter(([key]) => key !== 'publishedUrl' && key !== 'previewUrl'),
        ),
      },
      queuedAt: record.queuedAt as string,
      ...(typeof record.startedAt === 'string' ? { startedAt: record.startedAt } : {}),
      ...(typeof record.completedAt === 'string' ? { completedAt: record.completedAt } : {}),
      ...(typeof record.durationMs === 'number' ? { durationMs: record.durationMs } : {}),
      ...(Object.keys(progressRecord).length
        ? {
            progress: {
              ...(typeof progressRecord.phase === 'string' ? { phase: progressRecord.phase } : {}),
              ...(typeof progressRecord.progress === 'number' ? { progress: progressRecord.progress } : {}),
              ...(typeof progressRecord.total === 'number' ? { total: progressRecord.total } : {}),
              ...(typeof progressRecord.message === 'string' ? { message: progressRecord.message } : {}),
              ...(typeof progressRecord.updatedAt === 'string' ? { updatedAt: progressRecord.updatedAt } : {}),
            },
          }
        : {}),
      ...(typeof record.error === 'string' ? { error: record.error } : {}),
      ...(result ? { result } : {}),
    };
  }

  if (record.result) {
    const nested = normalizeTemplateReviewJobRecord(record.result, depth + 1);
    if (nested) return nested;
  }

  if (record.job) {
    const nested = normalizeTemplateReviewJobRecord(record.job, depth + 1);
    if (nested) return nested;
  }

  return null;
}

function severityRank(severity?: string): number {
  switch ((severity ?? '').toLowerCase()) {
    case 'critical':
      return 4;
    case 'major':
      return 3;
    case 'minor':
      return 2;
    case 'info':
      return 1;
    default:
      return 0;
  }
}

function summarizeReport(report?: AnalyzerReport): AnalyzerReviewSummary | undefined {
  if (!report) return undefined;
  const rows = report.rows ?? [];
  const passedChecks = rows.filter((row) => row.status === 'pass').length;
  const failedChecks = rows.filter((row) => row.status === 'fail').length;
  const partialChecks = rows.filter((row) => row.status === 'partial').length;
  const manualChecks = rows.filter((row) => row.status === 'manual').length;
  const topFailures = rows
    .filter((row) => row.status === 'fail' || row.status === 'partial')
    .sort((left, right) => {
      const severityDelta = severityRank(right.severity) - severityRank(left.severity);
      if (severityDelta !== 0) return severityDelta;
      return (right.confidence ?? 0) - (left.confidence ?? 0);
    })
    .slice(0, 5);

  return {
    automated: report.summary?.automated,
    humanInLoop: report.summary?.humanInLoop,
    overallScore: report.summary?.overallScore,
    grade: report.summary?.grade,
    coveragePercent: report.summary?.coverage?.coveragePercent,
    passedChecks,
    failedChecks,
    partialChecks,
    manualChecks,
    topFailures,
  };
}

class AnalyzerReviewRegistry {
  private readonly byJobId = new Map<string, { metadata: AnalyzerReviewMetadata; job?: AnalyzerJobRecord }>();
  private readonly jobIdsByVersion = new Map<string, string[]>();

  track(metadata: AnalyzerReviewMetadata, job: AnalyzerJobRecord): void {
    this.byJobId.set(job.jobId, { metadata, job });
    const jobIds = this.jobIdsByVersion.get(metadata.versionId) ?? [];
    if (!jobIds.includes(job.jobId)) jobIds.unshift(job.jobId);
    this.jobIdsByVersion.set(metadata.versionId, jobIds);
  }

  attach(jobId: string, metadata: AnalyzerReviewMetadata): void {
    const current = this.byJobId.get(jobId);
    this.byJobId.set(jobId, { metadata, job: current?.job });
    const jobIds = this.jobIdsByVersion.get(metadata.versionId) ?? [];
    if (!jobIds.includes(jobId)) jobIds.unshift(jobId);
    this.jobIdsByVersion.set(metadata.versionId, jobIds);
  }

  update(job: AnalyzerJobRecord): void {
    const current = this.byJobId.get(job.jobId);
    if (!current) return;
    this.byJobId.set(job.jobId, { metadata: current.metadata, job });
  }

  get(jobId: string): { metadata: AnalyzerReviewMetadata; job?: AnalyzerJobRecord } | null {
    return this.byJobId.get(jobId) ?? null;
  }

  listVersion(versionId: string, limit = 10): Array<{ metadata: AnalyzerReviewMetadata; job?: AnalyzerJobRecord }> {
    const jobIds = this.jobIdsByVersion.get(versionId) ?? [];
    return jobIds
      .slice(0, limit)
      .map((jobId) => this.byJobId.get(jobId))
      .filter((entry): entry is { metadata: AnalyzerReviewMetadata; job?: AnalyzerJobRecord } => Boolean(entry));
  }
}

const defaultAnalyzerReviewRegistry = new AnalyzerReviewRegistry();

export class RemoteTemplateReviewAnalyzerClient implements TemplateReviewAnalyzer {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: TemplateReviewAnalyzerClientOptions) {
    this.url = options.url.trim();
    this.apiKey = options.apiKey.trim();
    this.fetchFn = options.fetchFn
      ? (input, init) => options.fetchFn!(input, init)
      : (input, init) => fetch(input, init);
  }

  isConfigured(): boolean {
    return Boolean(this.url && this.apiKey);
  }

  async getHealth(): Promise<AnalyzerHealthSnapshot> {
    if (!this.isConfigured()) {
      return { configured: false, reachable: false };
    }

    try {
      const healthUrl = new URL(this.url);
      healthUrl.pathname = '/health';
      healthUrl.search = '';

      const [healthResponse, toolsResult] = await Promise.all([
        this.fetchFn(healthUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }),
        this.postRemoteMcp('tools/list', {}),
      ]);

      const health = healthResponse.ok ? asRecord(await healthResponse.json()) : {};
      const templateReview = asRecord(health.templateReview);
      const toolsRecord = asRecord(toolsResult);
      const toolList = Array.isArray(toolsRecord.tools) ? toolsRecord.tools : [];

      return {
        configured: true,
        reachable: healthResponse.ok,
        ...(typeof templateReview.browserAutomationSupported === 'boolean'
          ? { browserAutomationSupported: templateReview.browserAutomationSupported }
          : {}),
        toolNames: toolList
          .map((tool) => asRecord(tool))
          .map((tool) => (typeof tool.name === 'string' ? tool.name : null))
          .filter((tool): tool is string => Boolean(tool)),
        url: this.url,
      };
    } catch (error) {
      return {
        configured: true,
        reachable: false,
        error: error instanceof Error ? error.message : String(error),
        url: this.url,
      };
    }
  }

  async enqueueReview(input: EnqueueTrackedAnalyzerReviewInput): Promise<TrackedAnalyzerReview> {
    const payload = await this.callTool('enqueue_template_review', {
      publishedUrl: input.publishedUrl,
      ...(input.previewUrl ? { previewUrl: input.previewUrl } : {}),
      designerMode: 'skip',
      ...(input.timeout !== undefined ? { timeout: input.timeout } : {}),
      ...(input.crawlMaxPages !== undefined ? { crawlMaxPages: input.crawlMaxPages } : {}),
      ...(input.crawlMaxDepth !== undefined ? { crawlMaxDepth: input.crawlMaxDepth } : {}),
      ...(input.includeManual !== undefined ? { includeManual: input.includeManual } : {}),
    });

    const job = normalizeTemplateReviewJobRecord(payload);
    if (!job) {
      throw new Error('Analyzer enqueue did not return a recognizable template review job.');
    }

    defaultAnalyzerReviewRegistry.track(
      {
        versionId: input.versionId,
        assetId: input.assetId,
        templateName: input.templateName,
        publishedUrl: input.publishedUrl,
        ...(input.previewUrl ? { previewUrl: input.previewUrl } : {}),
      },
      job,
    );

    return this.toTrackedReview(job, {
      versionId: input.versionId,
      assetId: input.assetId,
      templateName: input.templateName,
      publishedUrl: input.publishedUrl,
      ...(input.previewUrl ? { previewUrl: input.previewUrl } : {}),
    });
  }

  async getReview(jobId: string, versionId?: string): Promise<TrackedAnalyzerReview> {
    const tracked = defaultAnalyzerReviewRegistry.get(jobId);
    if (versionId && !tracked) {
      defaultAnalyzerReviewRegistry.attach(jobId, {
        versionId,
        publishedUrl: '',
      });
    }

    const payload = await this.callTool('get_template_review_job', { jobId });
    const job = normalizeTemplateReviewJobRecord(payload);
    if (!job) {
      throw new Error(`Analyzer job ${jobId} did not return a recognizable job record.`);
    }

    if (tracked) {
      defaultAnalyzerReviewRegistry.update(job);
      return this.toTrackedReview(job, tracked.metadata);
    }

    const fallbackMetadata = {
      versionId: versionId ?? 'unknown',
      publishedUrl: job.input.publishedUrl,
      ...(job.input.previewUrl ? { previewUrl: job.input.previewUrl } : {}),
    };
    defaultAnalyzerReviewRegistry.track(fallbackMetadata, job);
    return this.toTrackedReview(job, fallbackMetadata);
  }

  async listTrackedReviews(input: ListTrackedAnalyzerReviewsInput): Promise<TrackedAnalyzerReview[]> {
    const entries = defaultAnalyzerReviewRegistry.listVersion(input.versionId, input.limit ?? 10);
    if (entries.length === 0) return [];
    if (input.refresh === false) {
      return entries
        .map((entry) => (entry.job ? this.toTrackedReview(entry.job, entry.metadata) : null))
        .filter((entry): entry is TrackedAnalyzerReview => Boolean(entry));
    }

    return Promise.all(
      entries.map((entry) =>
        entry.job
          ? this.getReview(entry.job.jobId, entry.metadata.versionId).catch(() =>
              this.toTrackedReview(entry.job as AnalyzerJobRecord, entry.metadata),
            )
          : Promise.resolve(null),
      ),
    ).then((items) => items.filter((item): item is TrackedAnalyzerReview => Boolean(item)));
  }

  private async callTool(name: string, args: JsonRecord): Promise<unknown> {
    return parseToolJson(
      await this.postRemoteMcp('tools/call', {
        name,
        arguments: args,
      }),
    );
  }

  private async postRemoteMcp(method: string, params: JsonRecord): Promise<unknown> {
    const response = await this.fetchFn(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `${method}-${Date.now()}`,
        method,
        params,
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Remote analyzer request failed (${response.status}): ${text}`);
    }

    const payload = JSON.parse(text) as JsonRecord;
    if (payload.error) {
      const errorRecord = asRecord(payload.error);
      throw new Error(
        typeof errorRecord.message === 'string' ? errorRecord.message : JSON.stringify(payload.error),
      );
    }

    return payload.result;
  }

  private toTrackedReview(job: AnalyzerJobRecord, metadata: AnalyzerReviewMetadata): TrackedAnalyzerReview {
    const report = job.result;
    return {
      versionId: metadata.versionId,
      ...(metadata.assetId ? { assetId: metadata.assetId } : {}),
      ...(metadata.templateName ? { templateName: metadata.templateName } : {}),
      jobId: job.jobId,
      status: job.status,
      queuedAt: job.queuedAt,
      ...(job.startedAt ? { startedAt: job.startedAt } : {}),
      ...(job.completedAt ? { completedAt: job.completedAt } : {}),
      ...(job.durationMs !== undefined ? { durationMs: job.durationMs } : {}),
      ...(job.error ? { error: job.error } : {}),
      publishedUrl: job.input.publishedUrl || metadata.publishedUrl,
      ...(job.input.previewUrl || metadata.previewUrl
        ? { previewUrl: job.input.previewUrl ?? metadata.previewUrl }
        : {}),
      analyzerUrl: this.url,
      reviewMode: 'published-only',
      ...(report ? { summary: summarizeReport(report) } : {}),
      job: {
        ...job,
        ...(report ? { result: report } : {}),
      },
    };
  }
}
