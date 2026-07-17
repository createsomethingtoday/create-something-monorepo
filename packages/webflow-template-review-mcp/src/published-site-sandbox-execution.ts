import { Buffer } from 'node:buffer';

import { Sandbox } from '@e2b/code-interpreter';

import {
  buildPublishedSiteSandboxBundle,
  type PublishedSiteSandboxBundle,
  type PublishedSiteSandboxBundleInput,
} from './published-site-sandbox-bundle.js';
import { createCollectorReceipt } from './unit-economics.js';

const PRIVATE_NETWORK_DENY_CIDRS = [
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '224.0.0.0/4',
  '240.0.0.0/4',
] as const;

const DEFAULT_SANDBOX_TIMEOUT_MS = 180_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_SCREENSHOT_BYTES = 750_000;
const DEFAULT_MAX_TOTAL_SCREENSHOT_BYTES = 2_000_000;
const DEFAULT_MAX_SCREENSHOT_COUNT = 6;
const MAX_EVIDENCE_PAGES = 25;
const MAX_LINKS_PER_PAGE = 20;
const MAX_ERRORS = 20;
const MAX_ERROR_CHARS = 1_000;

export type PublishedSiteSandboxExecutionInput = Omit<PublishedSiteSandboxBundleInput, 'sandbox_provider'> & {
  include_screenshots?: boolean;
};

export type PublishedSiteSandboxRuntimeOptions = {
  apiKey: string;
  template?: string;
  timeoutMs: number;
  requestTimeoutMs: number;
  allowInternetAccess: true;
  envs: Record<string, never>;
  metadata: Record<string, string>;
  network: {
    allowPublicTraffic: false;
    denyOut: string[];
  };
  lifecycle: {
    onTimeout: 'kill';
  };
};

type SandboxEntry = {
  type: string;
  name: string;
  path: string;
};

export interface PublishedSiteSandboxRuntime {
  sandboxId: string;
  getInfo(options?: { requestTimeoutMs?: number }): Promise<{
    startedAt: Date;
    cpuCount: number;
    memoryMB: number;
  }>;
  runCode(
    code: string,
    options?: { timeoutMs?: number; requestTimeoutMs?: number },
  ): Promise<{ error?: unknown }>;
  files: {
    exists(path: string): Promise<boolean>;
    read(path: string, options?: { format?: 'bytes' }): Promise<string | Uint8Array | ArrayBuffer>;
    list(path: string): Promise<SandboxEntry[]>;
  };
  kill(): Promise<void>;
}

export type PublishedSiteSandboxScreenshot = {
  name: string;
  mime_type: 'image/png';
  bytes: number;
  sha256?: string;
  included: boolean;
  data?: string;
  omitted_reason?: 'not_requested' | 'per_image_limit' | 'total_limit' | 'count_limit' | 'read_failed';
};

export type PublishedSiteSandboxExecutionResult = {
  ok: true;
  schema_version: 'published_site_sandbox_execution.v0.1';
  run_id: string;
  source_url: string;
  provider: 'direct_e2b';
  status: string;
  fetched_urls: string[];
  evidence: {
    static_pages: Array<Record<string, unknown>>;
    rendered: { status?: string; pages: Array<Record<string, unknown>> };
    network_summary: Record<string, unknown>;
    errors: unknown[];
    caveats: string[];
  };
  controls: Record<string, unknown>;
  sandbox: {
    id: string;
    template?: string;
    started_at: string;
    cpu_count: number;
    memory_mib: number;
  };
  cleanup: {
    killed: true;
  };
  screenshots: PublishedSiteSandboxScreenshot[];
  unit_economics_receipt: ReturnType<typeof createCollectorReceipt>;
  caveats: string[];
};

export type PublishedSiteSandboxExecutor = (
  input: PublishedSiteSandboxExecutionInput,
  config: PublishedSiteSandboxExecutionConfig,
) => Promise<PublishedSiteSandboxExecutionResult>;

export type PublishedSiteSandboxExecutionConfig = {
  apiKey?: string;
  template?: string;
  sandboxTimeoutMs?: number;
  requestTimeoutMs?: number;
  maxScreenshotBytes?: number;
  maxTotalScreenshotBytes?: number;
  maxScreenshotCount?: number;
  sandboxFactory?: (options: PublishedSiteSandboxRuntimeOptions) => Promise<PublishedSiteSandboxRuntime>;
  executor?: PublishedSiteSandboxExecutor;
};

export type PublishedSiteSandboxExecutionErrorDetails = {
  cleanup?: { killed: boolean; error?: string };
  [key: string]: unknown;
};

export class PublishedSiteSandboxExecutionError extends Error {
  constructor(
    readonly code:
      | 'PUBLISHED_SITE_SANDBOX_INPUT_INVALID'
      | 'PUBLISHED_SITE_SANDBOX_NOT_CONFIGURED'
      | 'PUBLISHED_SITE_SANDBOX_EXECUTION_FAILED'
      | 'PUBLISHED_SITE_SANDBOX_OUTPUT_INVALID'
      | 'PUBLISHED_SITE_SANDBOX_CLEANUP_FAILED',
    message: string,
    readonly status: number,
    readonly details?: PublishedSiteSandboxExecutionErrorDetails,
  ) {
    super(message);
    this.name = 'PublishedSiteSandboxExecutionError';
  }
}

function boundedInt(value: number | undefined, fallback: number, min: number, max: number): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < min || resolved > max) return fallback;
  return resolved;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown, max = MAX_ERROR_CHARS): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function compactStaticPage(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const headings = isRecord(value.heading_counts) ? value.heading_counts : {};
  return {
    ...(stringValue(value.url) ? { url: stringValue(value.url) } : {}),
    ...(numberValue(value.status) !== undefined ? { status: numberValue(value.status) } : {}),
    ...(stringValue(value.title, 300) ? { title: stringValue(value.title, 300) } : {}),
    ...(stringValue(value.meta_description, 500) ? { meta_description: stringValue(value.meta_description, 500) } : {}),
    ...(stringValue(value.open_graph_title, 300) ? { open_graph_title: stringValue(value.open_graph_title, 300) } : {}),
    ...(numberValue(value.html_bytes) !== undefined ? { html_bytes: numberValue(value.html_bytes) } : {}),
    ...(numberValue(value.link_count) !== undefined ? { link_count: numberValue(value.link_count) } : {}),
    ...(numberValue(value.image_count) !== undefined ? { image_count: numberValue(value.image_count) } : {}),
    ...(numberValue(value.missing_alt_count) !== undefined ? { missing_alt_count: numberValue(value.missing_alt_count) } : {}),
    ...(numberValue(value.form_count) !== undefined ? { form_count: numberValue(value.form_count) } : {}),
    ...(numberValue(value.button_count) !== undefined ? { button_count: numberValue(value.button_count) } : {}),
    heading_counts: headings,
    same_origin_links: Array.isArray(value.same_origin_links)
      ? value.same_origin_links.filter((item): item is string => typeof item === 'string').slice(0, MAX_LINKS_PER_PAGE)
      : [],
  };
}

function compactViewport(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const metrics = isRecord(value.metrics) ? value.metrics : {};
  return {
    ...(stringValue(value.name, 64) ? { name: stringValue(value.name, 64) } : {}),
    ...(numberValue(value.width) !== undefined ? { width: numberValue(value.width) } : {}),
    ...(numberValue(value.height) !== undefined ? { height: numberValue(value.height) } : {}),
    ...(stringValue(value.status, 64) ? { status: stringValue(value.status, 64) } : {}),
    ...(numberValue(value.latency_ms) !== undefined ? { latency_ms: numberValue(value.latency_ms) } : {}),
    ...(numberValue(value.console_error_count) !== undefined ? { console_error_count: numberValue(value.console_error_count) } : {}),
    ...(stringValue(value.screenshot_path, 500) ? { screenshot_name: String(value.screenshot_path).split('/').at(-1) } : {}),
    metrics: {
      ...(numberValue(metrics.viewport_width) !== undefined ? { viewport_width: numberValue(metrics.viewport_width) } : {}),
      ...(numberValue(metrics.viewport_height) !== undefined ? { viewport_height: numberValue(metrics.viewport_height) } : {}),
      ...(numberValue(metrics.document_width) !== undefined ? { document_width: numberValue(metrics.document_width) } : {}),
      ...(numberValue(metrics.document_height) !== undefined ? { document_height: numberValue(metrics.document_height) } : {}),
      ...(booleanValue(metrics.horizontal_overflow) !== undefined ? { horizontal_overflow: booleanValue(metrics.horizontal_overflow) } : {}),
      ...(numberValue(metrics.overflowing_element_count) !== undefined ? { overflowing_element_count: numberValue(metrics.overflowing_element_count) } : {}),
      ...(numberValue(metrics.clipped_text_candidate_count) !== undefined ? { clipped_text_candidate_count: numberValue(metrics.clipped_text_candidate_count) } : {}),
      ...(numberValue(metrics.h1_count) !== undefined ? { h1_count: numberValue(metrics.h1_count) } : {}),
      ...(numberValue(metrics.image_count) !== undefined ? { image_count: numberValue(metrics.image_count) } : {}),
      ...(numberValue(metrics.missing_alt_count) !== undefined ? { missing_alt_count: numberValue(metrics.missing_alt_count) } : {}),
      ...(numberValue(metrics.link_count) !== undefined ? { link_count: numberValue(metrics.link_count) } : {}),
      ...(numberValue(metrics.form_count) !== undefined ? { form_count: numberValue(metrics.form_count) } : {}),
    },
    ...(stringValue(value.error) ? { error: stringValue(value.error) } : {}),
  };
}

function compactRenderedPage(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  return {
    ...(stringValue(value.url) ? { url: stringValue(value.url) } : {}),
    viewports: Array.isArray(value.viewports)
      ? value.viewports.map(compactViewport).filter((item): item is Record<string, unknown> => Boolean(item)).slice(0, 6)
      : [],
  };
}

function compactEvidence(output: Record<string, unknown>) {
  const rendered = isRecord(output.rendered) ? output.rendered : {};
  return {
    static_pages: Array.isArray(output.static_pages)
      ? output.static_pages.map(compactStaticPage).filter((item): item is Record<string, unknown> => Boolean(item)).slice(0, MAX_EVIDENCE_PAGES)
      : [],
    rendered: {
      ...(stringValue(rendered.status, 64) ? { status: stringValue(rendered.status, 64) } : {}),
      pages: Array.isArray(rendered.pages)
        ? rendered.pages.map(compactRenderedPage).filter((item): item is Record<string, unknown> => Boolean(item)).slice(0, MAX_EVIDENCE_PAGES)
        : [],
    },
    network_summary: isRecord(output.network_summary) ? output.network_summary : {},
    errors: Array.isArray(output.errors) ? output.errors.slice(0, MAX_ERRORS) : [],
    caveats: Array.isArray(output.caveats)
      ? output.caveats.map((item) => stringValue(item)).filter((item): item is string => Boolean(item)).slice(0, 20)
      : [],
  };
}

function normalizeBytes(value: string | Uint8Array | ArrayBuffer): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new TextEncoder().encode(value);
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digestInput = new Uint8Array(bytes.byteLength);
  digestInput.set(bytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', digestInput.buffer);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function readScreenshots(
  sandbox: PublishedSiteSandboxRuntime,
  bundle: PublishedSiteSandboxBundle,
  input: PublishedSiteSandboxExecutionInput,
  config: PublishedSiteSandboxExecutionConfig,
): Promise<PublishedSiteSandboxScreenshot[]> {
  const screenshotDir = bundle.job.artifacts.screenshot_dir;
  if (!(await sandbox.files.exists(screenshotDir))) return [];
  const entries = (await sandbox.files.list(screenshotDir))
    .filter((entry) => entry.type === 'file' && entry.name.toLowerCase().endsWith('.png'))
    .sort((left, right) => left.name.localeCompare(right.name));
  const maxCount = boundedInt(config.maxScreenshotCount, DEFAULT_MAX_SCREENSHOT_COUNT, 0, 12);
  const maxImageBytes = boundedInt(config.maxScreenshotBytes, DEFAULT_MAX_SCREENSHOT_BYTES, 1, 3_000_000);
  const maxTotalBytes = boundedInt(config.maxTotalScreenshotBytes, DEFAULT_MAX_TOTAL_SCREENSHOT_BYTES, 1, 4_000_000);
  let includedBytes = 0;
  const screenshots: PublishedSiteSandboxScreenshot[] = [];

  for (const [index, entry] of entries.entries()) {
    if (index >= maxCount) {
      screenshots.push({ name: entry.name, mime_type: 'image/png', bytes: 0, included: false, omitted_reason: 'count_limit' });
      continue;
    }
    try {
      const bytes = normalizeBytes(await sandbox.files.read(entry.path, { format: 'bytes' }));
      const base = { name: entry.name, mime_type: 'image/png' as const, bytes: bytes.byteLength, sha256: await sha256(bytes) };
      if (!input.include_screenshots) {
        screenshots.push({ ...base, included: false, omitted_reason: 'not_requested' });
      } else if (bytes.byteLength > maxImageBytes) {
        screenshots.push({ ...base, included: false, omitted_reason: 'per_image_limit' });
      } else if (includedBytes + bytes.byteLength > maxTotalBytes) {
        screenshots.push({ ...base, included: false, omitted_reason: 'total_limit' });
      } else {
        includedBytes += bytes.byteLength;
        screenshots.push({ ...base, included: true, data: Buffer.from(bytes).toString('base64') });
      }
    } catch {
      screenshots.push({ name: entry.name, mime_type: 'image/png', bytes: 0, included: false, omitted_reason: 'read_failed' });
    }
  }
  return screenshots;
}

async function defaultSandboxFactory(options: PublishedSiteSandboxRuntimeOptions): Promise<PublishedSiteSandboxRuntime> {
  return Sandbox.create(options) as unknown as PublishedSiteSandboxRuntime;
}

function buildRuntimeOptions(
  bundle: PublishedSiteSandboxBundle,
  config: PublishedSiteSandboxExecutionConfig,
  apiKey: string,
): PublishedSiteSandboxRuntimeOptions {
  return {
    apiKey,
    ...(config.template ? { template: config.template } : {}),
    timeoutMs: boundedInt(config.sandboxTimeoutMs, DEFAULT_SANDBOX_TIMEOUT_MS, 30_000, 600_000),
    requestTimeoutMs: boundedInt(config.requestTimeoutMs, DEFAULT_REQUEST_TIMEOUT_MS, 5_000, 300_000),
    allowInternetAccess: true,
    envs: {},
    metadata: {
      lane: 'published_site_validation',
      run_id: bundle.job.run_id.slice(0, 128),
      source_host: new URL(bundle.job.source_url).hostname.slice(0, 128),
      coordinator: 'webflow-template-review-mcp',
    },
    network: {
      allowPublicTraffic: false,
      denyOut: [...PRIVATE_NETWORK_DENY_CIDRS],
    },
    lifecycle: { onTimeout: 'kill' },
  };
}

function asExecutionError(error: unknown, cleanup: { killed: boolean; error?: string }) {
  if (error instanceof PublishedSiteSandboxExecutionError) {
    return new PublishedSiteSandboxExecutionError(error.code, error.message, error.status, {
      ...error.details,
      cleanup,
    });
  }
  return new PublishedSiteSandboxExecutionError(
    'PUBLISHED_SITE_SANDBOX_EXECUTION_FAILED',
    `Published-site sandbox execution failed: ${error instanceof Error ? error.message : String(error)}`,
    502,
    { cleanup },
  );
}

export async function runPublishedSiteSandbox(
  input: PublishedSiteSandboxExecutionInput,
  config: PublishedSiteSandboxExecutionConfig = {},
): Promise<PublishedSiteSandboxExecutionResult> {
  const apiKey = config.apiKey?.trim();
  if (!apiKey) {
    throw new PublishedSiteSandboxExecutionError(
      'PUBLISHED_SITE_SANDBOX_NOT_CONFIGURED',
      'Published-site E2B execution is not configured. Set the coordinator-only E2B_API_KEY Worker secret.',
      503,
      { configured: false },
    );
  }

  let bundle: PublishedSiteSandboxBundle;
  try {
    bundle = buildPublishedSiteSandboxBundle({ ...input, sandbox_provider: 'direct_e2b' });
  } catch (error) {
    throw new PublishedSiteSandboxExecutionError(
      'PUBLISHED_SITE_SANDBOX_INPUT_INVALID',
      error instanceof Error ? error.message : String(error),
      400,
      { published_url: input.published_url },
    );
  }

  const runtimeOptions = buildRuntimeOptions(bundle, config, apiKey);
  const factory = config.sandboxFactory ?? defaultSandboxFactory;
  let sandbox: PublishedSiteSandboxRuntime | undefined;
  let runtimeInfo: Awaited<ReturnType<PublishedSiteSandboxRuntime['getInfo']>> | undefined;
  let evidenceOutput: Record<string, unknown> | undefined;
  let screenshots: PublishedSiteSandboxScreenshot[] = [];
  let pendingError: unknown;
  const cleanup: { killed: boolean; error?: string } = { killed: false };

  try {
    sandbox = await factory(runtimeOptions);
    runtimeInfo = await sandbox.getInfo({ requestTimeoutMs: runtimeOptions.requestTimeoutMs });
    const execution = await sandbox.runCode(bundle.e2b_run_code, {
      timeoutMs: bundle.job.controls.timeout_ms + 30_000,
      requestTimeoutMs: runtimeOptions.requestTimeoutMs,
    });
    if (execution.error) {
      throw new PublishedSiteSandboxExecutionError(
        'PUBLISHED_SITE_SANDBOX_EXECUTION_FAILED',
        'The fixed published-site evidence runner returned an execution error.',
        502,
        { runner_error: String(execution.error) },
      );
    }
    if (!(await sandbox.files.exists(bundle.job.artifacts.output_file))) {
      throw new PublishedSiteSandboxExecutionError(
        'PUBLISHED_SITE_SANDBOX_OUTPUT_INVALID',
        'The sandbox completed without the required evidence output file.',
        502,
      );
    }
    const rawOutput = await sandbox.files.read(bundle.job.artifacts.output_file);
    try {
      const parsed = JSON.parse(typeof rawOutput === 'string' ? rawOutput : new TextDecoder().decode(normalizeBytes(rawOutput))) as unknown;
      if (!isRecord(parsed)) throw new Error('output is not an object');
      evidenceOutput = parsed;
    } catch (error) {
      throw new PublishedSiteSandboxExecutionError(
        'PUBLISHED_SITE_SANDBOX_OUTPUT_INVALID',
        `The sandbox evidence output was not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        502,
      );
    }
    screenshots = await readScreenshots(sandbox, bundle, input, config);
  } catch (error) {
    pendingError = error;
  } finally {
    if (sandbox) {
      try {
        await sandbox.kill();
        cleanup.killed = true;
      } catch (error) {
        cleanup.error = error instanceof Error ? error.message : String(error);
      }
    }
  }

  if (!cleanup.killed && sandbox) {
    throw new PublishedSiteSandboxExecutionError(
      'PUBLISHED_SITE_SANDBOX_CLEANUP_FAILED',
      'The E2B sandbox could not be confirmed destroyed. Escalate using the returned sandbox id.',
      502,
      { sandbox_id: sandbox.sandboxId, cleanup },
    );
  }
  if (pendingError) throw asExecutionError(pendingError, cleanup);
  if (!sandbox || !runtimeInfo || !evidenceOutput) {
    throw new PublishedSiteSandboxExecutionError(
      'PUBLISHED_SITE_SANDBOX_EXECUTION_FAILED',
      'The sandbox execution ended without a complete coordinator receipt.',
      502,
      { cleanup },
    );
  }

  const completedAt = new Date().toISOString();
  const compact = compactEvidence(evidenceOutput);
  const discoveredPages = Array.isArray(evidenceOutput.discovered_pages)
    ? evidenceOutput.discovered_pages.filter((item): item is string => typeof item === 'string').slice(0, MAX_EVIDENCE_PAGES)
    : compact.static_pages.map((page) => page.url).filter((item): item is string => typeof item === 'string');

  return {
    ok: true,
    schema_version: 'published_site_sandbox_execution.v0.1',
    run_id: bundle.job.run_id,
    source_url: bundle.job.source_url,
    provider: 'direct_e2b',
    status: stringValue(evidenceOutput.status, 64) ?? 'unknown',
    fetched_urls: discoveredPages,
    evidence: compact,
    controls: bundle.job.controls,
    sandbox: {
      id: sandbox.sandboxId,
      ...(config.template ? { template: config.template } : {}),
      started_at: runtimeInfo.startedAt.toISOString(),
      cpu_count: runtimeInfo.cpuCount,
      memory_mib: runtimeInfo.memoryMB,
    },
    cleanup: { killed: true },
    screenshots,
    unit_economics_receipt: createCollectorReceipt({
      packetId: bundle.job.run_id,
      startedAt: runtimeInfo.startedAt.toISOString(),
      completedAt,
      cpuCount: runtimeInfo.cpuCount,
      memoryMiB: runtimeInfo.memoryMB,
      evidenceNote: 'Completed bounded direct E2B published-site evidence collection; sandbox cleanup was confirmed by the coordinator.',
    }),
    caveats: [
      'This is supplemental public-site evidence, not an official review decision.',
      'Designer/Admin structure, originality, licensing, visual quality, and category fit remain human-review lanes.',
      ...(compact.rendered.status === 'ok' ? [] : ['Rendered evidence was partial or unavailable; escalate remaining checks to the reviewer.']),
    ],
  };
}
