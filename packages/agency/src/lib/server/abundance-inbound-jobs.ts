import { createHash } from 'node:crypto';

import { safeJsonParse } from '../abundance/matching';
import {
  buildAbundanceLeadInputFromInboundJob,
  createLead,
  getLead,
  type AbundanceLeadInputOptions
} from './funnel-leads';
import type { Lead } from '../funnel';
import {
  INBOUND_JOB_STATUSES,
  type InboundJob,
  type InboundJobInput,
  type InboundJobStatus
} from '../types/abundance';

const TRACKING_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'ref',
  'ref_src'
]);

const MAX_LIMIT = 1000;

type InboundJobRow = Omit<InboundJob, 'source_agents' | 'raw_payload'> & {
  source_agents: string | null;
  raw_payload: string | null;
};

interface NormalizedInboundJobInput {
  source_agent: string;
  source_agents: string[];
  source_run_id: string | null;
  source_system: string | null;
  external_job_id: string | null;
  job_url: string | null;
  employer: string | null;
  location: string | null;
  title: string;
  category: string | null;
  specialty: string | null;
  facility_name: string | null;
  employment_type: string | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_period: string | null;
  shift: string | null;
  duration_weeks: number | null;
  start_date: string | null;
  openings: number | null;
  source_posted_at: string | null;
  status: InboundJobStatus;
  dedupe_key: string;
  raw_payload: string;
  notes: string | null;
}

interface InboundJobDedupeInput {
  job_url?: string | null;
  external_job_id?: string | null;
  title?: string | null;
  employer?: string | null;
  location?: string | null;
}

export interface InboundJobListOptions {
  status?: InboundJobStatus | 'all';
  source_agent?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface InboundJobListResult {
  jobs: InboundJob[];
  total: number;
  limit: number;
  offset: number;
}

export interface InboundJobSummary {
  total: number;
  new_count: number;
  reviewing_count: number;
  qualified_count: number;
  rejected_count: number;
  archived_count: number;
}

export function isInboundJobStatus(value: string | null | undefined): value is InboundJobStatus {
  return INBOUND_JOB_STATUSES.includes(value as InboundJobStatus);
}

interface InboundJobHandoffDependencies {
  getInboundJob: typeof getInboundJob;
  getLead: typeof getLead;
  createLead: typeof createLead;
  updateInboundJobHandoff: typeof updateInboundJobHandoff;
  now: () => string;
}

export function normalizeInboundJobInput(
  input: InboundJobInput | Record<string, unknown>
): NormalizedInboundJobInput {
  const source_agent = normalizeRequiredString(input.source_agent, 'source_agent');
  const title = normalizeRequiredString(input.title, 'title');
  const status =
    typeof input.status === 'string' && isInboundJobStatus(input.status) ? input.status : 'new';
  const raw_payload = stringifyRawPayload('raw_payload' in input ? input.raw_payload : input);

  const normalized: NormalizedInboundJobInput = {
    source_agent,
    source_agents: [source_agent],
    source_run_id: normalizeNullableString(input.source_run_id),
    source_system: normalizeNullableString(input.source_system),
    external_job_id: normalizeNullableString(input.external_job_id),
    job_url: normalizeJobUrl(normalizeNullableString(input.job_url)),
    employer: normalizeNullableString(input.employer),
    location: normalizeNullableString(input.location),
    title,
    category: normalizeNullableString(input.category),
    specialty: normalizeNullableString(input.specialty),
    facility_name: normalizeNullableString(input.facility_name),
    employment_type: normalizeNullableString(input.employment_type),
    pay_min: normalizeNullableNumber(input.pay_min),
    pay_max: normalizeNullableNumber(input.pay_max),
    pay_period: normalizeNullableString(input.pay_period)?.toLowerCase() ?? null,
    shift: normalizeNullableString(input.shift),
    duration_weeks: normalizeNullableInteger(input.duration_weeks),
    start_date: normalizeNullableDateString(input.start_date),
    openings: normalizeNullableInteger(input.openings),
    source_posted_at: normalizeNullableDateString(input.source_posted_at),
    status,
    dedupe_key: '',
    raw_payload,
    notes: normalizeNullableString(input.notes)
  };

  const providedDedupeKey = normalizeNullableString(input.dedupe_key);
  normalized.dedupe_key = (
    providedDedupeKey || computeInboundJobDedupeKey(normalized)
  ).toLowerCase();

  return normalized;
}

export function computeInboundJobDedupeKey(input: InboundJobDedupeInput): string {
  const canonicalUrl = normalizeJobUrl(normalizeNullableString(input.job_url));
  const base =
    canonicalUrl ||
    [
      normalizeNullableString(input.external_job_id),
      normalizeNullableString(input.title),
      normalizeNullableString(input.employer),
      normalizeNullableString(input.location)
    ]
      .filter(Boolean)
      .join('|')
      .toLowerCase();

  return createHash('sha256')
    .update(base || 'abundance-inbound-job')
    .digest('hex');
}

export async function ingestInboundJob(
  db: D1Database,
  input: InboundJobInput | Record<string, unknown>
): Promise<{ job: InboundJob; created: boolean; duplicate: boolean }> {
  const normalized = normalizeInboundJobInput(input);
  const existing = await db
    .prepare('SELECT * FROM inbound_jobs WHERE dedupe_key = ?')
    .bind(normalized.dedupe_key)
    .first<InboundJobRow>();

  const now = new Date().toISOString();

  if (existing) {
    const existingAgents = safeJsonParse<string[]>(
      existing.source_agents,
      existing.source_agent ? [existing.source_agent] : [],
      'source_agents'
    );
    const mergedAgents = mergeSourceAgents(existingAgents, normalized.source_agent);

    await db
      .prepare(
        `
				UPDATE inbound_jobs
				SET source_agents = ?,
				    source_run_id = COALESCE(source_run_id, ?),
				    source_system = COALESCE(source_system, ?),
				    external_job_id = COALESCE(external_job_id, ?),
				    job_url = COALESCE(job_url, ?),
				    employer = COALESCE(employer, ?),
				    location = COALESCE(location, ?),
				    category = COALESCE(category, ?),
				    specialty = COALESCE(specialty, ?),
				    facility_name = COALESCE(facility_name, ?),
				    employment_type = COALESCE(employment_type, ?),
				    pay_min = COALESCE(pay_min, ?),
				    pay_max = COALESCE(pay_max, ?),
				    pay_period = COALESCE(pay_period, ?),
				    shift = COALESCE(shift, ?),
				    duration_weeks = COALESCE(duration_weeks, ?),
				    start_date = COALESCE(start_date, ?),
				    openings = COALESCE(openings, ?),
				    source_posted_at = COALESCE(source_posted_at, ?),
				    last_seen_at = ?,
				    seen_count = seen_count + 1,
				    raw_payload = ?,
				    updated_at = ?
				WHERE dedupe_key = ?
			`
      )
      .bind(
        JSON.stringify(mergedAgents),
        normalized.source_run_id,
        normalized.source_system,
        normalized.external_job_id,
        normalized.job_url,
        normalized.employer,
        normalized.location,
        normalized.category,
        normalized.specialty,
        normalized.facility_name,
        normalized.employment_type,
        normalized.pay_min,
        normalized.pay_max,
        normalized.pay_period,
        normalized.shift,
        normalized.duration_weeks,
        normalized.start_date,
        normalized.openings,
        normalized.source_posted_at,
        now,
        normalized.raw_payload,
        now,
        normalized.dedupe_key
      )
      .run();

    const job = await getInboundJobByDedupeKey(db, normalized.dedupe_key);
    if (!job) {
      throw new Error('Failed to reload existing inbound job');
    }

    return { job, created: false, duplicate: true };
  }

  const id = `abj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  await db
    .prepare(
      `
			INSERT INTO inbound_jobs (
				id,
				source_agent,
				source_agents,
				source_run_id,
				source_system,
				external_job_id,
				job_url,
				employer,
				location,
				title,
				category,
				specialty,
				facility_name,
				employment_type,
				pay_min,
				pay_max,
				pay_period,
				shift,
				duration_weeks,
				start_date,
				openings,
				source_posted_at,
				status,
				dedupe_key,
				raw_payload,
				notes,
				seen_count,
				ingested_at,
				last_seen_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
		`
    )
    .bind(
      id,
      normalized.source_agent,
      JSON.stringify(normalized.source_agents),
      normalized.source_run_id,
      normalized.source_system,
      normalized.external_job_id,
      normalized.job_url,
      normalized.employer,
      normalized.location,
      normalized.title,
      normalized.category,
      normalized.specialty,
      normalized.facility_name,
      normalized.employment_type,
      normalized.pay_min,
      normalized.pay_max,
      normalized.pay_period,
      normalized.shift,
      normalized.duration_weeks,
      normalized.start_date,
      normalized.openings,
      normalized.source_posted_at,
      normalized.status,
      normalized.dedupe_key,
      normalized.raw_payload,
      normalized.notes,
      now,
      now,
      now
    )
    .run();

  const job = await getInboundJob(db, id);
  if (!job) {
    throw new Error('Failed to fetch created inbound job');
  }

  return { job, created: true, duplicate: false };
}

export async function getInboundJob(db: D1Database, id: string): Promise<InboundJob | null> {
  const row = await db
    .prepare('SELECT * FROM inbound_jobs WHERE id = ?')
    .bind(id)
    .first<InboundJobRow>();
  return mapInboundJob(row);
}

export async function updateInboundJob(
  db: D1Database,
  id: string,
  input: { status?: InboundJobStatus; notes?: string | null }
): Promise<InboundJob | null> {
  const existing = await getInboundJob(db, id);
  if (!existing) {
    return null;
  }

  const nextStatus = input.status ?? existing.status;
  const nextNotes =
    input.notes === undefined ? (existing.notes ?? null) : normalizeNullableString(input.notes);
  const reviewedAt = nextStatus === 'new' ? null : existing.reviewed_at || new Date().toISOString();
  const now = new Date().toISOString();

  await db
    .prepare(
      `
			UPDATE inbound_jobs
			SET status = ?, notes = ?, reviewed_at = ?, updated_at = ?
			WHERE id = ?
		`
    )
    .bind(nextStatus, nextNotes, reviewedAt, now, id)
    .run();

  return getInboundJob(db, id);
}

export async function handoffInboundJobToFunnelLead(
  db: D1Database,
  id: string,
  options: AbundanceLeadInputOptions = {},
  dependencies: InboundJobHandoffDependencies = {
    getInboundJob,
    getLead,
    createLead,
    updateInboundJobHandoff,
    now: () => new Date().toISOString()
  }
): Promise<{ job: InboundJob; lead: Lead; created: boolean } | null> {
  const job = await dependencies.getInboundJob(db, id);
  if (!job) {
    return null;
  }

  if (job.status !== 'qualified') {
    throw new TypeError('Only qualified inbound jobs can be handed off to the funnel');
  }

  if (job.funnel_lead_id) {
    const existingLead = await dependencies.getLead(db, job.funnel_lead_id);
    if (existingLead) {
      return { job, lead: existingLead, created: false };
    }
  }

  const handedOffAt = dependencies.now();
  const lead = await dependencies.createLead(
    db,
    buildAbundanceLeadInputFromInboundJob(job, {
      ...options,
      handed_off_at: handedOffAt
    })
  );

  const updatedJob = await dependencies.updateInboundJobHandoff(db, id, {
    funnel_lead_id: lead.id,
    funnel_handoff_at: handedOffAt
  });

  if (!updatedJob) {
    throw new Error('Failed to update inbound job handoff state');
  }

  return { job: updatedJob, lead, created: true };
}

export async function listInboundJobs(
  db: D1Database,
  options: InboundJobListOptions = {}
): Promise<InboundJobListResult> {
  const status = options.status && options.status !== 'all' ? options.status : null;
  const sourceAgent = normalizeNullableString(options.source_agent);
  const search = normalizeNullableString(options.search);
  const limit = clampLimit(options.limit);
  const offset = Math.max(options.offset || 0, 0);

  let where = 'WHERE 1=1';
  const params: Array<string | number> = [];

  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }

  if (sourceAgent) {
    where += ` AND (source_agent = ? OR source_agents LIKE ? ESCAPE '\\')`;
    params.push(sourceAgent, `%\"${escapeLike(sourceAgent)}\"%`);
  }

  if (search) {
    const like = `%${escapeLike(search)}%`;
    where += `
			AND (
				title LIKE ? ESCAPE '\\'
				OR IFNULL(employer, '') LIKE ? ESCAPE '\\'
				OR IFNULL(location, '') LIKE ? ESCAPE '\\'
				OR IFNULL(category, '') LIKE ? ESCAPE '\\'
				OR IFNULL(specialty, '') LIKE ? ESCAPE '\\'
				OR IFNULL(facility_name, '') LIKE ? ESCAPE '\\'
				OR dedupe_key LIKE ? ESCAPE '\\'
				OR IFNULL(job_url, '') LIKE ? ESCAPE '\\'
				OR IFNULL(notes, '') LIKE ? ESCAPE '\\'
			)
		`;
    params.push(like, like, like, like, like, like, like, like, like);
  }

  const rows = await db
    .prepare(
      `
			SELECT *
			FROM inbound_jobs
			${where}
			ORDER BY
				CASE status
					WHEN 'new' THEN 1
					WHEN 'reviewing' THEN 2
					WHEN 'qualified' THEN 3
					WHEN 'rejected' THEN 4
					ELSE 5
				END,
				last_seen_at DESC,
				ingested_at DESC
			LIMIT ? OFFSET ?
		`
    )
    .bind(...params, limit, offset)
    .all<InboundJobRow>();

  const countRow = await db
    .prepare(`SELECT COUNT(*) as count FROM inbound_jobs ${where}`)
    .bind(...params)
    .first<{ count: number }>();

  return {
    jobs: rows.results
      .map((row) => mapInboundJob(row))
      .filter((job): job is InboundJob => Boolean(job)),
    total: Number(countRow?.count || 0),
    limit,
    offset
  };
}

export async function summarizeInboundJobs(db: D1Database): Promise<InboundJobSummary> {
  const row = await db
    .prepare(
      `
			SELECT
				COUNT(*) as total,
				SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
				SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing_count,
				SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) as qualified_count,
				SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
				SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived_count
			FROM inbound_jobs
		`
    )
    .first<Record<string, number>>();

  return {
    total: coerceNumber(row?.total),
    new_count: coerceNumber(row?.new_count),
    reviewing_count: coerceNumber(row?.reviewing_count),
    qualified_count: coerceNumber(row?.qualified_count),
    rejected_count: coerceNumber(row?.rejected_count),
    archived_count: coerceNumber(row?.archived_count)
  };
}

export async function listInboundJobSourceAgents(db: D1Database): Promise<string[]> {
  const result = await db
    .prepare('SELECT source_agents FROM inbound_jobs')
    .all<{ source_agents: string | null }>();
  const agents = new Set<string>();

  for (const row of result.results) {
    for (const agent of safeJsonParse<string[]>(row.source_agents, [], 'source_agents')) {
      if (agent.trim()) {
        agents.add(agent.trim());
      }
    }
  }

  return [...agents].sort((left, right) => left.localeCompare(right));
}

export function toInboundJobsCsv(jobs: InboundJob[]): string {
  const headers = [
    'id',
    'source_agent',
    'source_agents',
    'source_run_id',
    'source_system',
    'external_job_id',
    'title',
    'employer',
    'facility_name',
    'location',
    'job_url',
    'category',
    'specialty',
    'employment_type',
    'pay_min',
    'pay_max',
    'pay_period',
    'shift',
    'duration_weeks',
    'start_date',
    'openings',
    'source_posted_at',
    'status',
    'dedupe_key',
    'funnel_lead_id',
    'funnel_handoff_at',
    'seen_count',
    'ingested_at',
    'last_seen_at',
    'reviewed_at',
    'notes',
    'raw_payload'
  ];

  const lines = [
    headers.join(','),
    ...jobs.map((job) =>
      [
        job.id,
        job.source_agent,
        job.source_agents.join(' | '),
        job.source_run_id ?? '',
        job.source_system ?? '',
        job.external_job_id ?? '',
        job.title,
        job.employer ?? '',
        job.facility_name ?? '',
        job.location ?? '',
        job.job_url ?? '',
        job.category ?? '',
        job.specialty ?? '',
        job.employment_type ?? '',
        job.pay_min ?? '',
        job.pay_max ?? '',
        job.pay_period ?? '',
        job.shift ?? '',
        job.duration_weeks ?? '',
        job.start_date ?? '',
        job.openings ?? '',
        job.source_posted_at ?? '',
        job.status,
        job.dedupe_key,
        job.funnel_lead_id ?? '',
        job.funnel_handoff_at ?? '',
        job.seen_count,
        job.ingested_at,
        job.last_seen_at,
        job.reviewed_at ?? '',
        job.notes ?? '',
        formatRawPayloadForCsv(job.raw_payload)
      ]
        .map((value) => csvEscape(value))
        .join(',')
    )
  ];

  return lines.join('\n');
}

async function getInboundJobByDedupeKey(
  db: D1Database,
  dedupeKey: string
): Promise<InboundJob | null> {
  const row = await db
    .prepare('SELECT * FROM inbound_jobs WHERE dedupe_key = ?')
    .bind(dedupeKey)
    .first<InboundJobRow>();
  return mapInboundJob(row);
}

async function updateInboundJobHandoff(
  db: D1Database,
  id: string,
  input: { funnel_lead_id: string; funnel_handoff_at: string }
): Promise<InboundJob | null> {
  await db
    .prepare(
      `
			UPDATE inbound_jobs
			SET funnel_lead_id = ?, funnel_handoff_at = ?, updated_at = ?
			WHERE id = ?
		`
    )
    .bind(input.funnel_lead_id, input.funnel_handoff_at, input.funnel_handoff_at, id)
    .run();

  return getInboundJob(db, id);
}

function mapInboundJob(row: InboundJobRow | null): InboundJob | null {
  if (!row) {
    return null;
  }

  return {
    ...row,
    source_agents: safeJsonParse<string[]>(
      row.source_agents,
      row.source_agent ? [row.source_agent] : [],
      'source_agents'
    ).filter(Boolean),
    raw_payload: parseRawPayload(row.raw_payload),
    pay_min: coerceNullableNumber(row.pay_min),
    pay_max: coerceNullableNumber(row.pay_max),
    duration_weeks: coerceNullableInteger(row.duration_weeks),
    openings: coerceNullableInteger(row.openings),
    seen_count: coerceInteger(row.seen_count) || 1
  };
}

function parseRawPayload(value: string | null): Record<string, unknown> | string | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }

    return typeof parsed === 'string' ? parsed : String(parsed);
  } catch {
    return value;
  }
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  const normalized = normalizeNullableString(value);
  if (!normalized) {
    throw new TypeError(`${fieldName} is required`);
  }
  return normalized;
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/[$,]/g, '');
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNullableInteger(value: unknown): number | null {
  const parsed = normalizeNullableNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function normalizeNullableDateString(value: unknown): string | null {
  const normalized = normalizeNullableString(value);
  if (!normalized) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (!/[tT:]/.test(normalized)) {
    const parsedDateOnly = new Date(normalized);
    if (!Number.isNaN(parsedDateOnly.getTime())) {
      return parsedDateOnly.toISOString().slice(0, 10);
    }
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? normalized : parsed.toISOString();
}

function stringifyRawPayload(value: unknown): string {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return JSON.stringify(normalized || {});
  }

  return JSON.stringify(value ?? {});
}

function normalizeJobUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    url.hash = '';

    for (const param of TRACKING_QUERY_PARAMS) {
      url.searchParams.delete(param);
    }

    const searchParams = new URLSearchParams();
    for (const [key, paramValue] of [...url.searchParams.entries()].sort(
      ([leftKey, leftValue], [rightKey, rightValue]) =>
        leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey)
    )) {
      searchParams.append(key, paramValue);
    }

    const pathname = url.pathname !== '/' ? url.pathname.replace(/\/+$/, '') : url.pathname;
    const host = url.host.toLowerCase();
    const protocol = url.protocol.toLowerCase();
    const search = searchParams.toString();

    return `${protocol}//${host}${pathname}${search ? `?${search}` : ''}`;
  } catch {
    return value;
  }
}

function mergeSourceAgents(existing: string[], next: string): string[] {
  const merged = new Set(existing.map((value) => value.trim()).filter(Boolean));
  merged.add(next);
  return [...merged].sort((left, right) => left.localeCompare(right));
}

function clampLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit) || !limit) {
    return 50;
  }

  return Math.max(1, Math.min(Math.floor(limit), MAX_LIMIT));
}

function coerceInteger(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function coerceNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function coerceNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = coerceInteger(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function coerceNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function formatRawPayloadForCsv(value: InboundJob['raw_payload']): string {
  if (value === null) {
    return '';
  }

  return typeof value === 'string' ? value : JSON.stringify(value);
}

function csvEscape(value: unknown): string {
  const stringValue = String(value ?? '');
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }
  return `"${stringValue.replace(/"/g, '""')}"`;
}
