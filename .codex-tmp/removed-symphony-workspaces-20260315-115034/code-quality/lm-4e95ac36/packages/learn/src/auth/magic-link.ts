/**
 * Magic Link Authentication
 *
 * Handles the magic link flow: initiate, poll, complete.
 * Canon: Authentication without ceremony—one click, authenticated.
 */

import { randomUUID } from 'crypto';
import { LMSClient } from '../client/lms-api.js';
import { saveAuth } from './storage.js';
import type { AuthTokens, User } from '../types.js';

const POLL_INTERVAL_MS = 2000; // 2 seconds
const MAX_POLL_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export interface MagicLinkResult {
	success: boolean;
	message: string;
	user?: User;
}

/**
 * Initiate magic link authentication and poll until complete
 *
 * @param email - User's email address
 * @param onStatus - Callback for status updates
 * @returns Authentication result
 */
export async function authenticateWithMagicLink(
	email: string,
	onStatus?: (status: string) => void
): Promise<MagicLinkResult> {
	const client = new LMSClient();
	const sessionId = randomUUID();

	// Step 1: Send magic link email
	onStatus?.('Sending magic link email...');

	try {
		await client.initiateMagicLink(email, sessionId);
	} catch (error) {
		return {
			success: false,
			message: error instanceof Error ? error.message : 'Failed to send magic link'
		};
	}

	onStatus?.('Magic link sent! Check your email and click the link.');

	// Step 2: Poll for verification
	const startTime = Date.now();

	while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
		await sleep(POLL_INTERVAL_MS);

		try {
			const response = await client.pollMagicLink(sessionId);

			if (response.status === 'verified' && response.accessToken && response.refreshToken) {
				// Parse JWT to get user info and expiry
				const tokenPayload = parseJWT(response.accessToken);

				const tokens: AuthTokens = {
					accessToken: response.accessToken,
					refreshToken: response.refreshToken,
					expiresAt: tokenPayload.exp
				};

				const user: User = {
					id: tokenPayload.sub,
					email: tokenPayload.email,
					name: tokenPayload.name,
					tier: tokenPayload.tier || 'free'
				};

				// Save to persistent storage
				saveAuth(tokens, user);

				onStatus?.('Authentication successful!');

				return {
					success: true,
					message: 'You are now authenticated.',
					user
				};
			}

			if (response.status === 'expired') {
				return {
					success: false,
					message: 'Magic link expired. Please try again.'
				};
			}

			// Still pending
			const remaining = Math.floor((MAX_POLL_DURATION_MS - (Date.now() - startTime)) / 1000);
			onStatus?.(`Waiting for email verification... (${remaining}s remaining)`);
		} catch (error) {
			// Network error, continue polling
			console.error('Poll error:', error);
		}
	}

	return {
		success: false,
		message: 'Verification timed out. Please try again.'
	};
}

/**
 * Parse JWT payload (without verification - just for reading claims)
 */
function parseJWT(token: string): {
	sub: string;
	email: string;
	name?: string;
	tier?: 'free' | 'pro' | 'agency';
	exp: number;
} {
	try {
		const [, payload] = token.split('.');
		const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
		return JSON.parse(decoded);
	} catch {
		throw new Error('Invalid JWT token');
	}
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
