import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	nurseHandoffActionSchema,
	parseBody,
	type NurseHandoffActionInput
} from '@create-something/canon/validation';
import type { ApiResponse, NurseHandoffActionResult, NurseHandoffResponse } from '$lib/types/abundance';
import { applyNurseHandoffAction } from '$lib/abundance/nurse-inbox';
import {
	findRecruiterPersonByEmail,
	listNurseHandoffs,
	normalizeHandoffStatus,
	normalizeOptionalString,
	parseBoundedInt
} from '$lib/abundance/nurse-handoffs';
import { requireAgencySessionUser } from '$lib/server/mcp-token';

interface OwnedHandoffRow {
	id: string;
	recruiter_person_id?: string | null;
}

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	const user = await requireAgencySessionUser({ cookies, platform });

	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		const recruiter = await findRecruiterPersonByEmail(db, user.email);
		if (!recruiter) {
			throw error(403, 'Recruiter access requires a linked recruiter profile.');
		}

		const status = normalizeHandoffStatus(url.searchParams.get('status'));
		const queueSlug = normalizeOptionalString(url.searchParams.get('queue_slug'));
		const limit = parseBoundedInt(url.searchParams.get('limit'), 40, 1, 100);
		const offset = parseBoundedInt(url.searchParams.get('offset'), 0, 0);

		const response: NurseHandoffResponse = await listNurseHandoffs(db, {
			status,
			queueSlug,
			limit,
			offset,
			recruiterPersonId: recruiter.id,
			includeRecruiters: false
		});

		return json({ success: true, data: response } as ApiResponse<NurseHandoffResponse>);
	} catch (err) {
		console.error('Recruiter nurse handoff query error:', err);
		if (isKitError(err)) throw err;

		return json(
			{
				success: false,
				error: `Error fetching recruiter handoffs: ${err instanceof Error ? err.message : 'Unknown error'}`
			} as ApiResponse<never>,
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	const user = await requireAgencySessionUser({ cookies, platform });

	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		const recruiter = await findRecruiterPersonByEmail(db, user.email);
		if (!recruiter) {
			throw error(403, 'Recruiter access requires a linked recruiter profile.');
		}

		const parseResult = await parseBody(request, nurseHandoffActionSchema);
		if (!parseResult.success) {
			return json(
				{ success: false, error: parseResult.error } as ApiResponse<never>,
				{ status: 400 }
			);
		}

		const input = parseResult.data as NurseHandoffActionInput;
		if (input.recruiter_person_id && input.recruiter_person_id !== recruiter.id) {
			return json(
				{
					success: false,
					error: 'Recruiters can only act on handoffs assigned to their linked profile.'
				} as ApiResponse<never>,
				{ status: 403 }
			);
		}

		const handoff = await db
			.prepare(
				`
					SELECT id, recruiter_person_id
					FROM handoffs
					WHERE id = ?
				`
			)
			.bind(input.handoff_id)
			.first<OwnedHandoffRow>();

		if (!handoff) {
			return json(
				{ success: false, error: 'Handoff not found.' } as ApiResponse<never>,
				{ status: 404 }
			);
		}

		if (handoff.recruiter_person_id !== recruiter.id) {
			return json(
				{
					success: false,
					error: 'This handoff is not assigned to your recruiter profile.'
				} as ApiResponse<never>,
				{ status: 403 }
			);
		}

		const result = await applyNurseHandoffAction(
			db,
			{
				...input,
				recruiter_person_id: recruiter.id,
				source: input.source || 'recruiter_handoff_queue'
			},
			{ actor_email: user.email, actor_role: 'recruiter' }
		);

		return json({ success: true, data: result } as ApiResponse<NurseHandoffActionResult>);
	} catch (err) {
		console.error('Recruiter nurse handoff action error:', err);
		if (isKitError(err)) throw err;

		const message = err instanceof Error ? err.message : 'Unknown error';
		const status = message.includes('not found') ? 404 : 500;

		return json(
			{
				success: false,
				error: `Error applying recruiter handoff action: ${message}`
			} as ApiResponse<never>,
			{ status }
		);
	}
};

function isKitError(err: unknown): err is { status: number; body: App.Error } {
	return Boolean(err && typeof err === 'object' && 'status' in err && 'body' in err);
}
