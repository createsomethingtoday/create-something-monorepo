import type { NormalizedPublicJobInput, PublicJob, PublicJobStatus } from '../types/abundance';

export type BrightDataJobRecord = Record<string, unknown>;

export type BrightDataJobNormalizeOptions = {
	sourceSystem?: string;
	fetchedAt?: string;
	providerSnapshotId?: string;
	rawPayloadExpiresAt?: string;
	metadata?: Record<string, unknown>;
};

const US_STATE_CODES = new Set([
	'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
	'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
	'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
	'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
	'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
	'DC'
]);

export async function normalizePublicJob(input: NormalizedPublicJobInput): Promise<PublicJob> {
	const fetchedAt = input.fetched_at ?? new Date().toISOString();
	const normalizedAt = input.normalized_at ?? fetchedAt;
	const lastSeenAt = input.last_seen_at ?? fetchedAt;
	const rawPayloadJson = stableStringify(input.raw_payload);
	const rawPayloadHash = await sha256Hex(rawPayloadJson);
	const externalJobId = cleanString(input.external_job_id) ?? `raw-${rawPayloadHash.slice(0, 24)}`;
	const identityHash = await sha256Hex(`${input.provider}:${input.source_system}:${externalJobId}`);

	return {
		id: `abjob_${identityHash.slice(0, 24)}`,
		provider: input.provider,
		source_system: input.source_system,
		source_url: cleanString(input.source_url),
		external_job_id: externalJobId,
		raw_payload_hash: rawPayloadHash,
		title: input.title.trim(),
		employer: cleanString(input.employer),
		city: cleanString(input.city),
		state: normalizeState(input.state),
		country: cleanString(input.country) ?? 'US',
		location_text: cleanString(input.location_text),
		specialty: cleanString(input.specialty),
		discipline: cleanString(input.discipline),
		employment_type: cleanString(input.employment_type),
		shift: cleanString(input.shift),
		duration: cleanString(input.duration),
		start_date: cleanString(input.start_date),
		pay_min: input.pay_min,
		pay_max: input.pay_max,
		pay_text: cleanString(input.pay_text),
		currency: cleanString(input.currency) ?? 'USD',
		openings: input.openings,
		status: input.status ?? 'open',
		application_url: cleanString(input.application_url),
		posted_at: cleanString(input.posted_at),
		last_seen_at: lastSeenAt,
		fetched_at: fetchedAt,
		normalized_at: normalizedAt,
		provider_snapshot_id: cleanString(input.provider_snapshot_id),
		raw_payload_json: rawPayloadJson,
		raw_payload_expires_at: cleanString(input.raw_payload_expires_at),
		metadata_json: stableStringify(input.metadata ?? {})
	};
}

export async function normalizeBrightDataJobRecord(
	record: BrightDataJobRecord,
	options: BrightDataJobNormalizeOptions = {}
): Promise<PublicJob> {
	const sourceUrl = firstString(record, [
		'url',
		'job_url',
		'job_posting_url',
		'job_listing_url',
		'application_url',
		'apply_url',
		'apply_link',
		'job_application_link'
	]);
	const title = firstString(record, ['job_title', 'title', 'position', 'name']);

	if (!title) {
		throw new Error('Bright Data job record is missing a job title.');
	}

	const locationText = firstString(record, ['job_location', 'location', 'location_text', 'formatted_location']);
	const parsedLocation = parseLocation(locationText);
	const status = booleanValue(record.is_expired) === true
		? 'expired'
		: normalizeJobStatus(firstString(record, ['status', 'job_status', 'posting_status']));
	const pay = parsePay(record);

	return normalizePublicJob({
		provider: 'bright_data',
		source_system: options.sourceSystem ?? inferBrightDataSourceSystem(record, sourceUrl),
		source_url: sourceUrl,
		external_job_id: firstString(record, [
			'job_posting_id',
			'jobid',
			'job_id',
			'id',
			'listing_id',
			'external_job_id'
		]),
		title,
		employer: firstString(record, ['company_name', 'company', 'employer', 'hiring_company']),
		city: parsedLocation.city,
		state: parsedLocation.state,
		country: parsedLocation.country,
		location_text: locationText,
		specialty: firstString(record, ['specialty', 'occupation', 'job_category', 'category']),
		discipline: firstString(record, ['discipline', 'profession']),
		employment_type: firstString(record, ['employment_type', 'job_type', 'work_type']),
		shift: firstString(record, ['shift', 'shift_type']),
		duration: firstString(record, ['duration', 'contract_duration']),
		start_date: firstString(record, ['start_date', 'starts_at']),
		pay_min: pay.min,
		pay_max: pay.max,
		pay_text: pay.text,
		currency: firstString(record, ['currency', 'salary_currency']) ?? 'USD',
		openings: firstNumber(record, ['openings', 'positions', 'number_of_openings']),
		status,
		application_url: firstString(record, [
			'application_url',
			'apply_url',
			'apply_link',
			'job_application_link',
			'applay_link'
		]) ?? sourceUrl,
		posted_at: firstString(record, [
			'posted_at',
			'posted_date',
			'date_posted_parsed',
			'date_posted',
			'job_posted_date',
			'job_posted_time'
		]),
		fetched_at: options.fetchedAt,
		provider_snapshot_id: options.providerSnapshotId,
		raw_payload: record,
		raw_payload_expires_at: options.rawPayloadExpiresAt,
		metadata: {
			...options.metadata,
			provider_record_source: firstString(record, ['db_source', 'source', 'dataset'])
		}
	});
}

export function parseBrightDataJobsResponse(payload: unknown): {
	records: BrightDataJobRecord[];
	snapshotId?: string;
} {
	if (typeof payload === 'string') {
		return { records: parseJsonLines(payload).filter(isRecord) };
	}

	if (Array.isArray(payload)) {
		return { records: payload.filter(isRecord) };
	}

	if (!isRecord(payload)) {
		return { records: [] };
	}

	const snapshotId = firstString(payload, ['snapshot_id', 'snapshotId']);
	const candidateRecords = payload.records ?? payload.data ?? payload.results;

	if (Array.isArray(candidateRecords)) {
		return { records: candidateRecords.filter(isRecord), snapshotId };
	}

	if (isRecord(candidateRecords)) {
		return { records: [candidateRecords], snapshotId };
	}

	return { records: looksLikeJobRecord(payload) ? [payload] : [], snapshotId };
}

function parseJsonLines(value: string): unknown[] {
	const trimmed = value.trim();
	if (!trimmed) return [];

	return trimmed
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			try {
				return JSON.parse(line);
			} catch {
				return undefined;
			}
		})
		.filter((entry): entry is unknown => entry !== undefined);
}

export function buildPublicJobUpsert(job: PublicJob): { sql: string; args: unknown[] } {
	return {
		sql: `
			INSERT INTO abundance_public_jobs (
				id, provider, source_system, source_url, external_job_id, raw_payload_hash,
				title, employer, city, state, country, location_text, specialty, discipline,
				employment_type, shift, duration, start_date, pay_min, pay_max, pay_text,
				currency, openings, status, application_url, posted_at, last_seen_at, fetched_at,
				normalized_at, provider_snapshot_id, raw_payload_json, raw_payload_expires_at,
				metadata_json
			) VALUES (
				?, ?, ?, ?, ?, ?,
				?, ?, ?, ?, ?, ?, ?, ?,
				?, ?, ?, ?, ?, ?, ?,
				?, ?, ?, ?, ?, ?, ?,
				?, ?, ?, ?, ?
			)
			ON CONFLICT(provider, source_system, external_job_id) DO UPDATE SET
				source_url = excluded.source_url,
				raw_payload_hash = excluded.raw_payload_hash,
				title = excluded.title,
				employer = excluded.employer,
				city = excluded.city,
				state = excluded.state,
				country = excluded.country,
				location_text = excluded.location_text,
				specialty = excluded.specialty,
				discipline = excluded.discipline,
				employment_type = excluded.employment_type,
				shift = excluded.shift,
				duration = excluded.duration,
				start_date = excluded.start_date,
				pay_min = excluded.pay_min,
				pay_max = excluded.pay_max,
				pay_text = excluded.pay_text,
				currency = excluded.currency,
				openings = excluded.openings,
				status = excluded.status,
				application_url = excluded.application_url,
				posted_at = excluded.posted_at,
				last_seen_at = excluded.last_seen_at,
				fetched_at = excluded.fetched_at,
				normalized_at = excluded.normalized_at,
				provider_snapshot_id = excluded.provider_snapshot_id,
				raw_payload_json = excluded.raw_payload_json,
				raw_payload_expires_at = excluded.raw_payload_expires_at,
				metadata_json = excluded.metadata_json
		`,
		args: [
			job.id,
			job.provider,
			job.source_system,
			job.source_url ?? null,
			job.external_job_id,
			job.raw_payload_hash,
			job.title,
			job.employer ?? null,
			job.city ?? null,
			job.state ?? null,
			job.country ?? null,
			job.location_text ?? null,
			job.specialty ?? null,
			job.discipline ?? null,
			job.employment_type ?? null,
			job.shift ?? null,
			job.duration ?? null,
			job.start_date ?? null,
			job.pay_min ?? null,
			job.pay_max ?? null,
			job.pay_text ?? null,
			job.currency ?? null,
			job.openings ?? null,
			job.status,
			job.application_url ?? null,
			job.posted_at ?? null,
			job.last_seen_at,
			job.fetched_at,
			job.normalized_at,
			job.provider_snapshot_id ?? null,
			job.raw_payload_json,
			job.raw_payload_expires_at ?? null,
			job.metadata_json
		]
	};
}

export function stableStringify(value: unknown): string {
	return JSON.stringify(sortJsonValue(value));
}

export async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sortJsonValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(sortJsonValue);
	}

	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entryValue]) => [key, sortJsonValue(entryValue)])
		);
	}

	return value;
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
	for (const key of keys) {
		const value = record[key];
		const cleaned = cleanString(value);
		if (cleaned) return cleaned;
	}

	return undefined;
}

function firstNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
		if (typeof value === 'string') {
			const parsed = Number(value.replace(/[$,]/g, '').trim());
			if (Number.isFinite(parsed)) return Math.trunc(parsed);
		}
	}

	return undefined;
}

function cleanString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') return value;
	if (typeof value !== 'string') return undefined;

	const normalized = value.trim().toLowerCase();
	if (['true', '1', 'yes'].includes(normalized)) return true;
	if (['false', '0', 'no'].includes(normalized)) return false;
	return undefined;
}

function parseLocation(locationText: string | undefined): {
	city?: string;
	state?: string;
	country?: string;
} {
	if (!locationText) return {};

	const parts = locationText.split(',').map((part) => part.trim()).filter(Boolean);
	if (parts.length === 0) return {};

	const maybeState = parts.length >= 2 ? normalizeState(parts[1]) : undefined;
	if (parts.length === 2 && maybeState) {
		return { city: parts[0], state: maybeState, country: 'US' };
	}

	if (parts.length >= 3 && maybeState) {
		return { city: parts[0], state: maybeState, country: parts[2] };
	}

	return {
		city: parts.length === 1 ? undefined : parts[0],
		country: parts.at(-1)
	};
}

function normalizeState(value: string | undefined): string | undefined {
	const cleaned = cleanString(value)?.toUpperCase();
	if (!cleaned) return undefined;
	return US_STATE_CODES.has(cleaned) ? cleaned : cleanString(value);
}

function normalizeJobStatus(value: string | undefined): PublicJobStatus {
	const normalized = value?.toLowerCase().trim();
	if (!normalized) return 'open';
	if (['open', 'active', 'available', 'published'].includes(normalized)) return 'open';
	if (['closed', 'filled'].includes(normalized)) return 'closed';
	if (['expired', 'removed', 'inactive'].includes(normalized)) return 'expired';
	return 'unknown';
}

function inferBrightDataSourceSystem(record: Record<string, unknown>, sourceUrl: string | undefined): string {
	const explicit = firstString(record, ['source_system', 'source_platform', 'platform', 'site']);
	if (explicit) return explicit.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

	const url = sourceUrl?.toLowerCase() ?? '';
	if (url.includes('linkedin.')) return 'linkedin_jobs';
	if (url.includes('indeed.')) return 'indeed_jobs';
	if (url.includes('glassdoor.')) return 'glassdoor_jobs';
	return 'bright_data_jobs';
}

function parsePay(record: Record<string, unknown>): { min?: number; max?: number; text?: string } {
	const min = firstNumber(record, ['pay_min', 'salary_min', 'salary_from', 'min_salary']);
	const max = firstNumber(record, ['pay_max', 'salary_max', 'salary_to', 'max_salary']);
	const text = firstString(record, [
		'pay_text',
		'salary',
		'salary_range',
		'salary_formatted',
		'compensation',
		'job_salary',
		'salary_text',
		'job_base_pay_range',
		'base_salary',
		'pay_range_glassdoor_est',
		'pay_range_employer_est'
	]);

	return { min, max, text };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function looksLikeJobRecord(record: Record<string, unknown>): boolean {
	return Boolean(firstString(record, ['job_title', 'title', 'position', 'job_posting_id', 'jobid', 'job_id']));
}
