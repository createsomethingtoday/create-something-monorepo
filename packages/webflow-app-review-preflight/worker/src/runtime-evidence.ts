import type { Env } from './types';
import type { AppRuntimeEvidenceJobContract } from './runtime-jobs';
import { serviceTokenAuthorized } from './service-auth';

const MAX_EVIDENCE_BYTES = 128 * 1024;
const FORBIDDEN_FIELDS = new Set([
  'authorization',
  'cookie',
  'credentials',
  'decision',
  'officialdecision',
  'password',
  'secret',
  'token'
]);

export class RuntimeEvidenceError extends Error {}

export interface RuntimeEvidence {
  schemaVersion: 'app_runtime_evidence.v1';
  status: 'complete' | 'partial' | 'failed';
  startedAt: string;
  finishedAt: string;
  requestCount: number;
  targetResults: Array<{
    url: string;
    statusCode: number;
    contentType: string;
    bytes: number;
    sha256: string;
    consoleMessages: string[];
  }>;
  screenshots: string[];
}

function containsForbiddenField(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsForbiddenField);
  return Object.entries(value).some(([key, child]) => {
    const normalized = key.replace(/[^a-z]/gi, '').toLowerCase();
    return FORBIDDEN_FIELDS.has(normalized) || containsForbiddenField(child);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

function validIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function normalizeEvidence(
  raw: unknown,
  contract: AppRuntimeEvidenceJobContract
): RuntimeEvidence {
  if (containsForbiddenField(raw)) {
    throw new RuntimeEvidenceError(
      'Runtime evidence contains a forbidden secret or decision field.'
    );
  }
  if (
    !isRecord(raw) ||
    !exactKeys(raw, [
      'schemaVersion',
      'status',
      'startedAt',
      'finishedAt',
      'requestCount',
      'targetResults',
      'screenshots'
    ]) ||
    raw.schemaVersion !== 'app_runtime_evidence.v1' ||
    !['complete', 'partial', 'failed'].includes(String(raw.status)) ||
    !validIsoDate(raw.startedAt) ||
    !validIsoDate(raw.finishedAt) ||
    Date.parse(raw.finishedAt) < Date.parse(raw.startedAt) ||
    !Number.isInteger(raw.requestCount) ||
    Number(raw.requestCount) < 0 ||
    Number(raw.requestCount) > contract.controls.maxRequests ||
    !Array.isArray(raw.targetResults) ||
    !Array.isArray(raw.screenshots)
  ) {
    throw new RuntimeEvidenceError('Runtime evidence does not match the bounded job contract.');
  }

  const allowedUrls = new Set(contract.targets.map((target) => target.url));
  const targetResults = raw.targetResults.map((item) => {
    if (
      !isRecord(item) ||
      !exactKeys(item, [
        'url',
        'statusCode',
        'contentType',
        'bytes',
        'sha256',
        'consoleMessages'
      ]) ||
      typeof item.url !== 'string' ||
      !allowedUrls.has(item.url) ||
      !Number.isInteger(item.statusCode) ||
      Number(item.statusCode) < 100 ||
      Number(item.statusCode) > 599 ||
      typeof item.contentType !== 'string' ||
      item.contentType.length > 200 ||
      !Number.isInteger(item.bytes) ||
      Number(item.bytes) < 0 ||
      Number(item.bytes) > 25 * 1024 * 1024 ||
      typeof item.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(item.sha256) ||
      !Array.isArray(item.consoleMessages) ||
      item.consoleMessages.length > 100 ||
      item.consoleMessages.some(
        (message) => typeof message !== 'string' || message.length > 500
      )
    ) {
      throw new RuntimeEvidenceError('Runtime evidence does not match the bounded job contract.');
    }
    return {
      url: item.url,
      statusCode: Number(item.statusCode),
      contentType: item.contentType,
      bytes: Number(item.bytes),
      sha256: item.sha256.toLowerCase(),
      consoleMessages: item.consoleMessages as string[]
    };
  });

  if (
    targetResults.length > contract.targets.length ||
    raw.screenshots.length > contract.controls.viewports.length * contract.targets.length ||
    raw.screenshots.some(
      (key) =>
        typeof key !== 'string' ||
        key.length > 240 ||
        !key.startsWith('runtime-evidence/') ||
        key.includes('..')
    )
  ) {
    throw new RuntimeEvidenceError('Runtime evidence does not match the bounded job contract.');
  }

  return {
    schemaVersion: 'app_runtime_evidence.v1',
    status: raw.status as RuntimeEvidence['status'],
    startedAt: raw.startedAt,
    finishedAt: raw.finishedAt,
    requestCount: Number(raw.requestCount),
    targetResults,
    screenshots: raw.screenshots as string[]
  };
}

export async function recordRuntimeEvidence(
  runtimeJobId: string,
  request: Request,
  env: Env
): Promise<
  | { unauthorized: true }
  | { notFound: true }
  | { runtimeJobId: string; status: RuntimeEvidence['status']; evidence: RuntimeEvidence }
> {
  if (!(await serviceTokenAuthorized(request, env.E2B_COORDINATOR_TOKEN))) {
    return { unauthorized: true };
  }

  const row = await env.DB.prepare(
    `SELECT j.id, j.status, j.job_json, v.review_id, j.review_version_id
       FROM runtime_jobs j
       JOIN review_versions v ON v.id = j.review_version_id
      WHERE j.id = ?`
  )
    .bind(runtimeJobId)
    .first<{
      id: string;
      status: string;
      job_json: string;
      review_id: string;
      review_version_id: string;
    }>();
  if (!row || !['approved', 'running'].includes(row.status)) return { notFound: true };

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_EVIDENCE_BYTES) {
    throw new RuntimeEvidenceError('Runtime evidence exceeds the 128 KB limit.');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new RuntimeEvidenceError('Runtime evidence must be valid JSON.');
  }
  const evidence = normalizeEvidence(
    raw,
    JSON.parse(row.job_json) as AppRuntimeEvidenceJobContract
  );
  const now = new Date().toISOString();

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE runtime_jobs
          SET status = ?, evidence_json = ?, updated_at = ?
        WHERE id = ? AND status IN ('approved', 'running')`
    ).bind(evidence.status, JSON.stringify(evidence), now, row.id),
    env.DB.prepare(
      `INSERT INTO review_events
        (id, review_id, review_version_id, actor_user_id, event_type,
         payload_json, created_at)
       VALUES (?, ?, ?, 'e2b-coordinator', 'runtime_evidence_recorded', ?, ?)`
    ).bind(
      crypto.randomUUID(),
      row.review_id,
      row.review_version_id,
      JSON.stringify({
        runtimeJobId: row.id,
        status: evidence.status,
        requestCount: evidence.requestCount
      }),
      now
    )
  ]);

  return { runtimeJobId: row.id, status: evidence.status, evidence };
}
