import { error } from '@sveltejs/kit';
import { requireAgencySessionUser, type AgencySessionUser } from '$lib/server/mcp-token';

export async function requireAgencyOperator(input: {
	cookies: Parameters<typeof requireAgencySessionUser>[0]['cookies'];
	platform: App.Platform | undefined;
}): Promise<AgencySessionUser> {
	const user = await requireAgencySessionUser(input);
	const allowed = parseOperatorEmails(input.platform?.env?.AGENCY_OPERATOR_EMAILS);
	if (!allowed.has(user.email.toLowerCase())) {
		throw error(403, 'Operator access required');
	}
	return user;
}

function parseOperatorEmails(raw: string | undefined): Set<string> {
	return new Set(
		(raw ?? '')
			.split(',')
			.map((value) => value.trim().toLowerCase())
			.filter(Boolean)
	);
}
