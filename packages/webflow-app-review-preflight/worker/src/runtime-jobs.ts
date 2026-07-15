import type { BundleReview } from '@create-something/webflow-app-review-preflight';
import type { AuthenticatedUser, Env } from './types';

const MAX_RUNTIME_TARGETS = 8;

export class RuntimeApprovalError extends Error {}

export interface AppRuntimeEvidenceJobContract {
  schemaVersion: 'app_runtime_evidence_job.v1';
  purpose: 'evidence_only';
  reviewVersionId: string;
  targets: Array<{ url: string; host: string }>;
  manualVerification: string[];
  controls: {
    allowedHosts: string[];
    maxRequests: 20;
    requestTimeoutMs: 10_000;
    totalTimeoutMs: 60_000;
    networkMode: 'exact_host_allowlist';
    credentials: 'none';
    viewports: Array<{ width: number; height: number }>;
  };
  evidenceOutputs: Array<'request_log' | 'response_metadata' | 'console_log' | 'screenshots'>;
  boundaries: {
    officialDecision: null;
    canWriteGovernance: false;
    acceptsSecrets: false;
  };
}

export interface StoredRuntimeJob {
  id: string;
  status: 'approved';
  approvedAt: string;
  contract: AppRuntimeEvidenceJobContract;
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b! >= 16 && b! <= 31) ||
    (a === 192 && b === 168)
  );
}

function publicRuntimeTarget(reference: string): { url: string; host: string } | null {
  if (reference.includes('{') || reference.includes('}')) return null;
  try {
    const url = new URL(reference);
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !hostname ||
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      hostname.includes(':') ||
      isPrivateIpv4(hostname)
    ) {
      return null;
    }
    url.hash = '';
    return { url: url.toString(), host: hostname };
  } catch {
    return null;
  }
}

function buildContract(
  reviewVersionId: string,
  result: BundleReview
): AppRuntimeEvidenceJobContract {
  const targets = new Map<string, { url: string; host: string }>();
  let excluded = 0;

  for (const reference of result.runtime.references) {
    const target = publicRuntimeTarget(reference);
    if (!target || targets.size >= MAX_RUNTIME_TARGETS) {
      excluded += 1;
      continue;
    }
    targets.set(target.url, target);
  }

  const manualVerification: string[] = [];
  if (targets.size === 0) {
    manualVerification.push('No public, credential-free runtime URL is available for automated execution.');
  }
  if (excluded > 0) {
    manualVerification.push(
      `${excluded} runtime reference${excluded === 1 ? '' : 's'} require manual verification because they are templated, private, credentialed, or outside the target cap.`
    );
  }
  if (result.runtime.manualVerificationRequired) {
    manualVerification.push(
      'Licensed, account-gated, and end-to-end installation behavior remains a human verification step.'
    );
  }

  const executableTargets = [...targets.values()];
  return {
    schemaVersion: 'app_runtime_evidence_job.v1',
    purpose: 'evidence_only',
    reviewVersionId,
    targets: executableTargets,
    manualVerification,
    controls: {
      allowedHosts: [...new Set(executableTargets.map((target) => target.host))].sort(),
      maxRequests: 20,
      requestTimeoutMs: 10_000,
      totalTimeoutMs: 60_000,
      networkMode: 'exact_host_allowlist',
      credentials: 'none',
      viewports: [
        { width: 1280, height: 720 },
        { width: 390, height: 844 }
      ]
    },
    evidenceOutputs: ['request_log', 'response_metadata', 'console_log', 'screenshots'],
    boundaries: {
      officialDecision: null,
      canWriteGovernance: false,
      acceptsSecrets: false
    }
  };
}

interface ReviewVersionRow {
  review_id: string;
  version_id: string;
  review_json: string;
}

export async function approveRuntimeJob(
  reviewId: string,
  request: Request,
  env: Env,
  user: AuthenticatedUser
): Promise<StoredRuntimeJob | null> {
  let body: { approved?: unknown };
  try {
    body = (await request.json()) as { approved?: unknown };
  } catch {
    throw new RuntimeApprovalError(
      'Approve the bounded sandbox test before a runtime job is prepared.'
    );
  }
  if (body.approved !== true) {
    throw new RuntimeApprovalError(
      'Approve the bounded sandbox test before a runtime job is prepared.'
    );
  }

  const row = await env.DB.prepare(
    `SELECT r.id AS review_id, v.id AS version_id, v.review_json
       FROM reviews r
       JOIN review_versions v ON v.id = r.latest_version_id
      WHERE r.id = ? AND r.owner_user_id = ?`
  )
    .bind(reviewId, user.id)
    .first<ReviewVersionRow>();
  if (!row) return null;

  const existing = await env.DB.prepare(
    `SELECT id, status, approved_at, job_json
       FROM runtime_jobs
      WHERE review_version_id = ? AND approved_by_user_id = ?
      ORDER BY created_at DESC
      LIMIT 1`
  )
    .bind(row.version_id, user.id)
    .first<{
      id: string;
      status: string;
      approved_at: string;
      job_json: string;
    }>();
  if (existing) {
    return {
      id: existing.id,
      status: 'approved',
      approvedAt: existing.approved_at,
      contract: JSON.parse(existing.job_json) as AppRuntimeEvidenceJobContract
    };
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const contract = buildContract(
    row.version_id,
    JSON.parse(row.review_json) as BundleReview
  );

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO runtime_jobs
        (id, review_version_id, status, approved_by_user_id, approved_at,
         job_json, evidence_json, created_at, updated_at)
       VALUES (?, ?, 'approved', ?, ?, ?, NULL, ?, ?)`
    ).bind(id, row.version_id, user.id, now, JSON.stringify(contract), now, now),
    env.DB.prepare(
      `INSERT INTO review_events
        (id, review_id, review_version_id, actor_user_id, event_type,
         payload_json, created_at)
       VALUES (?, ?, ?, ?, 'runtime_job_approved', ?, ?)`
    ).bind(
      crypto.randomUUID(),
      row.review_id,
      row.version_id,
      user.id,
      JSON.stringify({ runtimeJobId: id, targetCount: contract.targets.length }),
      now
    )
  ]);

  return { id, status: 'approved', approvedAt: now, contract };
}
