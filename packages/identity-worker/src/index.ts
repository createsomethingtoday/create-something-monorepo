/**
 * Identity Worker
 *
 * Unified authentication for CREATE SOMETHING services.
 * Zero dependencies. The infrastructure disappears.
 *
 * Canon: One identity, many manifestations.
 */

import type { Env, ErrorResponse, TokenResponse, UserResponse, JWTPayload, CrossDomainToken, User } from './types';
import { hashPassword, verifyPassword, generateUUID, hashToken, generateSecureToken } from './services/crypto';
import { createSignedToken, generateTokens, refreshTokens, getJWKS, validateJWT, importPublicKey } from './services/tokens';
import {
	type AuthorizationDecisionType,
	type AuthorizationRequest,
	type AuthzDecisionEventRecord,
	type AuthzRolloutRow,
	evaluateAuthorizationRequest,
	getAuthzRollout,
	getPolicyManifest,
	recordAuthzDecisionEvent,
} from '@create-something/mcp-authz';
import {
	findUserByEmail,
	findUserById,
	createUser,
	updateUser,
	updateUserPassword,
	updateUserEmail,
	softDeleteUser,
	hardDeleteUser,
	findDeletedUsersForCleanup,
	revokeAllUserTokens,
	checkRateLimit,
	incrementRateLimit,
	findRefreshTokenByHash,
	findApiKeyByHash,
	createEmailChangeRequest,
	findEmailChangeRequestByToken,
	deleteEmailChangeRequest,
	createCrossDomainToken,
	findCrossDomainTokenByHash,
	markCrossDomainTokenUsed,
	countRecentCrossDomainTokens,
	ensureMcpAccountForUserTenant,
	findMcpAccountById,
	createMcpSession,
	findMcpSessionById,
	findMcpSessionByTokenHash,
	findMcpLegacyKeyByTokenHash,
	findMcpLongLivedTokenByAuthSubject,
	findMcpLongLivedTokenById,
	findMcpLongLivedTokenByTokenHash,
	markMcpLegacyKeyUsed,
	markMcpLongLivedTokenUsed,
	replaceMcpSessionScopes,
	revokeMcpSession,
	revokeAllMcpSessionsForUser,
	createMcpAuthEvent,
	listRecentMcpAuthEvents,
	createMcpLegacyKey,
	findMcpLegacyKeyById,
	revokeMcpLegacyKey,
	revokeMcpLongLivedToken,
	upsertMcpLongLivedToken,
	findMcpPolicyRollout,
	createMcpPolicyEvent,
	listRecentMcpPolicyEvents,
} from './db/queries';
import { sendVerificationEmail, sendDeletionConfirmationEmail } from './services/email';
import type { RolloutConfig } from '@create-something/policy-os-engine';
import { createAuthOpenApi, createAuthPlatformContract } from '@create-something/auth-platform';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const method = request.method;
		const path = url.pathname;

		// CORS preflight
		if (method === 'OPTIONS') {
			return cors(new Response(null, { status: 204 }), request, env);
		}

		try {
			const response = await route(request, env, method, path);
			return cors(response, request, env);
		} catch (err) {
			console.error('Identity Worker Error:', err);
			return cors(
				json({ error: 'internal_error', message: 'An unexpected error occurred', status: 500 }, 500),
				request,
				env
			);
		}
	},
};

// Router
async function route(request: Request, env: Env, method: string, path: string): Promise<Response> {
	// Health check
	if (path === '/' && method === 'GET') {
		return json({ service: 'identity-worker', version: '0.1.0', status: 'healthy' });
	}

	// JWKS (public)
	if (path === '/.well-known/jwks.json' && method === 'GET') {
		const jwks = await getJWKS(env.DB);
		return json(jwks, 200, { 'Cache-Control': 'public, max-age=3600' });
	}
	if (path === '/.well-known/create-something-auth' && method === 'GET') {
		return json(createAuthPlatformContract(new URL(request.url).origin), 200, {
			'Cache-Control': 'public, max-age=300',
		});
	}
	if (path === '/v1/auth/openapi.json' && method === 'GET') {
		return json(createAuthOpenApi(new URL(request.url).origin), 200, {
			'Cache-Control': 'public, max-age=300',
		});
	}
	if (path === '/.well-known/oauth-authorization-server' && method === 'GET') {
		return json(buildOAuthAuthorizationServerMetadata(new URL(request.url), env), 200, {
			'Cache-Control': 'public, max-age=300',
		});
	}
	if (path === '/.well-known/openid-configuration' && method === 'GET') {
		return json(buildOpenIdConfigurationMetadata(new URL(request.url), env), 200, {
			'Cache-Control': 'public, max-age=300',
		});
	}
	if (path === '/oauth/register' && method === 'POST') return handleOAuthRegister(request, env);
	if (path === '/oauth/authorize' && method === 'GET') return handleOAuthAuthorizePage(request, env);
	if (path === '/oauth/authorize' && method === 'POST') return handleOAuthAuthorize(request, env);
	if (path === '/oauth/token' && method === 'POST') return handleOAuthToken(request, env);
	if (path === '/oauth/userinfo' && method === 'GET') return handleOAuthUserInfo(request, env);
	if (path === '/v1/auth/password/admin-get' && method === 'POST') return handleAdminGetPasswordUser(request, env);
	if (path === '/v1/auth/password/admin-upsert' && method === 'POST') return handleAdminUpsertPasswordUser(request, env);

	// Auth endpoints
	if (path === '/v1/auth/signup' && method === 'POST') return handleSignup(request, env);
	if (path === '/v1/auth/login' && method === 'POST') return handleLogin(request, env);
	if (path === '/v1/auth/magic-login' && method === 'POST') return handleMagicLogin(request, env);
	if (path === '/v1/auth/magic-signup' && method === 'POST') return handleMagicSignup(request, env);
	if (path === '/v1/auth/refresh' && method === 'POST') return handleRefresh(request, env);
	if (path === '/v1/auth/logout' && method === 'POST') return handleLogout(request, env);

	// Cross-domain SSO endpoints
	if (path === '/v1/auth/cross-domain/generate' && method === 'POST') return handleCrossDomainGenerate(request, env);
	if (path === '/v1/auth/cross-domain/exchange' && method === 'POST') return handleCrossDomainExchange(request, env);

	// MCP session router endpoints
	if (path === '/v1/mcp/sessions' && method === 'POST') return handleCreateMcpSession(request, env);
	if (path === '/v1/mcp/sessions/admin-mint' && method === 'POST') return handleAdminMintMcpSession(request, env);
	if (path === '/v1/mcp/sessions/resolve' && method === 'POST') return handleResolveMcpSession(request, env);
	if (path === '/v1/mcp/long-lived-tokens/admin-issue' && method === 'POST') {
		return handleAdminIssueMcpLongLivedToken(request, env);
	}
	if (path === '/v1/mcp/long-lived-tokens/admin-get' && method === 'POST') {
		return handleAdminGetMcpLongLivedToken(request, env);
	}
	if (path === '/v1/mcp/audit/admin-feed' && method === 'POST') {
		return handleAdminMcpAuditFeed(request, env);
	}
	if (path.startsWith('/v1/mcp/sessions/') && method === 'GET') {
		const sessionId = path.replace('/v1/mcp/sessions/', '');
		if (sessionId) return handleGetMcpSession(request, env, sessionId);
	}
	if (path.startsWith('/v1/mcp/sessions/') && path.endsWith('/revoke') && method === 'POST') {
		const sessionId = path.replace('/v1/mcp/sessions/', '').replace('/revoke', '').replace(/\/$/, '');
		if (sessionId) return handleRevokeMcpSession(request, env, sessionId);
	}
	if (path === '/v1/mcp/legacy-keys/issue' && method === 'POST') return handleIssueMcpLegacyKey(request, env);
	if (path.startsWith('/v1/mcp/long-lived-tokens/') && path.endsWith('/revoke') && method === 'POST') {
		const tokenId = path.replace('/v1/mcp/long-lived-tokens/', '').replace('/revoke', '').replace(/\/$/, '');
		if (tokenId) return handleRevokeMcpLongLivedToken(request, env, tokenId);
	}
	if (path.startsWith('/v1/mcp/legacy-keys/') && path.endsWith('/revoke') && method === 'POST') {
		const legacyKeyId = path.replace('/v1/mcp/legacy-keys/', '').replace('/revoke', '').replace(/\/$/, '');
		if (legacyKeyId) return handleRevokeMcpLegacyKey(request, env, legacyKeyId);
	}

	// User endpoints (protected)
	if (path === '/v1/users/me' && method === 'GET') return handleGetMe(request, env);
	if (path === '/v1/users/me' && method === 'PATCH') return handleUpdateMe(request, env);
	if (path === '/v1/users/me' && method === 'DELETE') return handleDeleteMe(request, env);
	if (path === '/v1/users/me/password' && method === 'PATCH') return handleChangePassword(request, env);
	if (path === '/v1/users/me/email/change' && method === 'POST') return handleInitiateEmailChange(request, env);
	if (path === '/v1/users/me/email/verify' && method === 'POST') return handleVerifyEmailChange(request, env);
	if (path === '/v1/users/me/avatar' && method === 'POST') return handleAvatarUpload(request, env);
	if (path === '/v1/users/me/avatar' && method === 'DELETE') return handleAvatarDelete(request, env);
	if (path === '/v1/users/me/analytics' && method === 'PATCH') return handleUpdateAnalytics(request, env);

	// Service-to-service (API key protected)
	if (path === '/v1/validate' && method === 'POST') return handleValidate(request, env);
	if (path.startsWith('/v1/users/') && path.endsWith('/tier') && method === 'PATCH') {
		const userId = path.replace('/v1/users/', '').replace('/tier', '');
		return handleUpdateTier(request, env, userId);
	}
	if (path.startsWith('/v1/users/') && path.endsWith('/hard-delete') && method === 'DELETE') {
		const userId = path.replace('/v1/users/', '').replace('/hard-delete', '');
		return handleHardDelete(request, env, userId);
	}
	if (path === '/v1/users/cleanup' && method === 'POST') {
		return handleCleanupDeletedUsers(request, env);
	}

	return json({ error: 'not_found', message: 'Endpoint not found', status: 404 }, 404);
}

// Auth Handlers

async function handleSignup(request: Request, env: Env): Promise<Response> {
	const db = env.DB;

	// Rate limit
	const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
	const { allowed } = await checkRateLimit(db, `signup:${ip}`, 3, 300);
	if (!allowed) {
		return json({ error: 'rate_limited', message: 'Too many signup attempts', status: 429 }, 429);
	}

	const body = await parseJSON<{ email?: string; password?: string; name?: string; source?: string }>(request);
	if (!body) return json({ error: 'invalid_request', message: 'Invalid JSON', status: 400 }, 400);

	const { email, password, name, source = 'templates' } = body;

	if (!email || !password) {
		return json({ error: 'invalid_request', message: 'Email and password required', status: 400 }, 400);
	}

	if (!isValidEmail(email)) {
		return json({ error: 'invalid_email', message: 'Invalid email format', status: 400 }, 400);
	}

	if (password.length < 8) {
		return json({ error: 'weak_password', message: 'Password must be at least 8 characters', status: 400 }, 400);
	}

	const existing = await findUserByEmail(db, email);
	if (existing) {
		return json({ error: 'email_exists', message: 'Email already registered', status: 409 }, 409);
	}

	await incrementRateLimit(db, `signup:${ip}`);

	const passwordHash = await hashPassword(password);
	const user = await createUser(db, {
		id: generateUUID(),
		email,
		password_hash: passwordHash,
		name,
		source: source as 'workway' | 'templates' | 'io' | 'space' | 'lms',
	});

	const { accessToken, refreshToken, expiresIn } = await generateTokens(db, user);

	return json({
		access_token: accessToken,
		refresh_token: refreshToken,
		token_type: 'Bearer',
		expires_in: expiresIn,
		user: {
			id: user.id,
			email: user.email,
		},
	});
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
	const db = env.DB;

	const body = await parseJSON<{ email?: string; password?: string }>(request);
	if (!body) return json({ error: 'invalid_request', message: 'Invalid JSON', status: 400 }, 400);

	const { email, password } = body;
	if (!email || !password) {
		return json({ error: 'invalid_request', message: 'Email and password required', status: 400 }, 400);
	}

	// Rate limit
	const rateKey = `login:${email.toLowerCase()}`;
	const { allowed } = await checkRateLimit(db, rateKey, 5, 60);
	if (!allowed) {
		return json({ error: 'rate_limited', message: 'Too many login attempts', status: 429 }, 429);
	}

	const user = await findUserByEmail(db, email);
	if (!user) {
		await incrementRateLimit(db, rateKey);
		return json({ error: 'invalid_credentials', message: 'Invalid email or password', status: 401 }, 401);
	}

	// Check if user is deleted
	if (user.deleted_at) {
		return json({ error: 'account_deleted', message: 'This account has been deleted', status: 401 }, 401);
	}

	const valid = await verifyPassword(password, user.password_hash);
	if (!valid) {
		await incrementRateLimit(db, rateKey);
		return json({ error: 'invalid_credentials', message: 'Invalid email or password', status: 401 }, 401);
	}

	const { accessToken, refreshToken, expiresIn } = await generateTokens(db, user);

	return json({
		access_token: accessToken,
		refresh_token: refreshToken,
		token_type: 'Bearer',
		expires_in: expiresIn,
		user: {
			id: user.id,
			email: user.email,
		},
	});
}

async function handleRefresh(request: Request, env: Env): Promise<Response> {
	const db = env.DB;

	const body = await parseJSON<{ refresh_token?: string }>(request);
	if (!body?.refresh_token) {
		return json({ error: 'invalid_request', message: 'Refresh token required', status: 400 }, 400);
	}

	const tokenHash = await hashToken(body.refresh_token);
	const storedToken = await findRefreshTokenByHash(db, tokenHash);
	if (!storedToken) {
		return json({ error: 'invalid_token', message: 'Invalid refresh token', status: 401 }, 401);
	}

	const user = await findUserById(db, storedToken.user_id);
	if (!user) {
		return json({ error: 'user_not_found', message: 'User not found', status: 401 }, 401);
	}

	const tokens = await refreshTokens(db, body.refresh_token, user);
	if (!tokens) {
		return json({ error: 'invalid_token', message: 'Token expired or revoked', status: 401 }, 401);
	}

	return json<TokenResponse>({
		access_token: tokens.accessToken,
		refresh_token: tokens.refreshToken,
		token_type: 'Bearer',
		expires_in: tokens.expiresIn,
	});
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
	const db = env.DB;

	const body = await parseJSON<{ refresh_token?: string }>(request);
	if (body?.refresh_token) {
		const tokenHash = await hashToken(body.refresh_token);
		const storedToken = await findRefreshTokenByHash(db, tokenHash);
		if (storedToken) {
			await revokeAllUserTokens(db, storedToken.user_id);
		}
	}

	return json({ success: true });
}

async function handleAdminGetPasswordUser(request: Request, env: Env): Promise<Response> {
	const auth = await authenticateApiKeyForPermissions(request, env, ['mcp_long_lived_token_issue']);
	if (!auth.ok) {
		return json({ error: auth.error, message: auth.message, status: auth.status }, auth.status);
	}

	const body = await parseJSON<AdminGetPasswordUserBody>(request);
	const email = body?.email?.trim().toLowerCase();
	if (!email || !isValidEmail(email)) {
		return json({ error: 'invalid_request', message: 'Valid email is required', status: 400 }, 400);
	}

	const user = await findUserByEmail(env.DB, email);
	if (!user) {
		return json({
			user: null,
			has_password: false,
		});
	}

	return json({
		user: {
			id: user.id,
			email: user.email,
			email_verified: Boolean(user.email_verified),
			name: user.name,
			tier: user.tier,
			source: user.source,
			deleted_at: user.deleted_at,
		},
		has_password: Boolean(user.password_hash),
	});
}

async function handleAdminUpsertPasswordUser(request: Request, env: Env): Promise<Response> {
	const db = env.DB;
	const auth = await authenticateApiKeyForPermissions(request, env, ['mcp_long_lived_token_issue']);
	if (!auth.ok) {
		return json({ error: auth.error, message: auth.message, status: auth.status }, auth.status);
	}

	const body = await parseJSON<AdminUpsertPasswordUserBody>(request);
	const email = body?.email?.trim().toLowerCase();
	const password = body?.password ?? '';
	if (!email || !isValidEmail(email)) {
		return json({ error: 'invalid_request', message: 'Valid email is required', status: 400 }, 400);
	}
	if (password.length < 12) {
		return json(
			{ error: 'weak_password', message: 'Password must be at least 12 characters', status: 400 },
			400,
		);
	}

	const userIdHint = normalizeOptionalId(body?.user_id);
	const source = body?.source ?? 'space';
	const tier = body?.tier ?? 'agency';
	const emailVerified = body?.email_verified !== false;
	const passwordHash = await hashPassword(password);
	const existing = await findUserByEmail(db, email);
	let user: User | null = existing;

	if (existing) {
		const updated = await updateUserPassword(db, existing.id, passwordHash);
		if (!updated) {
			return json({ error: 'update_failed', message: 'Failed to update password', status: 500 }, 500);
		}
		user = await updateUser(db, existing.id, {
			email_verified: emailVerified ? 1 : existing.email_verified,
			tier,
		});
		await revokeAllUserTokens(db, existing.id);
		await revokeAllMcpSessionsForUser(db, existing.id);
		await createMcpAuthEvent(db, {
			id: generateUUID(),
			session_id: null,
			user_id: existing.id,
			event_type: 'oauth_password_rotated',
			event_data_json: JSON.stringify({
				auth_email: email,
				actor: auth.actor,
			}),
		});
	} else {
		const created = await createUser(db, {
			id: userIdHint ?? generateUUID(),
			email,
			password_hash: passwordHash,
			name: normalizeNullableString(body?.name) ?? undefined,
			source,
		});
		user = await updateUser(db, created.id, {
			email_verified: emailVerified ? 1 : created.email_verified,
			tier,
		});
		await createMcpAuthEvent(db, {
			id: generateUUID(),
			session_id: null,
			user_id: created.id,
			event_type: 'oauth_password_initialized',
			event_data_json: JSON.stringify({
				auth_email: email,
				actor: auth.actor,
			}),
		});
	}

	return json({
		user: {
			id: user?.id ?? existing?.id ?? userIdHint ?? null,
			email,
			email_verified: Boolean(user?.email_verified ?? emailVerified),
			name: user?.name ?? normalizeNullableString(body?.name) ?? null,
			tier: user?.tier ?? tier,
			source: user?.source ?? source,
		},
		has_password: true,
	});
}

// Cross-Domain SSO Handlers

const VALID_TARGETS: CrossDomainToken['target'][] = ['ltd', 'io', 'space', 'agency'];

async function handleCrossDomainGenerate(request: Request, env: Env): Promise<Response> {
	const db = env.DB;

	// Authenticate - requires valid access token
	const payload = await authenticate(request, env);
	if (!payload) {
		return json({ error: 'unauthorized', message: 'Invalid token', status: 401 }, 401);
	}

	// Parse request
	const body = await parseJSON<{ target?: string }>(request);
	if (!body?.target || !VALID_TARGETS.includes(body.target as CrossDomainToken['target'])) {
		return json({ error: 'invalid_request', message: 'Valid target required (ltd, io, space, agency)', status: 400 }, 400);
	}

	const target = body.target as CrossDomainToken['target'];

	// Rate limit: max 10 cross-domain tokens per minute
	const recentCount = await countRecentCrossDomainTokens(db, payload.sub, 60);
	if (recentCount >= 10) {
		return json({ error: 'rate_limited', message: 'Too many cross-domain token requests', status: 429 }, 429);
	}

	// Generate token
	const token = generateSecureToken(32);
	const tokenHash = await hashToken(token);
	const expiresAt = new Date(Date.now() + 60 * 1000).toISOString(); // 60 seconds

	await createCrossDomainToken(db, {
		id: generateUUID(),
		user_id: payload.sub,
		token_hash: tokenHash,
		target,
		expires_at: expiresAt,
	});

	return json({
		token,
		expires_in: 60,
	});
}

async function handleCrossDomainExchange(request: Request, env: Env): Promise<Response> {
	const db = env.DB;

	// Parse request
	const body = await parseJSON<{ token?: string }>(request);
	if (!body?.token) {
		return json({ error: 'invalid_request', message: 'Token required', status: 400 }, 400);
	}

	// Find token
	const tokenHash = await hashToken(body.token);
	const storedToken = await findCrossDomainTokenByHash(db, tokenHash);

	if (!storedToken) {
		return json({ error: 'invalid_token', message: 'Invalid or expired token', status: 401 }, 401);
	}

	// Mark as used immediately (single-use)
	await markCrossDomainTokenUsed(db, storedToken.id);

	// Get user
	const user = await findUserById(db, storedToken.user_id);
	if (!user) {
		return json({ error: 'user_not_found', message: 'User not found', status: 404 }, 404);
	}

	// Check if user is deleted
	if (user.deleted_at) {
		return json({ error: 'account_deleted', message: 'This account has been deleted', status: 401 }, 401);
	}

	// Generate new tokens for this domain
	const { accessToken, refreshToken, expiresIn } = await generateTokens(db, user);

	return json({
		access_token: accessToken,
		refresh_token: refreshToken,
		token_type: 'Bearer',
		expires_in: expiresIn,
		user: {
			id: user.id,
			email: user.email,
			email_verified: Boolean(user.email_verified),
			name: user.name,
			avatar_url: user.avatar_url,
			tier: user.tier,
			analytics_opt_out: Boolean(user.analytics_opt_out),
			created_at: user.created_at,
		},
	});
}

// MCP Session Router Handlers

const DEFAULT_MCP_HUB_URL = 'https://cs-mcp-hub-remote.createsomething.workers.dev/mcp';
const MIN_MCP_SESSION_TTL_SECONDS = 300;
const DEFAULT_MCP_SESSION_TTL_SECONDS = 86400;
const MAX_MCP_SESSION_TTL_SECONDS = 604800;

type McpToolMode = 'read_only' | 'read_write';
type OauthCodeChallengeMethod = 'S256' | 'plain';
type FormEntryValue = string | File;

interface OAuthAuthorizationCodeClaims extends JWTPayload {
	kind: 'oauth_authorization_code';
	client_id: string;
	redirect_uri: string;
	scope: string;
	resource: string;
	nonce?: string;
	code_challenge?: string;
	code_challenge_method?: OauthCodeChallengeMethod;
	account_id?: string | null;
	tenant_id?: string | null;
	tool_mode?: McpToolMode;
	toolkit_profile?: string[];
}

interface OAuthRefreshTokenClaims extends JWTPayload {
	kind: 'oauth_refresh_token';
	client_id: string;
	scope: string;
	resource: string;
	email: string;
	tier: User['tier'];
	source: User['source'];
	account_id?: string | null;
	tenant_id?: string | null;
	tool_mode?: McpToolMode;
	toolkit_profile?: string[];
}

interface CreateMcpSessionBody {
	tenant_id?: string;
	host?: string;
	toolkit_profile?: string[];
	allowed_tool_prefixes?: string[];
	tool_mode?: McpToolMode;
	ttl_seconds?: number;
}

interface ResolveMcpSessionBody {
	token?: string;
	resource_host?: string;
}

interface AdminMintMcpSessionBody {
	account_id?: string;
	host?: string;
	bound_host?: string;
	toolkit_profile?: string[];
	allowed_tool_prefixes?: string[];
	tool_mode?: McpToolMode;
	ttl_seconds?: number;
	consent_record_id?: string;
	consent_granted_at?: string;
	actor?: string;
	metadata?: Record<string, unknown>;
}

interface IssueMcpLegacyKeyBody {
	account_id?: string;
	reason?: string;
	exception_approved_by?: string;
	ttl_seconds?: number;
	sunset_at?: string;
	actor?: string;
	metadata?: Record<string, unknown>;
}

interface AdminIssueMcpLongLivedTokenBody {
	auth_subject?: string;
	auth_email?: string;
	tenant_id?: string;
	account_id?: string;
	bound_host?: string;
	toolkit_profile?: string[];
	allowed_tool_prefixes?: string[];
	tool_mode?: McpToolMode;
	actor?: string;
	metadata?: Record<string, unknown>;
}

interface AdminGetMcpLongLivedTokenBody {
	auth_subject?: string;
}

interface AdminGetPasswordUserBody {
	email?: string;
}

interface AdminUpsertPasswordUserBody {
	email?: string;
	password?: string;
	user_id?: string;
	name?: string;
	source?: User['source'];
	tier?: User['tier'];
	email_verified?: boolean;
}

interface AdminMcpAuditFeedBody {
	limit?: number;
	search?: string;
}

interface OAuthTokenBody {
	grant_type?: string;
	code?: string;
	refresh_token?: string;
	redirect_uri?: string;
	client_id?: string;
	client_secret?: string;
	code_verifier?: string;
	resource?: string;
}

interface OAuthRegisterBody {
	client_name?: string;
	redirect_uris?: string[];
	token_endpoint_auth_method?: string;
	grant_types?: string[];
	response_types?: string[];
	scope?: string;
}

interface AgencyEntitlementDecision {
	allowed: boolean;
	reason?: string;
	account_id?: string | null;
	tenant_id?: string | null;
	service_tier?: 'mcp_only' | 'policy_os_trial' | 'policy_os_core' | null;
	entitlement_snapshot?: {
		service_tier: 'mcp_only' | 'policy_os_trial' | 'policy_os_core';
		managed_bearer_allowed: boolean;
		org_membership_active: boolean;
		service_entitled: boolean;
		policy_accepted: boolean;
		contract_active: boolean;
		billing_active: boolean;
		approved_exception?: {
			present: boolean;
			type: string | null;
			allowed_scope: string | null;
			graduation_target: string | null;
			review_by: string | null;
		};
	} | null;
	checks?: Record<string, boolean>;
}

type ManagedBearerIssueResult =
	| {
		ok: true;
		tokenId: string;
		token: string;
		tokenPrefix: string;
		accountId: string;
		tenantId: string;
		authSubject: string;
		authEmail: string | null;
		toolMode: McpToolMode;
		toolkitProfile: string[];
		allowedToolPrefixes: string[];
		boundHost: string | null;
		policyDecision: DecisionTelemetry;
	}
	| {
		ok: false;
		status: number;
		error: string;
		message: string;
		detail?: Record<string, unknown>;
	};

interface DecisionTelemetry {
	policy_id: string;
	decision: AuthorizationDecisionType;
	evaluation_path: 'legacy' | 'primary' | 'fallback';
	policy_hash: string | null;
	fallback_used: boolean;
	rollout_mode: 'legacy_enforce' | 'shadow' | 'polar_enforce';
	canary_percent: number;
	matched_rule_ids?: string[];
	compiler_version?: string | null;
	reason: string;
}

const POLICY_PARTNER_AUTH_GOVERNANCE_ID = 'policy.partner-auth-governance.v1';
const POLICY_MCP_CREDENTIAL_DELIVERY_ID = 'policy.mcp-credential-delivery.v1';
const POLICY_LEGACY_COMPAT_SUNSET_ID = 'policy.legacy-compat-sunset.v1';
const POLICY_MCP_SESSION_SELF_SERVICE_ID = 'policy.mcp-session-self-service.v1';
const POLICY_USER_BEARER_TOKEN_GOVERNANCE_ID = 'policy.user-bearer-token-governance.v1';
const WEBFLOW_TEMPLATE_REVIEW_REVIEWER_ACCOUNT_IDS = new Set([
	'acct_wf_template_review',
	'acct_wf_natalia',
	'acct_wf_eric',
	'acct_wf_vicki',
	'acct_wf_mariana',
	'acct_wf_micah',
]);
const WEBFLOW_TEMPLATE_REVIEW_PHASE_A_ALLOWED_TOOL_PREFIXES = [
	'webflow-template-review-mcp__template_review_health',
	'webflow-template-review-mcp__template_review_get_metrics',
	'webflow-template-review-mcp__template_review_list_queue',
	'webflow-template-review-mcp__template_review_my_queue',
	'webflow-template-review-mcp__template_review_search_assets',
	'webflow-template-review-mcp__template_review_search_versions',
	'webflow-template-review-mcp__template_review_get_asset',
	'webflow-template-review-mcp__template_review_list_versions',
	'webflow-template-review-mcp__template_review_get_version',
	'webflow-template-review-mcp__template_review_get_review_context',
	'webflow-template-review-mcp__template_review_get_comprehensive_review_contract',
	'webflow-template-review-mcp__template_review_format_agent_review_feedback',
	'webflow-template-review-mcp__template_review_prepare_published_site_sandbox',
	'webflow-template-review-mcp__template_review_list_releases',
	'webflow-template-review-mcp__template_review_get_field_map',
	'webflow-template-review-mcp__template_review_run_published_site_validation',
	'webflow-template-review-mcp__template_review_assign_self',
	'webflow-template-review-mcp__template_review_unassign_self',
	'webflow-template-review-mcp__template_review_request_changes',
	'webflow-template-review-mcp__template_review_set_review_status',
	'webflow-template-review-mcp__template_review_save_agent_feedback',
	'webflow-template-review-mcp__template_review_save_draft_feedback',
	'webflow-reviewer-exceptions-mcp__reviewer_exceptions_',
];
const DEFAULT_OAUTH_RESOURCE = DEFAULT_MCP_HUB_URL;
const OAUTH_AUTHORIZATION_CODE_TTL_SECONDS = 300;
const OAUTH_MANAGED_BEARER_EXPIRES_IN = 31536000;
const OAUTH_ID_TOKEN_TTL_SECONDS = 3600;
const OAUTH_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const MIN_MCP_LEGACY_KEY_TTL_SECONDS = 3600;
const DEFAULT_MCP_LEGACY_KEY_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_MCP_LEGACY_KEY_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_LEGACY_COMPAT_SUNSET_DAYS = 90;

async function handleOAuthRegister(request: Request, _env: Env): Promise<Response> {
	const body = await parseJSON<OAuthRegisterBody>(request);
	const clientName = normalizeOptionalId(body?.client_name) ?? 'chatgpt-mcp-client';
	const clientId = `oauth_${slugify(clientName)}_${generateUUID().replace(/-/g, '').slice(0, 12)}`;
	const redirectUris = Array.isArray(body?.redirect_uris)
		? body!.redirect_uris.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
		: [];
	return json({
		client_id: clientId,
		client_name: clientName,
		redirect_uris: redirectUris,
		token_endpoint_auth_method: body?.token_endpoint_auth_method ?? 'none',
		grant_types: body?.grant_types ?? ['authorization_code', 'refresh_token'],
		response_types: body?.response_types ?? ['code'],
		scope: body?.scope ?? 'openid profile email mcp offline_access',
	});
}

async function handleOAuthAuthorizePage(request: Request, env: Env): Promise<Response> {
	const params = new URL(request.url).searchParams;
	const validationError = validateOAuthAuthorizeRequest(params);
	if (validationError) {
		return oauthErrorResponse(validationError, 400);
	}

	const html = renderOAuthAuthorizePage(params, env);
	return new Response(html, {
		status: 200,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'no-store',
		},
	});
}

async function handleOAuthAuthorize(request: Request, env: Env): Promise<Response> {
	const form = await request.formData();
	const responseType = String(form.get('response_type') ?? '');
	const clientId = String(form.get('client_id') ?? '');
	const redirectUri = String(form.get('redirect_uri') ?? '');
	const state = String(form.get('state') ?? '');
	const scope = normalizeScope(String(form.get('scope') ?? 'openid mcp'));
	const resource = normalizeOAuthResource(String(form.get('resource') ?? env.MCP_HUB_URL ?? DEFAULT_OAUTH_RESOURCE));
	const nonce = normalizeNullableString(String(form.get('nonce') ?? ''));
	const codeChallenge = normalizeOptionalId(String(form.get('code_challenge') ?? ''));
	const codeChallengeMethod = normalizeCodeChallengeMethod(String(form.get('code_challenge_method') ?? ''));
	const email = String(form.get('email') ?? '').trim().toLowerCase();
	const password = String(form.get('password') ?? '');
	const tenantId = normalizeNullableId(form.get('tenant_id'));
	const accountId = normalizeNullableId(form.get('account_id'));
	const toolMode = normalizeToolModeNullable(form.get('tool_mode'));
	const toolkitProfile = normalizeToolkitProfileString(form.get('toolkit_profile'));

	const params = new URLSearchParams({
		response_type: responseType,
		client_id: clientId,
		redirect_uri: redirectUri,
		state,
		scope,
		resource,
		...(nonce ? { nonce } : {}),
		...(codeChallenge ? { code_challenge: codeChallenge } : {}),
		...(codeChallengeMethod ? { code_challenge_method: codeChallengeMethod } : {}),
		...(tenantId ? { tenant_id: tenantId } : {}),
		...(accountId ? { account_id: accountId } : {}),
		...(toolMode ? { tool_mode: toolMode } : {}),
		...(toolkitProfile.length > 0 ? { toolkit_profile: toolkitProfile.join(',') } : {}),
	});
	const validationError = validateOAuthAuthorizeRequest(params);
	if (validationError) {
		return oauthErrorResponse(validationError, 400);
	}

	const user = await findUserByEmail(env.DB, email);
	if (!user || user.deleted_at) {
		return renderOAuthAuthorizeError(params, env, 'Invalid email or password.');
	}

	const valid = await verifyPassword(password, user.password_hash);
	if (!valid) {
		return renderOAuthAuthorizeError(params, env, 'Invalid email or password.');
	}

	const now = Math.floor(Date.now() / 1000);
	const code = await createSignedToken(env.DB, {
		sub: user.id,
		email: user.email,
		tier: user.tier,
		source: user.source,
		iss: getOauthIssuer(new URL(request.url), env),
		aud: ['oauth'],
		iat: now,
		exp: now + OAUTH_AUTHORIZATION_CODE_TTL_SECONDS,
		kind: 'oauth_authorization_code',
		client_id: clientId,
		redirect_uri: redirectUri,
		scope,
		resource,
		...(nonce ? { nonce } : {}),
		...(codeChallenge ? { code_challenge: codeChallenge } : {}),
		...(codeChallengeMethod ? { code_challenge_method: codeChallengeMethod } : {}),
		...(tenantId ? { tenant_id: tenantId } : {}),
		...(accountId ? { account_id: accountId } : {}),
		...(toolMode ? { tool_mode: toolMode } : {}),
		...(toolkitProfile.length > 0 ? { toolkit_profile: toolkitProfile } : {}),
	} satisfies OAuthAuthorizationCodeClaims);

	const redirect = new URL(redirectUri);
	redirect.searchParams.set('code', code);
	if (state) redirect.searchParams.set('state', state);

	return Response.redirect(redirect.toString(), 302);
}

async function handleOAuthToken(request: Request, env: Env): Promise<Response> {
	const body = await parseOAuthTokenBody(request);
	if (!body) {
		return oauthErrorResponse('invalid_request', 400, 'Unable to parse token request.');
	}
	if (!body.client_id) {
		return oauthErrorResponse('invalid_request', 400, 'client_id is required.');
	}

	type OAuthExchangeClaims = Pick<
		OAuthAuthorizationCodeClaims,
		'sub' | 'client_id' | 'scope' | 'resource' | 'account_id' | 'tenant_id' | 'tool_mode' | 'toolkit_profile' | 'nonce'
	>;

	let claims: OAuthExchangeClaims | null = null;
	if (body.grant_type === 'authorization_code') {
		if (!body.code || !body.redirect_uri) {
			return oauthErrorResponse('invalid_request', 400, 'code, client_id, and redirect_uri are required.');
		}

		const authorizationCodeClaims = await validateOAuthAuthorizationCode(body.code, env);
		if (!authorizationCodeClaims) {
			return oauthErrorResponse('invalid_grant', 400, 'Invalid or expired authorization code.');
		}
		if (authorizationCodeClaims.client_id !== body.client_id || authorizationCodeClaims.redirect_uri !== body.redirect_uri) {
			return oauthErrorResponse('invalid_grant', 400, 'Authorization code does not match client_id or redirect_uri.');
		}
		if (
			authorizationCodeClaims.code_challenge
			&& !(await verifyPkce(body.code_verifier, authorizationCodeClaims.code_challenge, authorizationCodeClaims.code_challenge_method))
		) {
			return oauthErrorResponse('invalid_grant', 400, 'Invalid code_verifier.');
		}
		claims = authorizationCodeClaims;
	} else if (body.grant_type === 'refresh_token') {
		if (!body.refresh_token) {
			return oauthErrorResponse('invalid_request', 400, 'refresh_token and client_id are required.');
		}

		const refreshTokenClaims = await validateOAuthRefreshToken(body.refresh_token, env);
		if (!refreshTokenClaims) {
			return oauthErrorResponse('invalid_grant', 400, 'Invalid or expired refresh token.');
		}
		if (refreshTokenClaims.client_id !== body.client_id) {
			return oauthErrorResponse('invalid_grant', 400, 'Refresh token does not match client_id.');
		}
		claims = refreshTokenClaims;
	} else {
		return oauthErrorResponse('unsupported_grant_type', 400, 'Supported grant_types are authorization_code and refresh_token.');
	}

	const user = await findUserById(env.DB, claims.sub);
	if (!user) {
		return oauthErrorResponse('invalid_grant', 400, 'User no longer exists.');
	}

	try {
		const issued = await issueManagedBearerToken(env, {
			authSubject: user.id,
			authEmail: user.email,
			tenantId: claims.tenant_id ?? null,
			accountId: claims.account_id ?? null,
			toolMode: claims.tool_mode,
			toolkitProfile: Array.isArray(claims.toolkit_profile) ? claims.toolkit_profile : [],
			actor: `oauth:${user.id}`,
			actorRole: 'user',
			actionName: 'issue_user_bearer_token_oauth',
			metadata: {
				issued_via: 'oauth_token_exchange',
				client_id: claims.client_id,
				resource: claims.resource,
				scope: claims.scope,
				...('redirect_uri' in claims && claims.redirect_uri ? { redirect_uri: claims.redirect_uri } : {}),
			},
		});
		if (!issued.ok) {
			return oauthErrorResponse('access_denied', issued.status, issued.message);
		}

		const responseBody: Record<string, unknown> = {
			access_token: issued.token,
			token_type: 'Bearer',
			expires_in: OAUTH_MANAGED_BEARER_EXPIRES_IN,
			scope: claims.scope,
			resource: claims.resource,
		};

		if (scopeIncludes(claims.scope, 'openid')) {
			const now = Math.floor(Date.now() / 1000);
			const idToken = await createSignedToken(env.DB, {
				sub: user.id,
				iss: getOauthIssuer(new URL(request.url), env),
				aud: claims.client_id,
				iat: now,
				exp: now + OAUTH_ID_TOKEN_TTL_SECONDS,
				...(scopeIncludes(claims.scope, 'email')
					? { email: user.email, email_verified: Boolean(user.email_verified) }
					: {}),
				...(scopeIncludes(claims.scope, 'profile') && user.name ? { name: user.name } : {}),
				...(claims.nonce ? { nonce: claims.nonce } : {}),
			});
			responseBody.id_token = idToken;
		}
		if (scopeIncludes(claims.scope, 'offline_access')) {
			const now = Math.floor(Date.now() / 1000);
			const refreshToken = await createSignedToken(env.DB, {
				sub: user.id,
				iss: getOauthIssuer(new URL(request.url), env),
				aud: ['oauth'],
				iat: now,
				exp: now + OAUTH_REFRESH_TOKEN_TTL_SECONDS,
				kind: 'oauth_refresh_token',
				email: user.email,
				tier: user.tier,
				source: user.source,
				client_id: claims.client_id,
				scope: claims.scope,
				resource: claims.resource,
				...(claims.tenant_id ? { tenant_id: claims.tenant_id } : {}),
				...(claims.account_id ? { account_id: claims.account_id } : {}),
				...(claims.tool_mode ? { tool_mode: claims.tool_mode } : {}),
				...(Array.isArray(claims.toolkit_profile) && claims.toolkit_profile.length > 0
					? { toolkit_profile: claims.toolkit_profile }
					: {}),
			} satisfies OAuthRefreshTokenClaims);
			responseBody.refresh_token = refreshToken;
		}

		return json(responseBody, 200, {
			'Cache-Control': 'no-store',
			Pragma: 'no-cache',
		});
	} catch (error) {
		const description = error instanceof Error ? error.message : 'token_exchange_failed';
		console.error('OAuth token exchange failed:', {
			error: description,
			user_id: user.id,
			client_id: claims.client_id,
			resource: claims.resource,
		});
		return oauthErrorResponse('server_error', 500, description);
	}
}

async function handleOAuthUserInfo(request: Request, env: Env): Promise<Response> {
	const auth = request.headers.get('Authorization');
	const token = auth?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
	if (!token) {
		return oauthErrorResponse('invalid_token', 401, 'Bearer token required.');
	}

	const tokenHash = await hashToken(token);
	const managedToken = await findMcpLongLivedTokenByTokenHash(env.DB, tokenHash);
	if (!managedToken || managedToken.revoked_at) {
		return oauthErrorResponse('invalid_token', 401, 'Managed bearer token not found.');
	}

	const user = await findUserById(env.DB, managedToken.auth_subject);
	return json({
		sub: managedToken.auth_subject,
		email: user?.email ?? managedToken.auth_email,
		email_verified: Boolean(user?.email_verified ?? false),
	});
}

async function handleCreateMcpSession(request: Request, env: Env): Promise<Response> {
	const db = env.DB;
	const payload = await authenticate(request, env);
	if (!payload) {
		return json({ error: 'unauthorized', message: 'Invalid token', status: 401 }, 401);
	}

	const body = await parseJSON<CreateMcpSessionBody>(request);
	if (!body) {
		return json({ error: 'invalid_request', message: 'Invalid JSON', status: 400 }, 400);
	}

	const tenantId = normalizeTenantId(body.tenant_id);
	const host = normalizeHostName(body.host);
	const toolMode = normalizeToolMode(body.tool_mode);
	const toolkitProfile = normalizeToolkitProfile(body.toolkit_profile);
	const allowedToolPrefixes = resolveAllowedToolPrefixes(body.allowed_tool_prefixes, toolkitProfile);
	const ttlSeconds = clampTtlSeconds(body.ttl_seconds);
	const mcpAccount = await ensureMcpAccountForUserTenant(db, payload.sub, tenantId);
	const accountId = mcpAccount.account_id;
	const actor = `user:${payload.sub}`;
	const policyDecision = await evaluatePartnerPolicyDecision(db, env, {
		policyId: POLICY_MCP_SESSION_SELF_SERVICE_ID,
		actionName: 'mint_session',
		accountId,
		actor,
		request: {
			actor: {
				accountId,
				tenantId,
				userId: payload.sub,
				actorId: actor,
				role: 'user',
				toolMode,
			},
			action: {
				name: 'mint_session',
				writeIntent: true,
				humanReviewStep: true,
				introspectionOk: true,
			},
			resource: {
				kind: 'mcp_session',
				id: accountId,
				toolName: 'mcp_session_create',
				accessType: 'write',
				metadata: {
					host,
					tool_mode: toolMode,
					toolkit_profile: toolkitProfile,
					allowed_tool_prefixes: allowedToolPrefixes,
				},
			},
		},
		metadata: {
			host,
			tenant_id: tenantId,
			tool_mode: toolMode,
			toolkit_profile: toolkitProfile,
			allowed_tool_prefixes: allowedToolPrefixes,
			ttl_seconds: ttlSeconds,
		},
	});
	if (policyDecision.decision !== 'allow') {
		return json(
			{
				error: 'policy_denied',
				message: policyDecision.reason,
				status: policyDecisionHttpStatus(policyDecision.decision),
				policy: policyDecision,
			},
			policyDecisionHttpStatus(policyDecision.decision),
		);
	}

	const sessionId = `ms_${generateUUID().replace(/-/g, '')}`;
	const rawToken = `ms_tok_${generateSecureToken(48)}`;
	const tokenHash = await hashToken(rawToken);
	const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

	await createMcpSession(db, {
		id: sessionId,
		user_id: payload.sub,
		tenant_id: tenantId,
		account_id: accountId,
		host,
		bound_host: host,
		tool_mode: toolMode,
		toolkit_profile_json: JSON.stringify(toolkitProfile),
		allowed_tool_prefixes_json: JSON.stringify(allowedToolPrefixes),
		token_hash: tokenHash,
		expires_at: expiresAt,
	});

	await replaceMcpSessionScopes(
		db,
		sessionId,
		[
			...toolkitProfile.map((toolkit) => ({ scope_type: 'toolkit' as const, scope_value: toolkit })),
			...allowedToolPrefixes.map((prefix) => ({ scope_type: 'tool_prefix' as const, scope_value: prefix })),
		],
	);

	await createMcpAuthEvent(db, {
		id: generateUUID(),
		session_id: sessionId,
		user_id: payload.sub,
		event_type: 'mcp_session_created',
		event_data_json: JSON.stringify({
			host,
			bound_host: host,
			tenant_id: tenantId,
			tool_mode: toolMode,
			toolkit_profile: toolkitProfile,
			allowed_tool_prefixes: allowedToolPrefixes,
			ttl_seconds: ttlSeconds,
			policy: policyDecision,
		}),
	});

	return json({
		session_id: sessionId,
		token: rawToken,
		mcp_url: env.MCP_HUB_URL ?? DEFAULT_MCP_HUB_URL,
		expires_at: expiresAt,
		account_id: accountId,
		tenant_id: tenantId,
		user_id: payload.sub,
		host,
		bound_host: host,
		tool_mode: toolMode,
		toolkit_profile: toolkitProfile,
		allowed_tool_prefixes: allowedToolPrefixes,
		policy: policyDecision,
		required_auth: [],
	});
}

async function handleAdminMintMcpSession(request: Request, env: Env): Promise<Response> {
	const db = env.DB;
	const auth = await authenticateApiKeyForPermissions(request, env, ['mcp_session_admin_mint']);
	if (!auth.ok) {
		return json({ error: auth.error, message: auth.message, status: auth.status }, auth.status);
	}

	const body = await parseJSON<AdminMintMcpSessionBody>(request);
	if (!body) {
		return json({ error: 'invalid_request', message: 'Invalid JSON', status: 400 }, 400);
	}

	const accountId = normalizeAccountId(body.account_id);
	if (!accountId) {
		return json({ error: 'invalid_request', message: 'account_id is required', status: 400 }, 400);
	}

	const account = await findMcpAccountById(db, accountId);
	if (!account) {
		return json({ error: 'not_found', message: 'MCP account not found', status: 404 }, 404);
	}

	const actor = normalizeActor(body.actor);
	if (!actor) {
		return json({ error: 'invalid_request', message: 'actor is required', status: 400 }, 400);
	}
	const consentRecordId = normalizeOptionalId(body.consent_record_id);
	if (!consentRecordId) {
		return json({ error: 'invalid_request', message: 'consent_record_id is required', status: 400 }, 400);
	}
	const consentGrantedAt = parseOptionalIsoTimestamp(body.consent_granted_at);
	if (!consentGrantedAt) {
		return json({ error: 'invalid_request', message: 'consent_granted_at is required (ISO timestamp)', status: 400 }, 400);
	}
	const metadata = normalizeMetadata(body.metadata);
	const clientSlug = normalizeOptionalId(readMetadataString(metadata, 'client_slug'));
	const workspaceAccountId = normalizeAccountId(readMetadataString(metadata, 'workspace_account_id'));
	if (!clientSlug || !workspaceAccountId) {
		return json(
			{
				error: 'invalid_request',
				message: 'metadata.client_slug and metadata.workspace_account_id are required',
				status: 400,
			},
			400,
		);
	}
	const consentPresent = true;

	const policyDecision = await evaluatePartnerPolicyDecision(db, env, {
		policyId: POLICY_PARTNER_AUTH_GOVERNANCE_ID,
		actionName: 'mcp_session_admin_mint',
		accountId: account.account_id,
		actor,
		request: {
			actor: {
				accountId: account.account_id,
				tenantId: account.tenant_id,
				userId: account.user_id,
				actorId: actor,
				role: 'operator',
			},
			action: {
				name: 'admin_mint_session',
				writeIntent: true,
				humanReviewStep: consentPresent,
				introspectionOk: consentPresent,
			},
			resource: {
				kind: 'mcp_session',
				id: account.account_id,
				toolName: 'mcp_session_admin_mint',
				accessType: 'auth_admin',
			},
		},
		metadata: {
			consent_record_id: consentRecordId,
			consent_granted_at: consentGrantedAt,
			client_slug: clientSlug,
			workspace_account_id: workspaceAccountId,
			bound_host: normalizeOptionalHostName(body.bound_host) ?? normalizeHostName(body.host),
			...metadata,
		},
	});

	if (policyDecision.decision !== 'allow') {
		return json(
			{
				error: 'policy_denied',
				message: policyDecision.reason,
				status: policyDecisionHttpStatus(policyDecision.decision),
				policy: policyDecision,
			},
			policyDecisionHttpStatus(policyDecision.decision),
		);
	}

	const host = normalizeHostName(body.host);
	const boundHost = normalizeOptionalHostName(body.bound_host) ?? host;
	const toolMode = normalizeToolMode(body.tool_mode);
	const toolkitProfile = normalizeToolkitProfile(body.toolkit_profile);
	const allowedToolPrefixes = resolveAllowedToolPrefixes(body.allowed_tool_prefixes, toolkitProfile);
	const ttlSeconds = clampTtlSeconds(body.ttl_seconds);

	const sessionId = `ms_${generateUUID().replace(/-/g, '')}`;
	const rawToken = `ms_tok_${generateSecureToken(48)}`;
	const tokenHash = await hashToken(rawToken);
	const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

	await createMcpSession(db, {
		id: sessionId,
		user_id: account.user_id,
		tenant_id: account.tenant_id,
		account_id: account.account_id,
		host,
		bound_host: boundHost,
		tool_mode: toolMode,
		toolkit_profile_json: JSON.stringify(toolkitProfile),
		allowed_tool_prefixes_json: JSON.stringify(allowedToolPrefixes),
		token_hash: tokenHash,
		expires_at: expiresAt,
	});

	await replaceMcpSessionScopes(
		db,
		sessionId,
		[
			...toolkitProfile.map((toolkit) => ({ scope_type: 'toolkit' as const, scope_value: toolkit })),
			...allowedToolPrefixes.map((prefix) => ({ scope_type: 'tool_prefix' as const, scope_value: prefix })),
		],
	);

	await createMcpAuthEvent(db, {
		id: generateUUID(),
		session_id: sessionId,
		user_id: account.user_id,
		event_type: 'mcp_session_admin_minted',
		event_data_json: JSON.stringify({
			account_id: account.account_id,
			tenant_id: account.tenant_id,
			host,
			bound_host: boundHost,
			tool_mode: toolMode,
			toolkit_profile: toolkitProfile,
			allowed_tool_prefixes: allowedToolPrefixes,
			ttl_seconds: ttlSeconds,
			actor,
			policy: policyDecision,
			consent_record_id: consentRecordId,
			consent_granted_at: consentGrantedAt,
		}),
	});

	return json({
		session_id: sessionId,
		token: rawToken,
		mcp_url: env.MCP_HUB_URL ?? DEFAULT_MCP_HUB_URL,
		expires_at: expiresAt,
		account_id: account.account_id,
		tenant_id: account.tenant_id,
		user_id: account.user_id,
		host,
		bound_host: boundHost,
		tool_mode: toolMode,
		toolkit_profile: toolkitProfile,
		allowed_tool_prefixes: allowedToolPrefixes,
		policy: policyDecision,
	});
}

async function handleAdminIssueMcpLongLivedToken(request: Request, env: Env): Promise<Response> {
	const auth = await authenticateApiKeyForPermissions(request, env, ['mcp_long_lived_token_issue']);
	if (!auth.ok) {
		return json({ error: auth.error, message: auth.message, status: auth.status }, auth.status);
	}

	const body = await parseJSON<AdminIssueMcpLongLivedTokenBody>(request);
	if (!body) {
		return json({ error: 'invalid_request', message: 'Invalid JSON', status: 400 }, 400);
	}

	const authSubject = normalizeOptionalId(body.auth_subject);
	if (!authSubject) {
		return json({ error: 'invalid_request', message: 'auth_subject is required', status: 400 }, 400);
	}

	const issued = await issueManagedBearerToken(env, {
		authSubject,
		authEmail: body.auth_email ?? null,
		tenantId: body.tenant_id ?? null,
		accountId: body.account_id ?? null,
		boundHost: body.bound_host ?? null,
		toolkitProfile: body.toolkit_profile,
		allowedToolPrefixes: body.allowed_tool_prefixes,
		toolMode: body.tool_mode,
		actor: normalizeActor(body.actor) ?? auth.actor,
		actorRole: 'operator',
		actionName: 'issue_user_bearer_token',
		metadata: normalizeMetadata(body.metadata),
	});
	if (!issued.ok) {
		return json({ error: issued.error, message: issued.message, status: issued.status, ...(issued.detail ?? {}) }, issued.status);
	}

	return json({
		token_id: issued.tokenId,
		token: issued.token,
		token_prefix: issued.tokenPrefix,
		account_id: issued.accountId,
		tenant_id: issued.tenantId,
		auth_subject: issued.authSubject,
		auth_email: issued.authEmail,
		tool_mode: issued.toolMode,
		toolkit_profile: issued.toolkitProfile,
		allowed_tool_prefixes: issued.allowedToolPrefixes,
		bound_host: issued.boundHost,
		policy: issued.policyDecision,
	});
}

async function handleAdminGetMcpLongLivedToken(request: Request, env: Env): Promise<Response> {
	const db = env.DB;
	const auth = await authenticateApiKeyForPermissions(request, env, ['mcp_long_lived_token_issue']);
	if (!auth.ok) {
		return json({ error: auth.error, message: auth.message, status: auth.status }, auth.status);
	}

	const body = await parseJSON<AdminGetMcpLongLivedTokenBody>(request);
	const authSubject = normalizeOptionalId(body?.auth_subject);
	if (!authSubject) {
		return json({ error: 'invalid_request', message: 'auth_subject is required', status: 400 }, 400);
	}

	const token = await findMcpLongLivedTokenByAuthSubject(db, authSubject);
	if (!token) {
		return json({ token: null });
	}
	const toolkitProfile = parseStringArray(token.toolkit_profile_json);
	const allowedToolPrefixes =
		resolveEffectiveAllowedToolPrefixes({
			accountId: token.account_id,
			tenantId: token.tenant_id,
			host: token.bound_host,
			boundHost: token.bound_host,
			toolkitProfile,
			allowedToolPrefixes: parseAllowedToolPrefixesOrNull(token.allowed_tool_prefixes_json),
		}) ?? [];

	return json({
		token: {
			id: token.id,
			auth_subject: token.auth_subject,
			auth_email: token.auth_email,
			account_id: token.account_id,
			tenant_id: token.tenant_id,
			bound_host: token.bound_host,
			token_prefix: token.token_prefix,
			tool_mode: token.tool_mode,
			toolkit_profile: toolkitProfile,
			allowed_tool_prefixes: allowedToolPrefixes,
			last_used_at: token.last_used_at,
			revoked_at: token.revoked_at,
			created_at: token.created_at,
			updated_at: token.updated_at,
			active: token.revoked_at === null,
		},
	});
}

async function issueManagedBearerToken(
	env: Env,
	input: {
		authSubject: string;
		authEmail?: string | null;
		tenantId?: string | null;
		accountId?: string | null;
		boundHost?: string | null;
		toolkitProfile?: string[];
		allowedToolPrefixes?: string[];
		toolMode?: McpToolMode;
		actor: string;
		actorRole: 'operator' | 'user';
		actionName: string;
		metadata?: Record<string, unknown>;
	}
): Promise<ManagedBearerIssueResult> {
	const db = env.DB;
	const existing = await findMcpLongLivedTokenByAuthSubject(db, input.authSubject);
	const requestedTenantId = normalizeNullableString(input.tenantId);
	const requestedAccountId = normalizeNullableString(input.accountId);
	const entitlement = await checkAgencyManagedBearerEntitlement(env, {
		authSubject: input.authSubject,
		accountId: requestedAccountId ?? existing?.account_id ?? null,
		tenantId: requestedTenantId ?? existing?.tenant_id ?? null,
	});
	if (!entitlement.allowed) {
		return {
			ok: false,
			status: 403,
			error: 'entitlement_denied',
			message: entitlement.reason ?? 'Managed bearer access is not currently entitled',
			detail: { entitlement },
		};
	}

	const tenantId = normalizeTenantId(requestedTenantId ?? entitlement.tenant_id ?? existing?.tenant_id ?? input.authSubject);
	const accountId =
		normalizeAccountId(requestedAccountId ?? entitlement.account_id ?? existing?.account_id ?? undefined)
		?? `acct_${generateUUID().replace(/-/g, '')}`;
	const boundHost =
		normalizeOptionalHostName(input.boundHost) ?? normalizeOptionalHostName(existing?.bound_host) ?? null;
	const toolMode = normalizeToolMode(input.toolMode ?? (existing?.tool_mode as McpToolMode | undefined));
	const toolkitProfile =
		input.toolkitProfile !== undefined
			? normalizeToolkitProfile(input.toolkitProfile)
			: existing
				? parseStringArray(existing.toolkit_profile_json)
				: [];
	const allowedToolPrefixes =
		input.allowedToolPrefixes !== undefined
			? normalizeAllowedToolPrefixes(input.allowedToolPrefixes)
			: existing
				? parseAllowedToolPrefixesOrNull(existing.allowed_tool_prefixes_json) ?? buildAllowedToolPrefixes(toolkitProfile)
				: buildAllowedToolPrefixes(toolkitProfile);
	const metadata = normalizeMetadata(input.metadata);

	const policyDecision = await evaluatePartnerPolicyDecision(db, env, {
		policyId: POLICY_USER_BEARER_TOKEN_GOVERNANCE_ID,
		actionName: input.actionName,
		accountId,
		actor: input.actor,
		request: {
			actor: {
				accountId,
				tenantId,
				userId: input.authSubject,
				actorId: input.actor,
				role: input.actorRole,
				toolMode,
			},
			action: {
				name: input.actionName,
				writeIntent: true,
				humanReviewStep: true,
				introspectionOk: true,
			},
			resource: {
				kind: 'managed_bearer_token',
				id: accountId,
				toolName: 'mcp_long_lived_token_issue',
				accessType: input.actorRole === 'operator' ? 'auth_admin' : 'write',
				metadata: {
					auth_subject: input.authSubject,
					tool_mode: toolMode,
					bound_host: boundHost,
					toolkit_profile: toolkitProfile,
					allowed_tool_prefixes: allowedToolPrefixes,
					entitlement_reason: entitlement.reason ?? 'allowed',
				},
			},
		},
		metadata: {
			auth_subject: input.authSubject,
			auth_email: normalizeNullableString(input.authEmail) ?? existing?.auth_email ?? null,
			tenant_id: tenantId,
			account_id: accountId,
			tool_mode: toolMode,
			bound_host: boundHost,
			toolkit_profile: toolkitProfile,
			allowed_tool_prefixes: allowedToolPrefixes,
			entitlement_reason: entitlement.reason ?? 'allowed',
			...metadata,
		},
	});
	if (policyDecision.decision !== 'allow') {
		return {
			ok: false,
			status: policyDecisionHttpStatus(policyDecision.decision),
			error: 'policy_denied',
			message: policyDecision.reason,
			detail: { policy: policyDecision },
		};
	}

	const tokenId = `mlt_${generateUUID().replace(/-/g, '')}`;
	const rawToken = `mcpu_${generateSecureToken(48)}`;
	const tokenHash = await hashToken(rawToken);
	const tokenPrefix = rawToken.slice(0, 14);

	await upsertMcpLongLivedToken(db, {
		id: tokenId,
		auth_subject: input.authSubject,
		auth_email: normalizeNullableString(input.authEmail) ?? existing?.auth_email ?? null,
		tenant_id: tenantId,
		account_id: accountId,
		bound_host: boundHost,
		tool_mode: toolMode,
		toolkit_profile_json: JSON.stringify(toolkitProfile),
		allowed_tool_prefixes_json: JSON.stringify(allowedToolPrefixes),
		token_hash: tokenHash,
		token_prefix: tokenPrefix,
		issued_by: input.actor,
		metadata_json: JSON.stringify(metadata),
	});

	await createMcpAuthEvent(db, {
		id: generateUUID(),
		session_id: null,
		user_id: input.authSubject,
		event_type: existing ? 'mcp_long_lived_token_regenerated' : 'mcp_long_lived_token_issued',
		event_data_json: JSON.stringify({
			token_id: tokenId,
			account_id: accountId,
			tenant_id: tenantId,
			bound_host: boundHost,
			auth_subject: input.authSubject,
			token_prefix: tokenPrefix,
			policy: policyDecision,
			issued_via: metadata.issued_via ?? null,
			allowed_tool_prefixes: allowedToolPrefixes,
		}),
	});

	return {
		ok: true,
		tokenId,
		token: rawToken,
		tokenPrefix: tokenPrefix,
		accountId,
		tenantId,
		authSubject: input.authSubject,
		authEmail: normalizeNullableString(input.authEmail) ?? existing?.auth_email ?? null,
		boundHost,
		toolMode,
		toolkitProfile,
		allowedToolPrefixes,
		policyDecision,
	};
}

async function handleAdminMcpAuditFeed(request: Request, env: Env): Promise<Response> {
	const db = env.DB;
	const auth = await authenticateApiKeyForPermissions(request, env, ['mcp_long_lived_token_issue']);
	if (!auth.ok) {
		return json({ error: auth.error, message: auth.message, status: auth.status }, auth.status);
	}

	const body = await parseJSON<AdminMcpAuditFeedBody>(request);
	const limit =
		typeof body?.limit === 'number' && Number.isFinite(body.limit)
			? Math.max(1, Math.min(250, body.limit))
			: 50;
	const search = typeof body?.search === 'string' ? body.search : null;
	const [authEvents, policyEvents] = await Promise.all([
		listRecentMcpAuthEvents(db, limit, search),
		listRecentMcpPolicyEvents(db, limit, search),
	]);

	return json({
		auth_events: authEvents,
		policy_events: policyEvents,
	});
}

async function handleRevokeMcpLongLivedToken(request: Request, env: Env, tokenId: string): Promise<Response> {
	const db = env.DB;
	const auth = await authenticateApiKeyForPermissions(request, env, ['mcp_long_lived_token_revoke']);
	if (!auth.ok) {
		return json({ error: auth.error, message: auth.message, status: auth.status }, auth.status);
	}

	const existing = await findMcpLongLivedTokenById(db, tokenId);
	if (!existing) {
		return json({ error: 'not_found', message: 'Managed bearer token not found', status: 404 }, 404);
	}

	const actor = auth.actor;
	const policyDecision = await evaluatePartnerPolicyDecision(db, env, {
		policyId: POLICY_USER_BEARER_TOKEN_GOVERNANCE_ID,
		actionName: 'revoke_user_bearer_token',
		accountId: existing.account_id,
		actor,
		request: {
			actor: {
				accountId: existing.account_id,
				tenantId: existing.tenant_id,
				userId: existing.auth_subject,
				actorId: actor,
				role: 'operator',
				toolMode: existing.tool_mode,
			},
			action: {
				name: 'revoke_user_bearer_token',
				writeIntent: true,
				humanReviewStep: true,
				introspectionOk: true,
			},
			resource: {
				kind: 'managed_bearer_token',
				id: existing.id,
				toolName: 'mcp_long_lived_token_revoke',
				accessType: 'auth_admin',
			},
		},
		metadata: {
			auth_subject: existing.auth_subject,
			account_id: existing.account_id,
			tenant_id: existing.tenant_id,
		},
	});
	if (policyDecision.decision !== 'allow') {
		return json(
			{
				error: 'policy_denied',
				message: policyDecision.reason,
				status: policyDecisionHttpStatus(policyDecision.decision),
				policy: policyDecision,
			},
			policyDecisionHttpStatus(policyDecision.decision),
		);
	}

	const revoked = await revokeMcpLongLivedToken(db, tokenId);
	await createMcpAuthEvent(db, {
		id: generateUUID(),
		session_id: null,
		user_id: existing.auth_subject,
		event_type: 'mcp_long_lived_token_revoked',
		event_data_json: JSON.stringify({
			token_id: tokenId,
			account_id: existing.account_id,
			tenant_id: existing.tenant_id,
			revoked,
			policy: policyDecision,
		}),
	});

	return json({
		success: revoked,
		token_id: tokenId,
		revoked,
		policy: policyDecision,
	});
}

async function handleIssueMcpLegacyKey(request: Request, env: Env): Promise<Response> {
	const db = env.DB;
	const auth = await authenticateApiKeyForPermissions(request, env, ['mcp_legacy_key_issue']);
	if (!auth.ok) {
		return json({ error: auth.error, message: auth.message, status: auth.status }, auth.status);
	}

	const body = await parseJSON<IssueMcpLegacyKeyBody>(request);
	if (!body) {
		return json({ error: 'invalid_request', message: 'Invalid JSON', status: 400 }, 400);
	}

	const accountId = normalizeAccountId(body.account_id);
	if (!accountId) {
		return json({ error: 'invalid_request', message: 'account_id is required', status: 400 }, 400);
	}

	const reason = (body.reason ?? '').trim();
	if (!reason) {
		return json({ error: 'invalid_request', message: 'reason is required', status: 400 }, 400);
	}

	const exceptionApprovedBy = normalizeOptionalId(body.exception_approved_by);
	const sunsetAt = parseOptionalIsoTimestamp(body.sunset_at);
	if (!sunsetAt) {
		return json({ error: 'invalid_request', message: 'sunset_at is required (ISO timestamp)', status: 400 }, 400);
	}

	const account = await findMcpAccountById(db, accountId);
	if (!account) {
		return json({ error: 'not_found', message: 'MCP account not found', status: 404 }, 404);
	}

	const actor = normalizeActor(body.actor) ?? auth.actor;
	const ttlSeconds = clampLegacyKeyTtlSeconds(body.ttl_seconds);
	const expiresAtDate = new Date(Date.now() + ttlSeconds * 1000);
	const expiresAt = expiresAtDate.toISOString();
	const sunsetDate = new Date(sunsetAt);
	const maxSunsetDate = new Date(Date.now() + MAX_LEGACY_COMPAT_SUNSET_DAYS * 24 * 60 * 60 * 1000);
	const sunsetInBounds =
		Number.isFinite(sunsetDate.getTime()) &&
		sunsetDate.getTime() > Date.now() &&
		sunsetDate.getTime() <= maxSunsetDate.getTime() &&
		sunsetDate.getTime() >= expiresAtDate.getTime();

	const credentialPolicyDecision = await evaluatePartnerPolicyDecision(db, env, {
		policyId: POLICY_MCP_CREDENTIAL_DELIVERY_ID,
		actionName: 'mcp_legacy_key_issue',
		accountId: account.account_id,
		actor,
		request: {
			actor: {
				accountId: account.account_id,
				tenantId: account.tenant_id,
				userId: account.user_id,
				actorId: actor,
				role: 'operator',
			},
			action: {
				name: 'issue_legacy_key',
				writeIntent: true,
				humanReviewStep: Boolean(exceptionApprovedBy),
				introspectionOk: Boolean(exceptionApprovedBy),
			},
			resource: {
				kind: 'legacy_key',
				id: account.account_id,
				toolName: 'mcp_legacy_key_issue',
				accessType: 'auth_admin',
			},
		},
		metadata: {
			reason,
			exception_approved_by: exceptionApprovedBy,
			sunset_at: sunsetAt,
			expires_at: expiresAt,
			ttl_seconds: ttlSeconds,
			...normalizeMetadata(body.metadata),
		},
	});

	const sunsetPolicyDecision = await evaluatePartnerPolicyDecision(db, env, {
		policyId: POLICY_LEGACY_COMPAT_SUNSET_ID,
		actionName: 'mcp_legacy_key_issue',
		accountId: account.account_id,
		actor,
		request: {
			actor: {
				accountId: account.account_id,
				tenantId: account.tenant_id,
				userId: account.user_id,
				actorId: actor,
				role: 'operator',
			},
			action: {
				name: 'issue_legacy_key',
				writeIntent: true,
				humanReviewStep: true,
				introspectionOk: sunsetInBounds,
			},
			resource: {
				kind: 'legacy_key',
				id: account.account_id,
				toolName: 'mcp_legacy_key_issue',
				accessType: 'auth_admin',
			},
		},
		metadata: {
			sunset_at: sunsetAt,
			expires_at: expiresAt,
			max_sunset_days: MAX_LEGACY_COMPAT_SUNSET_DAYS,
			...normalizeMetadata(body.metadata),
		},
	});

	const combinedDecision = combinePolicyDecisions([credentialPolicyDecision, sunsetPolicyDecision]);
	if (combinedDecision.decision !== 'allow') {
		return json(
			{
				error: 'policy_denied',
				message: combinedDecision.reason,
				status: policyDecisionHttpStatus(combinedDecision.decision),
				policies: [credentialPolicyDecision, sunsetPolicyDecision],
			},
			policyDecisionHttpStatus(combinedDecision.decision),
		);
	}

	const legacyKeyId = `mlk_${generateUUID().replace(/-/g, '')}`;
	const rawLegacyKey = `mlk_${generateSecureToken(48)}`;
	const keyHash = await hashToken(rawLegacyKey);
	const keyPrefix = rawLegacyKey.slice(0, 14);

	await createMcpLegacyKey(db, {
		id: legacyKeyId,
		key_hash: keyHash,
		key_prefix: keyPrefix,
		tenant_id: account.tenant_id,
		account_id: account.account_id,
		user_id: account.user_id,
		reason,
		exception_approved_by: exceptionApprovedBy,
		issued_by: actor,
		expires_at: expiresAt,
		sunset_at: sunsetAt,
	});

	await createMcpAuthEvent(db, {
		id: generateUUID(),
		session_id: null,
		user_id: account.user_id,
		event_type: 'mcp_legacy_key_issued',
		event_data_json: JSON.stringify({
			legacy_key_id: legacyKeyId,
			key_prefix: keyPrefix,
			account_id: account.account_id,
			tenant_id: account.tenant_id,
			expires_at: expiresAt,
			sunset_at: sunsetAt,
			reason,
			exception_approved_by: exceptionApprovedBy,
			actor,
			policies: [credentialPolicyDecision, sunsetPolicyDecision],
		}),
	});

	return json({
		legacy_key_id: legacyKeyId,
		legacy_key: rawLegacyKey,
		key_prefix: keyPrefix,
		account_id: account.account_id,
		tenant_id: account.tenant_id,
		expires_at: expiresAt,
		sunset_at: sunsetAt,
		policies: [credentialPolicyDecision, sunsetPolicyDecision],
	});
}

async function handleRevokeMcpLegacyKey(request: Request, env: Env, legacyKeyId: string): Promise<Response> {
	const db = env.DB;
	const auth = await authenticateApiKeyForPermissions(request, env, ['mcp_legacy_key_revoke']);
	if (!auth.ok) {
		return json({ error: auth.error, message: auth.message, status: auth.status }, auth.status);
	}

	const body = (await parseJSON<{ actor?: string; metadata?: Record<string, unknown> }>(request)) ?? {};
	const existing = await findMcpLegacyKeyById(db, legacyKeyId);
	if (!existing) {
		return json({ error: 'not_found', message: 'Legacy key not found', status: 404 }, 404);
	}

	const actor = normalizeActor(body.actor) ?? auth.actor;
	const policyDecision = await evaluatePartnerPolicyDecision(db, env, {
		policyId: POLICY_MCP_CREDENTIAL_DELIVERY_ID,
		actionName: 'mcp_legacy_key_revoke',
		accountId: existing.account_id,
		actor,
		request: {
			actor: {
				accountId: existing.account_id,
				tenantId: existing.tenant_id,
				userId: existing.user_id,
				actorId: actor,
				role: 'operator',
			},
			action: {
				name: 'revoke_legacy_key',
				writeIntent: true,
				humanReviewStep: true,
				introspectionOk: true,
			},
			resource: {
				kind: 'legacy_key',
				id: existing.id,
				toolName: 'mcp_legacy_key_revoke',
				accessType: 'auth_admin',
			},
		},
		metadata: {
			legacy_key_id: existing.id,
			tenant_id: existing.tenant_id,
			...normalizeMetadata(body.metadata),
		},
	});

	if (policyDecision.decision !== 'allow') {
		return json(
			{
				error: 'policy_denied',
				message: policyDecision.reason,
				status: policyDecisionHttpStatus(policyDecision.decision),
				policy: policyDecision,
			},
			policyDecisionHttpStatus(policyDecision.decision),
		);
	}

	const revoked = await revokeMcpLegacyKey(db, legacyKeyId);
	await createMcpAuthEvent(db, {
		id: generateUUID(),
		session_id: null,
		user_id: existing.user_id,
		event_type: 'mcp_legacy_key_revoked',
		event_data_json: JSON.stringify({
			legacy_key_id: legacyKeyId,
			account_id: existing.account_id,
			tenant_id: existing.tenant_id,
			actor,
			revoked,
			policy: policyDecision,
		}),
	});

	return json({
		success: revoked,
		legacy_key_id: legacyKeyId,
		account_id: existing.account_id,
		tenant_id: existing.tenant_id,
		revoked,
		policy: policyDecision,
	});
}

async function handleResolveMcpSession(request: Request, env: Env): Promise<Response> {
	const db = env.DB;
	const authorized = isMcpResolveAuthorized(request, env);
	if (!authorized.ok) {
		return json({ error: 'unauthorized', message: authorized.message, status: authorized.status }, authorized.status);
	}

	const body = await parseJSON<ResolveMcpSessionBody>(request);
	if (!body?.token) {
		return json({ error: 'invalid_request', message: 'token is required', status: 400 }, 400);
	}
	const resourceHost = normalizeOptionalHostName(body.resource_host);

	const tokenHash = await hashToken(body.token);
	const session = await findMcpSessionByTokenHash(db, tokenHash);
	if (session) {
		const now = Date.now();
		const expired = new Date(session.expires_at).getTime() <= now;
		const revoked = Boolean(session.revoked_at);
		if (expired || revoked) {
			await createMcpAuthEvent(db, {
				id: generateUUID(),
				session_id: session.id,
				user_id: session.user_id,
				event_type: 'mcp_session_resolve_rejected',
				event_data_json: JSON.stringify({
					reason: revoked ? 'revoked' : 'expired',
					expires_at: session.expires_at,
					revoked_at: session.revoked_at,
				}),
			});
			return json({
				valid: false,
				reason: revoked ? 'revoked' : 'expired',
				session_id: session.id,
				expires_at: session.expires_at,
				revoked_at: session.revoked_at,
			});
		}

		const hostBindingFailure = getHostBindingFailure(session.bound_host, resourceHost);
		if (hostBindingFailure) {
			await createMcpAuthEvent(db, {
				id: generateUUID(),
				session_id: session.id,
				user_id: session.user_id,
				event_type: 'mcp_session_resolve_rejected',
				event_data_json: JSON.stringify({
					reason: hostBindingFailure,
					host: session.host,
					bound_host: session.bound_host,
					resource_host: resourceHost,
				}),
			});
			return json({
				valid: false,
				reason: hostBindingFailure,
				session_id: session.id,
				host: session.host,
				bound_host: session.bound_host,
				resource_host: resourceHost,
			});
		}

		const toolkitProfile = parseStringArray(session.toolkit_profile_json);
		const allowedToolPrefixes =
			resolveEffectiveAllowedToolPrefixes({
				accountId: session.account_id,
				tenantId: session.tenant_id,
				host: session.host,
				boundHost: session.bound_host,
				toolkitProfile,
				allowedToolPrefixes: parseStringArray(session.allowed_tool_prefixes_json),
			}) ?? [];

		const entitlement = await checkAgencyManagedBearerEntitlement(env, {
			authSubject: session.user_id,
			accountId: session.account_id,
			tenantId: session.tenant_id,
		});

		await createMcpAuthEvent(db, {
			id: generateUUID(),
			session_id: session.id,
			user_id: session.user_id,
			event_type: 'mcp_session_resolved',
			event_data_json: JSON.stringify({
				account_id: session.account_id,
				tenant_id: session.tenant_id,
				host: session.host,
				bound_host: session.bound_host,
				resource_host: resourceHost,
			}),
		});

		return json({
			valid: true,
			session_id: session.id,
			account_id: session.account_id,
			tenant_id: session.tenant_id,
			user_id: session.user_id,
			host: session.host,
			bound_host: session.bound_host,
			tool_mode: session.tool_mode,
			expires_at: session.expires_at,
			allowed_tool_prefixes: allowedToolPrefixes,
			toolkit_profile: toolkitProfile,
			allow_pending_oauth_approvals: false,
			auth_mode: 'session',
			service_tier: entitlement.service_tier ?? null,
			entitlement_snapshot: entitlement.entitlement_snapshot ?? null,
		});
	}

	const legacyKey = await findMcpLegacyKeyByTokenHash(db, tokenHash);
	if (!legacyKey) {
		const longLivedToken = await findMcpLongLivedTokenByTokenHash(db, tokenHash);
		if (!longLivedToken) {
			return json({ valid: false, reason: 'token_not_found' });
		}

		const revoked = Boolean(longLivedToken.revoked_at);
		if (revoked) {
			await createMcpAuthEvent(db, {
				id: generateUUID(),
				session_id: null,
				user_id: longLivedToken.auth_subject,
				event_type: 'mcp_long_lived_token_resolve_rejected',
				event_data_json: JSON.stringify({
					token_id: longLivedToken.id,
					account_id: longLivedToken.account_id,
					tenant_id: longLivedToken.tenant_id,
					reason: 'revoked',
					bound_host: longLivedToken.bound_host,
					resource_host: resourceHost,
					revoked_at: longLivedToken.revoked_at,
				}),
			});
			return json({
				valid: false,
				reason: 'revoked',
				token_id: longLivedToken.id,
				account_id: longLivedToken.account_id,
				tenant_id: longLivedToken.tenant_id,
				bound_host: longLivedToken.bound_host,
				resource_host: resourceHost,
				revoked_at: longLivedToken.revoked_at,
			});
		}

		const hostBindingFailure = getHostBindingFailure(longLivedToken.bound_host, resourceHost);
		if (hostBindingFailure) {
			await createMcpAuthEvent(db, {
				id: generateUUID(),
				session_id: null,
				user_id: longLivedToken.auth_subject,
				event_type: 'mcp_long_lived_token_resolve_rejected',
				event_data_json: JSON.stringify({
					token_id: longLivedToken.id,
					account_id: longLivedToken.account_id,
					tenant_id: longLivedToken.tenant_id,
					reason: hostBindingFailure,
					bound_host: longLivedToken.bound_host,
					resource_host: resourceHost,
				}),
			});
			return json({
				valid: false,
				reason: hostBindingFailure,
				token_id: longLivedToken.id,
				account_id: longLivedToken.account_id,
				tenant_id: longLivedToken.tenant_id,
				auth_mode: 'managed_bearer',
				bound_host: longLivedToken.bound_host,
				resource_host: resourceHost,
			});
		}

		const entitlement = await checkAgencyManagedBearerEntitlement(env, {
			authSubject: longLivedToken.auth_subject,
			accountId: longLivedToken.account_id,
			tenantId: longLivedToken.tenant_id,
		});
		if (!entitlement.allowed) {
			await createMcpAuthEvent(db, {
				id: generateUUID(),
				session_id: null,
				user_id: longLivedToken.auth_subject,
				event_type: 'mcp_long_lived_token_resolve_rejected',
				event_data_json: JSON.stringify({
					token_id: longLivedToken.id,
					account_id: longLivedToken.account_id,
					tenant_id: longLivedToken.tenant_id,
					reason: entitlement.reason ?? 'entitlement_denied',
					bound_host: longLivedToken.bound_host,
					resource_host: resourceHost,
					entitlement,
				}),
			});
			return json({
				valid: false,
				reason: entitlement.reason ?? 'entitlement_denied',
				token_id: longLivedToken.id,
				account_id: longLivedToken.account_id,
				tenant_id: longLivedToken.tenant_id,
				auth_mode: 'managed_bearer',
				bound_host: longLivedToken.bound_host,
				resource_host: resourceHost,
				service_tier: entitlement.service_tier ?? null,
				entitlement_snapshot: entitlement.entitlement_snapshot ?? null,
			});
		}

		await markMcpLongLivedTokenUsed(db, longLivedToken.id);
		const toolkitProfile = parseStringArray(longLivedToken.toolkit_profile_json);
		const allowedToolPrefixes = resolveEffectiveAllowedToolPrefixes({
			accountId: longLivedToken.account_id,
			tenantId: longLivedToken.tenant_id,
			host: longLivedToken.bound_host,
			boundHost: longLivedToken.bound_host,
			toolkitProfile,
			allowedToolPrefixes: parseAllowedToolPrefixesOrNull(longLivedToken.allowed_tool_prefixes_json),
		});
		await createMcpAuthEvent(db, {
			id: generateUUID(),
			session_id: null,
			user_id: longLivedToken.auth_subject,
			event_type: 'mcp_long_lived_token_resolved',
			event_data_json: JSON.stringify({
				token_id: longLivedToken.id,
				account_id: longLivedToken.account_id,
				tenant_id: longLivedToken.tenant_id,
				token_prefix: longLivedToken.token_prefix,
				bound_host: longLivedToken.bound_host,
				resource_host: resourceHost,
			}),
		});

		return json({
			valid: true,
			session_id: null,
			account_id: longLivedToken.account_id,
			tenant_id: longLivedToken.tenant_id,
			user_id: longLivedToken.auth_subject,
			host: longLivedToken.bound_host ?? 'agency_bearer',
			bound_host: longLivedToken.bound_host,
			tool_mode: longLivedToken.tool_mode,
			expires_at: null,
			allowed_tool_prefixes: allowedToolPrefixes,
			toolkit_profile: toolkitProfile,
			allow_pending_oauth_approvals: false,
			long_lived_token_id: longLivedToken.id,
			auth_mode: 'managed_bearer',
			service_tier: entitlement.service_tier ?? null,
			entitlement_snapshot: entitlement.entitlement_snapshot ?? null,
		});
	}

	const now = Date.now();
	const expired = new Date(legacyKey.expires_at).getTime() <= now;
	const revoked = Boolean(legacyKey.revoked_at);
	if (expired || revoked) {
		await createMcpAuthEvent(db, {
			id: generateUUID(),
			session_id: null,
			user_id: legacyKey.user_id,
			event_type: 'mcp_legacy_key_resolve_rejected',
			event_data_json: JSON.stringify({
				legacy_key_id: legacyKey.id,
				account_id: legacyKey.account_id,
				tenant_id: legacyKey.tenant_id,
				reason: revoked ? 'revoked' : 'expired',
				expires_at: legacyKey.expires_at,
				revoked_at: legacyKey.revoked_at,
				sunset_at: legacyKey.sunset_at,
			}),
		});
		return json({
			valid: false,
			reason: revoked ? 'revoked' : 'expired',
			legacy_key_id: legacyKey.id,
			account_id: legacyKey.account_id,
			tenant_id: legacyKey.tenant_id,
			expires_at: legacyKey.expires_at,
			revoked_at: legacyKey.revoked_at,
			sunset_at: legacyKey.sunset_at,
		});
	}

	await markMcpLegacyKeyUsed(db, legacyKey.id);
	await createMcpAuthEvent(db, {
		id: generateUUID(),
		session_id: null,
		user_id: legacyKey.user_id,
		event_type: 'mcp_legacy_key_resolved',
		event_data_json: JSON.stringify({
			legacy_key_id: legacyKey.id,
			account_id: legacyKey.account_id,
			tenant_id: legacyKey.tenant_id,
			key_prefix: legacyKey.key_prefix,
			sunset_at: legacyKey.sunset_at,
		}),
	});

	return json({
		valid: true,
		session_id: null,
		account_id: legacyKey.account_id,
		tenant_id: legacyKey.tenant_id,
		user_id: legacyKey.user_id,
		host: null,
		tool_mode: 'read_write',
		expires_at: legacyKey.expires_at,
		allowed_tool_prefixes: null,
		toolkit_profile: [],
		allow_pending_oauth_approvals: false,
		legacy_key_id: legacyKey.id,
		sunset_at: legacyKey.sunset_at,
		auth_mode: 'legacy_key',
	});
}

async function checkAgencyManagedBearerEntitlement(
	env: Env,
	input: {
		authSubject: string;
		accountId?: string | null;
		tenantId?: string | null;
	}
): Promise<AgencyEntitlementDecision> {
	const baseUrl = env.AGENCY_INTERNAL_API_URL?.trim()?.replace(/\/+$/, '');
	const apiKey = env.AGENCY_INTERNAL_API_KEY?.trim();
	if (!baseUrl || !apiKey) {
		return {
			allowed: false,
			reason: 'agency_entitlement_not_configured',
		};
	}

	try {
		const response = await fetch(`${baseUrl}/api/internal/mcp-entitlements/check`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': apiKey,
			},
			body: JSON.stringify({
				auth_subject: input.authSubject,
				account_id: input.accountId ?? null,
				tenant_id: input.tenantId ?? null,
			}),
		});
		const payload = (await response.json().catch(() => null)) as AgencyEntitlementDecision | null;
		if (!response.ok || !payload) {
			return {
				allowed: false,
				reason: payload?.reason ?? `agency_entitlement_http_${response.status}`,
			};
		}
		return payload;
	} catch (error) {
		return {
			allowed: false,
			reason: error instanceof Error ? `agency_entitlement_error:${error.name}` : 'agency_entitlement_error',
		};
	}
}

async function handleGetMcpSession(request: Request, env: Env, sessionId: string): Promise<Response> {
	const db = env.DB;
	const payload = await authenticate(request, env);
	if (!payload) {
		return json({ error: 'unauthorized', message: 'Invalid token', status: 401 }, 401);
	}

	const session = await findMcpSessionById(db, sessionId);
	if (!session) {
		return json({ error: 'not_found', message: 'Session not found', status: 404 }, 404);
	}

	if (session.user_id !== payload.sub) {
		return json({ error: 'forbidden', message: 'Session does not belong to authenticated user', status: 403 }, 403);
	}

	return json({
		session_id: session.id,
		account_id: session.account_id,
		tenant_id: session.tenant_id,
		user_id: session.user_id,
		host: session.host,
		bound_host: session.bound_host,
		tool_mode: session.tool_mode,
		toolkit_profile: parseStringArray(session.toolkit_profile_json),
		allowed_tool_prefixes: parseStringArray(session.allowed_tool_prefixes_json),
		expires_at: session.expires_at,
		revoked_at: session.revoked_at,
		created_at: session.created_at,
		updated_at: session.updated_at,
		active: session.revoked_at === null && new Date(session.expires_at).getTime() > Date.now(),
	});
}

async function handleRevokeMcpSession(request: Request, env: Env, sessionId: string): Promise<Response> {
	const db = env.DB;
	const payload = await authenticate(request, env);
	if (!payload) {
		return json({ error: 'unauthorized', message: 'Invalid token', status: 401 }, 401);
	}

	const session = await findMcpSessionById(db, sessionId);
	if (!session) {
		return json({ error: 'not_found', message: 'Session not found', status: 404 }, 404);
	}
	if (session.user_id !== payload.sub) {
		return json({ error: 'forbidden', message: 'Session does not belong to authenticated user', status: 403 }, 403);
	}

	const revoked = await revokeMcpSession(db, sessionId);
	await createMcpAuthEvent(db, {
		id: generateUUID(),
		session_id: sessionId,
		user_id: payload.sub,
		event_type: 'mcp_session_revoked',
		event_data_json: JSON.stringify({ revoked }),
	});

	return json({
		success: revoked,
		session_id: sessionId,
		revoked,
	});
}

async function handleMagicLogin(request: Request, env: Env): Promise<Response> {
	const db = env.DB;

	const body = await parseJSON<{ email?: string; source?: string }>(request);
	if (!body) return json({ error: 'invalid_request', message: 'Invalid JSON', status: 400 }, 400);

	const { email, source = 'lms' } = body;
	if (!email) {
		return json({ error: 'invalid_request', message: 'Email required', status: 400 }, 400);
	}

	const user = await findUserByEmail(db, email);
	if (!user) {
		return json({ error: 'user_not_found', message: 'User not found', status: 404 }, 404);
	}

	// Check if user is deleted
	if (user.deleted_at) {
		return json({ error: 'account_deleted', message: 'This account has been deleted', status: 401 }, 401);
	}

	const { accessToken, refreshToken, expiresIn } = await generateTokens(db, user);

	return json({
		access_token: accessToken,
		refresh_token: refreshToken,
		token_type: 'Bearer',
		expires_in: expiresIn,
		user: {
			id: user.id,
			email: user.email,
		},
	});
}

async function handleMagicSignup(request: Request, env: Env): Promise<Response> {
	const db = env.DB;

	const body = await parseJSON<{ email?: string; source?: string }>(request);
	if (!body) return json({ error: 'invalid_request', message: 'Invalid JSON', status: 400 }, 400);

	const { email, source = 'lms' } = body;

	if (!email) {
		return json({ error: 'invalid_request', message: 'Email required', status: 400 }, 400);
	}

	if (!isValidEmail(email)) {
		return json({ error: 'invalid_email', message: 'Invalid email format', status: 400 }, 400);
	}

	const existing = await findUserByEmail(db, email);
	if (existing) {
		return json({ error: 'email_exists', message: 'Email already registered', status: 409 }, 409);
	}

	// Generate a random unguessable password hash
	// Users can't log in with password - only via magic link or reset flow
	const randomPassword = generateSecureToken(32);
	const passwordHash = await hashPassword(randomPassword);

	const user = await createUser(db, {
		id: generateUUID(),
		email,
		password_hash: passwordHash,
		source: source as 'workway' | 'templates' | 'io' | 'space' | 'lms',
	});

	const { accessToken, refreshToken, expiresIn } = await generateTokens(db, user);

	return json({
		access_token: accessToken,
		refresh_token: refreshToken,
		token_type: 'Bearer',
		expires_in: expiresIn,
		user: {
			id: user.id,
			email: user.email,
		},
	});
}

// User Handlers

async function handleGetMe(request: Request, env: Env): Promise<Response> {
	const payload = await authenticate(request, env);
	if (!payload) {
		return json({ error: 'unauthorized', message: 'Invalid token', status: 401 }, 401);
	}

	const user = await findUserById(env.DB, payload.sub);
	if (!user) {
		return json({ error: 'user_not_found', message: 'User not found', status: 404 }, 404);
	}

	return json<UserResponse>({
		id: user.id,
		email: user.email,
		email_verified: Boolean(user.email_verified),
		name: user.name,
		avatar_url: user.avatar_url,
		tier: user.tier,
		analytics_opt_out: Boolean(user.analytics_opt_out),
		created_at: user.created_at,
	});
}

async function handleUpdateMe(request: Request, env: Env): Promise<Response> {
	const payload = await authenticate(request, env);
	if (!payload) {
		return json({ error: 'unauthorized', message: 'Invalid token', status: 401 }, 401);
	}

	const body = await parseJSON<{ name?: string; avatar_url?: string; analytics_opt_out?: boolean }>(request);
	if (!body) return json({ error: 'invalid_request', message: 'Invalid JSON', status: 400 }, 400);

	const user = await updateUser(env.DB, payload.sub, {
		...(body.name !== undefined && { name: body.name }),
		...(body.avatar_url !== undefined && { avatar_url: body.avatar_url }),
		...(body.analytics_opt_out !== undefined && { analytics_opt_out: body.analytics_opt_out ? 1 : 0 }),
	});

	if (!user) {
		return json({ error: 'user_not_found', message: 'User not found', status: 404 }, 404);
	}

	return json<UserResponse>({
		id: user.id,
		email: user.email,
		email_verified: Boolean(user.email_verified),
		name: user.name,
		avatar_url: user.avatar_url,
		tier: user.tier,
		analytics_opt_out: Boolean(user.analytics_opt_out),
		created_at: user.created_at,
	});
}

async function handleChangePassword(request: Request, env: Env): Promise<Response> {
	const db = env.DB;

	// Authenticate
	const payload = await authenticate(request, env);
	if (!payload) {
		return json({ error: 'unauthorized', message: 'Invalid token', status: 401 }, 401);
	}

	// Rate limit by user ID to prevent brute force
	const rateKey = `password:${payload.sub}`;
	const { allowed } = await checkRateLimit(db, rateKey, 5, 300); // 5 attempts per 5 minutes
	if (!allowed) {
		return json({ error: 'rate_limited', message: 'Too many password change attempts', status: 429 }, 429);
	}

	// Parse request body
	const body = await parseJSON<{ current_password?: string; new_password?: string }>(request);
	if (!body) return json({ error: 'invalid_request', message: 'Invalid JSON', status: 400 }, 400);

	const { current_password, new_password } = body;
	if (!current_password || !new_password) {
		return json({ error: 'invalid_request', message: 'Current password and new password required', status: 400 }, 400);
	}

	// Validate new password
	if (new_password.length < 8) {
		return json({ error: 'weak_password', message: 'New password must be at least 8 characters', status: 400 }, 400);
	}

	// Get user
	const user = await findUserById(db, payload.sub);
	if (!user) {
		return json({ error: 'user_not_found', message: 'User not found', status: 404 }, 404);
	}

	// Verify current password
	const valid = await verifyPassword(current_password, user.password_hash);
	if (!valid) {
		await incrementRateLimit(db, rateKey);
		return json({ error: 'invalid_password', message: 'Current password is incorrect', status: 401 }, 401);
	}

	// Hash and update new password
	const newPasswordHash = await hashPassword(new_password);
	const updated = await updateUserPassword(db, payload.sub, newPasswordHash);
	if (!updated) {
		return json({ error: 'update_failed', message: 'Failed to update password', status: 500 }, 500);
	}

	// Revoke all tokens to force re-login (security best practice)
	await revokeAllUserTokens(db, payload.sub);
	await revokeAllMcpSessionsForUser(db, payload.sub);

	return json({ success: true, message: 'Password updated. Please log in again.' });
}

async function handleInitiateEmailChange(request: Request, env: Env): Promise<Response> {
	const db = env.DB;

	// Authenticate
	const payload = await authenticate(request, env);
	if (!payload) {
		return json({ error: 'unauthorized', message: 'Invalid token', status: 401 }, 401);
	}

	// Check for Resend API key
	if (!env.RESEND_API_KEY) {
		return json({ error: 'service_unavailable', message: 'Email service not configured', status: 503 }, 503);
	}

	// Rate limit
	const rateKey = `email_change:${payload.sub}`;
	const { allowed } = await checkRateLimit(db, rateKey, 3, 3600); // 3 attempts per hour
	if (!allowed) {
		return json({ error: 'rate_limited', message: 'Too many email change attempts', status: 429 }, 429);
	}

	// Parse request
	const body = await parseJSON<{ new_email?: string; password?: string }>(request);
	if (!body) return json({ error: 'invalid_request', message: 'Invalid JSON', status: 400 }, 400);

	const { new_email, password } = body;
	if (!new_email || !password) {
		return json({ error: 'invalid_request', message: 'New email and password required', status: 400 }, 400);
	}

	if (!isValidEmail(new_email)) {
		return json({ error: 'invalid_email', message: 'Invalid email format', status: 400 }, 400);
	}

	// Get user and verify password
	const user = await findUserById(db, payload.sub);
	if (!user) {
		return json({ error: 'user_not_found', message: 'User not found', status: 404 }, 404);
	}

	const valid = await verifyPassword(password, user.password_hash);
	if (!valid) {
		await incrementRateLimit(db, rateKey);
		return json({ error: 'invalid_password', message: 'Password is incorrect', status: 401 }, 401);
	}

	// Check if new email already exists
	const existing = await findUserByEmail(db, new_email);
	if (existing) {
		return json({ error: 'email_exists', message: 'Email already in use', status: 409 }, 409);
	}

	// Generate verification token
	const token = generateUUID();
	const tokenHash = await hashToken(token);
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

	// Create email change request
	await createEmailChangeRequest(db, {
		id: generateUUID(),
		user_id: user.id,
		new_email: new_email.toLowerCase(),
		token_hash: tokenHash,
		expires_at: expiresAt,
	});

	// Send verification email to new address
	const verificationUrl = `https://id.createsomething.space/verify-email?token=${token}`;
	const result = await sendVerificationEmail(env.RESEND_API_KEY, new_email, user.name, verificationUrl);

	if (!result.success) {
		return json({ error: 'email_failed', message: 'Failed to send verification email', status: 500 }, 500);
	}

	return json({
		success: true,
		message: 'Verification email sent to your new address. Please check your inbox.',
	});
}

async function handleVerifyEmailChange(request: Request, env: Env): Promise<Response> {
	const db = env.DB;

	// Parse request
	const body = await parseJSON<{ token?: string }>(request);
	if (!body?.token) {
		return json({ error: 'invalid_request', message: 'Token required', status: 400 }, 400);
	}

	// Find the request by token
	const tokenHash = await hashToken(body.token);
	const changeRequest = await findEmailChangeRequestByToken(db, tokenHash);
	if (!changeRequest) {
		return json({ error: 'invalid_token', message: 'Invalid or expired token', status: 400 }, 400);
	}

	// Check if new email still available
	const existing = await findUserByEmail(db, changeRequest.new_email);
	if (existing) {
		await deleteEmailChangeRequest(db, changeRequest.id);
		return json({ error: 'email_exists', message: 'Email already in use', status: 409 }, 409);
	}

	// Update user's email
	const user = await updateUserEmail(db, changeRequest.user_id, changeRequest.new_email);
	if (!user) {
		return json({ error: 'update_failed', message: 'Failed to update email', status: 500 }, 500);
	}

	// Delete the change request
	await deleteEmailChangeRequest(db, changeRequest.id);

	// Revoke all tokens (security - force re-login with new email)
	await revokeAllUserTokens(db, changeRequest.user_id);
	await revokeAllMcpSessionsForUser(db, changeRequest.user_id);

	return json({
		success: true,
		message: 'Email updated successfully. Please log in with your new email.',
		email: user.email,
	});
}

async function handleDeleteMe(request: Request, env: Env): Promise<Response> {
	const db = env.DB;

	// Authenticate
	const payload = await authenticate(request, env);
	if (!payload) {
		return json({ error: 'unauthorized', message: 'Invalid token', status: 401 }, 401);
	}

	// Parse request
	const body = await parseJSON<{ password?: string }>(request);
	if (!body?.password) {
		return json({ error: 'invalid_request', message: 'Password required', status: 400 }, 400);
	}

	// Get user
	const user = await findUserById(db, payload.sub);
	if (!user) {
		return json({ error: 'user_not_found', message: 'User not found', status: 404 }, 404);
	}

	// Verify password
	const valid = await verifyPassword(body.password, user.password_hash);
	if (!valid) {
		return json({ error: 'invalid_password', message: 'Password is incorrect', status: 401 }, 401);
	}

	// Soft delete the user
	const deleted = await softDeleteUser(db, user.id);
	if (!deleted) {
		return json({ error: 'delete_failed', message: 'Failed to delete account', status: 500 }, 500);
	}

	// Revoke all tokens immediately
	await revokeAllUserTokens(db, user.id);
	await revokeAllMcpSessionsForUser(db, user.id);

	// Send confirmation email (if email service is configured)
	if (env.RESEND_API_KEY) {
		// Note: We don't use a deletion confirmation URL since this is a soft delete
		// The email just confirms the deletion and explains the 30-day grace period
		const confirmUrl = `https://id.createsomething.space/restore-account?email=${encodeURIComponent(user.email)}`;
		await sendDeletionConfirmationEmail(env.RESEND_API_KEY, user.email, user.name, confirmUrl);
	}

	return json({
		success: true,
		message: 'Account scheduled for deletion. You have 30 days to restore it by logging in.',
	});
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/gif': 'gif',
};

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

async function handleAvatarUpload(request: Request, env: Env): Promise<Response> {
	// Authenticate
	const payload = await authenticate(request, env);
	if (!payload) {
		return json({ error: 'unauthorized', message: 'Invalid token', status: 401 }, 401);
	}

	// Check content type
	const contentType = request.headers.get('Content-Type') || '';

	let imageData: ArrayBuffer;
	let mimeType: string;

	if (contentType.startsWith('multipart/form-data')) {
		// Handle multipart form upload
		const formData = await request.formData();
		const file = formData.get('avatar');

		if (!file || typeof file === 'string') {
			return json({ error: 'invalid_request', message: 'Avatar file required', status: 400 }, 400);
		}

		// file is now File type
		const imageFile = file as File;
		mimeType = imageFile.type;
		imageData = await imageFile.arrayBuffer();
	} else if (contentType in ALLOWED_IMAGE_TYPES) {
		// Handle raw image upload
		mimeType = contentType;
		imageData = await request.arrayBuffer();
	} else {
		return json({ error: 'invalid_content_type', message: 'Unsupported content type', status: 400 }, 400);
	}

	// Validate image type
	const extension = ALLOWED_IMAGE_TYPES[mimeType];
	if (!extension) {
		return json({ error: 'invalid_image_type', message: 'Supported types: PNG, JPEG, WebP, GIF', status: 400 }, 400);
	}

	// Validate size
	if (imageData.byteLength > MAX_AVATAR_SIZE) {
		return json({ error: 'file_too_large', message: 'Avatar must be under 5MB', status: 400 }, 400);
	}

	// Generate unique filename
	const filename = `${payload.sub}/${generateUUID()}.${extension}`;

	// Upload to R2
	await env.AVATARS.put(filename, imageData, {
		httpMetadata: {
			contentType: mimeType,
			cacheControl: 'public, max-age=31536000', // 1 year
		},
	});

	// Generate public URL
	const avatarUrl = `https://avatars.createsomething.space/${filename}`;

	// Delete old avatar if exists
	const user = await findUserById(env.DB, payload.sub);
	if (user?.avatar_url?.startsWith('https://avatars.createsomething.space/')) {
		const oldPath = user.avatar_url.replace('https://avatars.createsomething.space/', '');
		try {
			await env.AVATARS.delete(oldPath);
		} catch {
			// Ignore deletion errors for old avatars
		}
	}

	// Update user avatar_url
	const updatedUser = await updateUser(env.DB, payload.sub, { avatar_url: avatarUrl });
	if (!updatedUser) {
		return json({ error: 'update_failed', message: 'Failed to update avatar', status: 500 }, 500);
	}

	return json({
		success: true,
		avatar_url: avatarUrl,
	});
}

async function handleAvatarDelete(request: Request, env: Env): Promise<Response> {
	// Authenticate
	const payload = await authenticate(request, env);
	if (!payload) {
		return json({ error: 'unauthorized', message: 'Invalid token', status: 401 }, 401);
	}

	// Get user
	const user = await findUserById(env.DB, payload.sub);
	if (!user) {
		return json({ error: 'user_not_found', message: 'User not found', status: 404 }, 404);
	}

	// Delete from R2 if it's our avatar
	if (user.avatar_url?.startsWith('https://avatars.createsomething.space/')) {
		const path = user.avatar_url.replace('https://avatars.createsomething.space/', '');
		try {
			await env.AVATARS.delete(path);
		} catch {
			// Ignore deletion errors
		}
	}

	// Clear avatar_url
	await updateUser(env.DB, payload.sub, { avatar_url: null });

	return json({ success: true, message: 'Avatar deleted' });
}

async function handleUpdateAnalytics(request: Request, env: Env): Promise<Response> {
	// Authenticate
	const payload = await authenticate(request, env);
	if (!payload) {
		return json({ error: 'unauthorized', message: 'Invalid token', status: 401 }, 401);
	}

	// Parse request
	const body = await parseJSON<{ analytics_opt_out?: boolean }>(request);
	if (!body || typeof body.analytics_opt_out !== 'boolean') {
		return json({ error: 'invalid_request', message: 'analytics_opt_out boolean required', status: 400 }, 400);
	}

	// Update user preference
	const user = await updateUser(env.DB, payload.sub, {
		analytics_opt_out: body.analytics_opt_out ? 1 : 0,
	});

	if (!user) {
		return json({ error: 'user_not_found', message: 'User not found', status: 404 }, 404);
	}

	return json({
		success: true,
		analytics_opt_out: Boolean(user.analytics_opt_out),
		message: body.analytics_opt_out
			? 'Analytics tracking disabled. Your browsing data will no longer be collected.'
			: 'Analytics tracking enabled.',
	});
}

// Service-to-Service Handlers

async function handleValidate(request: Request, env: Env): Promise<Response> {
	const apiKey = request.headers.get('X-API-Key');
	if (!apiKey) {
		return json({ error: 'unauthorized', message: 'API key required', status: 401 }, 401);
	}

	const keyHash = await hashToken(apiKey);
	const storedKey = await findApiKeyByHash(env.DB, keyHash);
	if (!storedKey) {
		return json({ error: 'unauthorized', message: 'Invalid API key', status: 401 }, 401);
	}

	const body = await parseJSON<{ access_token?: string }>(request);
	if (!body?.access_token) {
		return json({ error: 'invalid_request', message: 'Access token required', status: 400 }, 400);
	}

	const jwks = await getJWKS(env.DB);
	let payload: JWTPayload | null = null;

	for (const jwk of jwks.keys) {
		const publicKey = await importPublicKey(jwk);
		payload = await validateJWT(body.access_token, publicKey);
		if (payload) break;
	}

	if (!payload) {
		return json({ error: 'invalid_token', message: 'Invalid or expired token', status: 401 }, 401);
	}

	return json({
		valid: true,
		user: { id: payload.sub, email: payload.email, tier: payload.tier, source: payload.source },
		exp: payload.exp,
	});
}

async function handleUpdateTier(request: Request, env: Env, userId: string): Promise<Response> {
	const apiKey = request.headers.get('X-API-Key');
	if (!apiKey) {
		return json({ error: 'unauthorized', message: 'API key required', status: 401 }, 401);
	}

	const keyHash = await hashToken(apiKey);
	const storedKey = await findApiKeyByHash(env.DB, keyHash);
	if (!storedKey) {
		return json({ error: 'unauthorized', message: 'Invalid API key', status: 401 }, 401);
	}

	const permissions: string[] = JSON.parse(storedKey.permissions);
	if (!permissions.includes('update_tier')) {
		return json({ error: 'forbidden', message: 'Insufficient permissions', status: 403 }, 403);
	}

	const body = await parseJSON<{ tier?: string }>(request);
	if (!body?.tier || !['free', 'pro', 'agency'].includes(body.tier)) {
		return json({ error: 'invalid_request', message: 'Valid tier required', status: 400 }, 400);
	}

	const user = await updateUser(env.DB, userId, { tier: body.tier as 'free' | 'pro' | 'agency' });
	if (!user) {
		return json({ error: 'user_not_found', message: 'User not found', status: 404 }, 404);
	}

	return json({ success: true, user: { id: user.id, email: user.email, tier: user.tier } });
}

async function handleHardDelete(request: Request, env: Env, userId: string): Promise<Response> {
	const db = env.DB;

	// Require API key with delete permission
	const apiKey = request.headers.get('X-API-Key');
	if (!apiKey) {
		return json({ error: 'unauthorized', message: 'API key required', status: 401 }, 401);
	}

	const keyHash = await hashToken(apiKey);
	const storedKey = await findApiKeyByHash(db, keyHash);
	if (!storedKey) {
		return json({ error: 'unauthorized', message: 'Invalid API key', status: 401 }, 401);
	}

	const permissions: string[] = JSON.parse(storedKey.permissions);
	if (!permissions.includes('delete_user')) {
		return json({ error: 'forbidden', message: 'Insufficient permissions', status: 403 }, 403);
	}

	// Check user exists and was soft-deleted
	const user = await findUserById(db, userId);
	if (!user) {
		return json({ error: 'user_not_found', message: 'User not found', status: 404 }, 404);
	}

	if (!user.deleted_at) {
		return json({ error: 'not_deleted', message: 'User must be soft-deleted first', status: 400 }, 400);
	}

	// Check grace period (30 days) unless force flag is set
	const body = await parseJSON<{ force?: boolean }>(request);
	if (!body?.force) {
		const deletedAt = new Date(user.deleted_at);
		const gracePeriodEnd = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
		const now = new Date();

		if (now < gracePeriodEnd) {
			const daysRemaining = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
			return json({
				error: 'grace_period',
				message: `Grace period has not expired. ${daysRemaining} days remaining.`,
				status: 400,
			}, 400);
		}
	}

	// Revoke all tokens first (in case any are still valid)
	await revokeAllUserTokens(db, userId);
	await revokeAllMcpSessionsForUser(db, userId);

	// Hard delete the user
	const deleted = await hardDeleteUser(db, userId);
	if (!deleted) {
		return json({ error: 'delete_failed', message: 'Failed to delete user', status: 500 }, 500);
	}

	return json({
		success: true,
		message: 'User permanently deleted',
		user_id: userId,
		deleted_at: new Date().toISOString(),
	});
}

async function handleCleanupDeletedUsers(request: Request, env: Env): Promise<Response> {
	const db = env.DB;

	// Require API key with cleanup permission
	const apiKey = request.headers.get('X-API-Key');
	if (!apiKey) {
		return json({ error: 'unauthorized', message: 'API key required', status: 401 }, 401);
	}

	const keyHash = await hashToken(apiKey);
	const storedKey = await findApiKeyByHash(db, keyHash);
	if (!storedKey) {
		return json({ error: 'unauthorized', message: 'Invalid API key', status: 401 }, 401);
	}

	const permissions: string[] = JSON.parse(storedKey.permissions);
	if (!permissions.includes('cleanup_users') && !permissions.includes('delete_user')) {
		return json({ error: 'forbidden', message: 'Insufficient permissions', status: 403 }, 403);
	}

	// Find all users deleted more than 30 days ago
	const usersToDelete = await findDeletedUsersForCleanup(db);

	const results: { user_id: string; email: string; deleted: boolean }[] = [];

	for (const user of usersToDelete) {
		// Revoke any remaining tokens
		await revokeAllUserTokens(db, user.id);
		await revokeAllMcpSessionsForUser(db, user.id);

		// Hard delete
		const deleted = await hardDeleteUser(db, user.id);
		results.push({ user_id: user.id, email: user.email, deleted });
	}

	return json({
		success: true,
		message: `Processed ${results.length} users for cleanup`,
		deleted_count: results.filter((r) => r.deleted).length,
		users: results,
	});
}

// Utilities

type ApiKeyAuthResult =
	| {
		ok: true;
		service: string;
		permissions: string[];
		actor: string;
	}
	| {
		ok: false;
		status: number;
		error: string;
		message: string;
	};

interface PolicyDecisionInput {
	policyId: string;
	actionName: string;
	accountId: string;
	actor: string;
	request: AuthorizationRequest;
	metadata: Record<string, unknown>;
}

async function authenticateApiKeyForPermissions(
	request: Request,
	env: Env,
	requiredPermissions: string[]
): Promise<ApiKeyAuthResult> {
	const apiKey = request.headers.get('X-API-Key')?.trim();
	if (!apiKey) {
		return { ok: false, status: 401, error: 'unauthorized', message: 'API key required' };
	}

	const keyHash = await hashToken(apiKey);
	const storedKey = await findApiKeyByHash(env.DB, keyHash);
	if (!storedKey) {
		return { ok: false, status: 401, error: 'unauthorized', message: 'Invalid API key' };
	}

	const permissions = parseApiKeyPermissions(storedKey.permissions);
	const missing = requiredPermissions.filter((permission) => !permissions.includes(permission));
	if (missing.length > 0) {
		return {
			ok: false,
			status: 403,
			error: 'forbidden',
			message: `Insufficient permissions. Missing: ${missing.join(', ')}`,
		};
	}

	return {
		ok: true,
		service: storedKey.service,
		permissions,
		actor: `service:${storedKey.service}`,
	};
}

function parseApiKeyPermissions(raw: string): string[] {
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean);
	} catch {
		return [];
	}
}

async function evaluatePartnerPolicyDecision(
	db: D1Database,
	env: Env,
	args: PolicyDecisionInput
): Promise<DecisionTelemetry> {
	const manifest = getPolicyManifest(args.policyId);
	const rollout = await getAuthzRollout(
		db,
		{
			scopeType: 'policy',
			policyId: args.policyId,
		},
		manifest,
		{
			readLegacyRollout: async (compatDb, scope) => {
				if (scope.scopeType !== 'policy') return null;
				const existing = await findMcpPolicyRollout(compatDb as D1Database, scope.policyId);
				if (!existing) return null;
				return {
					scopeKey: `policy:${scope.policyId}`,
					scopeType: 'policy',
					policyId: scope.policyId,
					accountId: args.accountId,
					entityType: null,
					entityId: null,
					mode: normalizeRolloutMode(existing.mode),
					canaryPercent: normalizeCanaryPercent(existing.canary_percent),
					mismatchThreshold: 0.005,
					fallbackRateThreshold: 0.01,
					updatedBy: existing.updated_by,
					updatedAt: toEpochSeconds(existing.updated_at),
				};
			},
		},
	);
	const hybridFallbackEnabled = parseBooleanEnv(env.MCP_POLICY_FALLBACK_ENABLED, true);
	const osoBootstrapPolicy = parseBooleanEnv(env.OSO_BOOTSTRAP_POLICY, false);
	const osoFetchTimeoutMillis = parseIntegerEnv(env.OSO_FETCH_TIMEOUT_MILLIS, 5000, 100, 30000);

	let decision: DecisionTelemetry;
	try {
		const evaluation = await evaluateAuthorizationRequest(
			args.policyId,
			args.request,
			{
				mode: rollout.mode,
				canaryPercent: rollout.canaryPercent,
			},
			{
				mode: 'hybrid',
				fallbackEnabled: hybridFallbackEnabled,
				oso: {
					url: env.OSO_URL,
					apiKey: env.OSO_API_KEY,
					fetchTimeoutMillis: osoFetchTimeoutMillis,
					bootstrapPolicy: osoBootstrapPolicy,
				},
			}
		);

		const final = evaluation.final;
		const polarRef = evaluation.polar;
		const fallbackUsed = polarRef.evaluationPath === 'fallback';

		await recordAuthzDecisionEvent(
			db,
			{
				id: generateUUID(),
				scopeKey: `policy:${args.policyId}`,
				scopeType: 'policy',
				policyId: args.policyId,
				accountId: args.accountId,
				tenantId: args.request.actor.tenantId ?? null,
				entityType: null,
				entityId: null,
				actorId: args.actor,
				actorRole: args.request.actor.role ?? null,
				actionName: args.actionName,
				resourceKind: args.request.resource.kind,
				resourceId: args.request.resource.id ?? null,
				resourceAccessType: args.request.resource.accessType ?? null,
				rolloutMode: rollout.mode,
				canaryPercent: rollout.canaryPercent,
				sampledPolar: evaluation.final.sampledPolar ? 1 : 0,
				mismatch: evaluation.final.mismatch ? 1 : 0,
				evaluationPath: final.evaluationPath,
				fallbackUsed: fallbackUsed ? 1 : 0,
				fallbackReason: polarRef.fallbackReason ?? null,
				legacyDecision: evaluation.legacy.decision,
				polarDecision: evaluation.polar.decision,
				finalDecision: final.decision,
				matchedRuleIdsJson: JSON.stringify(final.matchedRuleIds),
				reason: final.reason,
				policyHash: polarRef.policyHash ?? null,
				compilerVersion: polarRef.compilerVersion ?? null,
				correlationId: null,
				metadataJson: JSON.stringify({
					...args.metadata,
					decision_reason: final.reason,
					matched_rule_ids: final.matchedRuleIds,
					latency_ms: Math.floor(final.latencyMs),
				}),
			},
			{
				writeLegacyEvent: async (compatDb, event) => {
					await createMcpPolicyEvent(compatDb as D1Database, {
						id: event.id,
						policy_id: event.policyId,
						action_name: event.actionName,
						account_id: event.accountId,
						actor: event.actorId,
						rollout_mode: event.rolloutMode,
						canary_percent: event.canaryPercent,
						sampled_polar: event.sampledPolar,
						mismatch: event.mismatch,
						evaluation_path: event.evaluationPath,
						fallback_used: event.fallbackUsed,
						fallback_reason: event.fallbackReason,
						legacy_decision: event.legacyDecision,
						polar_decision: event.polarDecision,
						final_decision: event.finalDecision,
						policy_hash: event.policyHash,
						compiler_version: event.compilerVersion,
						metadata_json: event.metadataJson,
					});
				},
			},
		);

		decision = {
			policy_id: args.policyId,
			decision: final.decision,
			evaluation_path: final.evaluationPath,
			policy_hash: polarRef.policyHash ?? null,
			fallback_used: fallbackUsed,
			rollout_mode: rollout.mode,
			canary_percent: rollout.canaryPercent,
			matched_rule_ids: final.matchedRuleIds,
			compiler_version: polarRef.compilerVersion ?? null,
			reason: final.reason,
		};
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'policy evaluation failure';
		const failureEvent: AuthzDecisionEventRecord = {
			id: generateUUID(),
			scopeKey: `policy:${args.policyId}`,
			scopeType: 'policy',
			policyId: args.policyId,
			accountId: args.accountId,
			tenantId: args.request.actor.tenantId ?? null,
			entityType: null,
			entityId: null,
			actorId: args.actor,
			actorRole: args.request.actor.role ?? null,
			actionName: args.actionName,
			resourceKind: args.request.resource.kind,
			resourceId: args.request.resource.id ?? null,
			resourceAccessType: args.request.resource.accessType ?? null,
			rolloutMode: rollout.mode,
			canaryPercent: rollout.canaryPercent,
			sampledPolar: 0,
			mismatch: 0,
			evaluationPath: 'fallback',
			fallbackUsed: 1,
			fallbackReason: reason,
			legacyDecision: 'block',
			polarDecision: 'block',
			finalDecision: 'block',
			matchedRuleIdsJson: JSON.stringify(['policy_evaluation_failure']),
			reason: `Policy evaluation failed: ${reason}`,
			policyHash: null,
			compilerVersion: null,
			correlationId: null,
			metadataJson: JSON.stringify({
				...args.metadata,
				evaluation_error: reason,
			}),
		};
		await recordAuthzDecisionEvent(db, failureEvent, {
			writeLegacyEvent: async (compatDb, event) => {
				await createMcpPolicyEvent(compatDb as D1Database, {
					id: event.id,
					policy_id: event.policyId,
					action_name: event.actionName,
					account_id: event.accountId,
					actor: event.actorId,
					rollout_mode: event.rolloutMode,
					canary_percent: event.canaryPercent,
					sampled_polar: event.sampledPolar,
					mismatch: event.mismatch,
					evaluation_path: event.evaluationPath,
					fallback_used: event.fallbackUsed,
					fallback_reason: event.fallbackReason,
					legacy_decision: event.legacyDecision,
					polar_decision: event.polarDecision,
					final_decision: event.finalDecision,
					policy_hash: event.policyHash,
					compiler_version: event.compilerVersion,
					metadata_json: event.metadataJson,
				});
			},
		});

		decision = {
			policy_id: args.policyId,
			decision: 'block',
			evaluation_path: 'fallback',
			policy_hash: null,
			fallback_used: true,
			rollout_mode: rollout.mode,
			canary_percent: rollout.canaryPercent,
			matched_rule_ids: ['policy_evaluation_failure'],
			compiler_version: null,
			reason: `Policy evaluation failed: ${reason}`,
		};
	}

	return decision;
}

function normalizeRolloutMode(raw: string): RolloutConfig['mode'] {
	if (raw === 'shadow' || raw === 'polar_enforce') return raw;
	return 'legacy_enforce';
}

function normalizeCanaryPercent(raw: number): number {
	if (!Number.isFinite(raw)) return 0;
	return Math.max(0, Math.min(100, Math.trunc(raw)));
}

function toEpochSeconds(raw: string | null | undefined): number {
	if (!raw) return Math.floor(Date.now() / 1000);
	const date = new Date(raw);
	if (!Number.isFinite(date.getTime())) return Math.floor(Date.now() / 1000);
	return Math.floor(date.getTime() / 1000);
}

function combinePolicyDecisions(decisions: DecisionTelemetry[]): DecisionTelemetry {
	if (decisions.length === 0) {
		return {
			policy_id: 'policy.none',
			decision: 'allow',
			evaluation_path: 'legacy',
			policy_hash: null,
			fallback_used: false,
			rollout_mode: 'legacy_enforce',
			canary_percent: 0,
			reason: 'No policy decisions available.',
		};
	}

	let selected = decisions[0]!;
	for (const current of decisions.slice(1)) {
		if (decisionRank(current.decision) < decisionRank(selected.decision)) {
			selected = current;
		}
	}
	return selected;
}

function decisionRank(decision: AuthorizationDecisionType): number {
	if (decision === 'block') return 0;
	if (decision === 'require_human_review') return 1;
	return 2;
}

function policyDecisionHttpStatus(decision: AuthorizationDecisionType): number {
	if (decision === 'block') return 403;
	if (decision === 'require_human_review') return 409;
	return 200;
}

function normalizeAccountId(raw: string | undefined): string | null {
	if (!raw) return null;
	const candidate = raw.trim();
	if (!candidate) return null;
	return candidate.replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 128);
}

function normalizeOptionalId(raw: string | undefined): string | null {
	if (!raw) return null;
	const candidate = raw.trim();
	if (!candidate) return null;
	return candidate.slice(0, 256);
}

function normalizeActor(raw: string | undefined): string | null {
	if (!raw) return null;
	const candidate = raw.trim();
	if (!candidate) return null;
	return candidate.slice(0, 256);
}

function parseOptionalIsoTimestamp(raw: string | undefined): string | null {
	if (!raw) return null;
	const value = raw.trim();
	if (!value) return null;
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) return null;
	return date.toISOString();
}

function normalizeMetadata(raw: unknown): Record<string, unknown> {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
	return raw as Record<string, unknown>;
}

function readMetadataString(metadata: Record<string, unknown>, key: string): string | undefined {
	const value = metadata[key];
	return typeof value === 'string' ? value : undefined;
}

function clampLegacyKeyTtlSeconds(raw: number | undefined): number {
	if (!Number.isFinite(raw)) return DEFAULT_MCP_LEGACY_KEY_TTL_SECONDS;
	const ttl = Math.trunc(Number(raw));
	if (ttl < MIN_MCP_LEGACY_KEY_TTL_SECONDS) return MIN_MCP_LEGACY_KEY_TTL_SECONDS;
	if (ttl > MAX_MCP_LEGACY_KEY_TTL_SECONDS) return MAX_MCP_LEGACY_KEY_TTL_SECONDS;
	return ttl;
}

function parseBooleanEnv(raw: string | undefined, fallback: boolean): boolean {
	if (raw === undefined) return fallback;
	const normalized = raw.trim().toLowerCase();
	if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
	if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
	return fallback;
}

function parseIntegerEnv(raw: string | undefined, fallback: number, min: number, max: number): number {
	if (!raw) return fallback;
	const parsed = Number.parseInt(raw.trim(), 10);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.max(min, Math.min(max, parsed));
}

function normalizeTenantId(raw: string | undefined): string {
	const candidate = (raw ?? 'default').trim().toLowerCase();
	if (!candidate) return 'default';
	return candidate.replace(/[^a-z0-9._-]/g, '_').slice(0, 64);
}

function normalizeHostName(raw: string | undefined): string {
	return normalizeOptionalHostName(raw) ?? 'codex';
}

function normalizeOptionalHostName(raw: string | null | undefined): string | null {
	if (typeof raw !== 'string') return null;
	const candidate = raw.trim().toLowerCase();
	if (!candidate) return null;
	const withoutProtocol = candidate.replace(/^[a-z]+:\/\//, '');
	const hostPort = withoutProtocol.split('/')[0] ?? withoutProtocol;
	const hostname = hostPort.split('@').pop() ?? hostPort;
	const label = hostname.split(':')[0]?.split('.')[0] ?? hostname;
	if (!label) return null;
	const normalized = label.replace(/[^a-z0-9._-]/g, '_').slice(0, 64);
	return normalized || null;
}

export function getHostBindingFailure(boundHost: string | null | undefined, resourceHost: string | null): string | null {
	const normalizedBoundHost = normalizeOptionalHostName(boundHost);
	if (!normalizedBoundHost) return null;
	if (!resourceHost) return 'resource_host_required';
	if (resourceHost === normalizedBoundHost) return null;
	if (isCentralWebflowTemplateReviewHostBinding(normalizedBoundHost, resourceHost)) return null;
	return 'host_mismatch';
}

function isCentralWebflowTemplateReviewHostBinding(boundHost: string, resourceHost: string): boolean {
	return resourceHost === 'wf-template-review' && boundHost.startsWith('wf-template-review-');
}

function normalizeToolMode(raw: McpToolMode | undefined): McpToolMode {
	return raw === 'read_only' ? 'read_only' : 'read_write';
}

function normalizeToolkitProfile(raw: string[] | undefined): string[] {
	if (!Array.isArray(raw)) return [];
	const normalized = raw
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean)
		.map((value) => value.replace(/[^a-z0-9_]/g, '_'))
		.map((value) => value.replace(/^_+|_+$/g, ''))
		.filter(Boolean);
	return [...new Set(normalized)].slice(0, 200);
}

function buildAllowedToolPrefixes(toolkits: string[]): string[] {
	return toolkits.map((toolkit) => `composio-toolkit-${toolkit}__`);
}

function normalizeAllowedToolPrefixes(raw: string[] | undefined): string[] {
	if (!Array.isArray(raw)) return [];
	const normalized = raw
		.filter((value): value is string => typeof value === 'string')
		.map((value) => value.trim())
		.filter(Boolean);
	return [...new Set(normalized)].slice(0, 500);
}

function resolveAllowedToolPrefixes(rawPrefixes: string[] | undefined, toolkitProfile: string[]): string[] {
	const explicit = normalizeAllowedToolPrefixes(rawPrefixes);
	return explicit.length > 0 ? explicit : buildAllowedToolPrefixes(toolkitProfile);
}

export function resolveEffectiveAllowedToolPrefixes(input: {
	accountId?: string | null;
	tenantId?: string | null;
	host?: string | null;
	boundHost?: string | null;
	toolkitProfile?: string[];
	allowedToolPrefixes?: string[] | null;
}): string[] | null {
	if (isWebflowTemplateReviewReviewerLane(input)) {
		return [...WEBFLOW_TEMPLATE_REVIEW_PHASE_A_ALLOWED_TOOL_PREFIXES];
	}
	return input.allowedToolPrefixes ?? null;
}

function isWebflowTemplateReviewReviewerLane(input: {
	accountId?: string | null;
	tenantId?: string | null;
	host?: string | null;
	boundHost?: string | null;
	toolkitProfile?: string[];
}): boolean {
	const accountId = normalizeOptionalId(input.accountId ?? undefined)?.toLowerCase() ?? null;
	if (accountId && WEBFLOW_TEMPLATE_REVIEW_REVIEWER_ACCOUNT_IDS.has(accountId)) {
		return true;
	}

	const host = normalizeOptionalHostName(input.host);
	if (host === 'wf-template-review' || host?.startsWith('wf-template-review-')) {
		return true;
	}

	const boundHost = normalizeOptionalHostName(input.boundHost);
	return boundHost === 'wf-template-review' || Boolean(boundHost?.startsWith('wf-template-review-'));
}

function clampTtlSeconds(raw: number | undefined): number {
	if (!Number.isFinite(raw)) return DEFAULT_MCP_SESSION_TTL_SECONDS;
	const ttl = Math.trunc(Number(raw));
	if (ttl < MIN_MCP_SESSION_TTL_SECONDS) return MIN_MCP_SESSION_TTL_SECONDS;
	if (ttl > MAX_MCP_SESSION_TTL_SECONDS) return MAX_MCP_SESSION_TTL_SECONDS;
	return ttl;
}

function parseStringArray(raw: string): string[] {
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((value): value is string => typeof value === 'string')
			.map((value) => value.trim())
			.filter(Boolean);
	} catch {
		return [];
	}
}

function parseAllowedToolPrefixesOrNull(raw: string): string[] | null {
	const values = parseStringArray(raw);
	return values.length > 0 ? values : null;
}

function isMcpResolveAuthorized(
	request: Request,
	env: Env
): { ok: true } | { ok: false; status: number; message: string } {
	const expected = env.MCP_SESSION_RESOLVE_TOKEN?.trim();
	if (!expected) {
		return { ok: false, status: 503, message: 'MCP session resolver is not configured' };
	}

	const bearer = request.headers.get('Authorization');
	const bearerToken = bearer?.startsWith('Bearer ') ? bearer.slice(7).trim() : null;
	const altHeader = request.headers.get('X-Session-Resolve-Token')?.trim();
	const apiKeyHeader = request.headers.get('X-API-Key')?.trim();
	const provided = bearerToken || altHeader || apiKeyHeader;
	if (!provided || !constantTimeEqual(provided, expected)) {
		return { ok: false, status: 401, message: 'Invalid resolver credentials' };
	}

	return { ok: true };
}

function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; i += 1) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}

function buildOAuthAuthorizationServerMetadata(url: URL, env: Env) {
	const issuer = getOauthIssuer(url, env);
	return {
		issuer,
		authorization_endpoint: `${issuer}/oauth/authorize`,
		token_endpoint: `${issuer}/oauth/token`,
		registration_endpoint: `${issuer}/oauth/register`,
		userinfo_endpoint: `${issuer}/oauth/userinfo`,
		jwks_uri: `${issuer}/.well-known/jwks.json`,
		scopes_supported: ['openid', 'profile', 'email', 'mcp', 'offline_access'],
		response_types_supported: ['code'],
		grant_types_supported: ['authorization_code', 'refresh_token'],
		token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
		code_challenge_methods_supported: ['S256', 'plain'],
	};
}

function buildOpenIdConfigurationMetadata(url: URL, env: Env) {
	const issuer = getOauthIssuer(url, env);
	return {
		issuer,
		authorization_endpoint: `${issuer}/oauth/authorize`,
		token_endpoint: `${issuer}/oauth/token`,
		userinfo_endpoint: `${issuer}/oauth/userinfo`,
		registration_endpoint: `${issuer}/oauth/register`,
		jwks_uri: `${issuer}/.well-known/jwks.json`,
		response_types_supported: ['code'],
		grant_types_supported: ['authorization_code', 'refresh_token'],
		subject_types_supported: ['public'],
		id_token_signing_alg_values_supported: ['ES256'],
		scopes_supported: ['openid', 'profile', 'email', 'mcp', 'offline_access'],
		token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
		code_challenge_methods_supported: ['S256', 'plain'],
		claims_supported: ['sub', 'email', 'email_verified', 'name', 'nonce'],
	};
}

function getOauthIssuer(url: URL, env: Env): string {
	return normalizeUrlOrigin(url.origin);
}

function normalizeUrlOrigin(origin: string): string {
	return origin.replace(/\/+$/, '');
}

function validateOAuthAuthorizeRequest(params: URLSearchParams): string | null {
	if (params.get('response_type') !== 'code') return 'unsupported_response_type';
	if (!params.get('client_id')) return 'invalid_client';
	const redirectUri = params.get('redirect_uri');
	if (!redirectUri || !isValidHttpUrl(redirectUri)) return 'invalid_redirect_uri';
	const resource = params.get('resource');
	if (resource && !isValidHttpUrl(resource)) return 'invalid_target';
	return null;
}

function renderOAuthAuthorizePage(params: URLSearchParams, env: Env, errorMessage?: string): string {
	const hidden = Array.from(params.entries())
		.map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" />`)
		.join('\n');
	const hubUrl = escapeHtml(env.MCP_HUB_URL ?? DEFAULT_OAUTH_RESOURCE);
	return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <style>@import url('https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');</style>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%2307162b'/%3E%3Cpath d='M20 20h24v24H20z' fill='none' stroke='%23f4efe3' stroke-width='4'/%3E%3C/svg%3E" />
  <title>Authorize CREATE SOMETHING MCP</title>
  <style>
    :root {
      color-scheme: dark;
      --bg-1: #050608;
      --bg-2: #101215;
      --card: rgba(15, 16, 20, 0.92);
      --card-border: rgba(244, 239, 227, 0.09);
      --text: #f4efe3;
      --muted: rgba(244, 239, 227, 0.66);
      --input: rgba(8, 10, 14, 0.92);
      --input-border: rgba(244, 239, 227, 0.12);
      --accent: #f4efe3;
      --accent-ink: #081121;
      --danger-bg: rgba(135, 34, 54, 0.26);
      --danger-border: rgba(255, 143, 166, 0.22);
      --danger-text: #ffd7df;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'JetBrains Mono', 'SF Mono', Monaco, 'Cascadia Code', monospace;
      color: var(--text);
      margin: 0;
      min-height: 100vh;
      padding: 32px;
      background:
        radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 24%),
        linear-gradient(180deg, var(--bg-2), var(--bg-1));
      display: grid;
      place-items: center;
    }
    .shell {
      width: 100%;
      max-width: 980px;
      display: grid;
      gap: 24px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      color: rgba(244, 239, 227, 0.88);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-size: 0.8rem;
    }
    .mark {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      border: 1px solid rgba(244, 239, 227, 0.18);
      background: rgba(255, 255, 255, 0.02);
      display: grid;
      place-items: center;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
    }
    .mark::before {
      content: "";
      width: 18px;
      height: 18px;
      border: 2px solid var(--accent);
      display: block;
    }
    .card {
      width: 100%;
      max-width: 620px;
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 28px 80px rgba(0,0,0,.38);
      backdrop-filter: blur(10px);
    }
    .eyebrow {
      margin: 0 0 12px;
      color: rgba(244, 239, 227, 0.64);
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.74rem;
    }
    h1 {
      font-family: 'Stack Sans Notch', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: clamp(2rem, 4vw, 2.7rem);
      line-height: 1.02;
      letter-spacing: -0.03em;
      margin: 0 0 12px;
    }
    p { color: var(--muted); line-height: 1.65; margin: 0; }
    .lede { max-width: 52ch; }
    label { display: block; margin-top: 18px; font-weight: 600; font-size: 0.96rem; }
    input {
      width: 100%;
      margin-top: 8px;
      border: 1px solid var(--input-border);
      background: var(--input);
      color: var(--text);
      border-radius: 14px;
      padding: 14px 16px;
      font: inherit;
      outline: none;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
    }
    input:focus {
      border-color: rgba(244, 239, 227, 0.42);
      box-shadow: 0 0 0 3px rgba(244, 239, 227, 0.08);
    }
    button {
      margin-top: 22px;
      width: 100%;
      border: 0;
      border-radius: 999px;
      background: var(--accent);
      color: var(--accent-ink);
      padding: 14px 18px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .meta {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid rgba(255,255,255,0.07);
      font-size: .92rem;
      color: rgba(244, 239, 227, 0.58);
      overflow-wrap: anywhere;
    }
    .error {
      margin: 18px 0 0;
      background: var(--danger-bg);
      border: 1px solid var(--danger-border);
      color: var(--danger-text);
      border-radius: 14px;
      padding: 12px 14px;
    }
    @media (max-width: 640px) {
      body { padding: 18px; }
      .card { padding: 22px; border-radius: 22px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="brand">
      <div class="mark" aria-hidden="true"></div>
      <div>CREATE SOMETHING</div>
    </div>
    <main class="card">
    <p class="eyebrow">Managed MCP Access</p>
    <h1>Authorize MCP Access</h1>
    <p class="lede">Sign in to CREATE SOMETHING to connect this MCP app. The resulting access token is your managed MCP bearer token and remains subject to live entitlement checks.</p>
    ${errorMessage ? `<div class="error">${escapeHtml(errorMessage)}</div>` : ''}
    <form method="post" action="/oauth/authorize">
      ${hidden}
      <label>Email<input type="email" name="email" autocomplete="username" required /></label>
      <label>Password<input type="password" name="password" autocomplete="current-password" required /></label>
      <button type="submit">Authorize</button>
    </form>
    <div class="meta">Hub: ${hubUrl}</div>
  </main>
  </div>
</body>
</html>`;
}

function renderOAuthAuthorizeError(params: URLSearchParams, env: Env, errorMessage: string): Response {
	return new Response(renderOAuthAuthorizePage(params, env, errorMessage), {
		status: 401,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'no-store',
		},
	});
}

async function parseOAuthTokenBody(request: Request): Promise<OAuthTokenBody | null> {
	const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
	if (contentType.includes('application/x-www-form-urlencoded')) {
		const text = await request.text();
		const params = new URLSearchParams(text);
		return {
			grant_type: params.get('grant_type') ?? undefined,
			code: params.get('code') ?? undefined,
			refresh_token: params.get('refresh_token') ?? undefined,
			redirect_uri: params.get('redirect_uri') ?? undefined,
			client_id: params.get('client_id') ?? undefined,
			client_secret: params.get('client_secret') ?? undefined,
			code_verifier: params.get('code_verifier') ?? undefined,
			resource: params.get('resource') ?? undefined,
		};
	}
	return parseJSON<OAuthTokenBody>(request);
}

async function validateOAuthAuthorizationCode(code: string, env: Env): Promise<OAuthAuthorizationCodeClaims | null> {
	const jwks = await getJWKS(env.DB);
	for (const jwk of jwks.keys) {
		const publicKey = await importPublicKey(jwk);
		const payload = (await validateJWT(code, publicKey)) as OAuthAuthorizationCodeClaims | null;
		if (payload?.kind === 'oauth_authorization_code') {
			return payload;
		}
	}
	return null;
}

async function validateOAuthRefreshToken(token: string, env: Env): Promise<OAuthRefreshTokenClaims | null> {
	const jwks = await getJWKS(env.DB);
	for (const jwk of jwks.keys) {
		const publicKey = await importPublicKey(jwk);
		const payload = (await validateJWT(token, publicKey)) as OAuthRefreshTokenClaims | null;
		if (payload?.kind === 'oauth_refresh_token') {
			return payload;
		}
	}
	return null;
}

function normalizeScope(raw: string): string {
	return raw
		.split(/\s+/)
		.map((value) => value.trim())
		.filter(Boolean)
		.filter((value, index, all) => all.indexOf(value) === index)
		.join(' ');
}

function scopeIncludes(scope: string, expected: string): boolean {
	return scope
		.split(/\s+/)
		.map((value) => value.trim())
		.filter(Boolean)
		.includes(expected);
}

function normalizeOAuthResource(raw: string): string {
	return isValidHttpUrl(raw) ? raw : DEFAULT_OAUTH_RESOURCE;
}

function normalizeToolkitProfileString(raw: FormEntryValue | null): string[] {
	if (typeof raw !== 'string' || !raw.trim()) return [];
	return raw.split(',').map((value) => value.trim()).filter(Boolean);
}

function normalizeNullableId(raw: FormEntryValue | null): string | null {
	if (typeof raw !== 'string') return null;
	return normalizeOptionalId(raw) ?? null;
}

function normalizeNullableString(raw: string | null | undefined): string | null {
	const value = raw?.trim();
	return value ? value : null;
}

function normalizeToolModeNullable(raw: FormEntryValue | null): McpToolMode | undefined {
	if (typeof raw !== 'string') return undefined;
	if (raw === 'read_only' || raw === 'read_write') return raw;
	return undefined;
}

function normalizeCodeChallengeMethod(raw: string): OauthCodeChallengeMethod | undefined {
	if (raw === 'S256' || raw === 'plain') return raw;
	return undefined;
}

async function verifyPkce(
	codeVerifier: string | undefined,
	codeChallenge: string,
	method: OauthCodeChallengeMethod | undefined,
): Promise<boolean> {
	if (!codeVerifier) return false;
	if (!method || method === 'plain') return codeVerifier === codeChallenge;
	return (await sha256Base64Url(codeVerifier)) === codeChallenge;
}

async function sha256Base64Url(input: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
	return Buffer.from(new Uint8Array(digest)).toString('base64url');
}

function oauthErrorResponse(error: string, status: number, description?: string): Response {
	return json(
		{
			error,
			...(description ? { error_description: description } : {}),
		},
		status,
		{
			'Cache-Control': 'no-store',
			Pragma: 'no-cache',
		},
	);
}

function isValidHttpUrl(value: string): boolean {
	try {
		const parsed = new URL(value);
		return parsed.protocol === 'https:' || parsed.protocol === 'http:';
	} catch {
		return false;
	}
}

function slugify(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'client';
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

async function authenticate(request: Request, env: Env): Promise<JWTPayload | null> {
	const auth = request.headers.get('Authorization');
	if (!auth?.startsWith('Bearer ')) return null;

	const token = auth.slice(7);
	const jwks = await getJWKS(env.DB);

	for (const jwk of jwks.keys) {
		const publicKey = await importPublicKey(jwk);
		const payload = await validateJWT(token, publicKey);
		if (payload) return payload;
	}

	return null;
}

function cors(response: Response, request: Request, env: Env): Response {
	const origin = request.headers.get('Origin');
	const allowed = (env.ALLOWED_ORIGINS?.split(',') || []).concat(
		env.ENVIRONMENT !== 'production' ? ['http://localhost:5173', 'http://localhost:3000'] : []
	);

	const headers = new Headers(response.headers);
	if (origin && allowed.includes(origin)) {
		headers.set('Access-Control-Allow-Origin', origin);
		headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
		headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Session-Resolve-Token');
		headers.set('Access-Control-Allow-Credentials', 'true');
		headers.set('Access-Control-Max-Age', '86400');
	}

	return new Response(response.body, { status: response.status, headers });
}

function json<T>(data: T, status = 200, extraHeaders?: Record<string, string>): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json', ...extraHeaders },
	});
}

async function parseJSON<T>(request: Request): Promise<T | null> {
	try {
		return await request.json() as T;
	} catch {
		return null;
	}
}

/**
 * RFC 5322 compliant email validation
 * Validates local part, domain format, and proper TLD
 */
function isValidEmail(email: string): boolean {
	if (!email || typeof email !== 'string') {
		return false;
	}
	const trimmed = email.trim();
	if (trimmed.length < 5 || trimmed.length > 254) {
		return false;
	}
	return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(trimmed);
}
