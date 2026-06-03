import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { CONCIERGE_SESSION_DEPENDENCY } from '$chat/api-contract';
import { ensureConciergeSession, getRequiredHandoffThreadView } from '$lib/server/threads/session';
import { getAgencyAccessStateForRequest } from '$lib/server/agency-access';
import {
	buildStaffOnboardingPayload,
	getStaffOnboardingRuntime,
	submitStaffOnboarding
} from '$lib/server/abundance/staff-onboarding';

export const load: PageServerLoad = async ({ depends, cookies, params, platform, url, parent }) => {
	depends(CONCIERGE_SESSION_DEPENDENCY);
	const parentData = await parent();

	if (parentData.agencyAccess.status === 'anonymous') {
		throw redirect(303, `/chat/${params.threadId}`);
	}

	const threadView = await getRequiredHandoffThreadView(
		ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url }),
		params.threadId,
		platform
	);
	const staffOnboarding = buildStaffOnboardingPayload(threadView.thread);
	const runtime = getStaffOnboardingRuntime(platform?.env);

	return {
		threadView,
		staffOnboarding: {
			ready: staffOnboarding.ready,
			blockers: staffOnboarding.blockers,
			runtimeConfigured: runtime.configured,
			runtimeMissing: runtime.missing
		}
	};
};

export const actions: Actions = {
	submitStaffOnboarding: async ({ cookies, fetch, params, platform, request, url }) => {
		const agencyAccess = await getAgencyAccessStateForRequest({
			cookies,
			fetch,
			request,
			platform
		});

		if (agencyAccess.status === 'anonymous') {
			throw redirect(303, `/chat/${params.threadId}`);
		}

		const threadView = await getRequiredHandoffThreadView(
			ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url }),
			params.threadId,
			platform
		);
		const staffOnboarding = buildStaffOnboardingPayload(threadView.thread);

		if (!staffOnboarding.ready || !staffOnboarding.payload) {
			return fail(400, {
				staffOnboardingResult: {
					success: false,
					message: 'Staff DB writeback is blocked.',
					blockers: staffOnboarding.blockers
				}
			});
		}

		const result = await submitStaffOnboarding(staffOnboarding.payload, platform?.env, fetch);
		if (!result.success) {
			return fail(result.status, {
				staffOnboardingResult: {
					success: false,
					message: result.error ?? 'Staff DB writeback failed.',
					status: result.status
				}
			});
		}

		return {
			staffOnboardingResult: {
				success: true,
				message: 'Staff DB submission saved.',
				status: result.status
			}
		};
	}
};
