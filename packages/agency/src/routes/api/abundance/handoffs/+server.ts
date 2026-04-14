import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	nurseHandoffActionSchema,
	parseBody,
	type NurseHandoffActionInput
} from '@create-something/canon/validation';
import type {
	ApiResponse,
	NurseHandoffActionResult,
	NurseHandoffResponse
} from '$lib/types/abundance';
import { applyNurseHandoffAction } from '$lib/abundance/nurse-inbox';
import {
	listNurseHandoffs,
	normalizeHandoffStatus,
	normalizeOptionalString,
	parseBoundedInt
} from '$lib/abundance/nurse-handoffs';
import { requireAgencyOperator } from '$lib/server/operator-auth';

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	await requireAgencyOperator({ cookies, platform });

	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		const status = normalizeHandoffStatus(url.searchParams.get('status'));
		const queueSlug = normalizeOptionalString(url.searchParams.get('queue_slug'));
		const limit = parseBoundedInt(url.searchParams.get('limit'), 40, 1, 100);
		const offset = parseBoundedInt(url.searchParams.get('offset'), 0, 0);

		const response: NurseHandoffResponse = await listNurseHandoffs(db, {
			status,
			queueSlug,
			limit,
			offset
		});

		return json({ success: true, data: response } as ApiResponse<NurseHandoffResponse>);
	} catch (err) {
		console.error('Nurse handoff query error:', err);
		if (isKitError(err)) throw err;

		return json(
			{
				success: false,
				error: `Error fetching nurse handoffs: ${err instanceof Error ? err.message : 'Unknown error'}`
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

		const parseResult = await parseBody(request, nurseHandoffActionSchema);
		if (!parseResult.success) {
			return json(
				{ success: false, error: parseResult.error } as ApiResponse<never>,
				{ status: 400 }
			);
		}

		const result = await applyNurseHandoffAction(
			db,
			parseResult.data as NurseHandoffActionInput,
			{ actor_email: operator.email, actor_role: 'operator' }
		);

		return json({ success: true, data: result } as ApiResponse<NurseHandoffActionResult>);
	} catch (err) {
		console.error('Nurse handoff action error:', err);
		if (isKitError(err)) throw err;

		const message = err instanceof Error ? err.message : 'Unknown error';
		const status = message.includes('not found') ? 404 : 500;

		return json(
			{
				success: false,
				error: `Error applying nurse handoff action: ${message}`
			} as ApiResponse<never>,
			{ status }
		);
	}
};

function isKitError(err: unknown): err is { status: number; body: App.Error } {
	return Boolean(err && typeof err === 'object' && 'status' in err && 'body' in err);
}
