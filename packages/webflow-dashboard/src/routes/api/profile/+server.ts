import { json, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '@create-something/webflow-dashboard-core/airtable';
import {
	normalizeOptionalHttpUrl,
	normalizeOptionalTrimmedString
} from '@create-something/webflow-dashboard-core/forms';

// No-cache headers for API responses
const noCacheHeaders = {
	'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
	'Pragma': 'no-cache',
	'Expires': '0'
};

export const GET: RequestHandler = async ({ locals, platform }) => {
	try {
		if (!locals.user?.email) {
			return json(
				{ error: 'Unauthorized', details: 'No user email' },
				{ status: 401, headers: noCacheHeaders }
			);
		}

		const email = locals.user.email;

		if (!platform?.env?.AIRTABLE_API_KEY || !platform?.env?.AIRTABLE_BASE_ID) {
			return json(
				{ error: 'Server configuration error', details: 'Missing Airtable credentials' },
				{ status: 500, headers: noCacheHeaders }
			);
		}

		const airtable = getAirtableClient(platform.env);
		const creator = await airtable.getCreatorByEmail(email);

		if (!creator) {
			return json(
				{ error: 'Profile not found', details: `No creator found for email: ${email}` },
				{ status: 404, headers: noCacheHeaders }
			);
		}

		return json(creator, { headers: noCacheHeaders });
	} catch (err) {
		console.error('[ProfileAPI] GET error:', err);
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
	websiteUrl?: string;
	avatarUrl?: string | null;
}

type ProfileUpdatePayload = {
	name?: string;
	biography?: string;
	legalName?: string;
	websiteUrl?: string;
	avatarUrl?: string;
};

/**
 * PATCH /api/profile
 *
 * Matches the original Next.js dashboard logic exactly:
 * 1. Query Airtable for creator by email (same function as GET)
 * 2. Build fields object directly
 * 3. Update the record in one call
 * Errors propagate naturally — no silent swallowing.
 */
export const PATCH: RequestHandler = async ({ request, locals, platform }) => {
	try {
		if (!locals.user?.email) {
			throw error(401, 'Unauthorized');
		}

		if (!platform?.env?.AIRTABLE_API_KEY || !platform?.env?.AIRTABLE_BASE_ID) {
			throw error(500, 'Server configuration error');
		}

		const email = locals.user.email;
		const data = (await request.json().catch(() => ({}))) as ProfileUpdateData;
		let payload: ProfileUpdatePayload;
		try {
			payload = {
				name: normalizeOptionalTrimmedString(data.name, 'Name'),
				biography: normalizeOptionalTrimmedString(data.biography, 'Biography'),
				legalName: normalizeOptionalTrimmedString(data.legalName, 'Legal name'),
				websiteUrl: normalizeOptionalHttpUrl(data.websiteUrl, 'Personal website URL'),
				avatarUrl:
					data.avatarUrl === undefined
						? undefined
						: data.avatarUrl === null
							? ''
							: normalizeOptionalHttpUrl(data.avatarUrl, 'Avatar URL') || ''
			};
		} catch (validationError) {
			throw error(
				400,
				validationError instanceof Error ? validationError.message : 'Profile payload is invalid.'
			);
		}

		if (Object.values(payload).every((value) => value === undefined)) {
			throw error(400, 'No fields to update');
		}

		const airtable = getAirtableClient(platform.env);
		const creator = await airtable.getCreatorByEmail(email);
		if (!creator) {
			throw error(404, 'Profile not found');
		}

		const updated = await airtable.updateCreator(creator.id, payload);
		if (!updated) {
			throw error(500, 'Failed to update profile');
		}
		updated.email = email;

		return json(updated, { headers: noCacheHeaders });
	} catch (err) {
		if (isHttpError(err)) {
			throw err;
		}
		console.error('[ProfileAPI] PATCH: Unexpected error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		throw error(500, errorMessage);
	}
};
