import type { PageServerLoad } from './$types';
import {
	buildCaptureReview,
	type CaptureReviewOptions,
	type CaptureReviewResult,
} from '$lib/server/capture-review';
import { requireAgencyOperator } from '$lib/server/operator-auth';

const emptyReview = (includeOperational: boolean): CaptureReviewResult => ({
	generated_at: new Date().toISOString(),
	limits: {
		per_surface: 100,
		include_operational: includeOperational,
	},
	filters: {
		surface: 'all',
		classification: 'all',
		action: 'all',
		reviewed: 'all',
		query: '',
	},
	decision_storage: {
		available: false,
		stored_count: 0,
	},
	summary: {
		total: 0,
		unfiltered_total: 0,
		by_surface: {},
		by_classification: {},
		recommended_actions: {},
	},
	records: [],
});

export const load: PageServerLoad = async ({ cookies, platform, url }) => {
	const include = url.searchParams.get('include') ?? '';
	const includeOperational = include === 'all' || include === 'operational';
	const limit = Number.parseInt(url.searchParams.get('limit') ?? '100', 10);
	await requireAgencyOperator({ cookies, platform });

	try {
		const db = platform?.env?.DB;
		if (!db) {
			return {
				review: emptyReview(includeOperational),
				includeOperational,
				limit,
				error: 'Database is unavailable.',
			};
		}

		return {
			review: await buildCaptureReview(db, {
				limit,
				includeOperational,
				surface: url.searchParams.get('surface') as CaptureReviewOptions['surface'],
				classification: url.searchParams.get('classification') as CaptureReviewOptions['classification'],
				action: url.searchParams.get('action') as CaptureReviewOptions['action'],
				reviewed: url.searchParams.get('reviewed') as CaptureReviewOptions['reviewed'],
				query: url.searchParams.get('q') ?? '',
			}),
			includeOperational,
			limit,
			error: null,
		};
	} catch (error) {
		return {
			review: emptyReview(includeOperational),
			includeOperational,
			limit,
			error: error instanceof Error ? error.message : 'Failed to load capture review.',
		};
	}
};
