export interface ManagedBearerTokenMetadata {
	id: string;
	auth_subject: string;
	auth_email: string | null;
	account_id: string;
	tenant_id: string;
	bound_host?: string | null;
	token_prefix: string;
	tool_mode: 'read_only' | 'read_write';
	toolkit_profile: string[];
	allowed_tool_prefixes: string[];
	last_used_at: string | null;
	revoked_at: string | null;
	created_at: string;
	updated_at: string;
	active: boolean;
}

export function requireExplicitManagedBearerRotation(input: {
	existingToken: ManagedBearerTokenMetadata | null | undefined;
	rotateExisting?: boolean;
}):
	| { ok: true }
	| {
			ok: false;
			status: 409;
			body: {
				error: 'token_exists';
				message: string;
				explicit_rotate_required: true;
				token: ManagedBearerTokenMetadata;
			};
	  } {
	if (!input.existingToken?.active || input.rotateExisting === true) {
		return { ok: true };
	}

	return {
		ok: false,
		status: 409,
		body: {
			error: 'token_exists',
			message:
				'An active managed bearer token already exists. Re-issue does not rotate it automatically; set rotate_existing=true to replace it.',
			explicit_rotate_required: true,
			token: input.existingToken,
		},
	};
}
