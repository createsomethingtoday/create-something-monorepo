import { json, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ApiKeyError, getAirtableClient } from '$lib/server/airtable';
import {
	API_KEY_NAME_MAX_LENGTH,
	API_KEY_SCOPES,
	MAX_ACTIVE_API_KEYS,
	isApiKeyScope
} from '$lib/server/api-keys';
import { checkRateLimit } from '$lib/server/kv';

/** Key creations one creator may attempt per hour. */
const GENERATE_LIMIT = { attempts: 10, windowSeconds: 3600 } as const;

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	let body: { keyName?: unknown; scopes?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		throw error(400, 'Request body must be JSON');
	}

	const keyName = typeof body?.keyName === 'string' ? body.keyName.trim() : '';
	if (!keyName) {
		throw error(400, 'Key name is required');
	}
	if (keyName.length > API_KEY_NAME_MAX_LENGTH) {
		throw error(400, `Key name must be ${API_KEY_NAME_MAX_LENGTH} characters or fewer`);
	}

	const requested: unknown[] = Array.isArray(body.scopes) ? body.scopes : [];
	if (requested.length === 0) {
		throw error(400, 'At least one permission is required');
	}
	const scopes = requested.filter(isApiKeyScope);
	if (scopes.length !== requested.length) {
		throw error(400, `Permissions must be from: ${API_KEY_SCOPES.join(', ')}`);
	}

	if (platform?.env?.SESSIONS) {
		const rateLimit = await checkRateLimit(
			platform.env.SESSIONS,
			`api-key-generate:${locals.user.email.toLowerCase()}`,
			GENERATE_LIMIT.attempts,
			GENERATE_LIMIT.windowSeconds
		);
		if (!rateLimit.allowed) {
			throw error(429, 'You created several keys in a short time. Try again in an hour.');
		}
	}

	try {
		const airtable = getAirtableClient(platform?.env);
		const result = await airtable.generateApiKey(locals.user.email, keyName, [...new Set(scopes)]);

		return json({
			apiKey: result.key,
			keyName: result.apiKey.name,
			keyId: result.apiKey.id,
			expiresAt: result.apiKey.expiresAt,
			scopes: result.apiKey.scopes
		});
	} catch (err) {
		if (isHttpError(err)) throw err;
		if (err instanceof ApiKeyError) {
			if (err.code === 'MAX_KEYS_REACHED') {
				throw error(
					400,
					`You have ${MAX_ACTIVE_API_KEYS} active keys, which is the limit. Revoke one, then create a new key.`
				);
			}
			throw error(
				404,
				'No creator profile uses the email you signed in with, so a key cannot be created. Sign in with the email on your creator profile.'
			);
		}
		console.error('[API Keys] Generate failed:', err);
		throw error(500, 'Failed to generate API key');
	}
};
