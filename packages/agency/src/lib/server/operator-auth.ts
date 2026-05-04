import { error } from '@sveltejs/kit';
import { requireAgencySessionUser, type AgencySessionUser } from '$lib/server/mcp-token';

export interface AgencyOperatorAccess {
	actor: string;
	kind: 'operator' | 'internal';
	user: AgencySessionUser | null;
}

export async function requireAgencyOperator(input: {
	locals?: App.Locals;
	request?: Request;
	platform: App.Platform | undefined;
}): Promise<AgencySessionUser> {
	const user = await requireAgencySessionUser(input);
	const allowed = parseOperatorEmails(input.platform?.env?.AGENCY_OPERATOR_EMAILS);
	if (!allowed.has(user.email.toLowerCase())) {
		throw error(403, 'Operator access required');
	}
	return user;
}

export async function requireAgencyOperatorOrInternal(input: {
	locals?: App.Locals;
	request?: Request;
	platform: App.Platform | undefined;
}): Promise<AgencyOperatorAccess> {
	if (input.request && isInternalApiRequest(input.request, input.platform?.env)) {
		return {
			actor: 'agency_internal_api',
			kind: 'internal',
			user: null,
		};
	}

	const user = await requireAgencyOperator(input);
	return {
		actor: user.email,
		kind: 'operator',
		user,
	};
}

function parseOperatorEmails(raw: string | undefined): Set<string> {
	return new Set(
		(raw ?? '')
			.split(',')
			.map((value) => value.trim().toLowerCase())
			.filter(Boolean)
	);
}

function isInternalApiRequest(
	request: Request,
	env: App.Platform['env'] | undefined,
): boolean {
	const expected = env?.AGENCY_INTERNAL_API_KEY?.trim();
	if (!expected) return false;

	const authorization = request.headers.get('Authorization');
	const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
	const headerKey = request.headers.get('X-Agency-Internal-Key')?.trim();
	const provided = bearer || headerKey;

	return Boolean(provided && safeEqual(provided, expected));
}

function safeEqual(a: string, b: string): boolean {
	if (!a || !b) return false;

	let diff = a.length ^ b.length;
	const maxLength = Math.max(a.length, b.length);

	for (let index = 0; index < maxLength; index += 1) {
		diff |= a.charCodeAt(index % a.length) ^ b.charCodeAt(index % b.length);
	}

	return diff === 0;
}
