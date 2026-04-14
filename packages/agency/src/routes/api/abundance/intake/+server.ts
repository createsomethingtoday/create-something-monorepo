import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	nurseIntakeSchema,
	parseBody,
	type NurseIntakeInput
} from '@create-something/canon/validation';
import type { ApiResponse, NurseIntakeResult } from '$lib/types/abundance';
import { processNurseIntake } from '$lib/abundance/nurse-intake';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		const parseResult = await parseBody(request, nurseIntakeSchema);
		if (!parseResult.success) {
			return json(
				{ success: false, error: parseResult.error } as ApiResponse<never>,
				{ status: 400 }
			);
		}

		const intakeResult = await processNurseIntake(db, parseResult.data as NurseIntakeInput);

		return json(
			{ success: true, data: intakeResult } as ApiResponse<NurseIntakeResult>,
			{ status: intakeResult.created_person || intakeResult.created_profile ? 201 : 200 }
		);
	} catch (err) {
		console.error('Abundance intake error:', err);
		if (err instanceof Response) throw err;

		const message = err instanceof Error ? err.message : 'Unknown error';
		const status = message.includes('Phone and email map to different people records')
			? 409
			: message.includes('Phone or email is required')
				? 400
				: 500;

		return json(
			{
				success: false,
				error: `Error processing nurse intake: ${message}`
			} as ApiResponse<never>,
			{ status }
		);
	}
};
