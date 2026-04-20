/**
 * Clerk Server-Side Authentication
 *
 * Handles request authentication, user lookup, and webhook verification
 * for the .agency property using Clerk as the identity provider.
 *
 * Pattern adapted from @create-something/shivworks-network.
 */

import {
	createClerkClient,
	type ClerkClient,
	type User,
} from '@clerk/backend';

// ---------------------------------------------------------------------------
// Environment types
// ---------------------------------------------------------------------------

export interface ClerkRuntimeEnv extends Record<string, string | undefined> {
	CLERK_PUBLISHABLE_KEY?: string;
	CLERK_SECRET_KEY?: string;
	CLERK_JWT_KEY?: string;
	CLERK_AUTHORIZED_PARTIES?: string;
	CLERK_ISSUER_URL?: string;
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export function getClerkClient(env: ClerkRuntimeEnv): ClerkClient {
	if (!env.CLERK_SECRET_KEY) {
		throw new Error('CLERK_SECRET_KEY is not configured');
	}

	return createClerkClient({
		secretKey: env.CLERK_SECRET_KEY,
		publishableKey: env.CLERK_PUBLISHABLE_KEY,
	});
}

// ---------------------------------------------------------------------------
// JWT key normalisation (PEM stored with literal \n)
// ---------------------------------------------------------------------------

function normalizeJwtKey(value: string | undefined): string | undefined {
	if (!value) return undefined;
	return value.replace(/\\n/g, '\n');
}

// ---------------------------------------------------------------------------
// Authorized party resolution
// ---------------------------------------------------------------------------

function normalizeOrigin(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return '';
	try {
		return new URL(trimmed).origin;
	} catch {
		return trimmed.replace(/\/+$/, '');
	}
}

export function resolveAuthorizedParties(
	env: ClerkRuntimeEnv,
): string[] | undefined {
	const configured =
		env.CLERK_AUTHORIZED_PARTIES?.split(',')
			.map(normalizeOrigin)
			.filter(Boolean) ?? [];

	// Always include the canonical agency origins
	const canonical = [
		'https://createsomething.agency',
		'https://create-something-agency.pages.dev',
	];

	const origins = Array.from(new Set([...canonical, ...configured]));
	return origins.length > 0 ? origins : undefined;
}

// ---------------------------------------------------------------------------
// Request authentication (called from hooks.server.ts)
// ---------------------------------------------------------------------------

export interface ClerkAuthState {
	userId: string | null;
	sessionId: string | null;
	isAuthenticated: boolean;
}

export async function authenticateClerkRequest(
	request: Request,
	env: ClerkRuntimeEnv,
): Promise<ClerkAuthState> {
	if (!env.CLERK_SECRET_KEY) {
		return { userId: null, sessionId: null, isAuthenticated: false };
	}

	try {
		const clerkClient = getClerkClient(env);
		const requestState = await clerkClient.authenticateRequest(request, {
			jwtKey: normalizeJwtKey(env.CLERK_JWT_KEY),
			authorizedParties: resolveAuthorizedParties(env),
		});
		const auth = requestState.toAuth();
		const userId = auth?.userId ?? null;
		const sessionId = auth?.sessionId ?? null;

		return {
			userId,
			sessionId,
			isAuthenticated: Boolean(userId),
		};
	} catch (error) {
		console.error('Clerk auth failed', error);
		return { userId: null, sessionId: null, isAuthenticated: false };
	}
}

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

export function getPrimaryEmail(user: User): string {
	const primaryId = user.primaryEmailAddressId;
	return (
		user.emailAddresses.find((e) => e.id === primaryId)?.emailAddress ||
		user.emailAddresses[0]?.emailAddress ||
		''
	);
}

export function getDisplayName(user: User): string {
	const first = user.firstName?.trim();
	const last = user.lastName?.trim();
	const full = [first, last].filter(Boolean).join(' ').trim();
	return full || getPrimaryEmail(user) || 'User';
}

export function isUserEmailVerified(user: User): boolean {
	const primaryId = user.primaryEmailAddressId;
	const primary =
		user.emailAddresses.find((e) => e.id === primaryId) ||
		user.emailAddresses[0];
	return primary?.verification?.status === 'verified';
}

// ---------------------------------------------------------------------------
// Resolve the Clerk env slice from the platform env
// ---------------------------------------------------------------------------

const CLERK_ENV_KEYS = [
	'CLERK_PUBLISHABLE_KEY',
	'CLERK_SECRET_KEY',
	'CLERK_JWT_KEY',
	'CLERK_AUTHORIZED_PARTIES',
	'CLERK_ISSUER_URL',
] as const;

export function resolveClerkEnv(
	platformEnv?: Record<string, unknown> | null,
): ClerkRuntimeEnv {
	const resolved: ClerkRuntimeEnv = {};
	if (!platformEnv) return resolved;

	for (const key of CLERK_ENV_KEYS) {
		const value = platformEnv[key];
		if (typeof value === 'string') {
			resolved[key] = value;
		}
	}

	return resolved;
}
