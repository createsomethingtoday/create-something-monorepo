import { error } from '@sveltejs/kit';
import { getAirtableClient } from './airtable';

export interface ApiKeyAuth {
	email: string;
	scopes: string[];
}

/**
 * Validates an API key from the Authorization header
 * Returns the authenticated user's email and scopes
 */
export async function validateApiKeyFromRequest(
	request: Request,
	platform: App.Platform | undefined,
	requiredScope?: string
): Promise<ApiKeyAuth> {
	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	const authHeader = request.headers.get('Authorization');
	if (!authHeader) {
		throw error(401, 'Missing Authorization header');
	}

	// Expect: Bearer wfd_xxx...
	const parts = authHeader.split(' ');
	if (parts.length !== 2 || parts[0] !== 'Bearer') {
		throw error(401, 'Invalid Authorization header format. Expected: Bearer <api_key>');
	}

	const apiKey = parts[1];
	if (!apiKey.startsWith('wfd_')) {
		throw error(401, 'Invalid API key format');
	}

	const airtable = getAirtableClient(platform.env);
	const result = await airtable.validateApiKey(apiKey);

	if (!result.valid || !result.email) {
		throw error(401, 'Invalid or expired API key');
	}

	// Check required scope if specified
	if (requiredScope && !result.scopes?.includes(requiredScope)) {
		throw error(403, `This API key does not have the required scope: ${requiredScope}`);
	}

	return {
		email: result.email,
		scopes: result.scopes || []
	};
}
