import {
  createCompanionRun,
  finalizeCompanionRun,
  recordCompanionMission,
  type CompanionActorRole,
  type CompanionExecutionAuthority,
  type CompanionMissionId,
  type CompanionRun
} from '@create-something/webflow-app-review-preflight';
import type { AuthenticatedUser, Env } from './types';

const MAX_INPUT_BYTES = 128 * 1024;
const POLICY_VERSION = 'companion-policy.v1';
const FORBIDDEN_CAPTURE_KEY = /^(?:authorization|cookie|set-cookie|headers?|requestBody|responseBody|formValues?|storageValue|password|secret|credentials?|token)$/i;
const SECRET_CAPTURE_VALUE = /(?:Bearer\s+[A-Za-z0-9._~+/=-]{8,}|-----BEGIN [^-]*PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{12,})/i;
const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024;

export class CompanionRunInputError extends Error {}
export class CompanionTrustEscalationError extends Error {}

interface VersionRow {
  review_id: string;
  version_id: string;
  artifact_sha256: string;
  owner_user_id: string;
}

interface StoredRunRow {
  run_json: string;
  owner_user_id: string;
  actor_user_id: string;
}

async function insertRun(
  run: CompanionRun,
  ownerUserId: string,
  actorUserId: string,
  env: Env
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO companion_runs
      (id, review_id, review_version_id, owner_user_id, actor_user_id, actor_role,
       evidence_trust, policy_version, status, replay_of_run_id, run_json,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      run.id,
      run.reviewId,
      run.reviewVersionId,
      ownerUserId,
      actorUserId,
      run.actorRole,
      run.evidenceTrust,
      run.policyVersion,
      run.status,
      run.replayOfRunId,
      JSON.stringify(run),
      run.createdAt,
      run.updatedAt
    )
    .run();
}

function reviewerIds(env: Env): Set<string> {
  return new Set(
    (env.REVIEWER_USER_IDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function authorityForUser(
  user: AuthenticatedUser,
  env: Env
): { actorRole: CompanionActorRole; executionAuthority: CompanionExecutionAuthority } {
  if (user.companionSession) {
    return user.companionSession.actorRole === 'reviewer'
      ? { actorRole: 'reviewer', executionAuthority: 'webflow' }
      : { actorRole: 'developer', executionAuthority: 'partner' };
  }
  return reviewerIds(env).has(user.id)
    ? { actorRole: 'reviewer', executionAuthority: 'webflow' }
    : { actorRole: 'developer', executionAuthority: 'partner' };
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text || text.length > MAX_INPUT_BYTES) {
    throw new CompanionRunInputError('Companion request is missing or too large.');
  }
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new CompanionRunInputError('Companion request must be valid JSON.');
  }
}

async function readMissionRequest(
  request: Request
): Promise<{ input: Record<string, unknown>; screenshot: File | null }> {
  if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
    return { input: await readJson(request), screenshot: null };
  }
  const form = await request.formData();
  const manifest = form.get('manifest');
  const screenshot = form.get('screenshot');
  if (typeof manifest !== 'string' || manifest.length === 0 || manifest.length > MAX_INPUT_BYTES) {
    throw new CompanionRunInputError('Mission evidence manifest is missing or too large.');
  }
  let input: Record<string, unknown>;
  try {
    const parsed = JSON.parse(manifest) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    input = parsed as Record<string, unknown>;
  } catch {
    throw new CompanionRunInputError('Mission evidence manifest must be valid JSON.');
  }
  if (
    !(screenshot instanceof File) ||
    screenshot.type !== 'image/png' ||
    screenshot.size < 1 ||
    screenshot.size > MAX_SCREENSHOT_BYTES
  ) {
    throw new CompanionRunInputError('Mission evidence requires one masked PNG screenshot under 2 MB.');
  }
  return { input, screenshot };
}

function containsForbiddenCapture(value: unknown, key = ''): boolean {
  if (FORBIDDEN_CAPTURE_KEY.test(key)) return true;
  if (typeof value === 'string') return SECRET_CAPTURE_VALUE.test(value);
  if (Array.isArray(value)) return value.some((item) => containsForbiddenCapture(item));
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([childKey, child]) =>
      containsForbiddenCapture(child, childKey)
    );
  }
  return false;
}

async function evidenceDigest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function validateCapturedEvidence(
  input: Record<string, unknown>
): Promise<{ evidence: Record<string, unknown>; digest: string; eventCount: number }> {
  if (!input.evidence || typeof input.evidence !== 'object' || Array.isArray(input.evidence)) {
    throw new CompanionRunInputError('Mission evidence must include a normalized capture manifest.');
  }
  const evidence = input.evidence as Record<string, unknown>;
  if (containsForbiddenCapture(evidence)) {
    throw new CompanionRunInputError('Mission evidence contains a prohibited secret or value field.');
  }
  if (!Array.isArray(evidence.events) || evidence.events.length < 1 || evidence.events.length > 500) {
    throw new CompanionRunInputError('Mission evidence must contain between 1 and 500 observations.');
  }
  if (!evidence.snapshot || typeof evidence.snapshot !== 'object' || Array.isArray(evidence.snapshot)) {
    throw new CompanionRunInputError('Mission evidence must include a structural browser snapshot.');
  }
  const digest = await evidenceDigest(evidence);
  if (input.evidenceDigest !== digest) {
    throw new CompanionRunInputError('Mission evidence digest does not match the submitted capture.');
  }
  if (input.eventCount !== evidence.events.length) {
    throw new CompanionRunInputError('Mission evidence count does not match the submitted capture.');
  }
  return { evidence, digest, eventCount: evidence.events.length };
}

async function findVersion(
  reviewId: string,
  reviewVersionId: string,
  env: Env,
  user: AuthenticatedUser
): Promise<VersionRow | null> {
  if (
    user.companionSession &&
    (user.companionSession.reviewId !== reviewId ||
      user.companionSession.reviewVersionId !== reviewVersionId)
  ) {
    return null;
  }
  const authority = authorityForUser(user, env);
  return env.DB.prepare(
    `SELECT rv.review_id, rv.id AS version_id, rv.artifact_sha256, r.owner_user_id
       FROM review_versions rv
       JOIN reviews r ON r.id = rv.review_id
      WHERE rv.review_id = ? AND rv.id = ?
        AND (? = 'reviewer' OR r.owner_user_id = ?)`
  )
    .bind(reviewId, reviewVersionId, authority.actorRole, user.id)
    .first<VersionRow>();
}

export async function createCompanionRunForReview(
  reviewId: string,
  request: Request,
  env: Env,
  user: AuthenticatedUser
): Promise<CompanionRun | null> {
  const input = await readJson(request);
  if (typeof input.reviewVersionId !== 'string' || !input.reviewVersionId) {
    throw new CompanionRunInputError('An exact reviewVersionId is required.');
  }
  const version = await findVersion(reviewId, input.reviewVersionId, env, user);
  if (!version) return null;

  const now = new Date().toISOString();
  const authority = authorityForUser(user, env);
  const run = createCompanionRun(
    {
      reviewId: version.review_id,
      reviewVersionId: version.version_id,
      bundleSha256: version.artifact_sha256
    },
    {
      runId: crypto.randomUUID(),
      ...authority,
      policyVersion: POLICY_VERSION,
      now
    }
  );

  await insertRun(run, version.owner_user_id, user.id, env);

  return run;
}

export async function getCompanionRun(
  runId: string,
  env: Env,
  user: AuthenticatedUser
): Promise<CompanionRun | null> {
  const authority = authorityForUser(user, env);
  const row = await env.DB.prepare(
    `SELECT run_json
       FROM companion_runs
      WHERE id = ? AND (? = 'reviewer' OR owner_user_id = ? OR actor_user_id = ?)
        AND (? IS NULL OR (review_id = ? AND review_version_id = ?))`
  )
    .bind(
      runId,
      authority.actorRole,
      user.id,
      user.id,
      user.companionSession?.reviewId ?? null,
      user.companionSession?.reviewId ?? null,
      user.companionSession?.reviewVersionId ?? null
    )
    .first<{ run_json: string }>();
  return row ? (JSON.parse(row.run_json) as CompanionRun) : null;
}

export async function replayCompanionRun(
  runId: string,
  env: Env,
  user: AuthenticatedUser
): Promise<CompanionRun | null> {
  const authority = authorityForUser(user, env);
  if (authority.actorRole !== 'reviewer') {
    throw new CompanionTrustEscalationError('Only an authenticated reviewer may create a Webflow-observed replay.');
  }
  const row = await env.DB.prepare(
    `SELECT run_json, owner_user_id FROM companion_runs
      WHERE id = ? AND (? IS NULL OR (review_id = ? AND review_version_id = ?))`
  )
    .bind(
      runId,
      user.companionSession?.reviewId ?? null,
      user.companionSession?.reviewId ?? null,
      user.companionSession?.reviewVersionId ?? null
    )
    .first<{ run_json: string; owner_user_id: string }>();
  if (!row) return null;
  const source = JSON.parse(row.run_json) as CompanionRun;
  const now = new Date().toISOString();
  const replay = createCompanionRun(
    {
      reviewId: source.reviewId,
      reviewVersionId: source.reviewVersionId,
      bundleSha256: source.bundleSha256
    },
    {
      runId: crypto.randomUUID(),
      ...authority,
      policyVersion: source.policyVersion,
      now,
      replayOfRunId: source.id
    }
  );
  await insertRun(replay, row.owner_user_id, user.id, env);
  return replay;
}

export async function completeCompanionRun(
  runId: string,
  env: Env,
  user: AuthenticatedUser
): Promise<CompanionRun | null> {
  const row = await env.DB.prepare(
    `SELECT run_json FROM companion_runs
      WHERE id = ? AND actor_user_id = ?
        AND (? IS NULL OR (review_id = ? AND review_version_id = ?))`
  )
    .bind(
      runId,
      user.id,
      user.companionSession?.reviewId ?? null,
      user.companionSession?.reviewId ?? null,
      user.companionSession?.reviewVersionId ?? null
    )
    .first<{ run_json: string }>();
  if (!row) return null;
  const updated = finalizeCompanionRun(
    JSON.parse(row.run_json) as CompanionRun,
    authorityForUser(user, env),
    new Date().toISOString()
  );
  await env.DB.prepare(
    `UPDATE companion_runs SET status = ?, run_json = ?, updated_at = ?
      WHERE id = ? AND actor_user_id = ?`
  )
    .bind(updated.status, JSON.stringify(updated), updated.updatedAt, runId, user.id)
    .run();
  return updated;
}

function missionId(value: string): CompanionMissionId {
  if (
    value !== 'install_authorize' &&
    value !== 'configure' &&
    value !== 'publish' &&
    value !== 'production_runtime' &&
    value !== 'uninstall_cleanup'
  ) {
    throw new CompanionRunInputError('Mission is not part of the active policy.');
  }
  return value;
}

export async function recordCompanionMissionEvidence(
  runId: string,
  mission: string,
  request: Request,
  env: Env,
  user: AuthenticatedUser
): Promise<CompanionRun | null> {
  const row = await env.DB.prepare(
    `SELECT run_json, owner_user_id, actor_user_id
       FROM companion_runs
      WHERE id = ? AND actor_user_id = ?
        AND (? IS NULL OR (review_id = ? AND review_version_id = ?))`
  )
    .bind(
      runId,
      user.id,
      user.companionSession?.reviewId ?? null,
      user.companionSession?.reviewId ?? null,
      user.companionSession?.reviewVersionId ?? null
    )
    .first<StoredRunRow>();
  if (!row) return null;

  const { input, screenshot } = await readMissionRequest(request);
  const authority = authorityForUser(user, env);
  const run = JSON.parse(row.run_json) as CompanionRun;
  try {
    if (input.evidenceTrust !== run.evidenceTrust) {
      throw new CompanionTrustEscalationError(
        'The browser cannot choose or elevate its evidence trust level.'
      );
    }
    const validated = await validateCapturedEvidence(input);
    if (!screenshot || input.artifactCount !== 1) {
      throw new CompanionRunInputError('A passed mission requires one validated screenshot artifact.');
    }
    const screenshotBytes = new Uint8Array(await screenshot.arrayBuffer());
    const screenshotDigest = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', screenshotBytes))
    )
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const screenshotDeclaration =
      validated.evidence.screenshot &&
      typeof validated.evidence.screenshot === 'object' &&
      !Array.isArray(validated.evidence.screenshot)
        ? (validated.evidence.screenshot as Record<string, unknown>)
        : null;
    if (
      screenshotDeclaration?.sha256 !== screenshotDigest ||
      screenshotDeclaration.bytes !== screenshot.size ||
      screenshotDeclaration.maskedFormControls !== true
    ) {
      throw new CompanionRunInputError('Screenshot artifact does not match its capture manifest.');
    }
    const updated = recordCompanionMission(
      run,
      missionId(mission),
      {
        reviewVersionId:
          typeof input.reviewVersionId === 'string' ? input.reviewVersionId : '',
        evidenceTrust:
          input.evidenceTrust === 'partner_supplied' ||
          input.evidenceTrust === 'webflow_observed' ||
          input.evidenceTrust === 'human_verified'
            ? input.evidenceTrust
            : 'human_verified',
        status:
          input.status === 'passed' || input.status === 'failed' || input.status === 'blocked'
            ? input.status
            : 'blocked',
        evidenceDigest: validated.digest,
        eventCount: validated.eventCount,
        artifactCount: 1,
        observedAt: typeof input.observedAt === 'string' ? input.observedAt : ''
      },
      authority
    );

    const receipt = updated.missions.find((candidate) => candidate.id === mission)!;
    const now = new Date().toISOString();
    const receiptId = crypto.randomUUID();
    const objectKey = `companion-runs/${run.id}/${mission}/${screenshotDigest}.png`;
    await env.ARTIFACTS.put(objectKey, screenshotBytes, {
      httpMetadata: { contentType: 'image/png' },
      customMetadata: { sha256: screenshotDigest, trust: run.evidenceTrust }
    });
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO companion_mission_receipts
          (id, run_id, mission_id, status, evidence_trust, evidence_digest,
           event_count, artifact_count, manifest_json, observed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(run_id, mission_id) DO UPDATE SET
           status = excluded.status,
           evidence_trust = excluded.evidence_trust,
           evidence_digest = excluded.evidence_digest,
           event_count = excluded.event_count,
           artifact_count = excluded.artifact_count,
           manifest_json = excluded.manifest_json,
           observed_at = excluded.observed_at,
           updated_at = excluded.updated_at`
      ).bind(
        receiptId,
        run.id,
        mission,
        receipt.status,
        receipt.receipt!.evidenceTrust,
        receipt.receipt!.evidenceDigest,
        receipt.receipt!.eventCount,
        receipt.receipt!.artifactCount,
        JSON.stringify(input),
        receipt.receipt!.observedAt,
        now,
        now
      ),
      env.DB.prepare(
        `INSERT INTO companion_evidence_artifacts
          (id, mission_receipt_id, kind, object_key, content_type, bytes, sha256, created_at)
         VALUES (?, ?, 'masked_screenshot', ?, 'image/png', ?, ?, ?)`
      ).bind(crypto.randomUUID(), receiptId, objectKey, screenshot.size, screenshotDigest, now),
      env.DB.prepare(
        `UPDATE companion_runs
            SET status = ?, run_json = ?, updated_at = ?
          WHERE id = ? AND actor_user_id = ?`
      ).bind(updated.status, JSON.stringify(updated), now, run.id, user.id)
    ]);
    return updated;
  } catch (error) {
    if (error instanceof CompanionTrustEscalationError) throw error;
    if (error instanceof Error && /trust level/i.test(error.message)) {
      throw new CompanionTrustEscalationError(error.message);
    }
    throw new CompanionRunInputError(
      error instanceof Error ? error.message : 'Mission evidence is invalid.'
    );
  }
}
