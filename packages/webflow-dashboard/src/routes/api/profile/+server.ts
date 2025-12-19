import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	try {
		const airtable = getAirtableClient(platform.env);
		const creator = await airtable.getCreatorByEmail(locals.user.email);

		if (!creator) {
			throw error(404, 'Creator profile not found');
		}

		return json({ creator });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Failed to fetch profile:', err);
		throw error(500, 'Failed to fetch profile');
	}
};

export const PATCH: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	let body: { name?: string; biography?: string; legalName?: string };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	// Validate input
	if (body.name !== undefined && (typeof body.name !== 'string' || body.name.length > 100)) {
		throw error(400, 'Name must be a string of 100 characters or less');
	}
	if (body.biography !== undefined && (typeof body.biography !== 'string' || body.biography.length > 2000)) {
		throw error(400, 'Biography must be a string of 2000 characters or less');
	}
	if (body.legalName !== undefined && (typeof body.legalName !== 'string' || body.legalName.length > 200)) {
		throw error(400, 'Legal name must be a string of 200 characters or less');
	}

	try {
		const airtable = getAirtableClient(platform.env);

		// First get the creator to find their ID
		const existingCreator = await airtable.getCreatorByEmail(locals.user.email);
		if (!existingCreator) {
			throw error(404, 'Creator profile not found');
		}

		const updatedCreator = await airtable.updateCreator(existingCreator.id, {
			name: body.name,
			biography: body.biography,
			legalName: body.legalName
		});

		if (!updatedCreator) {
			throw error(400, 'No fields to update');
		}

		return json({ creator: updatedCreator });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Failed to update profile:', err);
		throw error(500, 'Failed to update profile');
	}
};
