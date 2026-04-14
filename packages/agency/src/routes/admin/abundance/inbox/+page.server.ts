import { requireAgencyOperator } from '$lib/server/operator-auth';
import type { PageServerLoad } from './$types';
import type { ApiResponse, NurseInboxResponse } from '$lib/types/abundance';

const emptyInbox: NurseInboxResponse = {
	items: [],
	recruiters: [],
	total: 0,
	limit: 40,
	offset: 0,
	filters: {},
	summary: {
		total_items: 0,
		draft_items: 0,
		ready_for_review_items: 0,
		eligible_items: 0,
		inactive_items: 0,
		by_source: []
	}
};

export const load: PageServerLoad = async ({ fetch, url, cookies, platform }) => {
	await requireAgencyOperator({ cookies, platform });

	try {
		const params = new URLSearchParams();
		const source = url.searchParams.get('source');
		const profileStatus = url.searchParams.get('profile_status');
		const limit = url.searchParams.get('limit') || '40';

		if (source) params.set('source', source);
		if (profileStatus) params.set('profile_status', profileStatus);
		params.set('limit', limit);

		const inboxRes = await fetch(`/api/abundance/intake/inbox?${params.toString()}`);
		const inboxPayload = inboxRes.ok
			? ((await inboxRes.json()) as ApiResponse<NurseInboxResponse>)
			: null;
		const inboxData = inboxRes.ok
			? inboxPayload?.data || emptyInbox
			: emptyInbox;

		return {
			inbox: inboxData
		};
	} catch (err) {
		console.error('Abundance inbox load error:', err);
		return {
			inbox: emptyInbox
		};
	}
};
