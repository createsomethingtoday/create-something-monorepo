import type { PageServerLoad } from './$types';
import {
	buildGovernanceOperatorReview,
	emptyGovernanceOperatorReview,
	normalizeGovernanceOperatorFilters
} from '$lib/server/governance-operator';
import { requireAgencyOperator } from '$lib/server/operator-auth';

export const load: PageServerLoad = async ({ cookies, platform, url }) => {
	const filters = normalizeGovernanceOperatorFilters(url.searchParams);
	await requireAgencyOperator({ cookies, platform });

	try {
		const db = platform?.env?.DB;
		if (!db) {
			return {
				review: emptyGovernanceOperatorReview(filters, 'Database is unavailable.'),
				error: 'Database is unavailable.'
			};
		}

		return {
			review: await buildGovernanceOperatorReview(db, filters),
			error: null
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to load governance records.';
		return {
			review: emptyGovernanceOperatorReview(filters, message),
			error: message
		};
	}
};
