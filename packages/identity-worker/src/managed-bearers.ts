import { generateSecureToken } from './services/crypto';

export type PreparedManagedBearerToken = {
	rawToken: string;
	tokenPrefix: string;
	tokenSource: 'adopted' | 'generated';
};

export function prepareManagedBearerToken(existingToken?: string | null): PreparedManagedBearerToken {
	const adoptedToken = normalizeExistingToken(existingToken);
	if (adoptedToken) {
		return {
			rawToken: adoptedToken,
			tokenPrefix: adoptedToken.slice(0, 14),
			tokenSource: 'adopted',
		};
	}

	const generatedToken = `mcpu_${generateSecureToken(48)}`;
	return {
		rawToken: generatedToken,
		tokenPrefix: generatedToken.slice(0, 14),
		tokenSource: 'generated',
	};
}

function normalizeExistingToken(value?: string | null): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}
