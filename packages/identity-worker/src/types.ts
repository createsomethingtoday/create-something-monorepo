/**
 * Identity Worker Types
 *
 * Canon: Types are the skeleton of understanding.
 */

// Environment bindings
export interface Env {
	DB: D1Database;
	AVATARS: R2Bucket;
	ENVIRONMENT: string;
	ALLOWED_ORIGINS: string;
	RESEND_API_KEY?: string;
	MCP_HUB_URL?: string;
	MCP_SESSION_RESOLVE_TOKEN?: string;
	OSO_URL?: string;
	OSO_API_KEY?: string;
	OSO_FETCH_TIMEOUT_MILLIS?: string;
	OSO_BOOTSTRAP_POLICY?: string;
	MCP_POLICY_FALLBACK_ENABLED?: string;
	AGENCY_INTERNAL_API_URL?: string;
	AGENCY_INTERNAL_API_KEY?: string;
	OAUTH_ISSUER?: string;
	CONTROL_RUNTIME_RESOURCES?: string;
}

// Database models
export interface User {
	id: string;
	email: string;
	email_verified: number;
	password_hash: string;
	name: string | null;
	avatar_url: string | null;
	tier: 'free' | 'pro' | 'agency';
	source: 'workway' | 'templates' | 'io' | 'space' | 'lms';
	workway_id: string | null;
	templates_id: string | null;
	deleted_at: string | null;
	analytics_opt_out: number;
	created_at: string;
	updated_at: string;
}

export interface RefreshToken {
	id: string;
	user_id: string;
	token_hash: string;
	family_id: string;
	expires_at: string;
	revoked_at: string | null;
	created_at: string;
}

export interface PlayerAccessCredential {
	subject_id: string;
	player_code: string;
	password_hash: string;
	manager_subject: string;
	display_name: string | null;
	status: 'active' | 'revoked';
	created_by_actor: string;
	last_used_at: string | null;
	rotated_at: string | null;
	revoked_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface PlayerAccessSession {
	id: string;
	subject_id: string;
	token_hash: string;
	family_id: string;
	expires_at: string;
	revoked_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface SigningKey {
	id: string;
	private_key: string;
	public_key: string;
	algorithm: string;
	active: number;
	created_at: string;
}

export interface ApiKey {
	id: string;
	service: string;
	key_hash: string;
	permissions: string;
	revoked_at: string | null;
}

// API request/response types
export interface SignupRequest {
	email: string;
	password: string;
	name?: string;
	source?: User['source'];
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface RefreshRequest {
	refresh_token: string;
}

export interface TokenResponse {
	access_token: string;
	refresh_token: string;
	token_type: 'Bearer';
	expires_in: number;
}

export interface UserResponse {
	id: string;
	email: string;
	email_verified: boolean;
	name: string | null;
	avatar_url: string | null;
	tier: User['tier'];
	analytics_opt_out: boolean;
	created_at: string;
}

export interface ErrorResponse {
	error: string;
	message: string;
	status: number;
}

// JWT payload
export interface JWTPayload {
	sub: string; // user id
	email: string;
	tier: User['tier'];
	source: User['source'];
	iss: string; // issuer: https://id.createsomething.space
	aud: string[]; // application audiences declared by the Identity Worker
	iat: number; // issued at
	exp: number; // expiration
}

// JWKS types
export interface JWK {
	kty: string;
	crv: string;
	x: string;
	y: string;
	kid: string;
	alg: string;
	use: string;
}

export interface JWKS {
	keys: JWK[];
}

// Cross-domain SSO
export interface CrossDomainToken {
	id: string;
	user_id: string;
	token_hash: string;
	target: 'ltd' | 'io' | 'space' | 'agency';
	created_at: string;
	expires_at: string;
	used_at: string | null;
}

export interface CrossDomainGenerateRequest {
	target: CrossDomainToken['target'];
}

export interface CrossDomainGenerateResponse {
	token: string;
	expires_in: number;
}

export interface CrossDomainExchangeRequest {
	token: string;
}

export interface CrossDomainExchangeResponse extends TokenResponse {
	user: UserResponse;
}

// MCP session contracts (multi-tenant hub)
export interface McpSession {
	id: string;
	user_id: string;
	tenant_id: string;
	account_id: string;
	host: string;
	bound_host: string | null;
	tool_mode: 'read_only' | 'read_write';
	toolkit_profile_json: string;
	allowed_tool_prefixes_json: string;
	token_hash: string;
	expires_at: string;
	revoked_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface McpAccount {
	account_id: string;
	user_id: string;
	tenant_id: string;
	created_at: string;
	updated_at: string;
}

export interface McpSessionScope {
	id: string;
	session_id: string;
	scope_type: 'toolkit' | 'tool_prefix';
	scope_value: string;
	created_at: string;
}

export interface McpAuthEvent {
	id: string;
	session_id: string | null;
	user_id: string | null;
	event_type: string;
	event_data_json: string;
	created_at: string;
}

export interface McpLegacyKey {
	id: string;
	key_hash: string;
	key_prefix: string;
	tenant_id: string;
	account_id: string;
	user_id: string | null;
	reason: string;
	exception_approved_by: string | null;
	issued_by: string;
	expires_at: string;
	sunset_at: string;
	revoked_at: string | null;
	last_used_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface McpLongLivedToken {
	id: string;
	auth_subject: string;
	auth_email: string | null;
	tenant_id: string;
	account_id: string;
	bound_host: string | null;
	tool_mode: 'read_only' | 'read_write';
	toolkit_profile_json: string;
	allowed_tool_prefixes_json: string;
	token_hash: string;
	token_prefix: string;
	issued_by: string;
	metadata_json: string;
	last_used_at: string | null;
	revoked_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface McpPolicyRollout {
	policy_id: string;
	mode: 'legacy_enforce' | 'shadow' | 'polar_enforce';
	canary_percent: number;
	updated_by: string;
	updated_at: string;
}

export interface McpPolicyEvent {
	id: string;
	policy_id: string;
	action_name: string;
	account_id: string | null;
	actor: string | null;
	rollout_mode: 'legacy_enforce' | 'shadow' | 'polar_enforce';
	canary_percent: number;
	sampled_polar: number;
	mismatch: number;
	evaluation_path: 'legacy' | 'primary' | 'fallback';
	fallback_used: number;
	fallback_reason: string | null;
	legacy_decision: 'allow' | 'require_human_review' | 'block';
	polar_decision: 'allow' | 'require_human_review' | 'block';
	final_decision: 'allow' | 'require_human_review' | 'block';
	policy_hash: string | null;
	compiler_version: string | null;
	metadata_json: string;
	created_at: string;
}
