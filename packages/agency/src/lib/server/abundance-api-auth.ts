import { json, type Handle } from '@sveltejs/kit';

const textEncoder = new TextEncoder();

export function isProtectedAbundanceApiPath(pathname: string): boolean {
	const isAbundanceApiPath = pathname === '/api/abundance' || pathname.startsWith('/api/abundance/');
	const isWhatsAppWebhookPath = pathname === '/api/abundance/whatsapp' || pathname === '/api/abundance/whatsapp/';
	return isAbundanceApiPath && !isWhatsAppWebhookPath;
}

export function isStaffOnboardingApiPath(pathname: string): boolean {
	return pathname === '/api/abundance/staff/onboarding' || pathname === '/api/abundance/staff/onboarding/';
}

export function extractBearerToken(authorizationHeader: string | null | undefined): string | null {
	if (!authorizationHeader) {
		return null;
	}

	const [scheme, ...tokenParts] = authorizationHeader.trim().split(/\s+/);
	const token = tokenParts.join(' ').trim();

	if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
		return null;
	}

	return token;
}

function timingSafeBytesEqual(left: Uint8Array, right: Uint8Array): boolean {
	let diff = left.length ^ right.length;
	const length = Math.max(left.length, right.length);

	for (let index = 0; index < length; index += 1) {
		diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
	}

	return diff === 0;
}

export async function isValidAbundanceApiBearer(
	authorizationHeader: string | null | undefined,
	expectedToken: string | null | undefined
): Promise<boolean> {
	const suppliedToken = extractBearerToken(authorizationHeader);
	const configuredToken = expectedToken?.trim();

	if (!suppliedToken || !configuredToken) {
		return false;
	}

	const [suppliedDigest, configuredDigest] = await Promise.all([
		crypto.subtle.digest('SHA-256', textEncoder.encode(suppliedToken)),
		crypto.subtle.digest('SHA-256', textEncoder.encode(configuredToken))
	]);

	return timingSafeBytesEqual(new Uint8Array(suppliedDigest), new Uint8Array(configuredDigest));
}

export const abundanceApiAuthHandle: Handle = async ({ event, resolve }) => {
	if (!isProtectedAbundanceApiPath(event.url.pathname)) {
		return resolve(event);
	}

	if (event.locals.user) {
		return resolve(event);
	}

	const isAuthorized = await isValidAbundanceApiBearer(
		event.request.headers.get('authorization'),
		event.platform?.env?.AGENCY_INTERNAL_API_KEY
	);

	const isStaffOnboardingAuthorized = isStaffOnboardingApiPath(event.url.pathname)
		? await isValidAbundanceApiBearer(
				event.request.headers.get('authorization'),
				event.platform?.env?.ABUNDANCE_STAFF_ONBOARDING_TOKEN
			)
		: false;

	if (!isAuthorized && !isStaffOnboardingAuthorized) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	return resolve(event);
};
