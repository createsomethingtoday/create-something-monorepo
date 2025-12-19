import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const airtable = getAirtableClient(platform?.env);
	const creator = await airtable.getCreatorByEmail(locals.user.email);

	if (!creator) {
		throw error(404, 'Profile not found');
	}

	return json({
		id: creator.id,
		name: creator.name,
		email: locals.user.email,
		avatarUrl: creator.avatarUrl,
		biography: creator.biography,
		legalName: creator.legalName
	});
};

interface ProfileUpdateData {
	name?: string;
	biography?: string;
	legalName?: string;
}

export const PATCH: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const data = (await request.json()) as ProfileUpdateData;
	const airtable = getAirtableClient(platform?.env);

	// Get creator first to verify they exist and get their ID
	const creator = await airtable.getCreatorByEmail(locals.user.email);
	if (!creator) {
		throw error(404, 'Profile not found');
	}

	// Update profile
	const updated = await airtable.updateCreator(creator.id, {
		name: data.name,
		biography: data.biography,
		legalName: data.legalName
	});

	if (!updated) {
		throw error(500, 'Failed to update profile');
	}

	return json({
		id: updated.id,
		name: updated.name,
		email: locals.user.email,
		avatarUrl: updated.avatarUrl,
		biography: updated.biography,
		legalName: updated.legalName
	});
};
