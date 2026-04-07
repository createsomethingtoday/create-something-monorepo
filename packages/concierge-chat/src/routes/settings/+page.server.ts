import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { CONCIERGE_SESSION_DEPENDENCY } from '$chat/api-contract';
import { ensureConciergeSession, getSettingsPageData } from '$lib/server/threads/session';
import { isAgencyAccessPreviewEnabled } from '$lib/server/runtime';

export const load: PageServerLoad = async ({ depends, cookies, platform, url, parent }) => {
	depends(CONCIERGE_SESSION_DEPENDENCY);
	const parentData = await parent();

	if (parentData.agencyAccess.status !== 'allowed') {
		throw redirect(303, '/apply');
	}

	return {
		...(await getSettingsPageData(
			ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url }),
			platform
		)),
		agencyAccessPreviewEnabled: isAgencyAccessPreviewEnabled(platform)
	};
};
