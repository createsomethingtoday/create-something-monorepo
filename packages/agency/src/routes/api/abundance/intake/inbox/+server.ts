import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	nurseInboxActionSchema,
	parseBody,
	type NurseInboxActionInput
} from '@create-something/canon/validation';
import type {
	ApiResponse,
	CandidateProfileStatus,
	NurseInboxActionResult,
	NurseInboxItem,
	NurseInboxResponse,
	NurseInboxSummary
} from '$lib/types/abundance';
import { safeJsonParse } from '$lib/abundance/matching';
import { applyNurseInboxAction, listNurseInboxRecruiters } from '$lib/abundance/nurse-inbox';
import { requireAgencyOperator } from '$lib/server/operator-auth';

interface InboxRow {
	id: string;
	event_type: string;
	source?: string | null;
	event_at: string;
	metadata_json?: string | null;
	candidate_profile_id: string;
	profile_status: CandidateProfileStatus;
	profession: string;
	specialty_primary?: string | null;
	specialties?: string | null;
	home_state?: string | null;
	available_from?: string | null;
	pay_floor_weekly?: number | null;
	recruiter_notes?: string | null;
	person_id: string;
	candidate_name: string;
	phone?: string | null;
	email?: string | null;
	opening_id?: string | null;
	facility_name?: string | null;
	opening_specialty?: string | null;
	opening_state?: string | null;
}

interface SummaryRow {
	total_items: number;
	draft_items: number;
	ready_for_review_items: number;
	eligible_items: number;
	inactive_items: number;
}

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
	await requireAgencyOperator({ cookies, platform });

	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		const source = normalizeOptionalString(url.searchParams.get('source'));
		const profileStatus = normalizeProfileStatus(url.searchParams.get('profile_status'));
		const limit = parseBoundedInt(url.searchParams.get('limit'), 40, 1, 100);
		const offset = parseBoundedInt(url.searchParams.get('offset'), 0, 0);

		const filters = buildFilters({ source, profileStatus });
		const inboxCtes = buildInboxCtes(filters.where);

		const rowsResult = await db
			.prepare(
				`
					${inboxCtes}
					SELECT
						id,
						event_type,
						source,
						event_at,
						metadata_json,
						candidate_profile_id,
						profile_status,
						profession,
						specialty_primary,
						specialties,
						home_state,
						available_from,
						pay_floor_weekly,
						recruiter_notes,
						person_id,
						candidate_name,
						phone,
						email,
						opening_id,
						facility_name,
						opening_specialty,
						opening_state
					FROM pending_inbox_events
					ORDER BY COALESCE(datetime(event_at), event_at) DESC, id DESC
					LIMIT ? OFFSET ?
				`
			)
			.bind(...filters.params, limit, offset)
			.all<InboxRow>();

		const items = (rowsResult.results || []).map(mapInboxRow);

		const [totalResult, summaryResult, bySourceResult, recruiters] = await Promise.all([
			db
				.prepare(
					`
						${inboxCtes}
						SELECT COUNT(*) AS count
						FROM pending_inbox_events
					`
				)
				.bind(...filters.params)
				.first<{ count: number }>(),
			db
				.prepare(
					`
						${inboxCtes}
						SELECT
							COUNT(*) AS total_items,
							SUM(CASE WHEN profile_status = 'draft' THEN 1 ELSE 0 END) AS draft_items,
							SUM(CASE WHEN profile_status = 'ready_for_review' THEN 1 ELSE 0 END) AS ready_for_review_items,
							SUM(CASE WHEN profile_status = 'eligible' THEN 1 ELSE 0 END) AS eligible_items,
							SUM(CASE WHEN profile_status = 'inactive' THEN 1 ELSE 0 END) AS inactive_items
						FROM pending_inbox_events
					`
				)
				.bind(...filters.params)
				.first<SummaryRow>(),
			db
				.prepare(
					`
						${inboxCtes}
						SELECT source, COUNT(*) AS count
						FROM pending_inbox_events
						GROUP BY source
						ORDER BY count DESC, source ASC
					`
				)
				.bind(...filters.params)
				.all<{ source?: string | null; count: number }>(),
			listNurseInboxRecruiters(db)
		]);

		const summary: NurseInboxSummary = {
			total_items: summaryResult?.total_items || 0,
			draft_items: summaryResult?.draft_items || 0,
			ready_for_review_items: summaryResult?.ready_for_review_items || 0,
			eligible_items: summaryResult?.eligible_items || 0,
			inactive_items: summaryResult?.inactive_items || 0,
			by_source: (bySourceResult.results || []).map((row) => ({
				source: row.source || 'unknown',
				count: row.count
			}))
		};

		const response: NurseInboxResponse = {
			items,
			recruiters,
			total: totalResult?.count || 0,
			limit,
			offset,
			filters: {
				source: source || undefined,
				profile_status: profileStatus || undefined
			},
			summary
		};

		return json({ success: true, data: response } as ApiResponse<NurseInboxResponse>);
	} catch (err) {
		console.error('Nurse inbox query error:', err);
		if (isKitError(err)) throw err;

		return json(
			{
				success: false,
				error: `Error fetching nurse inbox: ${err instanceof Error ? err.message : 'Unknown error'}`
			} as ApiResponse<never>,
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	const operator = await requireAgencyOperator({ cookies, platform });

	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		const parseResult = await parseBody(request, nurseInboxActionSchema);
		if (!parseResult.success) {
			return json(
				{ success: false, error: parseResult.error } as ApiResponse<never>,
				{ status: 400 }
			);
		}

		const result = await applyNurseInboxAction(
			db,
			parseResult.data as NurseInboxActionInput,
			{ actor_email: operator.email, actor_role: 'operator' }
		);

		return json({ success: true, data: result } as ApiResponse<NurseInboxActionResult>);
	} catch (err) {
		console.error('Nurse inbox action error:', err);
		if (isKitError(err)) throw err;

		const message = err instanceof Error ? err.message : 'Unknown error';
		const status = message.includes('not found') ? 404 : 500;

		return json(
			{
				success: false,
				error: `Error applying nurse inbox action: ${message}`
			} as ApiResponse<never>,
			{ status }
		);
	}
};

function mapInboxRow(row: InboxRow): NurseInboxItem {
	const metadata = safeJsonParse<Record<string, unknown>>(row.metadata_json, {}, 'metadata_json');
	const specialties = safeJsonParse<string[]>(row.specialties, [], 'specialties');
	const messagePreview =
		typeof metadata.content === 'string' ? metadata.content.slice(0, 240) : undefined;
	const subject = typeof metadata.subject === 'string' ? metadata.subject : undefined;
	const messageId = typeof metadata.message_id === 'string' ? metadata.message_id : undefined;
	const messageType =
		typeof metadata.message_type === 'string' ? metadata.message_type : undefined;

	return {
		id: row.id,
		event_type: row.event_type,
		source: row.source || undefined,
		event_at: row.event_at,
		message_preview: messagePreview,
		subject,
		message_id: messageId,
		message_type: messageType,
		person_id: row.person_id,
		candidate_profile_id: row.candidate_profile_id,
		candidate_name: row.candidate_name,
		phone: row.phone || undefined,
		email: row.email || undefined,
		profile_status: row.profile_status,
		profession: normalizeProfession(row.profession),
		specialty_primary: row.specialty_primary || undefined,
		specialties,
		home_state: row.home_state || undefined,
		available_from: row.available_from || undefined,
		pay_floor_weekly: row.pay_floor_weekly ?? undefined,
		recruiter_notes: row.recruiter_notes || undefined,
		next_step: getInboxNextStep(row.profile_status, row.event_type),
		opening:
			row.opening_id || row.facility_name || row.opening_specialty || row.opening_state
				? {
						id: row.opening_id || undefined,
						facility_name: row.facility_name || undefined,
						specialty: row.opening_specialty || undefined,
						state: row.opening_state || undefined
					}
				: undefined
	};
}

function buildFilters(input: { source?: string; profileStatus?: CandidateProfileStatus | null }): {
	where: string;
	params: string[];
} {
	const clauses = [
		`(
			ce.event_type = 'intake_submitted' OR
			ce.event_type = 'intake_updated' OR
			ce.event_type LIKE '%_intake_started' OR
			ce.event_type LIKE '%_message_received'
		)`
	];
	const params: string[] = [];

	if (input.source) {
		clauses.push('ce.source = ?');
		params.push(input.source);
	}

	if (input.profileStatus) {
		clauses.push('cp.profile_status = ?');
		params.push(input.profileStatus);
	}

	return {
		where: clauses.join(' AND '),
		params
	};
}

function buildInboxCtes(whereClause: string): string {
	return `
		WITH ranked_inbound_events AS (
			SELECT
				ce.id,
				ce.event_type,
				ce.source,
				ce.event_at,
				ce.metadata_json,
				cp.id AS candidate_profile_id,
				cp.profile_status,
				cp.profession,
				cp.specialty_primary,
				cp.specialties,
				cp.home_state,
				cp.available_from,
				cp.pay_floor_weekly,
				cp.recruiter_notes,
				p.id AS person_id,
				p.name AS candidate_name,
				p.phone,
				p.email,
				o.id AS opening_id,
				o.facility_name,
				o.specialty AS opening_specialty,
				o.state AS opening_state,
				ROW_NUMBER() OVER (
					PARTITION BY cp.id
					ORDER BY COALESCE(datetime(ce.event_at), ce.event_at) DESC, ce.id DESC
				) AS row_number
			FROM candidate_events ce
			INNER JOIN candidate_profiles cp ON cp.id = ce.candidate_profile_id
			INNER JOIN people p ON p.id = cp.person_id
			LEFT JOIN openings o ON o.id = ce.opening_id
			WHERE ${whereClause}
		),
		latest_inbound_events AS (
			SELECT *
			FROM ranked_inbound_events
			WHERE row_number = 1
		),
		latest_handled_events AS (
			SELECT
				ce.candidate_profile_id,
				MAX(COALESCE(datetime(ce.event_at), ce.event_at)) AS handled_at
			FROM candidate_events ce
			WHERE ce.event_type IN (
				'inbox_reviewed',
				'inbox_recruiter_assigned',
				'handoff_created'
			)
			GROUP BY ce.candidate_profile_id
		),
		pending_inbox_events AS (
			SELECT lie.*
			FROM latest_inbound_events lie
			LEFT JOIN latest_handled_events lhe ON lhe.candidate_profile_id = lie.candidate_profile_id
			WHERE
				lhe.handled_at IS NULL
				OR COALESCE(datetime(lie.event_at), lie.event_at) > lhe.handled_at
		)
	`;
}

function getInboxNextStep(profileStatus: CandidateProfileStatus, eventType: string): string {
	if (profileStatus === 'eligible') {
		return 'Move to recruiter handoff or shortlist review.';
	}

	if (profileStatus === 'ready_for_review') {
		return 'Review message context and run eligibility gating.';
	}

	if (eventType.endsWith('_message_received')) {
		return 'Use the new inbound message to complete profile qualification.';
	}

	return 'Collect missing profile details before recruiter review.';
}

function normalizeProfileStatus(value: string | null): CandidateProfileStatus | null {
	if (!value) {
		return null;
	}

	return ['draft', 'ready_for_review', 'eligible', 'inactive'].includes(value)
		? (value as CandidateProfileStatus)
		: null;
}

function normalizeOptionalString(value: string | null): string | undefined {
	if (!value) {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function parseBoundedInt(
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

function normalizeProfession(value: string): NurseInboxItem['profession'] {
	return ['rn', 'lpn', 'lvn', 'cna', 'allied', 'other'].includes(value)
		? (value as NurseInboxItem['profession'])
		: 'other';
}

function isKitError(err: unknown): err is { status: number; body: App.Error } {
	return Boolean(
		err &&
			typeof err === 'object' &&
			'status' in err &&
			'body' in err
	);
}
