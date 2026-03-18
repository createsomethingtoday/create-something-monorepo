import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAgencySessionUser } from '$lib/server/mcp-token';
import { listPartnerProspectClaimsForAgencyUser } from '$lib/server/partner-prospect-discovery';

export const GET: RequestHandler = async ({ cookies, platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
	}

	const user = await requireAgencySessionUser({ cookies, platform });
	const prospects = await listPartnerProspectClaimsForAgencyUser({
		db,
		authSubject: user.id,
		email: user.email,
	});

	return json({
		user: {
			auth_subject: user.id,
			email: user.email,
		},
		prospects,
	});
};
