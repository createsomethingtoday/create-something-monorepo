import { createHash, randomUUID } from 'node:crypto';

import type { D1Database, D1PreparedStatement } from '@create-something/mcp-core';

import type {
  ZipRecruiterApplyWebhookPayload,
  ZipRecruiterHiringSignal,
  ZipRecruiterJob,
  ZipRecruiterQuestions,
} from './schemas/index.js';
import type {
  R2BucketLike,
  StaffingApplicationRecord,
  StaffingCandidateRecord,
  StaffingJobRecord,
} from './types.js';

interface JobJoinRow extends StaffingJobRecord {
  ziprecruiter_job_id: string | null;
  sync_status: string | null;
  last_payload_hash: string | null;
  questions_json: string | null;
  last_synced_at: string | null;
}

interface ApplicationJoinRow extends StaffingApplicationRecord {
  candidate_full_name: string | null;
  candidate_email: string | null;
  candidate_phone: string | null;
  job_title: string | null;
  ziprecruiter_job_id: string | null;
}

type BatchCapableD1Database = D1Database & {
  batch?: (statements: D1PreparedStatement[]) => Promise<unknown>;
};

async function runStatements(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  const batch = (db as BatchCapableD1Database).batch;
  if (typeof batch === 'function') {
    await batch.call(db, statements);
    return;
  }

  for (const statement of statements) {
    await statement.run();
  }
}

export interface JobDetail {
  id: string;
  employer_id: string;
  employer_name: string | null;
  title: string;
  job_type: string;
  status: string;
  country: string;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  description: string;
  apply_url: string | null;
  requirements: string | null;
  specialty: string | null;
  discipline: string | null;
  shift: string | null;
  compensation_min: number | null;
  compensation_max: number | null;
  compensation_currency: string | null;
  starts_on: string | null;
  source: string;
  partner_attributes: Record<string, string>;
  metadata: Record<string, unknown>;
  ziprecruiter_job_id: string | null;
  sync_status: string | null;
  last_payload_hash: string | null;
  questions: ZipRecruiterQuestions;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationDetail {
  id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  status_name: string | null;
  status_group: string | null;
  rejection_reason: string | null;
  source: string;
  external_application_id: string | null;
  ziprecruiter_response_id: string | null;
  zr_application_id: string | null;
  answers: unknown;
  attributes: unknown;
  profile: unknown;
  additional_data: unknown;
  resume_sha256: string | null;
  resume_artifact_ref: string | null;
  created_at: string;
  updated_at: string;
  last_event_at: string;
  candidate: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
  job: {
    id: string;
    title: string | null;
    ziprecruiter_job_id: string | null;
  };
}

type UpsertJobArgs = {
  localJobId: string;
  remoteJobId: string;
  payload: ZipRecruiterJob;
  status?: string;
  syncStatus?: string;
  questions?: ZipRecruiterQuestions | null;
};

type ApplyWebhookPersistenceArgs = {
  db: D1Database;
  storage?: R2BucketLike;
  payload: ZipRecruiterApplyWebhookPayload;
  rawPayload: string;
  signature: {
    enabled: boolean;
    verified: boolean;
    reason?: string;
    version?: string | null;
    timestamp?: string | null;
  };
};

function parseJsonOr<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringify(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value);
}

function sha256Hex(input: string | Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

function nowIso(): string {
  return new Date().toISOString();
}

function decodeBase64(input: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(input, 'base64'));
  }

  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function deriveSpecialties(payload: ZipRecruiterApplyWebhookPayload): string[] {
  const specialties = new Set<string>();

  const trackingCode = payload.attributes?.tracking_code;
  if (trackingCode) specialties.add(trackingCode);

  const jobRecords = Array.isArray(payload.profile?.job_records)
    ? payload.profile?.job_records
    : [];
  for (const record of jobRecords) {
    const title = typeof record?.title === 'string' ? record.title.trim() : '';
    if (title) specialties.add(title);
  }

  return Array.from(specialties);
}

function deriveLicenseSummary(payload: ZipRecruiterApplyWebhookPayload): Array<Record<string, unknown>> {
  const records = Array.isArray(payload.profile?.license_certification_records)
    ? payload.profile?.license_certification_records
    : [];

  return records.slice(0, 10).map((record) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      return {};
    }
    return record as Record<string, unknown>;
  });
}

async function uploadResumeArtifact(
  storage: R2BucketLike | undefined,
  resumeBase64: string | undefined,
  responseId: string,
): Promise<{ key: string | null; sha256: string | null }> {
  if (!resumeBase64) {
    return { key: null, sha256: null };
  }

  const bytes = decodeBase64(resumeBase64);
  const sha256 = sha256Hex(bytes);
  const key = `ziprecruiter/resumes/${sha256}.pdf`;

  if (storage) {
    await storage.put(key, bytes, {
      httpMetadata: { contentType: 'application/pdf' },
      customMetadata: {
        source: 'ziprecruiter',
        responseId,
        sha256,
        uploadedAt: nowIso(),
      },
    });
  }

  return { key: storage ? key : null, sha256 };
}

export function generateLocalId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`;
}

function mapJobRow(row: JobJoinRow): JobDetail {
  return {
    id: row.id,
    employer_id: row.employer_id,
    employer_name: row.employer_name,
    title: row.title,
    job_type: row.job_type,
    status: row.status,
    country: row.country,
    city: row.city,
    state: row.state,
    postal_code: row.postal_code,
    description: row.description,
    apply_url: row.apply_url,
    requirements: row.requirements,
    specialty: row.specialty,
    discipline: row.discipline,
    shift: row.shift,
    compensation_min: row.compensation_min,
    compensation_max: row.compensation_max,
    compensation_currency: row.compensation_currency,
    starts_on: row.starts_on,
    source: row.source,
    partner_attributes: parseJsonOr<Record<string, string>>(row.partner_attributes_json, {}),
    metadata: parseJsonOr<Record<string, unknown>>(row.metadata_json, {}),
    ziprecruiter_job_id: row.ziprecruiter_job_id,
    sync_status: row.sync_status,
    last_payload_hash: row.last_payload_hash,
    questions: parseJsonOr<ZipRecruiterQuestions>(row.questions_json, []),
    last_synced_at: row.last_synced_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapApplicationRow(row: ApplicationJoinRow): ApplicationDetail {
  return {
    id: row.id,
    job_id: row.job_id,
    candidate_id: row.candidate_id,
    status: row.status,
    status_name: row.status_name,
    status_group: row.status_group,
    rejection_reason: row.rejection_reason,
    source: row.source,
    external_application_id: row.external_application_id,
    ziprecruiter_response_id: row.ziprecruiter_response_id,
    zr_application_id: row.zr_application_id,
    answers: parseJsonOr(row.answers_json, null),
    attributes: parseJsonOr(row.attributes_json, null),
    profile: parseJsonOr(row.profile_json, null),
    additional_data: parseJsonOr(row.additional_data_json, null),
    resume_sha256: row.resume_sha256,
    resume_artifact_ref: row.resume_artifact_ref,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_event_at: row.last_event_at,
    candidate: {
      id: row.candidate_id,
      full_name: row.candidate_full_name,
      email: row.candidate_email,
      phone: row.candidate_phone,
    },
    job: {
      id: row.job_id,
      title: row.job_title,
      ziprecruiter_job_id: row.ziprecruiter_job_id,
    },
  };
}

async function fetchJobJoinRow(
  db: D1Database,
  sql: string,
  value: string,
): Promise<JobJoinRow | null> {
  return db.prepare(sql).bind(value).first<JobJoinRow>();
}

export async function getJobDetailByLocalId(
  db: D1Database,
  localJobId: string,
): Promise<JobDetail | null> {
  const row = await fetchJobJoinRow(
    db,
    `
      SELECT
        j.*,
        l.ziprecruiter_job_id,
        l.sync_status,
        l.last_payload_hash,
        l.questions_json,
        l.last_synced_at
      FROM staffing_jobs j
      LEFT JOIN ziprecruiter_job_links l ON l.job_id = j.id
      WHERE j.id = ?
      LIMIT 1
    `,
    localJobId,
  );

  return row ? mapJobRow(row) : null;
}

export async function getJobDetailByRemoteId(
  db: D1Database,
  remoteJobId: string,
): Promise<JobDetail | null> {
  const row = await fetchJobJoinRow(
    db,
    `
      SELECT
        j.*,
        l.ziprecruiter_job_id,
        l.sync_status,
        l.last_payload_hash,
        l.questions_json,
        l.last_synced_at
      FROM ziprecruiter_job_links l
      INNER JOIN staffing_jobs j ON j.id = l.job_id
      WHERE l.ziprecruiter_job_id = ?
      LIMIT 1
    `,
    remoteJobId,
  );

  return row ? mapJobRow(row) : null;
}

export async function resolveJobLink(
  db: D1Database,
  input: { localJobId?: string; ziprecruiterJobId?: string },
): Promise<{ localJobId: string; ziprecruiterJobId: string; detail: JobDetail }> {
  const detail =
    (input.localJobId ? await getJobDetailByLocalId(db, input.localJobId) : null) ??
    (input.ziprecruiterJobId ? await getJobDetailByRemoteId(db, input.ziprecruiterJobId) : null);

  if (!detail || !detail.ziprecruiter_job_id) {
    throw new Error('ZipRecruiter job link not found.');
  }

  return {
    localJobId: detail.id,
    ziprecruiterJobId: detail.ziprecruiter_job_id,
    detail,
  };
}

export async function upsertStaffingJobAndLink(
  db: D1Database,
  args: UpsertJobArgs,
): Promise<JobDetail> {
  const { localJobId, remoteJobId, payload } = args;
  const status = args.status ?? 'active';
  const syncStatus = args.syncStatus ?? 'synced';
  const payloadHash = sha256Hex(JSON.stringify(payload));

  await runStatements(db, [
    db.prepare(
      `
        INSERT INTO staffing_jobs (
          id,
          employer_id,
          employer_name,
          title,
          job_type,
          status,
          country,
          city,
          state,
          postal_code,
          description,
          apply_url,
          requirements,
          specialty,
          discipline,
          shift,
          compensation_min,
          compensation_max,
          compensation_currency,
          starts_on,
          source,
          partner_attributes_json,
          metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ziprecruiter', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          employer_id = excluded.employer_id,
          employer_name = excluded.employer_name,
          title = excluded.title,
          job_type = excluded.job_type,
          status = excluded.status,
          country = excluded.country,
          city = excluded.city,
          state = excluded.state,
          postal_code = excluded.postal_code,
          description = excluded.description,
          apply_url = excluded.apply_url,
          requirements = excluded.requirements,
          specialty = excluded.specialty,
          discipline = excluded.discipline,
          shift = excluded.shift,
          compensation_min = excluded.compensation_min,
          compensation_max = excluded.compensation_max,
          compensation_currency = excluded.compensation_currency,
          starts_on = excluded.starts_on,
          partner_attributes_json = excluded.partner_attributes_json,
          metadata_json = excluded.metadata_json,
          updated_at = CURRENT_TIMESTAMP
      `,
    ).bind(
      localJobId,
      payload.employer_id,
      payload.employer_name ?? null,
      payload.title,
      payload.job_type,
      status,
      payload.country,
      payload.city ?? null,
      payload.state ?? null,
      payload.postal_code ?? null,
      payload.description,
      payload.apply_url ?? null,
      payload.requirements ?? null,
      payload.metadata?.specialty ?? null,
      payload.metadata?.discipline ?? null,
      payload.metadata?.shift ?? null,
      payload.compensation_min ?? payload.metadata?.compensation_min ?? null,
      payload.compensation_max ?? payload.metadata?.compensation_max ?? null,
      payload.compensation_currency ?? payload.metadata?.compensation_currency ?? null,
      payload.metadata?.starts_on ?? null,
      stringify(payload.partner_attributes),
      stringify(payload.metadata ?? {}),
    ),
    db.prepare(
      `
        INSERT INTO ziprecruiter_job_links (
          job_id,
          ziprecruiter_job_id,
          employer_id,
          sync_status,
          last_payload_hash,
          questions_json,
          last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(ziprecruiter_job_id) DO UPDATE SET
          job_id = excluded.job_id,
          employer_id = excluded.employer_id,
          sync_status = excluded.sync_status,
          last_payload_hash = excluded.last_payload_hash,
          questions_json = COALESCE(excluded.questions_json, ziprecruiter_job_links.questions_json),
          last_synced_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `,
    ).bind(
      localJobId,
      remoteJobId,
      payload.employer_id,
      syncStatus,
      payloadHash,
      args.questions ? stringify(args.questions) : null,
    ),
  ]);

  const detail = await getJobDetailByLocalId(db, localJobId);
  if (!detail) {
    throw new Error(`Failed to load staffing job ${localJobId} after upsert.`);
  }
  return detail;
}

export async function setQuestionSnapshot(
  db: D1Database,
  localJobId: string,
  questions: ZipRecruiterQuestions | null,
): Promise<void> {
  await db.prepare(
    `
      UPDATE ziprecruiter_job_links
      SET questions_json = ?, updated_at = CURRENT_TIMESTAMP, last_synced_at = CURRENT_TIMESTAMP
      WHERE job_id = ?
    `,
  ).bind(stringify(questions ?? []), localJobId).run();
}

export async function markJobClosed(
  db: D1Database,
  localJobId: string,
): Promise<void> {
  await runStatements(db, [
    db.prepare(
      `UPDATE staffing_jobs SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ).bind(localJobId),
    db.prepare(
      `
        UPDATE ziprecruiter_job_links
        SET sync_status = 'closed', updated_at = CURRENT_TIMESTAMP, last_synced_at = CURRENT_TIMESTAMP
        WHERE job_id = ?
      `,
    ).bind(localJobId),
  ]);
}

async function ensureWebhookJob(
  db: D1Database,
  remoteJobId: string,
): Promise<JobDetail> {
  const existing = await getJobDetailByRemoteId(db, remoteJobId);
  if (existing) return existing;

  const placeholderJob: ZipRecruiterJob = {
    job_id: remoteJobId,
    employer_id: `ziprecruiter:${remoteJobId}`,
    title: `Unmapped ZipRecruiter job ${remoteJobId}`,
    job_type: 'other',
    country: 'US',
    description:
      'Placeholder created from ZipRecruiter Apply Webhook because no canonical staffing job existed yet.',
    metadata: {
      specialty: 'unknown',
      discipline: 'unknown',
    },
  };

  return upsertStaffingJobAndLink(db, {
    localJobId: generateLocalId('staffjob'),
    remoteJobId,
    payload: placeholderJob,
    status: 'unmapped',
    syncStatus: 'webhook_only',
  });
}

async function findCandidateByContact(
  db: D1Database,
  email?: string,
  phone?: string,
): Promise<StaffingCandidateRecord | null> {
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedPhone = phone?.trim();

  if (normalizedEmail && normalizedPhone) {
    return db.prepare(
      `
        SELECT * FROM staffing_candidates
        WHERE lower(email) = ? OR phone = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `,
    ).bind(normalizedEmail, normalizedPhone).first<StaffingCandidateRecord>();
  }

  if (normalizedEmail) {
    return db.prepare(
      `SELECT * FROM staffing_candidates WHERE lower(email) = ? ORDER BY updated_at DESC LIMIT 1`,
    ).bind(normalizedEmail).first<StaffingCandidateRecord>();
  }

  if (normalizedPhone) {
    return db.prepare(
      `SELECT * FROM staffing_candidates WHERE phone = ? ORDER BY updated_at DESC LIMIT 1`,
    ).bind(normalizedPhone).first<StaffingCandidateRecord>();
  }

  return null;
}

async function getApplicationJoinRowByLocalId(
  db: D1Database,
  localApplicationId: string,
): Promise<ApplicationJoinRow | null> {
  return db.prepare(
    `
      SELECT
        a.*,
        c.full_name AS candidate_full_name,
        c.email AS candidate_email,
        c.phone AS candidate_phone,
        j.title AS job_title,
        l.ziprecruiter_job_id
      FROM staffing_applications a
      INNER JOIN staffing_candidates c ON c.id = a.candidate_id
      INNER JOIN staffing_jobs j ON j.id = a.job_id
      LEFT JOIN ziprecruiter_job_links l ON l.job_id = j.id
      WHERE a.id = ?
      LIMIT 1
    `,
  ).bind(localApplicationId).first<ApplicationJoinRow>();
}

async function getApplicationJoinRowByZrApplicationId(
  db: D1Database,
  zrApplicationId: string,
): Promise<ApplicationJoinRow | null> {
  return db.prepare(
    `
      SELECT
        a.*,
        c.full_name AS candidate_full_name,
        c.email AS candidate_email,
        c.phone AS candidate_phone,
        j.title AS job_title,
        l.ziprecruiter_job_id
      FROM staffing_applications a
      INNER JOIN staffing_candidates c ON c.id = a.candidate_id
      INNER JOIN staffing_jobs j ON j.id = a.job_id
      LEFT JOIN ziprecruiter_job_links l ON l.job_id = j.id
      WHERE a.zr_application_id = ?
      LIMIT 1
    `,
  ).bind(zrApplicationId).first<ApplicationJoinRow>();
}

export async function getApplicationDetailByLocalId(
  db: D1Database,
  localApplicationId: string,
): Promise<ApplicationDetail | null> {
  const row = await getApplicationJoinRowByLocalId(db, localApplicationId);
  return row ? mapApplicationRow(row) : null;
}

export async function getApplicationDetailByZrApplicationId(
  db: D1Database,
  zrApplicationId: string,
): Promise<ApplicationDetail | null> {
  const row = await getApplicationJoinRowByZrApplicationId(db, zrApplicationId);
  return row ? mapApplicationRow(row) : null;
}

export async function getApplicationForSignal(
  db: D1Database,
  input: { localApplicationId?: string; zrApplicationId?: string },
): Promise<ApplicationDetail> {
  const detail =
    (input.localApplicationId ? await getApplicationDetailByLocalId(db, input.localApplicationId) : null) ??
    (input.zrApplicationId ? await getApplicationDetailByZrApplicationId(db, input.zrApplicationId) : null);

  if (!detail) {
    throw new Error('Staffing application not found.');
  }

  return detail;
}

export async function listRecentWebhookEvents(
  db: D1Database,
  limit = 20,
): Promise<Array<Record<string, unknown>>> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const rows = await db.prepare(
    `
      SELECT
        id,
        ziprecruiter_response_id,
        ziprecruiter_job_id,
        signature_verified,
        signature_version,
        signature_timestamp,
        processed_status,
        processing_error,
        candidate_id,
        application_id,
        created_at,
        length(raw_payload) AS raw_payload_bytes
      FROM ziprecruiter_apply_events
      ORDER BY created_at DESC
      LIMIT ?
    `,
  ).bind(safeLimit).all<Record<string, unknown>>();

  return rows.results;
}

export async function getSyncStatusSummary(
  db: D1Database,
): Promise<Record<string, unknown>> {
  const totals = await db.prepare(
    `
      SELECT
        (SELECT COUNT(*) FROM staffing_jobs) AS jobs,
        (SELECT COUNT(*) FROM staffing_candidates) AS candidates,
        (SELECT COUNT(*) FROM staffing_applications) AS applications,
        (SELECT COUNT(*) FROM ziprecruiter_apply_events) AS webhook_events,
        (SELECT COUNT(*) FROM ziprecruiter_hiring_signal_log) AS hiring_signal_events
    `,
  ).first<Record<string, number>>();

  const jobStatuses = await db.prepare(
    `SELECT sync_status, COUNT(*) AS count FROM ziprecruiter_job_links GROUP BY sync_status ORDER BY count DESC`,
  ).all<Record<string, unknown>>();

  const applicationStatuses = await db.prepare(
    `SELECT status, COUNT(*) AS count FROM staffing_applications GROUP BY status ORDER BY count DESC`,
  ).all<Record<string, unknown>>();

  const latestWebhook = await db.prepare(
    `SELECT created_at, processed_status, processing_error FROM ziprecruiter_apply_events ORDER BY created_at DESC LIMIT 1`,
  ).first<Record<string, unknown>>();

  return {
    totals: totals ?? {},
    job_sync_statuses: jobStatuses.results,
    application_statuses: applicationStatuses.results,
    latest_webhook: latestWebhook ?? null,
  };
}

export async function upsertApplicationFromWebhook(
  args: ApplyWebhookPersistenceArgs,
): Promise<{
  job: JobDetail;
  candidate: StaffingCandidateRecord;
  application: ApplicationDetail;
  duplicate: boolean;
  resume: { key: string | null; sha256: string | null };
}> {
  const { db, storage, payload, rawPayload, signature } = args;
  const ingestedAt = nowIso();
  const job = await ensureWebhookJob(db, payload.job_id);
  const existingCandidate = await findCandidateByContact(db, payload.email, payload.phone);
  const candidateId = existingCandidate?.id ?? generateLocalId('nurse');
  const resume = await uploadResumeArtifact(storage, payload.resume, payload.response_id);
  const specialties = deriveSpecialties(payload);
  const licenseSummary = deriveLicenseSummary(payload);

  await db.prepare(
    `
      INSERT INTO staffing_candidates (
        id,
        source,
        external_candidate_id,
        full_name,
        first_name,
        last_name,
        email,
        phone,
        city,
        state,
        postal_code,
        nurse_specialties_json,
        license_summary_json,
        profile_json,
        latest_resume_sha256,
        latest_resume_artifact_ref
      ) VALUES (?, 'ziprecruiter', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        full_name = excluded.full_name,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        email = COALESCE(excluded.email, staffing_candidates.email),
        phone = COALESCE(excluded.phone, staffing_candidates.phone),
        city = COALESCE(excluded.city, staffing_candidates.city),
        state = COALESCE(excluded.state, staffing_candidates.state),
        postal_code = COALESCE(excluded.postal_code, staffing_candidates.postal_code),
        nurse_specialties_json = excluded.nurse_specialties_json,
        license_summary_json = excluded.license_summary_json,
        profile_json = excluded.profile_json,
        latest_resume_sha256 = COALESCE(excluded.latest_resume_sha256, staffing_candidates.latest_resume_sha256),
        latest_resume_artifact_ref = COALESCE(excluded.latest_resume_artifact_ref, staffing_candidates.latest_resume_artifact_ref),
        updated_at = CURRENT_TIMESTAMP
    `,
  ).bind(
    candidateId,
    null,
    payload.name ?? ([payload.first_name, payload.last_name].filter(Boolean).join(' ') || null),
    payload.first_name ?? null,
    payload.last_name ?? null,
    payload.email?.trim().toLowerCase() ?? null,
    payload.phone?.trim() ?? null,
    payload.profile?.city ?? null,
    payload.profile?.state ?? null,
    payload.profile?.postal_code ?? null,
    stringify(specialties),
    stringify(licenseSummary),
    stringify(payload.profile),
    resume.sha256,
    resume.key,
  ).run();

  const zrApplicationId = payload.zr_application_id ?? payload.response_id;
  const existingApplication = await db.prepare(
    `
      SELECT id
      FROM staffing_applications
      WHERE ziprecruiter_response_id = ?
      LIMIT 1
    `,
  ).bind(payload.response_id).first<{ id: string }>();

  const applicationId = existingApplication?.id ?? generateLocalId('app');
  const duplicate = Boolean(existingApplication);
  const additionalData = {
    ingested_at: ingestedAt,
    signature: {
      enabled: signature.enabled,
      verified: signature.verified,
      reason: signature.reason ?? null,
      version: signature.version ?? null,
      timestamp: signature.timestamp ?? null,
    },
  };

  await runStatements(db, [
    db.prepare(
      `
        INSERT INTO staffing_applications (
          id,
          job_id,
          candidate_id,
          source,
          external_application_id,
          ziprecruiter_response_id,
          zr_application_id,
          status,
          answers_json,
          attributes_json,
          profile_json,
          additional_data_json,
          resume_sha256,
          resume_artifact_ref,
          last_event_at
        ) VALUES (?, ?, ?, 'ziprecruiter', ?, ?, ?, 'received', ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ziprecruiter_response_id) DO UPDATE SET
          candidate_id = excluded.candidate_id,
          status = excluded.status,
          answers_json = excluded.answers_json,
          attributes_json = excluded.attributes_json,
          profile_json = excluded.profile_json,
          additional_data_json = excluded.additional_data_json,
          resume_sha256 = COALESCE(excluded.resume_sha256, staffing_applications.resume_sha256),
          resume_artifact_ref = COALESCE(excluded.resume_artifact_ref, staffing_applications.resume_artifact_ref),
          last_event_at = excluded.last_event_at,
          updated_at = CURRENT_TIMESTAMP
      `,
    ).bind(
      applicationId,
      job.id,
      candidateId,
      null,
      payload.response_id,
      zrApplicationId,
      stringify(payload.answers),
      stringify(payload.attributes),
      stringify(payload.profile),
      stringify(additionalData),
      resume.sha256,
      resume.key,
      ingestedAt,
    ),
    db.prepare(
      `
        INSERT INTO ziprecruiter_apply_events (
          id,
          ziprecruiter_response_id,
          ziprecruiter_job_id,
          raw_payload,
          signature_verified,
          signature_version,
          signature_timestamp,
          processed_status,
          processing_error,
          candidate_id,
          application_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ziprecruiter_response_id) DO UPDATE SET
          raw_payload = excluded.raw_payload,
          signature_verified = excluded.signature_verified,
          signature_version = excluded.signature_version,
          signature_timestamp = excluded.signature_timestamp,
          processed_status = excluded.processed_status,
          processing_error = excluded.processing_error,
          candidate_id = excluded.candidate_id,
          application_id = excluded.application_id
      `,
    ).bind(
      generateLocalId('zrapplyevt'),
      payload.response_id,
      payload.job_id,
      rawPayload,
      signature.verified ? 1 : 0,
      signature.version ?? null,
      signature.timestamp ?? null,
      duplicate ? 'duplicate' : 'processed',
      signature.verified || !signature.enabled ? null : signature.reason ?? 'unverified',
      candidateId,
      applicationId,
    ),
  ]);

  const candidate = await db.prepare(`SELECT * FROM staffing_candidates WHERE id = ? LIMIT 1`).bind(candidateId).first<StaffingCandidateRecord>();
  const application = await getApplicationDetailByLocalId(db, applicationId);

  if (!candidate || !application) {
    throw new Error('Failed to load webhook persistence results.');
  }

  return {
    job,
    candidate,
    application,
    duplicate,
    resume,
  };
}

export async function updateApplicationStatusFromHiringSignal(
  db: D1Database,
  applicationId: string,
  signal: ZipRecruiterHiringSignal,
): Promise<void> {
  await db.prepare(
    `
      UPDATE staffing_applications
      SET
        status = ?,
        status_name = ?,
        status_group = ?,
        rejection_reason = ?,
        additional_data_json = ?,
        last_event_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
  ).bind(
    signal.event,
    signal.status_name ?? null,
    signal.status_group ?? null,
    signal.reason ?? null,
    stringify(signal.additional_data ?? null),
    signal.event_timestamp,
    applicationId,
  ).run();
}

export async function logHiringSignalEvent(
  db: D1Database,
  input: {
    applicationId: string;
    zrApplicationId: string;
    event: string;
    requestBody: unknown;
    responseStatus: number | null;
    responseBody: unknown;
    success: boolean;
    errorMessage?: string;
  },
): Promise<void> {
  await db.prepare(
    `
      INSERT INTO ziprecruiter_hiring_signal_log (
        id,
        application_id,
        zr_application_id,
        event,
        request_body,
        response_status,
        response_body,
        success,
        error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).bind(
    generateLocalId('zrsignal'),
    input.applicationId,
    input.zrApplicationId,
    input.event,
    stringify(input.requestBody),
    input.responseStatus,
    stringify(input.responseBody),
    input.success ? 1 : 0,
    input.errorMessage ?? null,
  ).run();
}
