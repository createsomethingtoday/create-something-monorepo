import { requireAgencyOperator } from '$lib/server/operator-auth';
import type { ApiResponse, NurseHandoffResponse } from '$lib/types/abundance';
import type { PageServerLoad } from './$types';

const emptyHandoffs: NurseHandoffResponse = {
	items: [],
	recruiters: [],
	total: 0,
	limit: 40,
	offset: 0,
	filters: {},
	summary: {
		total_items: 0,
		open_items: 0,
		accepted_items: 0,
		completed_items: 0,
		cancelled_items: 0,
		overdue_items: 0,
		due_soon_items: 0,
		by_queue: []
	}
};

export const load: PageServerLoad = async ({ fetch, url, cookies, platform }) => {
	await requireAgencyOperator({ cookies, platform });

	try {
		const params = new URLSearchParams();
		const status = url.searchParams.get('status');
		const queueSlug = url.searchParams.get('queue_slug');
		const limit = url.searchParams.get('limit') || '40';

		if (status) params.set('status', status);
		if (queueSlug) params.set('queue_slug', queueSlug);
		params.set('limit', limit);

		const handoffRes = await fetch(`/api/abundance/handoffs?${params.toString()}`);
		const handoffPayload = handoffRes.ok
			? ((await handoffRes.json()) as ApiResponse<NurseHandoffResponse>)
			: null;
		const handoffs = handoffRes.ok ? handoffPayload?.data || emptyHandoffs : emptyHandoffs;

		return { handoffs };
	} catch (err) {
		console.error('Abundance handoffs load error:', err);
		return { handoffs: emptyHandoffs };
	}
};
