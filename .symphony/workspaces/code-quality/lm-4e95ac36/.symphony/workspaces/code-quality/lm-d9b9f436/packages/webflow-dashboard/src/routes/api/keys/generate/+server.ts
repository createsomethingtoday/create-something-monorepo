import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

interface GenerateKeyRequest {
	keyName: string;
	scopes: string[];
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const { keyName, scopes } = (await request.json()) as GenerateKeyRequest;

	if (!keyName || typeof keyName !== 'string' || keyName.trim().length === 0) {
		throw error(400, 'Key name is required');
	}

	if (!Array.isArray(scopes) || scopes.length === 0) {
		throw error(400, 'At least one scope is required');
	}

	const validScopes = ['read:assets', 'read:profile'];
	const invalidScopes = scopes.filter((s: string) => !validScopes.includes(s));
	if (invalidScopes.length > 0) {
		throw error(400, `Invalid scopes: ${invalidScopes.join(', ')}`);
	}

	const airtable = getAirtableClient(platform?.env);
	const result = await airtable.generateApiKey(locals.user.email, keyName.trim(), scopes);

	return json({
		apiKey: result.key,
		keyName: result.apiKey.name,
		keyId: result.apiKey.id,
		expiresAt: result.apiKey.expiresAt,
		scopes: result.apiKey.scopes
	});
};
