import { safeJsonParse } from '$lib/abundance/matching';
import { listNurseInboxRecruiters } from '$lib/abundance/nurse-inbox';
import type {
	HandoffStatus,
	NurseHandoffItem,
	NurseHandoffResponse,
	NurseHandoffSlaState,
	NurseHandoffSummary,
	NurseInboxRecruiterOption,
	PersonRole,
	PersonStatus
} from '$lib/types/abundance';

const DUE_SOON_HOURS = 4;
const MS_PER_HOUR = 1000 * 60 * 60;

interface HandoffRow {
	id: string;
	status: HandoffStatus;
	reason: string;
	queue_slug?: string | null;
	sla_due_at?: string | null;
	acknowledged_at?: string | null;
	resolved_at?: string | null;
	created_at: string;
	updated_at: string;
	notes_json?: string | null;
	candidate_profile_id?: string | null;
	candidate_name?: string | null;
	profile_status?: NurseHandoffItem['profile_status'] | null;
	profession?: string | null;
	specialty_primary?: string | null;
	home_state?: string | null;
	recruiter_person_id?: string | null;
	recruiter_name?: string | null;
	recruiter_email?: string | null;
	recruiter_role?: Extract<PersonRole, 'recruiter' | 'operator'> | null;
	recruiter_status?: PersonStatus | null;
	opening_id?: string | null;
	facility_name?: string | null;
	opening_specialty?: string | null;
	opening_state?: string | null;
}

interface SummaryRow {
	total_items: number;
	open_items: number;
	accepted_items: number;
	completed_items: number;
	cancelled_items: number;
	overdue_items: number;
	due_soon_items: number;
}

interface RecruiterRow {
	id: string;
	name: string;
	email?: string | null;
	primary_role: Extract<PersonRole, 'recruiter' | 'operator'>;
	status: PersonStatus;
}

export interface NurseHandoffQueryInput {
	status: HandoffStatus | 'all' | null;
	queueSlug?: string;
	limit: number;
	offset: number;
	recruiterPersonId?: string;
	includeRecruiters?: boolean;
}

export async function listNurseHandoffs(
	db: D1Database,
	input: NurseHandoffQueryInput
): Promise<NurseHandoffResponse> {
	const filters = buildHandoffFilters({
		status: input.status,
		queueSlug: input.queueSlug,
		recruiterPersonId: input.recruiterPersonId
	});
	const recruitersPromise =
		input.includeRecruiters === false
			? Promise.resolve([] as NurseInboxRecruiterOption[])
			: listNurseInboxRecruiters(db);

	const [rowsResult, totalResult, summaryResult, byQueueResult, recruiters] = await Promise.all([
		db
			.prepare(
				`
					SELECT
						h.id,
						h.status,
						h.reason,
						h.queue_slug,
						h.sla_due_at,
						h.acknowledged_at,
						h.resolved_at,
						h.created_at,
						h.updated_at,
						h.notes_json,
						h.candidate_profile_id,
						cp.profile_status,
						cp.profession,
						cp.specialty_primary,
						cp.home_state,
						candidate.name AS candidate_name,
						h.recruiter_person_id,
						recruiter.name AS recruiter_name,
						recruiter.email AS recruiter_email,
						recruiter.primary_role AS recruiter_role,
						recruiter.status AS recruiter_status,
						o.id AS opening_id,
						o.facility_name,
						o.specialty AS opening_specialty,
						o.state AS opening_state
					FROM handoffs h
					LEFT JOIN candidate_profiles cp ON cp.id = h.candidate_profile_id
					LEFT JOIN people candidate ON candidate.id = cp.person_id
					LEFT JOIN people recruiter ON recruiter.id = h.recruiter_person_id
					LEFT JOIN openings o ON o.id = h.opening_id
					WHERE ${filters.where}
					ORDER BY
						CASE h.status
							WHEN 'open' THEN 0
							WHEN 'accepted' THEN 1
							WHEN 'completed' THEN 2
							ELSE 3
						END,
						CASE
							WHEN h.status IN ('open', 'accepted')
								AND h.sla_due_at IS NOT NULL
								AND julianday(h.sla_due_at) < julianday('now')
							THEN 0
							ELSE 1
						END,
						CASE WHEN h.sla_due_at IS NULL THEN 1 ELSE 0 END,
						COALESCE(julianday(h.sla_due_at), julianday(h.updated_at)) ASC,
						COALESCE(datetime(h.updated_at), h.updated_at) DESC
					LIMIT ? OFFSET ?
				`
			)
			.bind(...filters.params, input.limit, input.offset)
			.all<HandoffRow>(),
		db
			.prepare(
				`
					SELECT COUNT(*) AS count
					FROM handoffs h
					WHERE ${filters.where}
				`
			)
			.bind(...filters.params)
			.first<{ count: number }>(),
		db
			.prepare(
				`
					SELECT
						COUNT(*) AS total_items,
						SUM(CASE WHEN h.status = 'open' THEN 1 ELSE 0 END) AS open_items,
						SUM(CASE WHEN h.status = 'accepted' THEN 1 ELSE 0 END) AS accepted_items,
						SUM(CASE WHEN h.status = 'completed' THEN 1 ELSE 0 END) AS completed_items,
						SUM(CASE WHEN h.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_items,
						SUM(CASE
							WHEN h.status IN ('open', 'accepted')
								AND h.sla_due_at IS NOT NULL
								AND julianday(h.sla_due_at) < julianday('now')
							THEN 1
							ELSE 0
						END) AS overdue_items,
						SUM(CASE
							WHEN h.status IN ('open', 'accepted')
								AND h.sla_due_at IS NOT NULL
								AND julianday(h.sla_due_at) >= julianday('now')
								AND julianday(h.sla_due_at) <= julianday('now', '+${DUE_SOON_HOURS} hours')
							THEN 1
							ELSE 0
						END) AS due_soon_items
					FROM handoffs h
					WHERE ${filters.where}
				`
			)
			.bind(...filters.params)
			.first<SummaryRow>(),
		db
			.prepare(
				`
					SELECT COALESCE(h.queue_slug, 'unassigned') AS queue_slug, COUNT(*) AS count
					FROM handoffs h
					WHERE ${filters.where}
					GROUP BY COALESCE(h.queue_slug, 'unassigned')
					ORDER BY count DESC, queue_slug ASC
				`
			)
			.bind(...filters.params)
			.all<{ queue_slug: string; count: number }>(),
		recruitersPromise
	]);

	const summary: NurseHandoffSummary = {
		total_items: summaryResult?.total_items || 0,
		open_items: summaryResult?.open_items || 0,
		accepted_items: summaryResult?.accepted_items || 0,
		completed_items: summaryResult?.completed_items || 0,
		cancelled_items: summaryResult?.cancelled_items || 0,
		overdue_items: summaryResult?.overdue_items || 0,
		due_soon_items: summaryResult?.due_soon_items || 0,
		by_queue: (byQueueResult.results || []).map((row) => ({
			queue_slug: row.queue_slug,
			count: row.count
		}))
	};

	return {
		items: (rowsResult.results || []).map(mapHandoffRow),
		recruiters,
		total: totalResult?.count || 0,
		limit: input.limit,
		offset: input.offset,
		filters: {
			status: input.status || undefined,
			queue_slug: input.queueSlug || undefined
		},
		summary
	};
}

export async function findRecruiterPersonByEmail(
	db: D1Database,
	email: string
): Promise<NurseInboxRecruiterOption | null> {
	const normalizedEmail = email.trim().toLowerCase();
	if (!normalizedEmail) {
		return null;
	}

	const recruiter = await db
		.prepare(
			`
				SELECT id, name, email, primary_role, status
				FROM people
				WHERE lower(email) = ?
					AND primary_role IN ('recruiter', 'operator')
					AND status != 'inactive'
				LIMIT 1
			`
		)
		.bind(normalizedEmail)
		.first<RecruiterRow>();

	return recruiter
		? {
				id: recruiter.id,
				name: recruiter.name,
				email: recruiter.email || undefined,
				role: recruiter.primary_role,
				status: recruiter.status
			}
		: null;
}

export function normalizeHandoffStatus(value: string | null): HandoffStatus | 'all' | null {
	if (!value) {
		return null;
	}

	if (value === 'all') {
		return 'all';
	}

	return ['open', 'accepted', 'completed', 'cancelled'].includes(value)
		? (value as HandoffStatus)
		: null;
}

export function normalizeOptionalString(value: string | null): string | undefined {
	if (!value) {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export function parseBoundedInt(
	value: string | null,
	fallback: number,
	min: number,
	max = Number.POSITIVE_INFINITY
): number {
	const parsed = Number.parseInt(value || '', 10);

	if (!Number.isFinite(parsed)) {
		return fallback;
	}

	return Math.min(Math.max(parsed, min), max);
}

function mapHandoffRow(row: HandoffRow): NurseHandoffItem {
	const notes = safeJsonParse<Record<string, unknown>>(row.notes_json, {}, 'handoffs.notes_json');
	const timing = computeHandoffTiming(row);

	return {
		id: row.id,
		status: row.status,
		reason: row.reason,
		queue_slug: row.queue_slug || undefined,
		sla_due_at: row.sla_due_at || undefined,
		acknowledged_at: row.acknowledged_at || undefined,
		resolved_at: row.resolved_at || undefined,
		created_at: row.created_at,
		updated_at: row.updated_at,
		age_hours: timing.ageHours,
		hours_until_sla: timing.hoursUntilSla,
		sla_state: timing.slaState,
		candidate_profile_id: row.candidate_profile_id || undefined,
		candidate_name: row.candidate_name || undefined,
		profile_status: row.profile_status || undefined,
		profession: normalizeProfession(row.profession),
		specialty_primary: row.specialty_primary || undefined,
		home_state: row.home_state || undefined,
		recruiter: row.recruiter_person_id
			? {
					id: row.recruiter_person_id,
					name: row.recruiter_name || 'Assigned recruiter',
					email: row.recruiter_email || undefined,
					role: row.recruiter_role || 'recruiter',
					status: row.recruiter_status || 'active'
				}
			: undefined,
		opening:
			row.opening_id || row.facility_name || row.opening_specialty || row.opening_state
				? {
						id: row.opening_id || undefined,
						facility_name: row.facility_name || undefined,
						specialty: row.opening_specialty || undefined,
						state: row.opening_state || undefined
					}
				: undefined,
		last_note: typeof notes.last_note === 'string' ? notes.last_note : undefined,
		last_updated_by: typeof notes.last_updated_by === 'string' ? notes.last_updated_by : undefined,
		last_updated_at:
			typeof notes.last_updated_at === 'string' ? notes.last_updated_at : undefined
	};
}

function buildHandoffFilters(input: {
	status: HandoffStatus | 'all' | null;
	queueSlug?: string;
	recruiterPersonId?: string;
}): { where: string; params: string[] } {
	const clauses: string[] = [];
	const params: string[] = [];

	if (!input.status) {
		clauses.push(`h.status IN ('open', 'accepted')`);
	} else if (input.status !== 'all') {
		clauses.push('h.status = ?');
		params.push(input.status);
	}

	if (input.queueSlug) {
		clauses.push('COALESCE(h.queue_slug, ?) = ?');
		params.push('unassigned', input.queueSlug);
	}

	if (input.recruiterPersonId) {
		clauses.push('h.recruiter_person_id = ?');
		params.push(input.recruiterPersonId);
	}

	return {
		where: clauses.length > 0 ? clauses.join(' AND ') : '1 = 1',
		params
	};
}

function normalizeProfession(
	value: string | null | undefined
): NurseHandoffItem['profession'] | undefined {
	if (!value) {
		return undefined;
	}

	return ['rn', 'lpn', 'lvn', 'cna', 'allied', 'other'].includes(value)
		? (value as NurseHandoffItem['profession'])
		: 'other';
}

function computeHandoffTiming(row: Pick<HandoffRow, 'status' | 'created_at' | 'sla_due_at'>): {
	ageHours: number;
	hoursUntilSla?: number;
	slaState: NurseHandoffSlaState;
} {
	const now = Date.now();
	const createdAt = parseTimestamp(row.created_at) ?? now;
	const ageHours = roundNonNegativeHours((now - createdAt) / MS_PER_HOUR);
	const slaDueAt = parseTimestamp(row.sla_due_at);

	if (row.status === 'completed' || row.status === 'cancelled') {
		return { ageHours, slaState: 'resolved' };
	}

	if (!slaDueAt) {
		return { ageHours, slaState: 'no_sla' };
	}

	const hoursUntilSla = roundSignedHours((slaDueAt - now) / MS_PER_HOUR);
	if (hoursUntilSla < 0) {
		return { ageHours, hoursUntilSla, slaState: 'overdue' };
	}

	if (hoursUntilSla <= DUE_SOON_HOURS) {
		return { ageHours, hoursUntilSla, slaState: 'due_soon' };
	}

	return { ageHours, hoursUntilSla, slaState: 'on_track' };
}

function parseTimestamp(value: string | null | undefined): number | null {
	if (!value) {
		return null;
	}

	const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
		? `${value.replace(' ', 'T')}Z`
		: value;
	const timestamp = Date.parse(normalized);

	return Number.isFinite(timestamp) ? timestamp : null;
}

function roundNonNegativeHours(value: number): number {
	return Math.round(Math.max(value, 0) * 10) / 10;
}

function roundSignedHours(value: number): number {
	return Math.round(value * 10) / 10;
}
