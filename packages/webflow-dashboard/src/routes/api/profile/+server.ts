import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ locals, platform }) => {
	try {
		// Check authentication
		if (!locals.user?.email) {
			console.error('[Profile API] No user email in locals');
			throw error(401, 'Unauthorized');
		}

		console.log('[Profile API] Fetching profile for:', locals.user.email);

		// Verify environment variables
		if (!platform?.env?.AIRTABLE_API_KEY || !platform?.env?.AIRTABLE_BASE_ID) {
			console.error('[Profile API] Missing Airtable env vars:', {
				hasApiKey: !!platform?.env?.AIRTABLE_API_KEY,
				hasBaseId: !!platform?.env?.AIRTABLE_BASE_ID
			});
			throw error(500, 'Server configuration error');
		}

		const airtable = getAirtableClient(platform.env);
		const creator = await airtable.getCreatorByEmail(locals.user.email);

		if (!creator) {
			console.error('[Profile API] Creator not found for:', locals.user.email);
			throw error(404, 'Profile not found');
		}

		console.log('[Profile API] Successfully fetched profile for:', locals.user.email);
		
		return json({
			id: creator.id,
			name: creator.name,
			email: locals.user.email,
			avatarUrl: creator.avatarUrl,
			biography: creator.biography,
			legalName: creator.legalName
		});
	} catch (err) {
		console.error('[Profile API] Error:', err);
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, 'Internal server error');
	}
};

interface ProfileUpdateData {
	name?: string;
	biography?: string;
	legalName?: string;
}

export const PATCH: RequestHandler = async ({ request, locals, platform }) => {
	try {
		// Check authentication
		if (!locals.user?.email) {
			console.error('[Profile API PATCH] No user email in locals');
			throw error(401, 'Unauthorized');
		}

		console.log('[Profile API PATCH] Updating profile for:', locals.user.email);

		// Verify environment variables
		if (!platform?.env?.AIRTABLE_API_KEY || !platform?.env?.AIRTABLE_BASE_ID) {
			console.error('[Profile API PATCH] Missing Airtable env vars');
			throw error(500, 'Server configuration error');
		}

		const data = (await request.json()) as ProfileUpdateData;
		const airtable = getAirtableClient(platform.env);

		// Get creator first to verify they exist and get their ID
		const creator = await airtable.getCreatorByEmail(locals.user.email);
		if (!creator) {
			console.error('[Profile API PATCH] Creator not found for:', locals.user.email);
			throw error(404, 'Profile not found');
		}

		// Update profile
		const updated = await airtable.updateCreator(creator.id, {
			name: data.name,
			biography: data.biography,
			legalName: data.legalName
		});

		if (!updated) {
			console.error('[Profile API PATCH] Failed to update creator:', creator.id);
			throw error(500, 'Failed to update profile');
		}

		console.log('[Profile API PATCH] Successfully updated profile for:', locals.user.email);

		return json({
			id: updated.id,
			name: updated.name,
			email: locals.user.email,
			avatarUrl: updated.avatarUrl,
			biography: updated.biography,
			legalName: updated.legalName
		});
	} catch (err) {
		console.error('[Profile API PATCH] Error:', err);
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, 'Internal server error');
	}
};
