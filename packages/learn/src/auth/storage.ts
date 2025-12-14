/**
 * Auth Storage
 *
 * Persists authentication tokens to ~/.create-something/auth.json
 * Canon: Storage recedes; authentication persists.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { AuthState, AuthTokens, User } from '../types.js';

const CONFIG_DIR = join(homedir(), '.create-something');
const AUTH_FILE = join(CONFIG_DIR, 'auth.json');

/**
 * Ensure the config directory exists with proper permissions
 */
function ensureConfigDir(): void {
	if (!existsSync(CONFIG_DIR)) {
		mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
	}
}

/**
 * Load stored authentication state
 */
export function loadAuth(): AuthState | null {
	try {
		if (!existsSync(AUTH_FILE)) {
			return null;
		}

		const content = readFileSync(AUTH_FILE, 'utf-8');
		const state = JSON.parse(content) as AuthState;

		// Validate structure
		if (state.version !== 1 || !state.tokens || !state.user) {
			return null;
		}

		return state;
	} catch {
		return null;
	}
}

/**
 * Save authentication state
 */
export function saveAuth(tokens: AuthTokens, user: User): void {
	ensureConfigDir();

	const state: AuthState = {
		version: 1,
		tokens,
		user
	};

	writeFileSync(AUTH_FILE, JSON.stringify(state, null, 2), { mode: 0o600 });

	// Ensure file permissions are restrictive (owner read/write only)
	try {
		chmodSync(AUTH_FILE, 0o600);
	} catch {
		// Ignore chmod errors on Windows
	}
}

/**
 * Clear stored authentication
 */
export function clearAuth(): void {
	try {
		if (existsSync(AUTH_FILE)) {
			writeFileSync(AUTH_FILE, '{}', { mode: 0o600 });
		}
	} catch {
		// Ignore errors
	}
}

/**
 * Check if access token is expired or about to expire
 */
export function isTokenExpired(tokens: AuthTokens, bufferSeconds = 60): boolean {
	const now = Math.floor(Date.now() / 1000);
	return tokens.expiresAt < now + bufferSeconds;
}

/**
 * Get current user from stored auth
 */
export function getCurrentUser(): User | null {
	const auth = loadAuth();
	return auth?.user ?? null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
	const auth = loadAuth();
	if (!auth) return false;

	return !isTokenExpired(auth.tokens);
}
