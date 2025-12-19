import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';

const VALID_SCOPES = ['read:assets', 'read:profile', 'write:assets'] as const;

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	let body: { name?: string; scopes?: string[] };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	// Validate name
	const name = body.name?.trim();
	if (!name || name.length < 1 || name.length > 50) {
		throw error(400, 'Name must be between 1 and 50 characters');
	}

	// Validate scopes
	const scopes = body.scopes || ['read:assets', 'read:profile'];
	if (!Array.isArray(scopes) || scopes.length === 0) {
		throw error(400, 'At least one scope is required');
	}

	for (const scope of scopes) {
		if (!VALID_SCOPES.includes(scope as typeof VALID_SCOPES[number])) {
			throw error(400, `Invalid scope: ${scope}. Valid scopes are: ${VALID_SCOPES.join(', ')}`);
		}
	}

	try {
		const airtable = getAirtableClient(platform.env);
		const result = await airtable.generateApiKey(locals.user.email, name, scopes);

		return json({
			key: result.key, // Only shown once!
			apiKey: result.apiKey,
			warning: 'Save this key now. It will not be shown again.'
		}, { status: 201 });
	} catch (err) {
		console.error('Failed to generate API key:', err);
		throw error(500, 'Failed to generate API key');
	}
};
