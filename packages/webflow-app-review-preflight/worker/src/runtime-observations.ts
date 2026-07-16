import type {
  RuntimeArtifactPin,
  RuntimeLifecycleContract,
  RuntimeObservationJobContract,
  RuntimeObservationSummary,
  RuntimeTestPackage,
  RuntimeTestPackageInput,
  RuntimeTestPackageView
} from '@create-something/webflow-app-review-preflight';
import { serviceTokenAuthorized } from './service-auth';
import type { AuthenticatedUser, Env } from './types';

const MAX_INPUT_BYTES = 32 * 1024;
const MAX_RUNTIME_ARTIFACTS = 8;
const MAX_PACKAGE_LIFETIME_MS = 24 * 60 * 60 * 1000;
const JOB_LIFETIME_MS = 15 * 60 * 1000;
const HEX_SHA256 = /^[a-f0-9]{64}$/;
const INSTALLATION_ID = /^[a-zA-Z0-9:_-]{3,128}$/;
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const MAX_EVIDENCE_ARTIFACTS = 12;
const FORBIDDEN_EVIDENCE_KEY = /^(?:authorization|cookie|set-cookie|password|secret|token|credentials?|requestHeaders|responseHeaders|requestBody|responseBody|formValues?)$/i;
const FORBIDDEN_EVIDENCE_VALUE = /(?:Bearer\s+[A-Za-z0-9._~+/=-]{8,}|-----BEGIN [^-]*PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{12,})/i;

const ARTIFACT_POLICY: Record<
  string,
  { contentType: string; maxBytes: number; extension: string }
> = {
  screenshot_before: { contentType: 'image/png', maxBytes: 2 * 1024 * 1024, extension: 'png' },
  screenshot_after_install: { contentType: 'image/png', maxBytes: 2 * 1024 * 1024, extension: 'png' },
  screenshot_after_observation: { contentType: 'image/png', maxBytes: 2 * 1024 * 1024, extension: 'png' },
  // Legacy artifact kind retained so previously captured evidence remains readable.
  screenshot_after_cleanup: { contentType: 'image/png', maxBytes: 2 * 1024 * 1024, extension: 'png' },
  network_log: { contentType: 'application/json', maxBytes: 1024 * 1024, extension: 'json' },
  console_log: { contentType: 'application/json', maxBytes: 512 * 1024, extension: 'json' },
  dom_snapshot: { contentType: 'application/json', maxBytes: 1024 * 1024, extension: 'json' },
  storage_snapshot: { contentType: 'application/json', maxBytes: 512 * 1024, extension: 'json' },
  script_inventory: { contentType: 'application/json', maxBytes: 1024 * 1024, extension: 'json' },
  playwright_trace: { contentType: 'application/zip', maxBytes: 5 * 1024 * 1024, extension: 'zip' }
};

export class RuntimeTestPackageError extends Error {}
export class RuntimeObservationApprovalError extends Error {}
export class RuntimeObservationEvidenceError extends Error {}
export class RuntimeObservationDispatchError extends Error {}

interface ReviewVersionRow {
  review_id: string;
  version_id: string;
  artifact_sha256: string;
}

interface TestPackageRow {
  id: string;
  review_version_id: string;
  owner_user_id: string;
  status: string;
  license_expires_at: string;
  package_json: string;
}

interface ObservationJobRow {
  id: string;
  status: string;
  capability_sha256: string;
  contract_json: string;
  expires_at: string;
  owner_user_id: string;
}

interface EvidenceArtifactDeclaration {
  field: string;
  kind: string;
  fileName: string;
  contentType: string;
  bytes: number;
  sha256: string;
}

interface ValidatedEvidenceArtifact extends EvidenceArtifactDeclaration {
  file: File;
  objectKey: string;
}

type RuntimeSecurityPredicates = NonNullable<
  RuntimeObservationSummary['evidence']
>['securityPredicates'];

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b! >= 16 && b! <= 31) ||
    (a === 192 && b === 168)
  );
}

function normalizeUrl(
  value: unknown,
  env: Env,
  kind: 'sandbox' | 'runtime' | 'canary'
): URL {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) {
    throw new RuntimeTestPackageError(`${kind} URL is missing or too long.`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new RuntimeTestPackageError(`${kind} URL is invalid.`);
  }

  const host = url.hostname.toLowerCase();
  if (url.username || url.password || !host || !['http:', 'https:'].includes(url.protocol)) {
    throw new RuntimeTestPackageError(`${kind} URL must not contain credentials.`);
  }

  if (
    kind === 'sandbox' &&
    (host === 'webflow-ext.com' ||
      host.endsWith('.webflow-ext.com') ||
      host === 'design.webflow.com' ||
      host.endsWith('.design.webflow.com'))
  ) {
    throw new RuntimeTestPackageError(
      'Published runtime evidence requires a Webflow published-site origin, not Designer or a Designer Extension URL.'
    );
  }

  if (env.ENVIRONMENT === 'production') {
    if (url.protocol !== 'https:') {
      throw new RuntimeTestPackageError(`${kind} URL must use HTTPS in production.`);
    }
    if (
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.includes(':') ||
      isPrivateIpv4(host)
    ) {
      throw new RuntimeTestPackageError(`${kind} URL must be publicly routable.`);
    }
    if (
      (kind === 'sandbox' || kind === 'canary') &&
      host !== 'webflow.com' &&
      !host.endsWith('.webflow.com') &&
      host !== 'webflow.io' &&
      !host.endsWith('.webflow.io')
    ) {
      throw new RuntimeTestPackageError(
        `${kind} URL must be hosted on a Webflow-controlled origin.`
      );
    }
  }

  url.hash = '';
  return url;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length === 0 || text.length > MAX_INPUT_BYTES) {
    throw new RuntimeTestPackageError('Runtime test package input is missing or too large.');
  }
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new RuntimeTestPackageError('Runtime test package input must be valid JSON.');
  }
}

function boundedSelector(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 256) {
    throw new RuntimeTestPackageError(`${label} must be a selector under 257 characters.`);
  }
  return value.trim();
}

function parseLifecycle(value: unknown): RuntimeLifecycleContract {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RuntimeTestPackageError('Lifecycle instructions are required.');
  }
  const lifecycle = value as Record<string, unknown>;
  return {
    readySelector: boundedSelector(lifecycle.readySelector, 'Ready selector')
  };
}

function parseArtifacts(value: unknown, env: Env): RuntimeArtifactPin[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_RUNTIME_ARTIFACTS) {
    throw new RuntimeTestPackageError('Provide between 1 and 8 pinned runtime artifacts.');
  }

  const unique = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new RuntimeTestPackageError('Each runtime artifact must be an object.');
    }
    const artifact = item as Record<string, unknown>;
    const url = normalizeUrl(artifact.url, env, 'runtime');
    if (unique.has(url.toString())) {
      throw new RuntimeTestPackageError('Runtime artifact URLs must be unique.');
    }
    unique.add(url.toString());
    if (typeof artifact.sha256 !== 'string' || !HEX_SHA256.test(artifact.sha256)) {
      throw new RuntimeTestPackageError('Every runtime artifact requires a lowercase SHA-256.');
    }
    if (
      typeof artifact.integrity !== 'string' ||
      !artifact.integrity.startsWith('sha256-') ||
      artifact.integrity.length > 160
    ) {
      throw new RuntimeTestPackageError('Every runtime artifact requires a SHA-256 SRI value.');
    }
    const digestBytes = artifact.sha256.match(/.{2}/g)!.map((pair) =>
      String.fromCharCode(Number.parseInt(pair, 16))
    ).join('');
    if (artifact.integrity !== `sha256-${btoa(digestBytes)}`) {
      throw new RuntimeTestPackageError(
        'The runtime SHA-256 and SRI must describe the same SHA-256 bytes.'
      );
    }
    return {
      url: url.toString(),
      sha256: artifact.sha256,
      integrity: artifact.integrity
    };
  });
}

function parseNegativeProxyProbe(
  value: unknown,
  env: Env,
  allowedHosts: Set<string>
): RuntimeTestPackageInput['negativeProxyProbe'] {
  const probe = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
  if (
    !probe ||
    probe.method !== 'GET' ||
    typeof probe.urlTemplate !== 'string' ||
    probe.urlTemplate.length > 2048 ||
    probe.urlTemplate.split('{canaryUrl}').length !== 2
  ) {
    throw new RuntimeTestPackageError(
      'Negative proxy probe must be one bounded GET URL template containing {canaryUrl} once.'
    );
  }
  const sampleUrl = normalizeUrl(
    probe.urlTemplate.replace(
      '{canaryUrl}',
      encodeURIComponent('https://runtime-canary.webflow.com/probe')
    ),
    env,
    'runtime'
  );
  if (!allowedHosts.has(sampleUrl.hostname.toLowerCase())) {
    throw new RuntimeTestPackageError(
      'Negative proxy probe must use the sandbox or a pinned runtime host.'
    );
  }
  return { method: 'GET', urlTemplate: probe.urlTemplate };
}

function parsePackageInput(
  body: Record<string, unknown>,
  env: Env,
  nowMs: number
): Omit<RuntimeTestPackageInput, 'sandboxOwnershipConfirmed'> & {
  sandboxOwnershipConfirmed: true;
} {
  if (body.sandboxOwnershipConfirmed !== true) {
    throw new RuntimeTestPackageError(
      'Confirm that this is a dedicated Webflow sandbox installation, not a customer site.'
    );
  }
  if (
    typeof body.sandboxInstallationId !== 'string' ||
    !INSTALLATION_ID.test(body.sandboxInstallationId)
  ) {
    throw new RuntimeTestPackageError('Sandbox installation ID is invalid.');
  }
  const license = body.license;
  if (!license || typeof license !== 'object' || Array.isArray(license)) {
    throw new RuntimeTestPackageError('A time-limited installation allowlist is required.');
  }
  const licenseRecord = license as Record<string, unknown>;
  const expiresAtMs =
    typeof licenseRecord.expiresAt === 'string'
      ? Date.parse(licenseRecord.expiresAt)
      : Number.NaN;
  if (
    licenseRecord.mode !== 'installation_allowlist' ||
    !Number.isFinite(expiresAtMs) ||
    expiresAtMs <= nowMs ||
    expiresAtMs > nowMs + MAX_PACKAGE_LIFETIME_MS
  ) {
    throw new RuntimeTestPackageError(
      'The installation allowlist must expire within the next 24 hours.'
    );
  }

  const targetUrl = normalizeUrl(body.targetUrl, env, 'sandbox');
  const runtimeArtifacts = parseArtifacts(body.runtimeArtifacts, env);
  const allowedHosts = new Set([
    targetUrl.hostname.toLowerCase(),
    ...runtimeArtifacts.map((artifact) => new URL(artifact.url).hostname.toLowerCase())
  ]);

  return {
    targetUrl: targetUrl.toString(),
    sandboxInstallationId: body.sandboxInstallationId,
    sandboxOwnershipConfirmed: true,
    license: {
      mode: 'installation_allowlist',
      expiresAt: new Date(expiresAtMs).toISOString()
    },
    runtimeArtifacts,
    negativeProxyProbe: parseNegativeProxyProbe(
      body.negativeProxyProbe,
      env,
      allowedHosts
    ),
    lifecycle: parseLifecycle(body.lifecycle)
  };
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(value: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

function randomCapability(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function bearerToken(request: Request): string | null {
  const value = request.headers.get('authorization');
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length).trim() || null;
}

function constantTimeEqual(left: string, right: string): boolean {
  let mismatch = left.length ^ right.length;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function createRuntimeTestPackage(
  reviewId: string,
  request: Request,
  env: Env,
  user: AuthenticatedUser
): Promise<RuntimeTestPackage | null> {
  const row = await env.DB.prepare(
    `SELECT r.id AS review_id, v.id AS version_id, v.artifact_sha256
       FROM reviews r
       JOIN review_versions v ON v.id = r.latest_version_id
      WHERE r.id = ? AND r.owner_user_id = ?`
  )
    .bind(reviewId, user.id)
    .first<ReviewVersionRow>();
  if (!row) return null;

  const now = new Date();
  const input = parsePackageInput(await readJson(request), env, now.getTime());
  const target = new URL(input.targetUrl);
  const id = crypto.randomUUID();
  const testPackage: RuntimeTestPackage = {
    schemaVersion: 'runtime_test_package.v1',
    id,
    reviewId: row.review_id,
    reviewVersionId: row.version_id,
    bundleSha256: row.artifact_sha256,
    status: 'ready',
    trust: 'partner_supplied',
    target: { url: target.toString(), host: target.hostname.toLowerCase() },
    sandboxInstallationId: input.sandboxInstallationId,
    license: input.license,
    runtimeArtifacts: input.runtimeArtifacts,
    negativeProxyProbe: input.negativeProxyProbe,
    lifecycle: input.lifecycle,
    evidence: null,
    createdAt: now.toISOString()
  };

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO runtime_test_packages
        (id, review_version_id, owner_user_id, status, trust, target_url,
         target_host, sandbox_installation_id, license_mode,
         license_expires_at, package_json, created_at, updated_at)
       VALUES (?, ?, ?, 'ready', 'partner_supplied', ?, ?, ?,
               'installation_allowlist', ?, ?, ?, ?)`
    ).bind(
      id,
      row.version_id,
      user.id,
      testPackage.target.url,
      testPackage.target.host,
      testPackage.sandboxInstallationId,
      testPackage.license.expiresAt,
      JSON.stringify(testPackage),
      testPackage.createdAt,
      testPackage.createdAt
    ),
    env.DB.prepare(
      `INSERT INTO review_events
        (id, review_id, review_version_id, actor_user_id, event_type,
         payload_json, created_at)
       VALUES (?, ?, ?, ?, 'runtime_test_package_created', ?, ?)`
    ).bind(
      crypto.randomUUID(),
      row.review_id,
      row.version_id,
      user.id,
      JSON.stringify({
        testPackageId: id,
        sandboxInstallationId: testPackage.sandboxInstallationId,
        trust: testPackage.trust
      }),
      testPackage.createdAt
    )
  ]);

  return testPackage;
}

export async function listRuntimeTestPackages(
  reviewId: string,
  env: Env,
  user: AuthenticatedUser,
  options: { includeAll?: boolean } = {}
): Promise<RuntimeTestPackageView[] | null> {
  const owned = await env.DB.prepare(
    'SELECT id FROM reviews WHERE id = ? AND (? = 1 OR owner_user_id = ?)'
  )
    .bind(reviewId, options.includeAll ? 1 : 0, user.id)
    .first<{ id: string }>();
  if (!owned) return null;

  const rows = await env.DB.prepare(
    `SELECT p.package_json, p.status AS package_status,
            j.id AS job_id, j.status AS job_status,
            j.approved_at, j.expires_at, j.consumed_at,
            j.evidence_trust, j.evidence_manifest_json,
            (SELECT COUNT(*)
               FROM runtime_observation_artifacts a
              WHERE a.observation_job_id = j.id) AS artifact_count
       FROM runtime_test_packages p
       JOIN review_versions v ON v.id = p.review_version_id
       LEFT JOIN runtime_observation_jobs j
         ON j.id = (
           SELECT nested.id
             FROM runtime_observation_jobs nested
            WHERE nested.test_package_id = p.id
            ORDER BY nested.created_at DESC
            LIMIT 1
         )
      WHERE v.review_id = ? AND (? = 1 OR p.owner_user_id = ?)
      ORDER BY p.created_at DESC`
  )
    .bind(reviewId, options.includeAll ? 1 : 0, user.id)
    .all<{
      package_json: string;
      package_status: string;
      job_id: string | null;
      job_status: RuntimeObservationSummary['status'] | null;
      approved_at: string | null;
      expires_at: string | null;
      consumed_at: string | null;
      evidence_trust: 'webflow_observed' | null;
      evidence_manifest_json: string | null;
      artifact_count: number;
    }>();

  const views: RuntimeTestPackageView[] = [];
  for (const row of rows.results) {
    const testPackage = JSON.parse(row.package_json) as RuntimeTestPackage;
    const expired = Date.parse(testPackage.license.expiresAt) <= Date.now();
    let observation: RuntimeObservationSummary | null = null;
    if (row.job_id && row.job_status && row.approved_at && row.expires_at) {
      const manifest = row.evidence_manifest_json
        ? (JSON.parse(row.evidence_manifest_json) as {
          cleanup?: { status?: unknown; residue?: unknown };
          negativeProxyCanary?: { outcome?: unknown };
          securityEvaluation?: {
            status?: unknown;
            predicates?: unknown;
            blockers?: unknown;
          };
          })
        : null;
      const cleanupStatus = manifest?.cleanup?.status;
      const cleanupResidue = manifest?.cleanup?.residue;
      const proxyOutcome = manifest?.negativeProxyCanary?.outcome;
      const securityStatus = manifest?.securityEvaluation?.status;
      const securityPredicates = manifest?.securityEvaluation?.predicates;
      const securityBlockers = manifest?.securityEvaluation?.blockers;
      const artifactRows = row.evidence_trust === 'webflow_observed'
        ? await env.DB.prepare(
            `SELECT kind, content_type, bytes, sha256
               FROM runtime_observation_artifacts
              WHERE observation_job_id = ?
              ORDER BY created_at ASC`
          )
            .bind(row.job_id)
            .all<{
              kind: string;
              content_type: string;
              bytes: number;
              sha256: string;
            }>()
        : { results: [] };
      observation = {
        id: row.job_id,
        status: row.job_status,
        trust: row.evidence_trust,
        approvedAt: row.approved_at,
        expiresAt: row.expires_at,
        completedAt: row.consumed_at,
        evidence:
          row.evidence_trust === 'webflow_observed' &&
          (cleanupStatus === 'clean' || cleanupStatus === 'residue_detected' || cleanupStatus === 'not_tested') &&
          Array.isArray(cleanupResidue) &&
          (securityStatus === 'passed' || securityStatus === 'blocked') &&
          securityPredicates !== null && typeof securityPredicates === 'object' &&
          Array.isArray(securityBlockers) &&
          (proxyOutcome === 'blocked' || proxyOutcome === 'exposed' || proxyOutcome === 'error')
            ? {
                securityStatus,
                securityPredicates: securityPredicates as RuntimeSecurityPredicates,
                blockers: securityBlockers.filter(
                  (item): item is string => typeof item === 'string'
                ),
                cleanupStatus,
                cleanupResidue: cleanupResidue.filter(
                  (item): item is string => typeof item === 'string'
                ),
                negativeProxyOutcome: proxyOutcome,
                artifactCount: row.artifact_count,
                artifacts: artifactRows.results.map((artifact) => ({
                  kind: artifact.kind,
                  contentType: artifact.content_type,
                  bytes: artifact.bytes,
                  sha256: artifact.sha256
                }))
              }
            : null
      };
    }
    views.push({
      ...testPackage,
      status: expired && row.package_status === 'ready'
        ? 'expired'
        : (row.package_status as RuntimeTestPackageView['status']),
      observation
    });
  }
  return views;
}

export interface StoredRuntimeObservationJob {
  id: string;
  status: 'approved';
  approvedAt: string;
  capability: string;
  contract: RuntimeObservationJobContract;
}

export async function getRuntimeObservationJob(
  observationJobId: string,
  request: Request,
  env: Env
): Promise<
  | {
      id: string;
      status: 'running';
      contract: RuntimeObservationJobContract;
    }
  | { unauthorized: true }
  | { notFound: true }
  | { unavailable: true }
> {
  const supplied = bearerToken(request);
  if (!supplied) return { unauthorized: true };

  const row = await env.DB.prepare(
    `SELECT id, status, capability_sha256, contract_json, expires_at
       FROM runtime_observation_jobs
      WHERE id = ?`
  )
    .bind(observationJobId)
    .first<ObservationJobRow>();
  if (!row) return { notFound: true };

  const suppliedHash = await sha256(supplied);
  if (!constantTimeEqual(suppliedHash, row.capability_sha256)) {
    return { unauthorized: true };
  }
  if (
    !['approved', 'running'].includes(row.status) ||
    Date.parse(row.expires_at) <= Date.now()
  ) {
    return { unavailable: true };
  }

  const contract = JSON.parse(row.contract_json) as RuntimeObservationJobContract;
  if (row.status === 'approved') {
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE runtime_observation_jobs
            SET status = 'running', updated_at = ?
          WHERE id = ? AND status = 'approved'`
      ).bind(now, row.id),
      env.DB.prepare(
        `INSERT INTO review_events
          (id, review_id, review_version_id, actor_user_id, event_type,
           payload_json, created_at)
         VALUES (?, ?, ?, 'webflow-runtime-runner',
                 'runtime_observation_job_started', ?, ?)`
      ).bind(
        crypto.randomUUID(),
        contract.reviewId,
        contract.reviewVersionId,
        JSON.stringify({
          observationJobId: row.id,
          testPackageId: contract.testPackageId,
          nonce: contract.nonce
        }),
        now
      )
    ]);
  }

  return { id: row.id, status: 'running', contract };
}

function hasForbiddenEvidence(value: unknown, key = '', depth = 0): boolean {
  if (depth > 20 || FORBIDDEN_EVIDENCE_KEY.test(key)) return true;
  if (typeof value === 'string') return FORBIDDEN_EVIDENCE_VALUE.test(value);
  if (Array.isArray(value)) {
    return value.some((item) => hasForbiddenEvidence(item, '', depth + 1));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([childKey, childValue]) =>
      hasForbiddenEvidence(childValue, childKey, depth + 1)
    );
  }
  return false;
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function isPng(bytes: Uint8Array): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return signature.every((value, index) => bytes[index] === value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RuntimeObservationEvidenceError(`${label} is missing or invalid.`);
  }
  return value as Record<string, unknown>;
}

function validateManifest(
  value: unknown,
  observationJobId: string,
  contract: RuntimeObservationJobContract
): Record<string, unknown> & { artifacts: EvidenceArtifactDeclaration[] } {
  const manifest = requireRecord(value, 'Evidence manifest');
  if (hasForbiddenEvidence(manifest)) {
    throw new RuntimeObservationEvidenceError(
      'Evidence contains a forbidden secret, credential, header, body, or form-value field.'
    );
  }
  if (
    manifest.schemaVersion !== 'runtime_observation_evidence.v1' ||
    manifest.observationJobId !== observationJobId ||
    manifest.testPackageId !== contract.testPackageId ||
    manifest.reviewVersionId !== contract.reviewVersionId ||
    manifest.bundleSha256 !== contract.bundleSha256 ||
    manifest.nonce !== contract.nonce ||
    manifest.targetUrl !== contract.target.url ||
    manifest.trust !== 'webflow_observed'
  ) {
    throw new RuntimeObservationEvidenceError(
      'Evidence does not match the server-issued observation contract.'
    );
  }

  const startedAt =
    typeof manifest.startedAt === 'string' ? Date.parse(manifest.startedAt) : Number.NaN;
  const finishedAt =
    typeof manifest.finishedAt === 'string' ? Date.parse(manifest.finishedAt) : Number.NaN;
  if (
    !Number.isFinite(startedAt) ||
    !Number.isFinite(finishedAt) ||
    finishedAt < startedAt ||
    finishedAt - startedAt > contract.controls.totalTimeoutMs + 10_000
  ) {
    throw new RuntimeObservationEvidenceError('Evidence timestamps exceed the job budget.');
  }

  const redaction = requireRecord(manifest.redaction, 'Redaction receipt');
  if (
    redaction.applied !== true ||
    redaction.headersRemoved !== true ||
    redaction.cookiesRemoved !== true ||
    redaction.formValuesMasked !== true
  ) {
    throw new RuntimeObservationEvidenceError(
      'Evidence must confirm header, cookie, and form-value redaction.'
    );
  }

  if (!Array.isArray(manifest.runtimeArtifacts)) {
    throw new RuntimeObservationEvidenceError('Runtime artifact observations are required.');
  }
  for (const pin of contract.runtimeArtifacts) {
    const observation = manifest.runtimeArtifacts.find((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
      return record?.url === pin.url;
    });
    const record = requireRecord(observation, `Runtime observation for ${pin.url}`);
    if (
      record.expectedSha256 !== pin.sha256 ||
      record.integrity !== pin.integrity ||
      typeof record.loadedByPage !== 'boolean' ||
      (record.domIntegrity !== null && typeof record.domIntegrity !== 'string') ||
      (record.domCrossOrigin !== null && typeof record.domCrossOrigin !== 'string') ||
      typeof record.observedSha256 !== 'string' ||
      !HEX_SHA256.test(record.observedSha256)
    ) {
      throw new RuntimeObservationEvidenceError(
        `Runtime observation for ${pin.url} is incomplete or substituted.`
      );
    }
    const sourceMap = requireRecord(record.sourceMap, 'Source-map observation');
    if (typeof sourceMap.available !== 'boolean') {
      throw new RuntimeObservationEvidenceError('Source-map availability must be recorded.');
    }
    if (sourceMap.available === true) {
      let sourceMapUrl: URL;
      try {
        sourceMapUrl = new URL(String(sourceMap.url));
      } catch {
        throw new RuntimeObservationEvidenceError('Available source maps require a valid URL.');
      }
      if (!contract.controls.allowedHosts.includes(sourceMapUrl.hostname.toLowerCase())) {
        throw new RuntimeObservationEvidenceError('Source-map URL is outside the job allowlist.');
      }
    }
  }

  if (typeof manifest.runtimeReadyObserved !== 'boolean') {
    throw new RuntimeObservationEvidenceError(
      'Runtime-ready observation is missing.'
    );
  }

  if (
    !Array.isArray(manifest.runtimeCreatedScripts) ||
    manifest.runtimeCreatedScripts.length > 100 ||
    manifest.runtimeCreatedScripts.some(
      (item) => typeof item !== 'string' || item.length > 2048
    )
  ) {
    throw new RuntimeObservationEvidenceError(
      'Runtime-created script observations are missing or too large.'
    );
  }

  if (
    !Array.isArray(manifest.unreviewedRuntimeScripts) ||
    manifest.unreviewedRuntimeScripts.length > 100 ||
    manifest.unreviewedRuntimeScripts.some(
      (item) => typeof item !== 'string' || item.length > 2048
    )
  ) {
    throw new RuntimeObservationEvidenceError(
      'Unreviewed runtime script observations are missing or too large.'
    );
  }

  const cleanup = requireRecord(manifest.cleanup, 'Cleanup observation');
  if (!['clean', 'residue_detected', 'not_tested'].includes(String(cleanup.status))) {
    throw new RuntimeObservationEvidenceError('Cleanup status is invalid.');
  }
  if (
    !Array.isArray(cleanup.residue) ||
    cleanup.residue.length > 100 ||
    cleanup.residue.some((item) => typeof item !== 'string' || item.length > 512)
  ) {
    throw new RuntimeObservationEvidenceError('Cleanup residue is missing or too large.');
  }

  const canary = requireRecord(manifest.negativeProxyCanary, 'Negative proxy canary');
  if (
    canary.url !== contract.controls.negativeProxyCanaryUrl ||
    !['blocked', 'exposed', 'error'].includes(String(canary.outcome)) ||
    (canary.statusCode !== null &&
      (!Number.isInteger(canary.statusCode) || Number(canary.statusCode) < 0 || Number(canary.statusCode) > 599))
  ) {
    throw new RuntimeObservationEvidenceError('Negative proxy canary evidence is invalid.');
  }

  if (
    !Array.isArray(manifest.artifacts) ||
    manifest.artifacts.length === 0 ||
    manifest.artifacts.length > MAX_EVIDENCE_ARTIFACTS
  ) {
    throw new RuntimeObservationEvidenceError('Provide between 1 and 12 evidence artifacts.');
  }

  const fields = new Set<string>();
  const artifacts = manifest.artifacts.map((value) => {
    const item = requireRecord(value, 'Artifact declaration');
    if (
      typeof item.field !== 'string' ||
      !/^[a-z0-9_]+$/.test(item.field) ||
      fields.has(item.field) ||
      item.kind !== item.field ||
      typeof item.fileName !== 'string' ||
      item.fileName.length === 0 ||
      item.fileName.length > 128 ||
      /[\\/]/.test(item.fileName) ||
      typeof item.contentType !== 'string' ||
      !Number.isInteger(item.bytes) ||
      Number(item.bytes) <= 0 ||
      typeof item.sha256 !== 'string' ||
      !HEX_SHA256.test(item.sha256)
    ) {
      throw new RuntimeObservationEvidenceError('Artifact declaration is invalid.');
    }
    fields.add(item.field);
    return {
      field: item.field,
      kind: item.kind,
      fileName: item.fileName,
      contentType: item.contentType,
      bytes: Number(item.bytes),
      sha256: item.sha256
    };
  });

  return Object.assign(manifest, { artifacts });
}

export function evaluateRuntimeSecurity(
  manifest: Record<string, unknown>,
  contract: RuntimeObservationJobContract
): {
  status: 'passed' | 'blocked';
  predicates: RuntimeSecurityPredicates;
  blockers: string[];
} {
  const observations = manifest.runtimeArtifacts as Array<Record<string, unknown>>;
  const canary = manifest.negativeProxyCanary as Record<string, unknown>;
  const targetHost = new URL(contract.target.url).hostname.toLowerCase();
  const predicates: RuntimeSecurityPredicates = {
    publishedTarget:
      targetHost !== 'design.webflow.com' &&
      !targetHost.endsWith('.design.webflow.com') &&
      targetHost !== 'webflow-ext.com' &&
      !targetHost.endsWith('.webflow-ext.com'),
    runtimeReadyObserved: manifest.runtimeReadyObserved === true,
    runtimeLoadedByPage: contract.runtimeArtifacts.every((pin) =>
      observations.some((item) => item.url === pin.url && item.loadedByPage === true)
    ),
    runtimeHashMatched: contract.runtimeArtifacts.every((pin) =>
      observations.some(
        (item) => item.url === pin.url && item.observedSha256 === pin.sha256
      )
    ),
    runtimeIntegrityMatched: contract.runtimeArtifacts.every((pin) =>
      observations.some(
        (item) => item.url === pin.url && item.domIntegrity === pin.integrity
      )
    ),
    noRuntimeCreatedScripts:
      Array.isArray(manifest.runtimeCreatedScripts) &&
      manifest.runtimeCreatedScripts.length === 0,
    noUnreviewedRuntimeScripts:
      Array.isArray(manifest.unreviewedRuntimeScripts) &&
      manifest.unreviewedRuntimeScripts.length === 0,
    negativeProxyBlocked: canary.outcome === 'blocked'
  };
  const blockers = [
    !predicates.publishedTarget ? 'Use a real published Webflow test-site URL.' : null,
    !predicates.runtimeReadyObserved ? 'The runtime-ready signal was not observed on the published page.' : null,
    !predicates.runtimeLoadedByPage ? 'The pinned runtime was not loaded by the published page.' : null,
    !predicates.runtimeHashMatched ? 'The executed runtime bytes did not match the pinned SHA-256.' : null,
    !predicates.runtimeIntegrityMatched ? 'The runtime script did not carry the pinned SRI value.' : null,
    !predicates.noRuntimeCreatedScripts ? 'The runtime created additional script elements at execution time.' : null,
    !predicates.noUnreviewedRuntimeScripts ? 'The runtime loaded additional unreviewed scripts.' : null,
    !predicates.negativeProxyBlocked ? 'The negative proxy canary was not blocked.' : null
  ].filter((item): item is string => item !== null);
  return {
    status: blockers.length === 0 ? 'passed' : 'blocked',
    predicates,
    blockers
  };
}

async function validateEvidenceArtifacts(
  form: FormData,
  declarations: EvidenceArtifactDeclaration[],
  ownerUserId: string,
  contract: RuntimeObservationJobContract,
  observationJobId: string
): Promise<ValidatedEvidenceArtifact[]> {
  const declaredFields = new Set(declarations.map((item) => item.field));
  for (const [field] of form.entries()) {
    if (field !== 'manifest' && !declaredFields.has(field)) {
      throw new RuntimeObservationEvidenceError(`Unexpected artifact field: ${field}.`);
    }
  }

  let totalBytes = 0;
  const result: ValidatedEvidenceArtifact[] = [];
  for (const declaration of declarations) {
    const values = form.getAll(declaration.field);
    if (values.length !== 1 || !(values[0] instanceof File)) {
      throw new RuntimeObservationEvidenceError(
        `Artifact ${declaration.field} must contain exactly one file.`
      );
    }
    const file = values[0];
    const policy = ARTIFACT_POLICY[declaration.kind];
    if (
      !policy ||
      declaration.contentType !== policy.contentType ||
      file.type !== policy.contentType ||
      file.name !== declaration.fileName ||
      file.size !== declaration.bytes ||
      file.size > policy.maxBytes
    ) {
      throw new RuntimeObservationEvidenceError(
        `Artifact ${declaration.field} violates its type or size policy.`
      );
    }
    totalBytes += file.size;
    if (totalBytes > MAX_EVIDENCE_BYTES) {
      throw new RuntimeObservationEvidenceError('Evidence artifacts exceed the 10 MB limit.');
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const digest = hex(await crypto.subtle.digest('SHA-256', bytes));
    if (!constantTimeEqual(digest, declaration.sha256)) {
      throw new RuntimeObservationEvidenceError(
        `Artifact ${declaration.field} does not match its SHA-256.`
      );
    }
    if (policy.contentType === 'image/png' && !isPng(bytes)) {
      throw new RuntimeObservationEvidenceError(
        `Artifact ${declaration.field} is not a valid PNG payload.`
      );
    }
    if (policy.contentType === 'application/json') {
      let parsed: unknown;
      try {
        parsed = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        throw new RuntimeObservationEvidenceError(
          `Artifact ${declaration.field} must contain valid JSON.`
        );
      }
      if (hasForbiddenEvidence(parsed)) {
        throw new RuntimeObservationEvidenceError(
          `Artifact ${declaration.field} contains forbidden sensitive data.`
        );
      }
    }

    const objectKey = [
      'runtime-observations',
      safePathSegment(ownerUserId),
      contract.reviewId,
      contract.reviewVersionId,
      contract.testPackageId,
      observationJobId,
      `${declaration.kind}-${declaration.sha256}.${policy.extension}`
    ].join('/');
    result.push({ ...declaration, file, objectKey });
  }
  return result;
}

export async function recordRuntimeObservationEvidence(
  observationJobId: string,
  request: Request,
  env: Env
): Promise<
  | {
      observationJobId: string;
      status: 'complete';
      trust: 'webflow_observed';
      security: {
        status: 'passed' | 'blocked';
        predicates: RuntimeSecurityPredicates;
        blockers: string[];
      };
      artifacts: Array<{ kind: string; sha256: string; objectKey: string }>;
    }
  | { unauthorized: true }
  | { notFound: true }
  | { unavailable: true }
> {
  const supplied = bearerToken(request);
  if (!supplied) return { unauthorized: true };

  const row = await env.DB.prepare(
    `SELECT j.id, j.status, j.capability_sha256, j.contract_json,
            j.expires_at, p.owner_user_id
       FROM runtime_observation_jobs j
       JOIN runtime_test_packages p ON p.id = j.test_package_id
      WHERE j.id = ?`
  )
    .bind(observationJobId)
    .first<ObservationJobRow>();
  if (!row) return { notFound: true };
  if (!constantTimeEqual(await sha256(supplied), row.capability_sha256)) {
    return { unauthorized: true };
  }
  if (row.status !== 'running' || Date.parse(row.expires_at) <= Date.now()) {
    return { unavailable: true };
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_EVIDENCE_BYTES + 512 * 1024) {
    throw new RuntimeObservationEvidenceError('Evidence upload exceeds the request limit.');
  }
  const form = await request.formData();
  const manifestValue = form.get('manifest');
  if (typeof manifestValue !== 'string' || manifestValue.length > 128 * 1024) {
    throw new RuntimeObservationEvidenceError('Evidence manifest is missing or too large.');
  }

  let parsedManifest: unknown;
  try {
    parsedManifest = JSON.parse(manifestValue);
  } catch {
    throw new RuntimeObservationEvidenceError('Evidence manifest must be valid JSON.');
  }
  const contract = JSON.parse(row.contract_json) as RuntimeObservationJobContract;
  const validatedManifest = validateManifest(parsedManifest, observationJobId, contract);
  const manifest = Object.assign(validatedManifest, {
    securityEvaluation: evaluateRuntimeSecurity(validatedManifest, contract)
  });
  const artifacts = await validateEvidenceArtifacts(
    form,
    manifest.artifacts,
    row.owner_user_id,
    contract,
    observationJobId
  );

  const claim = await env.DB.prepare(
    `UPDATE runtime_observation_jobs
        SET status = 'uploading', updated_at = ?
      WHERE id = ? AND status = 'running' AND evidence_manifest_json IS NULL`
  )
    .bind(new Date().toISOString(), observationJobId)
    .run();
  if (claim.meta.changes !== 1) return { unavailable: true };

  const uploadedKeys: string[] = [];
  try {
    for (const artifact of artifacts) {
      await env.ARTIFACTS.put(artifact.objectKey, artifact.file, {
        httpMetadata: { contentType: artifact.contentType },
        customMetadata: {
          sha256: artifact.sha256,
          kind: artifact.kind,
          observationJobId,
          trust: 'webflow_observed'
        }
      });
      uploadedKeys.push(artifact.objectKey);
    }

    const completedAt = new Date().toISOString();
    await env.DB.batch([
      ...artifacts.map((artifact) =>
        env.DB.prepare(
          `INSERT INTO runtime_observation_artifacts
            (id, observation_job_id, kind, object_key, content_type,
             bytes, sha256, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          crypto.randomUUID(),
          observationJobId,
          artifact.kind,
          artifact.objectKey,
          artifact.contentType,
          artifact.bytes,
          artifact.sha256,
          completedAt
        )
      ),
      env.DB.prepare(
        `UPDATE runtime_observation_jobs
            SET status = 'complete', consumed_at = ?,
                evidence_trust = 'webflow_observed',
                evidence_manifest_json = ?, updated_at = ?
          WHERE id = ? AND status = 'uploading'`
      ).bind(completedAt, JSON.stringify(manifest), completedAt, observationJobId),
      env.DB.prepare(
        `INSERT INTO review_events
          (id, review_id, review_version_id, actor_user_id, event_type,
           payload_json, created_at)
         VALUES (?, ?, ?, 'webflow-runtime-runner',
                 'runtime_observation_completed', ?, ?)`
      ).bind(
        crypto.randomUUID(),
        contract.reviewId,
        contract.reviewVersionId,
        JSON.stringify({
          observationJobId,
          testPackageId: contract.testPackageId,
          trust: 'webflow_observed',
          artifactCount: artifacts.length,
          securityStatus: manifest.securityEvaluation.status,
          securityBlockers: manifest.securityEvaluation.blockers
        }),
        completedAt
      )
    ]);
  } catch (error) {
    await Promise.all(uploadedKeys.map((key) => env.ARTIFACTS.delete(key)));
    await env.DB.prepare(
      `UPDATE runtime_observation_jobs
          SET status = 'running', updated_at = ?
        WHERE id = ? AND status = 'uploading' AND evidence_manifest_json IS NULL`
    )
      .bind(new Date().toISOString(), observationJobId)
      .run();
    throw error;
  }

  return {
    observationJobId,
    status: 'complete',
    trust: 'webflow_observed',
    security: manifest.securityEvaluation,
    artifacts: artifacts.map((artifact) => ({
      kind: artifact.kind,
      sha256: artifact.sha256,
      objectKey: artifact.objectKey
    }))
  };
}

async function issueRuntimeObservationJob(
  testPackageId: string,
  env: Env
): Promise<StoredRuntimeObservationJob | null> {
  const row = await env.DB.prepare(
    `SELECT id, review_version_id, owner_user_id, status,
            license_expires_at, package_json
       FROM runtime_test_packages
      WHERE id = ?`
  )
    .bind(testPackageId)
    .first<TestPackageRow>();
  if (!row) return null;

  const now = new Date();
  const licenseExpiresAt = Date.parse(row.license_expires_at);
  if (row.status !== 'ready' || !Number.isFinite(licenseExpiresAt) || licenseExpiresAt <= now.getTime()) {
    throw new RuntimeObservationApprovalError(
      'The runtime test package is expired or no longer available.'
    );
  }

  const testPackage = JSON.parse(row.package_json) as RuntimeTestPackage;
  let canaryUrl: URL;
  try {
    canaryUrl = normalizeUrl(env.RUNTIME_CANARY_URL, env, 'canary');
  } catch (error) {
    throw new RuntimeObservationApprovalError(
      error instanceof Error ? error.message : 'Runtime canary is not configured.'
    );
  }

  const capability = randomCapability();
  const capabilitySha256 = await sha256(capability);
  const nonce = crypto.randomUUID();
  const expiresAt = new Date(
    Math.min(licenseExpiresAt, now.getTime() + JOB_LIFETIME_MS)
  ).toISOString();
  const allowedHosts = [
    testPackage.target.host,
    ...testPackage.runtimeArtifacts.map((artifact) => new URL(artifact.url).hostname.toLowerCase())
  ];
  const contract: RuntimeObservationJobContract = {
    schemaVersion: 'runtime_observation_job.v1',
    purpose: 'webflow_observation',
    testPackageId: testPackage.id,
    reviewId: testPackage.reviewId,
    reviewVersionId: testPackage.reviewVersionId,
    bundleSha256: testPackage.bundleSha256,
    nonce,
    target: testPackage.target,
    sandboxInstallationId: testPackage.sandboxInstallationId,
    runtimeArtifacts: testPackage.runtimeArtifacts,
    negativeProxyProbe: {
      method: 'GET',
      url: testPackage.negativeProxyProbe.urlTemplate.replace(
        '{canaryUrl}',
        encodeURIComponent(canaryUrl.toString())
      )
    },
    lifecycle: testPackage.lifecycle,
    controls: {
      allowedHosts: [...new Set(allowedHosts)].sort(),
      maxRequests: 100,
      requestTimeoutMs: 10_000,
      totalTimeoutMs: 90_000,
      networkMode: 'exact_host_allowlist',
      evidenceTrust: 'webflow_observed',
      negativeProxyCanaryUrl: canaryUrl.toString()
    },
    boundaries: {
      partnerCanSubmitEvidence: false,
      officialDecision: null,
      canWriteGovernance: false,
      acceptsAccountCredentials: false
    },
    expiresAt
  };
  const id = crypto.randomUUID();
  const approvedAt = now.toISOString();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO runtime_observation_jobs
        (id, test_package_id, status, capability_sha256, nonce,
         contract_json, approved_by_actor, approved_at, expires_at,
         consumed_at, evidence_trust, evidence_manifest_json,
         created_at, updated_at)
       VALUES (?, ?, 'approved', ?, ?, ?, 'webflow-runtime-coordinator',
               ?, ?, NULL, NULL, NULL, ?, ?)`
    ).bind(
      id,
      testPackage.id,
      capabilitySha256,
      nonce,
      JSON.stringify(contract),
      approvedAt,
      expiresAt,
      approvedAt,
      approvedAt
    ),
    env.DB.prepare(
      `INSERT INTO review_events
        (id, review_id, review_version_id, actor_user_id, event_type,
         payload_json, created_at)
       VALUES (?, ?, ?, 'webflow-runtime-coordinator',
               'runtime_observation_job_approved', ?, ?)`
    ).bind(
      crypto.randomUUID(),
      testPackage.reviewId,
      testPackage.reviewVersionId,
      JSON.stringify({
        observationJobId: id,
        testPackageId: testPackage.id,
        nonce,
        expiresAt
      }),
      approvedAt
    )
  ]);

  return { id, status: 'approved', approvedAt, capability, contract };
}

export async function approveRuntimeObservationJob(
  testPackageId: string,
  request: Request,
  env: Env
): Promise<StoredRuntimeObservationJob | { unauthorized: true } | null> {
  if (!(await serviceTokenAuthorized(request, env.E2B_COORDINATOR_TOKEN))) {
    return { unauthorized: true };
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (error) {
    if (error instanceof RuntimeTestPackageError) {
      throw new RuntimeObservationApprovalError(
        'Explicit Webflow approval and sandbox ownership verification are required.'
      );
    }
    throw error;
  }
  if (body.approved !== true || body.sandboxOwnershipVerified !== true) {
    throw new RuntimeObservationApprovalError(
      'Explicit Webflow approval and sandbox ownership verification are required.'
    );
  }

  return issueRuntimeObservationJob(testPackageId, env);
}

async function dispatchRuntimeObservationJob(
  request: Request,
  job: StoredRuntimeObservationJob,
  env: Env
): Promise<void> {
  if (!env.RUNTIME_OBSERVATION_DISPATCH_URL || !env.RUNTIME_OBSERVATION_DISPATCH_TOKEN) {
    throw new RuntimeObservationDispatchError(
      'The runtime runner is not configured. Your test package remains ready; ask a reviewer to configure the server-owned runner.'
    );
  }

  let dispatchUrl: URL;
  try {
    dispatchUrl = new URL(env.RUNTIME_OBSERVATION_DISPATCH_URL);
  } catch {
    throw new RuntimeObservationDispatchError('The runtime runner endpoint is invalid.');
  }
  if (env.ENVIRONMENT === 'production' && dispatchUrl.protocol !== 'https:') {
    throw new RuntimeObservationDispatchError('The runtime runner endpoint must use HTTPS.');
  }

  let response: Response;
  try {
    response = await fetch(new Request(dispatchUrl.toString(), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RUNTIME_OBSERVATION_DISPATCH_TOKEN}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        observationJobId: job.id,
        apiBaseUrl: new URL(request.url).origin,
        capability: job.capability
      })
    }));
  } catch {
    throw new RuntimeObservationDispatchError('The runtime runner could not be reached.');
  }
  if (!response.ok) {
    throw new RuntimeObservationDispatchError('The runtime runner rejected this test request.');
  }
}

export async function requestRuntimeObservationRun(
  testPackageId: string,
  request: Request,
  env: Env,
  user: AuthenticatedUser,
  options: {
    includeAll?: boolean;
    eventType?: 'runtime_observation_run_requested' | 'runtime_observation_replay_requested';
  } = {}
): Promise<
  | Omit<StoredRuntimeObservationJob, 'capability' | 'contract'>
  | { notFound: true }
> {
  const owned = await env.DB.prepare(
    'SELECT id FROM runtime_test_packages WHERE id = ? AND (? = 1 OR owner_user_id = ?)'
  )
    .bind(testPackageId, options.includeAll ? 1 : 0, user.id)
    .first<{ id: string }>();
  if (!owned) return { notFound: true };

  const job = await issueRuntimeObservationJob(testPackageId, env);
  if (!job) return { notFound: true };

  try {
    await dispatchRuntimeObservationJob(request, job, env);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The runtime runner could not be started.';
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE runtime_observation_jobs
            SET status = 'failed', updated_at = ?
          WHERE id = ? AND status = 'approved'`
      ).bind(now, job.id),
      env.DB.prepare(
        `INSERT INTO review_events
          (id, review_id, review_version_id, actor_user_id, event_type,
           payload_json, created_at)
         VALUES (?, ?, ?, ?, 'runtime_observation_dispatch_failed', ?, ?)`
      ).bind(
        crypto.randomUUID(),
        job.contract.reviewId,
        job.contract.reviewVersionId,
        user.id,
        JSON.stringify({ observationJobId: job.id, testPackageId, message }),
        now
      )
    ]);
    throw error;
  }

  await env.DB.prepare(
    `INSERT INTO review_events
      (id, review_id, review_version_id, actor_user_id, event_type,
       payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      job.contract.reviewId,
      job.contract.reviewVersionId,
      user.id,
      options.eventType ?? 'runtime_observation_run_requested',
      JSON.stringify({ observationJobId: job.id, testPackageId }),
      new Date().toISOString()
    )
    .run();

  return { id: job.id, status: job.status, approvedAt: job.approvedAt };
}

export async function requestReviewerRuntimeObservationReplay(
  testPackageId: string,
  request: Request,
  env: Env,
  user: AuthenticatedUser
): ReturnType<typeof requestRuntimeObservationRun> {
  if (
    user.companionSession?.actorRole !== 'reviewer' ||
    user.companionSession.runtimeTestPackageId !== testPackageId
  ) {
    throw new RuntimeObservationApprovalError(
      'Only an authenticated reviewer may replay this exact runtime test package.'
    );
  }
  return requestRuntimeObservationRun(testPackageId, request, env, user, {
    includeAll: true,
    eventType: 'runtime_observation_replay_requested'
  });
}
