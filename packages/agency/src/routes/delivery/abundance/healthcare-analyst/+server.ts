import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canAccessNpgHealthcareAnalyst } from '$lib/server/abundance-client-access';

function readHealthcareAnalystUrl(platform: App.Platform | undefined): string {
	const raw = platform?.env?.NPG_HEALTHCARE_ANALYST_URL?.trim();
	if (!raw) throw error(503, 'NPG healthcare analyst access is not configured');

	try {
		const url = new URL(raw);
		if (url.protocol !== 'https:' || url.hostname !== 'udify.app' || !url.pathname.startsWith('/agent/')) {
			throw new Error('Unexpected analyst URL');
		}
		return url.toString();
	} catch {
		throw error(503, 'NPG healthcare analyst access is not configured');
	}
}

export const GET: RequestHandler = ({ locals, platform }) => {
	if (
		!canAccessNpgHealthcareAnalyst(
			locals.user?.email,
			platform?.env?.AGENCY_OPERATOR_EMAILS
		)
	) {
		throw error(403, 'NPG client access required');
	}

	throw redirect(303, readHealthcareAnalystUrl(platform));
};
