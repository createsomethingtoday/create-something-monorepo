import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	nurseMessageIntakeSchema,
	parseBody,
	type NurseMessageIntakeInput
} from '@create-something/canon/validation';
import type { ApiResponse, NurseMessageIntakeResult } from '$lib/types/abundance';
import { processNurseMessageIntake } from '$lib/abundance/nurse-intake';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		const parseResult = await parseBody(request, nurseMessageIntakeSchema);
		if (!parseResult.success) {
			return json(
				{ success: false, error: parseResult.error } as ApiResponse<never>,
				{ status: 400 }
			);
		}

		const intakeResult = await processNurseMessageIntake(
			db,
			parseResult.data as NurseMessageIntakeInput
		);

		return json(
			{ success: true, data: intakeResult } as ApiResponse<NurseMessageIntakeResult>,
			{ status: intakeResult.is_new_candidate ? 201 : 200 }
		);
	} catch (err) {
		console.error('Abundance message intake error:', err);
		if (err instanceof Response) throw err;

		const message = err instanceof Error ? err.message : 'Unknown error';
		const status =
			message.includes('Phone and email map to different')
				? 409
				: message.includes('Phone or email is required')
					? 400
					: 500;

		return json(
			{
				success: false,
				error: `Error processing nurse message intake: ${message}`
			} as ApiResponse<never>,
			{ status }
		);
	}
};
