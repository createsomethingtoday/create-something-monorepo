import { error } from '@sveltejs/kit';
import { getAirtableClient } from './airtable';

type AirtableEnv = Parameters<typeof getAirtableClient>[0];

export async function getHasTemplateAsset(
	email: string | undefined,
	env: AirtableEnv | undefined
): Promise<boolean> {
	if (!email) {
		return false;
	}

	if (!env) {
		throw new Error('Airtable runtime env not available');
	}

	const airtable = getAirtableClient(env);
	return airtable.hasTemplateAssetByEmail(email);
}

export async function requireTemplateAssetAccess(
	email: string | undefined,
	env: AirtableEnv | undefined
): Promise<void> {
	if (!email) {
		throw error(401, 'Unauthorized');
	}

	let hasTemplateAsset = false;

	try {
		hasTemplateAsset = await getHasTemplateAsset(email, env);
	} catch (err) {
		console.error('Error checking template asset access:', err);
		throw error(503, 'Unable to verify marketplace access');
	}

	if (!hasTemplateAsset) {
		throw error(403, 'Marketplace insights require at least one template asset');
	}
}
