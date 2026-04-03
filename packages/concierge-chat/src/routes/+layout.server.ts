import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createLayoutServerLoader } from '@create-something/canon/auth';
import { getAgencyAccessStateForRequest } from '$lib/server/agency-access';
import { getIntakeVerificationSupport } from '$lib/server/intake-verification';
import {
	getSanitizedIntakeGrantUrl,
	resolveIntakeAccess
} from '$lib/server/intake-access';

const loadAgencySession = createLayoutServerLoader({ property: 'agency' });

export const load: LayoutServerLoad = async (event) => {
	const intakeAccess = resolveIntakeAccess({
		cookies: event.cookies,
		url: event.url,
		platform: event.platform,
		secure: event.url.protocol === 'https:'
	});

	if (intakeAccess.granted && intakeAccess.shouldStripGrantParam) {
		throw redirect(303, getSanitizedIntakeGrantUrl(event.url));
	}

	const sessionData = await loadAgencySession({
		url: event.url,
		cookies: event.cookies,
		platform: event.platform
			? {
					env: event.platform.env as Record<string, string | undefined> | undefined
				}
			: undefined
	});

	return {
		...sessionData,
		currentPath: event.url.pathname,
		intakeAccess,
		intakeVerification: getIntakeVerificationSupport(event.platform),
		agencyAccess: await getAgencyAccessStateForRequest({
			cookies: event.cookies,
			fetch: event.fetch,
			request: event.request,
			platform: event.platform
		})
	};
};
