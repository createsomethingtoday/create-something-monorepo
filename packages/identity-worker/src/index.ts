/**
 * Identity Worker
 *
 * Unified authentication for CREATE SOMETHING services.
 * Zero dependencies. The infrastructure disappears.
 *
 * Canon: One identity, many manifestations.
 */

import type { Env, ErrorResponse, TokenResponse, UserResponse, JWTPayload, CrossDomainToken } from './types';
import { hashPassword, verifyPassword, generateUUID, hashToken, generateSecureToken } from './services/crypto';
import { generateTokens, refreshTokens, getJWKS, validateJWT, importPublicKey } from './services/tokens';
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
} from './db/queries';
import { sendVerificationEmail, sendDeletionConfirmationEmail } from './services/email';

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
		headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
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
