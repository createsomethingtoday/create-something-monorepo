import { requireAgencySessionUser } from '$lib/server/mcp-token';
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
	const user = await requireAgencySessionUser({ cookies, platform });

	try {
		const params = new URLSearchParams();
		const status = url.searchParams.get('status');
		const queueSlug = url.searchParams.get('queue_slug');
		const limit = url.searchParams.get('limit') || '40';

		if (status) params.set('status', status);
		if (queueSlug) params.set('queue_slug', queueSlug);
		params.set('limit', limit);

		const handoffRes = await fetch(`/api/abundance/handoffs/mine?${params.toString()}`);
		const handoffPayload = (await handoffRes.json().catch(() => null)) as
			| ApiResponse<NurseHandoffResponse>
			| null;

		return {
			userEmail: user.email,
			handoffs: handoffRes.ok ? handoffPayload?.data || emptyHandoffs : emptyHandoffs,
			errorMessage: handoffRes.ok ? undefined : handoffPayload?.error || 'Unable to load your handoffs.'
		};
	} catch (err) {
		console.error('Recruiter handoffs load error:', err);
		return {
			userEmail: user.email,
			handoffs: emptyHandoffs,
			errorMessage: 'Unable to load your handoffs.'
		};
	}
};
