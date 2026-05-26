import { json, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Airtable from 'airtable';

// Airtable table ID for Creators (matches original Next.js dashboard)
const CREATORS_TABLE = 'tbljt0plqxdMARZXb';

// No-cache headers for API responses
const noCacheHeaders = {
	'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
	'Pragma': 'no-cache',
	'Expires': '0'
};

/**
 * Shared helper: create Airtable base and query creator by email.
 * Matches the original Next.js dashboard pattern exactly —
 * one base instance, one query function, errors propagate naturally.
 */
function getBase(env: { AIRTABLE_API_KEY: string; AIRTABLE_BASE_ID: string }) {
	return new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(env.AIRTABLE_BASE_ID);
}

function normalizeOptionalUrl(value: string | null): string {
	if (value === null) return '';

	const trimmed = value.trim();
	if (!trimmed) return '';

	try {
		const url = new URL(trimmed);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			throw new Error('Invalid URL protocol');
		}
		return trimmed;
	} catch {
		throw error(400, 'Personal website URL is invalid');
	}
}

async function getRecordsByEmail(base: ReturnType<typeof getBase>, email: string) {
	const formula = `OR(FIND("${email}", ARRAYJOIN({📧Email}, ",")) > 0, FIND("${email}", ARRAYJOIN({📧WF Account Email}, ",")) > 0, FIND("${email}", ARRAYJOIN({📧Emails}, ",")) > 0)`;
	const records = await base(CREATORS_TABLE)
		.select({ filterByFormula: formula })
		.firstPage();
	return records;
}

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

		const base = getBase(platform.env as { AIRTABLE_API_KEY: string; AIRTABLE_BASE_ID: string });
		const records = await getRecordsByEmail(base, email);

		if (records.length === 0) {
			return json(
				{ error: 'Profile not found', details: `No creator found for email: ${email}` },
				{ status: 404, headers: noCacheHeaders }
			);
		}

		const record = records[0];

		return json(
			{
				id: record.id,
				name: (record.fields['Name'] as string) || '',
				email: email,
				avatarUrl: (record.fields['🖼️Avatar (Primary)'] as { url: string }[] | undefined)?.[0]?.url,
				biography: record.fields['ℹ️Biography'] as string,
				legalName: record.fields['ℹ️Legal Name'] as string,
				websiteUrl: (record.fields['🔗Personal Site'] as string) || ''
			},
			{ headers: noCacheHeaders }
		);
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
	avatarUrl?: string | null;
	websiteUrl?: string | null;
}

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
		const data = (await request.json()) as ProfileUpdateData;

		const base = getBase(platform.env as { AIRTABLE_API_KEY: string; AIRTABLE_BASE_ID: string });

		// Step 1: Find creator (same query as GET — errors propagate, not swallowed)
		const records = await getRecordsByEmail(base, email);

		if (!records || records.length === 0) {
			throw error(404, 'Profile not found');
		}

		const recordId = records[0].id;

		// Step 2: Build Airtable fields directly (matches original Next.js approach)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const fields: Record<string, any> = {};

		if (data.name !== undefined) fields['Name'] = data.name;
		if (data.biography !== undefined) fields['ℹ️Biography'] = data.biography;
		if (data.legalName !== undefined) fields['ℹ️Legal Name'] = data.legalName;
		if (data.websiteUrl !== undefined) fields['🔗Personal Site'] = normalizeOptionalUrl(data.websiteUrl);
		// Avatar: use field ID (fldyddTon9Lu8BR8G) to match original dashboard exactly
		if (data.avatarUrl !== undefined) {
			fields['fldyddTon9Lu8BR8G'] = data.avatarUrl ? [{ url: data.avatarUrl }] : [];
		}

		if (Object.keys(fields).length === 0) {
			throw error(400, 'No fields to update');
		}

		// Step 3: Update directly (matches original — one call, errors propagate)
		const updatedRecords = await base(CREATORS_TABLE).update([
			{ id: recordId, fields }
		]);

		if (!updatedRecords || updatedRecords.length === 0) {
			throw error(500, 'Failed to update record in Airtable');
		}

		const updated = updatedRecords[0];
		return json(
			{
				id: updated.id,
				name: (updated.fields['Name'] as string) || '',
				email: email,
				avatarUrl: (updated.fields['🖼️Avatar (Primary)'] as { url: string }[] | undefined)?.[0]?.url,
				biography: updated.fields['ℹ️Biography'] as string,
				legalName: updated.fields['ℹ️Legal Name'] as string,
				websiteUrl: (updated.fields['🔗Personal Site'] as string) || ''
			},
			{ headers: noCacheHeaders }
		);
	} catch (err) {
		if (isHttpError(err)) {
			throw err;
		}
		console.error('[ProfileAPI] PATCH: Unexpected error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		throw error(500, errorMessage);
	}
};
