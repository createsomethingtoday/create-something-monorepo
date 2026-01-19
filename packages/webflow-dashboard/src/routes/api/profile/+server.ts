import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Airtable from 'airtable';
import { getAirtableClient } from '$lib/server/airtable';
import { createLogger } from '@create-something/components/utils';

const logger = createLogger('ProfileAPI');

// Helper to add no-cache headers to API responses
const noCacheHeaders = {
	'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
	'Pragma': 'no-cache',
	'Expires': '0'
};

export const GET: RequestHandler = async ({ locals, platform }) => {
	try {
		// Check authentication
		if (!locals.user?.email) {
			logger.warn('No user email in locals');
			return json(
				{ error: 'Unauthorized', details: 'No user email' },
				{ status: 401, headers: noCacheHeaders }
			);
		}

		const email = locals.user.email;
		logger.debug('Fetching profile', { email });

		// Verify environment variables
		if (!platform?.env?.AIRTABLE_API_KEY || !platform?.env?.AIRTABLE_BASE_ID) {
			return json(
				{ error: 'Server configuration error', details: 'Missing Airtable credentials' },
				{ status: 500, headers: noCacheHeaders }
			);
		}

		// Direct Airtable query (same as working debug endpoint)
		const base = new Airtable({ apiKey: platform.env.AIRTABLE_API_KEY }).base(platform.env.AIRTABLE_BASE_ID);
		const formula = `OR(FIND("${email}", ARRAYJOIN({📧Email}, ",")) > 0, FIND("${email}", ARRAYJOIN({📧WF Account Email}, ",")) > 0, FIND("${email}", ARRAYJOIN({📧Emails}, ",")) > 0)`;
		
		const records = await base('tbljt0plqxdMARZXb')
			.select({ filterByFormula: formula })
			.firstPage();

		if (records.length === 0) {
			logger.warn('Creator not found', { email });
			return json(
				{ error: 'Profile not found', details: `No creator found for email: ${email}` },
				{ status: 404, headers: noCacheHeaders }
			);
		}

		const record = records[0];
		logger.info('Profile fetched successfully', { email });

		return json(
			{
				id: record.id,
				name: (record.fields['Name'] as string) || '',
				email: email,
				avatarUrl: (record.fields['🖼️Avatar (Primary)'] as { url: string }[] | undefined)?.[0]?.url,
				biography: record.fields['ℹ️Biography'] as string,
				legalName: record.fields['ℹ️Legal Name'] as string
			},
			{ headers: noCacheHeaders }
		);
	} catch (err) {
		logger.error('Unexpected error fetching profile', { error: err });
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';

		return json(
			{ error: 'Internal server error', message: errorMessage },
			{ status: 500, headers: noCacheHeaders }
		);
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
			logger.warn('PATCH: No user email in locals');
			throw error(401, 'Unauthorized');
		}

		logger.debug('Updating profile', { email: locals.user.email });

		// Verify environment variables
		if (!platform?.env?.AIRTABLE_API_KEY || !platform?.env?.AIRTABLE_BASE_ID) {
			logger.error('PATCH: Missing Airtable env vars');
			throw error(500, 'Server configuration error');
		}

		const data = (await request.json()) as ProfileUpdateData;
		const airtable = getAirtableClient(platform.env);

		// Get creator first to verify they exist and get their ID
		const creator = await airtable.getCreatorByEmail(locals.user.email);
		if (!creator) {
			logger.warn('PATCH: Creator not found', { email: locals.user.email });
			throw error(404, 'Profile not found');
		}

		// Update profile
		const updated = await airtable.updateCreator(creator.id, {
			name: data.name,
			biography: data.biography,
			legalName: data.legalName
		});

		if (!updated) {
			logger.error('PATCH: Failed to update creator', { creatorId: creator.id });
			throw error(500, 'Failed to update profile');
		}

		logger.info('Profile updated successfully', { email: locals.user.email });

		return json(
			{
				id: updated.id,
				name: updated.name,
				email: locals.user.email,
				avatarUrl: updated.avatarUrl,
				biography: updated.biography,
				legalName: updated.legalName
			},
			{ headers: noCacheHeaders }
		);
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		logger.error('PATCH: Unexpected error', { error: err });
		throw error(500, 'Internal server error');
	}
};
