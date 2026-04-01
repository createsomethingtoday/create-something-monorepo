import type { D1Database } from '@create-something/mcp-core';

import { renderIndeedApplyFeed } from './feed.js';
import type { IndeedSignatureResult } from './signature.js';
import type {
  IndeedApplicationListRecord,
  IndeedApplicationRecord,
  IndeedJobRecord,
  IndeedWebhookEventRecord,
  R2BucketLike,
} from './types.js';

interface UpsertJobInput {
  accountId: string;
  localJobId: string;
  status: string;
  referenceNumber: string;
  requisitionId: string;
  title: string;
  companyName: string;
  sourceName?: string;
  url: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  streetAddress?: string;
  descriptionHtml: string;
  employmentType?: string;
  email?: string;
  jobMeta?: string;
  phoneConfig: string;
  coverletterConfig: string;
  resumeConfig: string;
  nameConfig: string;
  resumeFieldsRequired?: string[];
  resumeFieldsOptional?: string[];
  metadata?: Record<string, unknown>;
}

interface UpsertApplicationFromWebhookInput {
  db: D1Database;
  storage?: R2BucketLike;
  accountId: string;
  payload: Record<string, unknown>;
  rawPayload: string;
  signature: IndeedSignatureResult;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function encodeJson(value: unknown): string | null {
  if (value === undefined) return null;
  return JSON.stringify(value);
}

function decodeBase64(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(base64, 'base64'));
  }

  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sanitizeFileName(fileName?: string | null): string {
  const input = fileName?.trim() || 'resume.bin';
  return input.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function storeResumeArtifact(
  storage: R2BucketLike | undefined,
  accountId: string,
  jobId: string,
  applicationId: string,
  resume: Record<string, unknown> | undefined,
): Promise<{ key: string | null; sha256: string | null }> {
  const file = resume?.file;
  if (!storage || !file || typeof file !== 'object') {
    return { key: null, sha256: null };
  }

  const fileData = normalizeString((file as Record<string, unknown>).data);
  if (!fileData) {
    return { key: null, sha256: null };
  }

  const bytes = decodeBase64(fileData);
  const sha256 = await sha256Hex(bytes);
  const safeName = sanitizeFileName(normalizeString((file as Record<string, unknown>).fileName));
  const contentType = normalizeString((file as Record<string, unknown>).contentType) ?? 'application/octet-stream';
  const key = `abundance/indeed/resumes/${accountId}/${jobId}/${applicationId}-${safeName}`;

  await storage.put(key, bytes, {
    httpMetadata: { contentType },
    customMetadata: {
      account_id: accountId,
      job_id: jobId,
      application_id: applicationId,
      sha256,
    },
  });

  return { key, sha256 };
}

export function generateLocalId(prefix: string): string {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : nowIso();
  return `${prefix}_${String(token).replace(/[^a-zA-Z0-9]/g, '')}`;
}

export async function upsertJobConfig(db: D1Database, input: UpsertJobInput): Promise<IndeedJobRecord> {
  const publishedAt = nowIso();
  await db
    .prepare(
      `INSERT INTO indeed_staffing_jobs (
        id, account_id, status, reference_number, requisition_id, title, company_name, source_name, url,
        city, state, country, postal_code, street_address, description_html, employment_type, email, job_meta,
        phone_config, coverletter_config, resume_config, name_config, resume_fields_required_json,
        resume_fields_optional_json, metadata_json, published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        reference_number = excluded.reference_number,
        requisition_id = excluded.requisition_id,
        title = excluded.title,
        company_name = excluded.company_name,
        source_name = excluded.source_name,
        url = excluded.url,
        city = excluded.city,
        state = excluded.state,
        country = excluded.country,
        postal_code = excluded.postal_code,
        street_address = excluded.street_address,
        description_html = excluded.description_html,
        employment_type = excluded.employment_type,
        email = excluded.email,
        job_meta = excluded.job_meta,
        phone_config = excluded.phone_config,
        coverletter_config = excluded.coverletter_config,
        resume_config = excluded.resume_config,
        name_config = excluded.name_config,
        resume_fields_required_json = excluded.resume_fields_required_json,
        resume_fields_optional_json = excluded.resume_fields_optional_json,
        metadata_json = excluded.metadata_json,
        published_at = indeed_staffing_jobs.published_at,
        updated_at = excluded.updated_at`,
    )
    .bind(
      input.localJobId,
      input.accountId,
      input.status,
      input.referenceNumber,
      input.requisitionId,
      input.title,
      input.companyName,
      input.sourceName ?? null,
      input.url,
      input.city ?? null,
      input.state ?? null,
      input.country,
      input.postalCode ?? null,
      input.streetAddress ?? null,
      input.descriptionHtml,
      input.employmentType ?? null,
      input.email ?? null,
      input.jobMeta ?? null,
      input.phoneConfig,
      input.coverletterConfig,
      input.resumeConfig,
      input.nameConfig,
      encodeJson(input.resumeFieldsRequired),
      encodeJson(input.resumeFieldsOptional),
      encodeJson(input.metadata),
      publishedAt,
      nowIso(),
      nowIso(),
    )
    .run();

  return getJobByLocalId(db, input.accountId, input.localJobId);
}

export async function getJobByLocalId(db: D1Database, accountId: string, localJobId: string): Promise<IndeedJobRecord> {
  const job = await db
    .prepare(`SELECT * FROM indeed_staffing_jobs WHERE account_id = ? AND id = ? LIMIT 1`)
    .bind(accountId, localJobId)
    .first<IndeedJobRecord>();

  if (!job) {
    throw new Error(`Indeed job not found: ${localJobId}`);
  }

  return job;
}

export async function listJobs(
  db: D1Database,
  accountId: string,
  options: { includeDrafts?: boolean; localJobIds?: string[]; statuses?: string[]; search?: string; limit?: number } = {},
): Promise<IndeedJobRecord[]> {
  const clauses = ['account_id = ?'];
  const bindings: unknown[] = [accountId];

  if (options.statuses && options.statuses.length > 0) {
    clauses.push(`status IN (${options.statuses.map(() => '?').join(', ')})`);
    bindings.push(...options.statuses);
  } else if (!options.includeDrafts) {
    clauses.push(`status = 'active'`);
  } else {
    clauses.push(`status IN ('draft', 'active')`);
  }

  if (options.localJobIds && options.localJobIds.length > 0) {
    clauses.push(`id IN (${options.localJobIds.map(() => '?').join(', ')})`);
    bindings.push(...options.localJobIds);
  }

  if (options.search?.trim()) {
    const search = `%${options.search.trim()}%`;
    clauses.push(
      `(id LIKE ? OR title LIKE ? OR company_name LIKE ? OR reference_number LIKE ? OR requisition_id LIKE ? OR city LIKE ? OR state LIKE ? OR postal_code LIKE ?)`,
    );
    bindings.push(search, search, search, search, search, search, search, search);
  }

  const limit = Math.max(1, Math.min(options.limit ?? 200, 200));
  bindings.push(limit);

  const result = await db
    .prepare(`SELECT * FROM indeed_staffing_jobs WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC LIMIT ?`)
    .bind(...bindings)
    .all<IndeedJobRecord>();

  return result.results;
}

export async function updateJobQuestions(
  db: D1Database,
  accountId: string,
  localJobId: string,
  questionsJson: string,
): Promise<IndeedJobRecord> {
  await db
    .prepare(
      `UPDATE indeed_staffing_jobs
       SET questions_json = ?, updated_at = ?
       WHERE account_id = ? AND id = ?`,
    )
    .bind(questionsJson, nowIso(), accountId, localJobId)
    .run();

  return getJobByLocalId(db, accountId, localJobId);
}

export async function expireJob(db: D1Database, accountId: string, localJobId: string): Promise<IndeedJobRecord> {
  await db
    .prepare(
      `UPDATE indeed_staffing_jobs
       SET status = 'expired', updated_at = ?
       WHERE account_id = ? AND id = ?`,
    )
    .bind(nowIso(), accountId, localJobId)
    .run();

  return getJobByLocalId(db, accountId, localJobId);
}

export async function renderFeedFromStorage(
  db: D1Database,
  accountId: string,
  runtime: { apiToken: string; publisher: string; publisherUrl: string; publicBaseUrl?: string },
  options: { includeDrafts?: boolean; localJobIds?: string[]; baseUrl?: string } = {},
): Promise<{ xml: string; jobs: IndeedJobRecord[] }> {
  const jobs = await listJobs(db, accountId, {
    includeDrafts: options.includeDrafts,
    localJobIds: options.localJobIds,
  });

  const xml = renderIndeedApplyFeed(jobs, runtime, { baseUrl: options.baseUrl });
  return { xml, jobs };
}

export async function getQuestionsDocument(
  db: D1Database,
  accountId: string,
  localJobId: string,
): Promise<string | null> {
  const row = await db
    .prepare(`SELECT questions_json FROM indeed_staffing_jobs WHERE account_id = ? AND id = ? LIMIT 1`)
    .bind(accountId, localJobId)
    .first<{ questions_json: string | null }>();

  return row?.questions_json ?? null;
}

async function getExistingApplicationByIndeedId(
  db: D1Database,
  accountId: string,
  indeedApplyId: string,
): Promise<IndeedApplicationRecord | null> {
  return db
    .prepare(`SELECT * FROM indeed_staffing_applications WHERE account_id = ? AND indeed_apply_id = ? LIMIT 1`)
    .bind(accountId, indeedApplyId)
    .first<IndeedApplicationRecord>();
}

async function getDuplicateApplicationByEmail(
  db: D1Database,
  accountId: string,
  jobId: string,
  applicantEmail: string | null,
): Promise<IndeedApplicationRecord | null> {
  if (!applicantEmail) return null;

  return db
    .prepare(
      `SELECT *
       FROM indeed_staffing_applications
       WHERE account_id = ?
         AND job_id = ?
         AND applicant_email = ?
         AND created_at >= datetime('now', '-120 days')
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(accountId, jobId, applicantEmail)
    .first<IndeedApplicationRecord>();
}

async function logWebhookEvent(
  db: D1Database,
  accountId: string,
  data: {
    applicationId?: string | null;
    jobId?: string | null;
    indeedApplyId?: string | null;
    duplicate: boolean;
    signature: IndeedSignatureResult;
    payloadJson: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO indeed_staffing_webhook_events (
        account_id, application_id, job_id, indeed_apply_id,
        signature_verified, signature_reason, duplicate, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      accountId,
      data.applicationId ?? null,
      data.jobId ?? null,
      data.indeedApplyId ?? null,
      data.signature.verified ? 1 : 0,
      data.signature.reason ?? null,
      data.duplicate ? 1 : 0,
      data.payloadJson,
      nowIso(),
    )
    .run();
}

export async function upsertApplicationFromWebhook(
  input: UpsertApplicationFromWebhookInput,
): Promise<{
  application: IndeedApplicationRecord;
  job: IndeedJobRecord;
  duplicate: boolean;
  existingById: boolean;
  resume: { key: string | null };
}> {
  const { db, storage, accountId, payload, rawPayload, signature } = input;
  const indeedApplyId = normalizeString(payload.id);
  if (!indeedApplyId) {
    throw new Error('Indeed payload is missing id.');
  }

  const payloadJob = (payload.job ?? {}) as Record<string, unknown>;
  const payloadApplicant = (payload.applicant ?? {}) as Record<string, unknown>;
  const resumeObject = (payloadApplicant.resume as Record<string, unknown> | undefined) ?? undefined;
  const resumeJson = resumeObject?.json;
  const applicantLocation =
    resumeJson && typeof resumeJson === 'object' ? (resumeJson as Record<string, unknown>).location : undefined;

  const localJobId = normalizeString(payloadJob.jobId) ?? normalizeString(payloadJob.jobKey);
  if (!localJobId) {
    throw new Error('Indeed payload is missing job.jobId or job.jobKey.');
  }

  const job = await getJobByLocalId(db, accountId, localJobId);
  if (job.status === 'expired') {
    throw new Error(`Indeed job ${localJobId} is expired.`);
  }

  const existingById = await getExistingApplicationByIndeedId(db, accountId, indeedApplyId);
  if (existingById) {
    await logWebhookEvent(db, accountId, {
      applicationId: existingById.id,
      jobId: localJobId,
      indeedApplyId,
      duplicate: true,
      signature,
      payloadJson: rawPayload,
    });

    return {
      application: existingById,
      job,
      duplicate: true,
      existingById: true,
      resume: { key: existingById.resume_artifact_ref },
    };
  }

  const applicantEmail = normalizeString(payloadApplicant.email);
  const duplicateByEmail = await getDuplicateApplicationByEmail(db, accountId, localJobId, applicantEmail);
  if (duplicateByEmail) {
    await logWebhookEvent(db, accountId, {
      applicationId: duplicateByEmail.id,
      jobId: localJobId,
      indeedApplyId,
      duplicate: true,
      signature,
      payloadJson: rawPayload,
    });

    return {
      application: duplicateByEmail,
      job,
      duplicate: true,
      existingById: false,
      resume: { key: duplicateByEmail.resume_artifact_ref },
    };
  }

  const localApplicationId = generateLocalId('indeedapp');
  const resume = await storeResumeArtifact(
    storage,
    accountId,
    localJobId,
    localApplicationId,
    resumeObject,
  );

  await db
    .prepare(
      `INSERT INTO indeed_staffing_applications (
        id, account_id, job_id, indeed_apply_id, status,
        applicant_full_name, applicant_first_name, applicant_last_name,
        applicant_email, applicant_phone, applicant_location_json,
        applicant_json, analytics_json, answers_json, raw_payload_json,
        resume_artifact_ref, resume_sha256, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      localApplicationId,
      accountId,
      localJobId,
      indeedApplyId,
      'received',
      normalizeString(payloadApplicant.fullName),
      normalizeString(payloadApplicant.firstName),
      normalizeString(payloadApplicant.lastName),
      applicantEmail,
      normalizeString(payloadApplicant.phoneNumber),
      encodeJson(applicantLocation),
      JSON.stringify(payloadApplicant),
      encodeJson(payload.analytics),
      encodeJson(payload.screenerQuestionsAndAnswers ?? payload.questionsAndAnswers),
      rawPayload,
      resume.key,
      resume.sha256,
      nowIso(),
      nowIso(),
    )
    .run();

  const application = await db
    .prepare(`SELECT * FROM indeed_staffing_applications WHERE account_id = ? AND id = ? LIMIT 1`)
    .bind(accountId, localApplicationId)
    .first<IndeedApplicationRecord>();

  if (!application) {
    throw new Error('Failed to persist Indeed application.');
  }

  await logWebhookEvent(db, accountId, {
    applicationId: application.id,
    jobId: localJobId,
    indeedApplyId,
    duplicate: false,
    signature,
    payloadJson: rawPayload,
  });

  return {
    application,
    job,
    duplicate: false,
    existingById: false,
    resume: { key: resume.key },
  };
}

export async function getApplicationByLocalId(
  db: D1Database,
  accountId: string,
  localApplicationId: string,
): Promise<(IndeedApplicationRecord & { job: IndeedJobRecord | null }) | null> {
  const application = await db
    .prepare(`SELECT * FROM indeed_staffing_applications WHERE account_id = ? AND id = ? LIMIT 1`)
    .bind(accountId, localApplicationId)
    .first<IndeedApplicationRecord>();

  if (!application) return null;

  const job = await db
    .prepare(`SELECT * FROM indeed_staffing_jobs WHERE account_id = ? AND id = ? LIMIT 1`)
    .bind(accountId, application.job_id)
    .first<IndeedJobRecord>();

  return { ...application, job: job ?? null };
}

export async function listApplications(
  db: D1Database,
  accountId: string,
  options: {
    localJobId?: string;
    applicantEmail?: string;
    dispositionStatus?: string;
    search?: string;
    limit?: number;
  } = {},
): Promise<IndeedApplicationListRecord[]> {
  const clauses = ['a.account_id = ?'];
  const bindings: unknown[] = [accountId];

  if (options.localJobId) {
    clauses.push('a.job_id = ?');
    bindings.push(options.localJobId);
  }

  if (options.applicantEmail) {
    clauses.push('a.applicant_email = ?');
    bindings.push(options.applicantEmail);
  }

  if (options.dispositionStatus) {
    clauses.push('a.disposition_status = ?');
    bindings.push(options.dispositionStatus);
  }

  if (options.search?.trim()) {
    const search = `%${options.search.trim()}%`;
    clauses.push(
      `(a.id LIKE ? OR a.indeed_apply_id LIKE ? OR a.applicant_full_name LIKE ? OR a.applicant_email LIKE ? OR a.applicant_phone LIKE ?)`,
    );
    bindings.push(search, search, search, search, search);
  }

  const limit = Math.max(1, Math.min(options.limit ?? 200, 200));
  bindings.push(limit);

  const result = await db
    .prepare(
      `SELECT
         a.*,
         j.title AS job_title,
         j.company_name AS job_company_name,
         j.status AS job_status
       FROM indeed_staffing_applications a
       LEFT JOIN indeed_staffing_jobs j
         ON j.account_id = a.account_id
        AND j.id = a.job_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY a.created_at DESC
       LIMIT ?`,
    )
    .bind(...bindings)
    .all<IndeedApplicationListRecord>();

  return result.results;
}

export async function recordDisposition(
  db: D1Database,
  accountId: string,
  localApplicationId: string,
  status: string,
  notes?: string,
): Promise<IndeedApplicationRecord> {
  await db
    .prepare(
      `UPDATE indeed_staffing_applications
       SET disposition_status = ?, disposition_notes = ?, disposition_recorded_at = ?, updated_at = ?
       WHERE account_id = ? AND id = ?`,
    )
    .bind(status, notes ?? null, nowIso(), nowIso(), accountId, localApplicationId)
    .run();

  const application = await db
    .prepare(`SELECT * FROM indeed_staffing_applications WHERE account_id = ? AND id = ? LIMIT 1`)
    .bind(accountId, localApplicationId)
    .first<IndeedApplicationRecord>();

  if (!application) {
    throw new Error(`Indeed application not found: ${localApplicationId}`);
  }

  return application;
}

export async function listRecentWebhookEvents(
  db: D1Database,
  accountId: string,
  limit: number,
): Promise<IndeedWebhookEventRecord[]> {
  const result = await db
    .prepare(
      `SELECT * FROM indeed_staffing_webhook_events
       WHERE account_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .bind(accountId, limit)
    .all<IndeedWebhookEventRecord>();

  return result.results;
}

export async function getSyncStatusSummary(db: D1Database, accountId: string): Promise<Record<string, unknown>> {
  const jobs = await db
    .prepare(
      `SELECT
         COUNT(*) AS total_jobs,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_jobs,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_jobs,
         SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expired_jobs
       FROM indeed_staffing_jobs
       WHERE account_id = ?`,
    )
    .bind(accountId)
    .first<{ total_jobs: number; active_jobs: number; draft_jobs: number; expired_jobs: number }>();

  const applications = await db
    .prepare(
      `SELECT
         COUNT(*) AS total_applications,
         SUM(CASE WHEN disposition_recorded_at IS NOT NULL AND disposition_synced_at IS NULL THEN 1 ELSE 0 END) AS pending_dispositions,
         MAX(created_at) AS latest_application_at
       FROM indeed_staffing_applications
       WHERE account_id = ?`,
    )
    .bind(accountId)
    .first<{ total_applications: number; pending_dispositions: number; latest_application_at: string | null }>();

  const events = await db
    .prepare(
      `SELECT
         COUNT(*) AS total_events,
         SUM(CASE WHEN duplicate = 1 THEN 1 ELSE 0 END) AS duplicate_events,
         MAX(created_at) AS latest_event_at
       FROM indeed_staffing_webhook_events
       WHERE account_id = ?`,
    )
    .bind(accountId)
    .first<{ total_events: number; duplicate_events: number; latest_event_at: string | null }>();

  return {
    jobs: jobs ?? { total_jobs: 0, active_jobs: 0, draft_jobs: 0, expired_jobs: 0 },
    applications:
      applications ?? { total_applications: 0, pending_dispositions: 0, latest_application_at: null },
    events: events ?? { total_events: 0, duplicate_events: 0, latest_event_at: null },
  };
}
