import { constantTimeEqual } from './mcp-entitlements';

export type GovernanceWriteCredentialResult =
	| { ok: true }
	| { ok: false; status: 401 | 503; error: string };

export function verifyGovernanceWriteCredential(input: {
	request: Request;
	expectedKey?: string | null;
}): GovernanceWriteCredentialResult {
	const expectedKey = input.expectedKey?.trim();
	if (!expectedKey) {
		return { ok: false, status: 503, error: 'Governance writes require AGENCY_INTERNAL_API_KEY.' };
	}

	const providedKey =
		input.request.headers.get('X-API-Key')?.trim() ??
		input.request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ??
		null;
	if (!providedKey || !constantTimeEqual(expectedKey, providedKey)) {
		return { ok: false, status: 401, error: 'Missing or invalid governance write credential.' };
	}

	return { ok: true };
}
