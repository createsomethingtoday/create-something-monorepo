import { error, fail } from '@sveltejs/kit';
import {
	buildStaffOnboardingPayload,
	getStaffOnboardingRuntime,
	submitStaffOnboarding
} from '$server/abundance/staff-onboarding';
import { createHandoffPacket } from '$server/handoff/create-packet';
import { getDemoThread } from '$server/threads/demo';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const thread = getDemoThread(params.threadId);

	if (!thread) {
		throw error(404, `Unknown demo thread: ${params.threadId}`);
	}

	const staffOnboarding = buildStaffOnboardingPayload(thread);
	const runtime = getStaffOnboardingRuntime(platform?.env);

	return {
		thread,
		packet: createHandoffPacket(thread),
		staffOnboarding: {
			ready: staffOnboarding.ready,
			blockers: staffOnboarding.blockers,
			runtimeConfigured: runtime.configured,
			runtimeMissing: runtime.missing
		}
	};
};

export const actions: Actions = {
	submitStaffOnboarding: async ({ params, platform, fetch }) => {
		const thread = getDemoThread(params.threadId);

		if (!thread) {
			throw error(404, `Unknown demo thread: ${params.threadId}`);
		}

		const staffOnboarding = buildStaffOnboardingPayload(thread);
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
