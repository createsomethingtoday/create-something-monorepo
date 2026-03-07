import { PartnerAuthHttpError, postIdentityAdmin } from '$lib/server/partner-auth';

export interface ManagedTokenSnapshot {
	token: {
		id: string;
		auth_subject: string;
		auth_email: string | null;
		account_id: string;
		tenant_id: string;
		token_prefix: string;
		tool_mode: 'read_only' | 'read_write';
		toolkit_profile: string[];
		allowed_tool_prefixes: string[];
		last_used_at: string | null;
		revoked_at: string | null;
		created_at: string;
		updated_at: string;
		active: boolean;
	} | null;
	available: boolean;
	error: string | null;
}

export interface PasswordSnapshot {
	hasPassword: boolean;
	email: string | null;
	emailVerified: boolean;
	identityUserExists: boolean;
	available: boolean;
	error: string | null;
}

interface TokenMetadataResponse {
	token: ManagedTokenSnapshot['token'];
}

interface PasswordUserResponse {
	user: {
		id: string;
		email: string;
		email_verified: boolean;
	} | null;
	has_password: boolean;
}

export async function loadManagedTokenSnapshot(
	platform: App.Platform | undefined,
	authSubject: string,
): Promise<ManagedTokenSnapshot> {
	const env = platform?.env;
	if (!env) {
		return {
			token: null,
			available: false,
			error: 'Platform env is unavailable',
		};
	}

	try {
		const payload = await postIdentityAdmin<TokenMetadataResponse>(env, '/v1/mcp/long-lived-tokens/admin-get', {
			auth_subject: authSubject,
		});
		return {
			token: payload.token,
			available: true,
			error: null,
		};
	} catch (error) {
		if (error instanceof PartnerAuthHttpError) {
			return {
				token: null,
				available: false,
				error: error.message,
			};
		}

		return {
			token: null,
			available: false,
			error: error instanceof Error ? error.message : 'Failed to load token state',
		};
	}
}

export async function loadPasswordSnapshot(
	platform: App.Platform | undefined,
	email: string,
): Promise<PasswordSnapshot> {
	const env = platform?.env;
	if (!env) {
		return {
			hasPassword: false,
			email: null,
			emailVerified: false,
			identityUserExists: false,
			available: false,
			error: 'Platform env is unavailable',
		};
	}

	try {
		const payload = await postIdentityAdmin<PasswordUserResponse>(env, '/v1/auth/password/admin-get', {
			email,
		});
		return {
			hasPassword: payload.has_password,
			email: payload.user?.email ?? email,
			emailVerified: payload.user?.email_verified ?? false,
			identityUserExists: Boolean(payload.user),
			available: true,
			error: null,
		};
	} catch (error) {
		if (error instanceof PartnerAuthHttpError) {
			return {
				hasPassword: false,
				email,
				emailVerified: false,
				identityUserExists: false,
				available: false,
				error: error.message,
			};
		}

		return {
			hasPassword: false,
			email,
			emailVerified: false,
			identityUserExists: false,
			available: false,
			error: error instanceof Error ? error.message : 'Failed to load password state',
		};
	}
}

export function getSettledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
	if (result.status === 'fulfilled') {
		return result.value;
	}

	console.error('Access-state dependency failed:', result.reason);
	return fallback;
}
