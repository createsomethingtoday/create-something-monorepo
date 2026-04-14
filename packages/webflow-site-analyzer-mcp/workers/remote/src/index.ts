import { Container, getContainer } from '@cloudflare/containers';

import type {
  EnqueueTemplateReviewInput,
  GetTemplateReviewJobInput,
  ListTemplateReviewJobsInput,
  RunTemplateReviewInput,
  TemplateReviewJobRecord,
  TemplateReviewJobStatus,
  UnifiedTemplateReviewReport,
} from '../../../src/types.js';
import {
  claimQueuedTemplateReviewJobs,
  countEnqueuedTemplateReviewJobs,
  createQueuedTemplateReviewJob,
  listTemplateReviewJobsForResponse,
  markTemplateReviewJobFailed,
  markTemplateReviewJobSucceeded,
  pruneExpiredTemplateReviewJobs,
  requeueStaleRunningTemplateReviewJobs,
  sanitizeTemplateReviewJob,
  shouldResumeTemplateReviewQueue,
  type StoredTemplateReviewJob,
} from './template-review-jobs.js';

const DEFAULT_PORT = 8788;
const ANALYZER_ENTRYPOINT = ['/bin/sh', '-lc', 'cd /app && node dist/http.js'];
const JOB_ID_PREFIX = 'template-review-';
const JOB_STORAGE_PREFIX = 'template-review-job:';
const DEFAULT_COMPLETED_JOB_RETENTION_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RUNNING_STALE_MS = 20 * 60 * 1000;
const DEFAULT_RESUME_SWEEP_MS = 60 * 1000;
const TEMPLATE_REVIEW_QUEUE_CALLBACK = 'resumeTemplateReviewQueue';
const TEMPLATE_REVIEW_EXPIRY_CALLBACK = 'expireTemplateReviewJob';
const JSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, X-Requested-With, X-API-Key',
};

const TEMPLATE_REVIEW_TOOL_NAMES = new Set([
  'enqueue_template_review',
  'get_template_review_job',
  'list_template_review_jobs',
]);

interface Env {
  AnalyzerContainer: DurableObjectNamespace<AnalyzerContainer>;
  SANDBOX_SLEEP_AFTER?: string;
  UPSTREAM_PORT?: string;
  WEBFLOW_SITE_ANALYZER_MCP_API_KEY?: string;
  MCP_API_KEY?: string;
  STEEL_API_KEY?: string;
  BROWSERLESS_API_KEY?: string;
  BROWSERLESS_TOKEN?: string;
  BROWSERLESS_ENDPOINT?: string;
  WEBFLOW_ANALYZER_REGISTRY_PATH?: string;
  WEBFLOW_TEMPLATE_REVIEW_MAX_CONCURRENT_JOBS?: string;
  WEBFLOW_TEMPLATE_REVIEW_MAX_QUEUE_SIZE?: string;
  WEBFLOW_TEMPLATE_REVIEW_COMPLETED_JOB_RETENTION_MS?: string;
  WEBFLOW_TEMPLATE_REVIEW_STALE_RUNNING_MS?: string;
  WEBFLOW_TEMPLATE_REVIEW_RESUME_SWEEP_MS?: string;
  MCP_TELEMETRY_ENABLED?: string;
  MCP_TELEMETRY_PATH?: string;
  BRAINTRUST_ENABLED?: string;
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_ID?: string;
  BRAINTRUST_PROJECT_NAME?: string;
}

type AnalyzerContainerStub = DurableObjectStub<AnalyzerContainer>;
type JsonRpcId = string | number | null;

type JsonRpcToolCall = {
  id: JsonRpcId;
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getUpstreamPort(env: Env): number {
  return parsePositiveInt(env.UPSTREAM_PORT?.trim(), DEFAULT_PORT);
}

function getMaxConcurrentJobs(env: Env): number {
  return parsePositiveInt(env.WEBFLOW_TEMPLATE_REVIEW_MAX_CONCURRENT_JOBS?.trim(), 2);
}

function getMaxQueueSize(env: Env): number {
  return parsePositiveInt(env.WEBFLOW_TEMPLATE_REVIEW_MAX_QUEUE_SIZE?.trim(), 100);
}

function getCompletedJobRetentionMs(env: Env): number {
  return parsePositiveInt(
    env.WEBFLOW_TEMPLATE_REVIEW_COMPLETED_JOB_RETENTION_MS?.trim(),
    DEFAULT_COMPLETED_JOB_RETENTION_MS,
  );
}

function getRunningStaleMs(env: Env): number {
  return parsePositiveInt(env.WEBFLOW_TEMPLATE_REVIEW_STALE_RUNNING_MS?.trim(), DEFAULT_RUNNING_STALE_MS);
}

function getResumeSweepMs(env: Env): number {
  return parsePositiveInt(env.WEBFLOW_TEMPLATE_REVIEW_RESUME_SWEEP_MS?.trim(), DEFAULT_RESUME_SWEEP_MS);
}

function getAnalyzerApiKey(env: Env): string | null {
  const value = env.WEBFLOW_SITE_ANALYZER_MCP_API_KEY?.trim() ?? env.MCP_API_KEY?.trim() ?? '';
  return value ? value : null;
}

function setIfPresent(target: Record<string, string>, key: string, value: string | undefined): void {
  const normalized = value?.trim();
  if (normalized) target[key] = normalized;
}

function buildAnalyzerEnv(env: Env): Record<string, string> {
  const result: Record<string, string> = {};

  setIfPresent(result, 'PORT', String(getUpstreamPort(env)));
  setIfPresent(result, 'WEBFLOW_SITE_ANALYZER_MCP_API_KEY', env.WEBFLOW_SITE_ANALYZER_MCP_API_KEY);
  setIfPresent(result, 'MCP_API_KEY', env.MCP_API_KEY);
  setIfPresent(result, 'STEEL_API_KEY', env.STEEL_API_KEY);
  setIfPresent(result, 'BROWSERLESS_API_KEY', env.BROWSERLESS_API_KEY);
  setIfPresent(result, 'BROWSERLESS_TOKEN', env.BROWSERLESS_TOKEN ?? env.BROWSERLESS_API_KEY);
  setIfPresent(result, 'BROWSERLESS_ENDPOINT', env.BROWSERLESS_ENDPOINT);
  setIfPresent(result, 'WEBFLOW_ANALYZER_REGISTRY_PATH', env.WEBFLOW_ANALYZER_REGISTRY_PATH);
  setIfPresent(
    result,
    'WEBFLOW_TEMPLATE_REVIEW_MAX_CONCURRENT_JOBS',
    env.WEBFLOW_TEMPLATE_REVIEW_MAX_CONCURRENT_JOBS,
  );
  setIfPresent(result, 'WEBFLOW_TEMPLATE_REVIEW_MAX_QUEUE_SIZE', env.WEBFLOW_TEMPLATE_REVIEW_MAX_QUEUE_SIZE);
  setIfPresent(result, 'MCP_TELEMETRY_ENABLED', env.MCP_TELEMETRY_ENABLED);
  setIfPresent(result, 'MCP_TELEMETRY_PATH', env.MCP_TELEMETRY_PATH);
  setIfPresent(result, 'BRAINTRUST_ENABLED', env.BRAINTRUST_ENABLED);
  setIfPresent(result, 'BRAINTRUST_API_KEY', env.BRAINTRUST_API_KEY);
  setIfPresent(result, 'BRAINTRUST_PROJECT_ID', env.BRAINTRUST_PROJECT_ID);
  setIfPresent(result, 'BRAINTRUST_PROJECT_NAME', env.BRAINTRUST_PROJECT_NAME);

  return result;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(JSON_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers,
  });
}

function toolSuccessResponse(id: JsonRpcId, result: unknown): Response {
  return jsonResponse({
    jsonrpc: '2.0',
    id,
    result: {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    },
  });
}

function toolErrorResponse(
  id: JsonRpcId,
  toolName: string,
  safeArgs: Record<string, unknown>,
  error: unknown,
): Response {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return jsonResponse({
    jsonrpc: '2.0',
    id,
    result: {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage, tool: toolName, arguments: safeArgs }, null, 2),
        },
      ],
      isError: true,
    },
  });
}

function buildToolCallPayload(toolName: string, args: unknown, id: JsonRpcId) {
  return {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  };
}

function createTemplateReviewJobId(nowMs: number): string {
  return `${JOB_ID_PREFIX}${nowMs}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureStringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required string argument: ${key}`);
  }
  return value.trim();
}

function ensureUrlArg(args: Record<string, unknown>, key: 'previewUrl' | 'publishedUrl'): string {
  const value = ensureStringArg(args, key);
  try {
    return new URL(value).toString();
  } catch {
    throw new Error(`Invalid URL for ${key}: ${value}`);
  }
}

function optionalBooleanArg(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new Error(`Expected boolean for ${key}`);
  }
  return value;
}

function optionalIntArg(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Expected positive integer for ${key}`);
  }
  return value;
}

function normalizeEnqueueInput(args: Record<string, unknown>): EnqueueTemplateReviewInput {
  return {
    previewUrl: ensureUrlArg(args, 'previewUrl'),
    publishedUrl: ensureUrlArg(args, 'publishedUrl'),
    timeout: optionalIntArg(args, 'timeout'),
    includeManual: optionalBooleanArg(args, 'includeManual'),
    crawlMaxPages: optionalIntArg(args, 'crawlMaxPages'),
    crawlMaxDepth: optionalIntArg(args, 'crawlMaxDepth'),
  };
}

function normalizeGetJobInput(args: Record<string, unknown>): GetTemplateReviewJobInput {
  return {
    jobId: ensureStringArg(args, 'jobId'),
  };
}

function normalizeListJobsInput(args: Record<string, unknown>): ListTemplateReviewJobsInput {
  const limit = optionalIntArg(args, 'limit');
  const status = args.status;
  if (status === undefined) {
    return { limit };
  }
  if (
    status !== 'queued' &&
    status !== 'running' &&
    status !== 'succeeded' &&
    status !== 'failed' &&
    status !== 'canceled'
  ) {
    throw new Error(`Unsupported template review job status filter: ${String(status)}`);
  }
  return {
    status,
    limit,
  };
}

function parseToolErrorPayload(payload: unknown): string | null {
  const text = asRecord(payload)?.result;
  const result = asRecord(text);
  const content = Array.isArray(result?.content) ? result.content : [];
  const first = asRecord(content[0]);
  const raw = typeof first?.text === 'string' ? first.text : null;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.error === 'string' && parsed.error.trim().length > 0) {
      return parsed.error;
    }
  } catch {
    return raw;
  }
  return raw;
}

async function parseQueueToolCall(request: Request): Promise<JsonRpcToolCall | null> {
  if (request.method !== 'POST') return null;
  const url = new URL(request.url);
  if (url.pathname !== '/mcp') return null;

  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    return null;
  }

  const payload = asRecord(body);
  if (!payload || payload.method !== 'tools/call') return null;

  const params = asRecord(payload.params);
  if (!params || typeof params.name !== 'string' || !TEMPLATE_REVIEW_TOOL_NAMES.has(params.name)) {
    return null;
  }

  const idValue = payload.id;
  const id: JsonRpcId =
    typeof idValue === 'string' || typeof idValue === 'number' || idValue === null ? idValue : null;

  return {
    id,
    params: {
      name: params.name,
      arguments: asRecord(params.arguments) ?? {},
    },
  };
}

export class AnalyzerContainer extends Container<Env> {
  defaultPort = DEFAULT_PORT;
  sleepAfter = '24h';
  enableInternet = true;
  pingEndpoint = 'container/health';

  private readonly durableState: DurableObjectState<{}>;
  private readonly runtimeEnv: Env;

  constructor(ctx: DurableObjectState<{}>, env: Env) {
    super(ctx, env);
    this.durableState = ctx;
    this.runtimeEnv = env;
    this.envVars = buildAnalyzerEnv(env);
    this.entrypoint = ANALYZER_ENTRYPOINT;
    this.enableInternet = true;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    const queueToolCall = await parseQueueToolCall(request);
    if (queueToolCall) {
      return this.handleQueueToolCall(queueToolCall);
    }

    return super.fetch(request);
  }

  async resumeTemplateReviewQueue(): Promise<void> {
    await this.maybeStartQueuedTemplateReviews();
  }

  async expireTemplateReviewJob(payload?: { jobId?: unknown }): Promise<void> {
    const jobId = typeof payload?.jobId === 'string' ? payload.jobId : null;
    if (!jobId) return;

    await this.durableState.blockConcurrencyWhile(async () => {
      const job = await this.getStoredJob(jobId);
      if (!job?.retentionExpiresAt) return;
      const expiresAt = Date.parse(job.retentionExpiresAt);
      if (!Number.isFinite(expiresAt) || expiresAt > Date.now()) return;
      await this.deleteStoredJobs([jobId]);
      await this.syncResumeTemplateReviewSweep(await this.listStoredJobs());
    });
  }

  private async handleQueueToolCall(toolCall: JsonRpcToolCall): Promise<Response> {
    const { id, params } = toolCall;
    const safeArgs = params.arguments;

    try {
      switch (params.name) {
        case 'enqueue_template_review':
          return toolSuccessResponse(id, await this.enqueueTemplateReview(safeArgs));
        case 'get_template_review_job':
          return toolSuccessResponse(id, await this.getTemplateReviewJob(safeArgs));
        case 'list_template_review_jobs':
          return toolSuccessResponse(id, await this.listTemplateReviewJobs(safeArgs));
        default:
          throw new Error(`Unknown tool: ${params.name}`);
      }
    } catch (error) {
      return toolErrorResponse(id, params.name, safeArgs, error);
    }
  }

  private async enqueueTemplateReview(
    rawArgs: Record<string, unknown>,
  ): Promise<TemplateReviewJobRecord & { retentionExpiresAt?: string }> {
    const input = normalizeEnqueueInput(rawArgs);
    let queuedJob: StoredTemplateReviewJob | null = null;

    await this.durableState.blockConcurrencyWhile(async () => {
      const nowMs = Date.now();
      const jobs = await this.loadNormalizedJobs(nowMs);

      if (countEnqueuedTemplateReviewJobs(jobs) >= getMaxQueueSize(this.runtimeEnv)) {
        throw new Error('Template review queue is at capacity. Retry when active jobs complete.');
      }

      queuedJob = createQueuedTemplateReviewJob(createTemplateReviewJobId(nowMs), input, nowMs);
      await this.putStoredJob(queuedJob);
      jobs.push(queuedJob);
      await this.syncResumeTemplateReviewSweep(jobs);
    });

    this.startTemplateReviewQueue();
    if (!queuedJob) {
      throw new Error('Failed to create template review job.');
    }
    return sanitizeTemplateReviewJob(queuedJob);
  }

  private async getTemplateReviewJob(
    rawArgs: Record<string, unknown>,
  ): Promise<TemplateReviewJobRecord & { retentionExpiresAt?: string }> {
    const input = normalizeGetJobInput(rawArgs);
    let job: StoredTemplateReviewJob | null = null;

    await this.durableState.blockConcurrencyWhile(async () => {
      const jobs = await this.loadNormalizedJobs(Date.now());
      job = jobs.find((candidate) => candidate.jobId === input.jobId) ?? null;
      await this.syncResumeTemplateReviewSweep(jobs);
    });

    if (!job) {
      throw new Error(`Template review job not found: ${input.jobId}`);
    }

    this.startTemplateReviewQueue();
    return sanitizeTemplateReviewJob(job);
  }

  private async listTemplateReviewJobs(
    rawArgs: Record<string, unknown>,
  ): Promise<Array<TemplateReviewJobRecord & { retentionExpiresAt?: string }>> {
    const input = normalizeListJobsInput(rawArgs);
    let jobs: StoredTemplateReviewJob[] = [];

    await this.durableState.blockConcurrencyWhile(async () => {
      jobs = await this.loadNormalizedJobs(Date.now());
      await this.syncResumeTemplateReviewSweep(jobs);
    });

    this.startTemplateReviewQueue();
    return listTemplateReviewJobsForResponse(jobs, input);
  }

  private startTemplateReviewQueue(): void {
    this.durableState.waitUntil(this.maybeStartQueuedTemplateReviews());
  }

  private async maybeStartQueuedTemplateReviews(): Promise<void> {
    let claimedJobs: StoredTemplateReviewJob[] = [];

    await this.durableState.blockConcurrencyWhile(async () => {
      const nowMs = Date.now();
      const jobs = await this.loadNormalizedJobs(nowMs);
      claimedJobs = claimQueuedTemplateReviewJobs(jobs, nowMs, getMaxConcurrentJobs(this.runtimeEnv));
      if (claimedJobs.length > 0) {
        await this.putStoredJobs(claimedJobs);
      }
      await this.syncResumeTemplateReviewSweep(jobs);
    });

    for (const job of claimedJobs) {
      this.durableState.waitUntil(this.runQueuedTemplateReviewJob(job.jobId));
    }
  }

  private async runQueuedTemplateReviewJob(jobId: string): Promise<void> {
    const job = await this.getStoredJob(jobId);
    if (!job || job.status !== 'running') return;

    try {
      const result = await this.executeTemplateReview(job);

      await this.durableState.blockConcurrencyWhile(async () => {
        const current = await this.getStoredJob(jobId);
        if (!current || current.status !== 'running') return;

        const retentionMs = getCompletedJobRetentionMs(this.runtimeEnv);
        markTemplateReviewJobSucceeded(current, result, Date.now(), retentionMs);
        await this.putStoredJob(current);
        await this.schedule(
          new Date(Date.now() + retentionMs),
          TEMPLATE_REVIEW_EXPIRY_CALLBACK,
          { jobId: current.jobId },
        );
        await this.syncResumeTemplateReviewSweep(await this.listStoredJobs());
      });
    } catch (error) {
      await this.durableState.blockConcurrencyWhile(async () => {
        const current = await this.getStoredJob(jobId);
        if (!current || current.status !== 'running') return;

        markTemplateReviewJobFailed(current, error, Date.now(), getCompletedJobRetentionMs(this.runtimeEnv));
        await this.putStoredJob(current);
        await this.schedule(
          new Date(Date.now() + getCompletedJobRetentionMs(this.runtimeEnv)),
          TEMPLATE_REVIEW_EXPIRY_CALLBACK,
          { jobId: current.jobId },
        );
        await this.syncResumeTemplateReviewSweep(await this.listStoredJobs());
      });
    } finally {
      this.startTemplateReviewQueue();
    }
  }

  private async executeTemplateReview(job: StoredTemplateReviewJob): Promise<UnifiedTemplateReviewReport> {
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    });
    const analyzerApiKey = getAnalyzerApiKey(this.runtimeEnv);
    if (analyzerApiKey) {
      headers.set('Authorization', `Bearer ${analyzerApiKey}`);
    }

    const response = await this.containerFetch('http://container/mcp', {
      method: 'POST',
      headers,
      body: JSON.stringify(buildToolCallPayload('run_template_review', job.input, job.jobId)),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `run_template_review failed with HTTP ${response.status}: ${text || response.statusText}`,
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const topLevelError = asRecord(payload.error);
    if (topLevelError) {
      throw new Error(JSON.stringify(topLevelError));
    }

    const result = asRecord(payload.result);
    if (!result) {
      throw new Error('Analyzer returned an invalid JSON-RPC result.');
    }
    if (result.isError === true) {
      throw new Error(parseToolErrorPayload(payload) ?? 'run_template_review returned an error response.');
    }

    const content = Array.isArray(result.content) ? result.content : [];
    const first = asRecord(content[0]);
    const text = typeof first?.text === 'string' ? first.text : null;
    if (!text) {
      throw new Error('run_template_review returned no JSON payload.');
    }

    try {
      return JSON.parse(text) as UnifiedTemplateReviewReport;
    } catch {
      throw new Error('run_template_review returned invalid JSON.');
    }
  }

  private async loadNormalizedJobs(nowMs: number): Promise<StoredTemplateReviewJob[]> {
    const jobs = await this.listStoredJobs();
    const { keptJobs, expiredJobIds } = pruneExpiredTemplateReviewJobs(jobs, nowMs);
    const requeuedJobIds = requeueStaleRunningTemplateReviewJobs(
      keptJobs,
      nowMs,
      getRunningStaleMs(this.runtimeEnv),
    );

    if (expiredJobIds.length > 0) {
      await this.deleteStoredJobs(expiredJobIds);
    }
    if (requeuedJobIds.length > 0) {
      await this.putStoredJobs(keptJobs.filter((job) => requeuedJobIds.includes(job.jobId)));
    }

    return keptJobs;
  }

  private async syncResumeTemplateReviewSweep(jobs: StoredTemplateReviewJob[]): Promise<void> {
    this.deleteSchedules(TEMPLATE_REVIEW_QUEUE_CALLBACK);
    if (!shouldResumeTemplateReviewQueue(jobs)) return;
    await this.schedule(
      new Date(Date.now() + getResumeSweepMs(this.runtimeEnv)),
      TEMPLATE_REVIEW_QUEUE_CALLBACK,
    );
  }

  private async listStoredJobs(): Promise<StoredTemplateReviewJob[]> {
    const entries = await this.durableState.storage.list<StoredTemplateReviewJob>({
      prefix: JOB_STORAGE_PREFIX,
    });
    return Array.from(entries.values());
  }

  private async getStoredJob(jobId: string): Promise<StoredTemplateReviewJob | null> {
    return (await this.durableState.storage.get<StoredTemplateReviewJob>(
      this.storageKey(jobId),
    )) ?? null;
  }

  private async putStoredJob(job: StoredTemplateReviewJob): Promise<void> {
    await this.durableState.storage.put(this.storageKey(job.jobId), job);
  }

  private async putStoredJobs(jobs: StoredTemplateReviewJob[]): Promise<void> {
    await Promise.all(jobs.map((job) => this.putStoredJob(job)));
  }

  private async deleteStoredJobs(jobIds: string[]): Promise<void> {
    await Promise.all(jobIds.map((jobId) => this.durableState.storage.delete(this.storageKey(jobId))));
  }

  private storageKey(jobId: string): string {
    return `${JOB_STORAGE_PREFIX}${jobId}`;
  }
}

async function proxyToContainer(request: Request, env: Env): Promise<Response> {
  const container = getContainer(env.AnalyzerContainer, 'primary');

  try {
    const upstream = await container.fetch(request);
    const headers = new Headers(upstream.headers);
    headers.set('X-Webflow-Site-Analyzer-Host', 'cloudflare-container');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    return Response.json(
      {
        error: 'Analyzer container unavailable',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return proxyToContainer(request, env);
  },
};
