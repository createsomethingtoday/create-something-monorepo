/**
 * Identity Worker Types
 *
 * Canon: Types are the skeleton of understanding.
 */

// Environment bindings
export interface Env {
	DB: D1Database;
	ENVIRONMENT: string;
	ALLOWED_ORIGINS: string;
	RESEND_API_KEY?: string;
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
	aud: string[]; // audience: ['workway', 'templates', 'io', 'space']
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
