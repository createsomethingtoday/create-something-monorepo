/**
 * Are.na Channel Management API
 *
 * PUT: Update channel settings (open for collaboration, etc.)
 *
 * Requires authentication via ARENA_API_TOKEN.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ArenaClient } from '$lib/integrations/arena';

// CREATE SOMETHING channels we can manage
const MANAGED_CHANNELS = [
	'canon-minimalism',
	'motion-language-4hbfmugttwe',
	'claude-code-puz_2pgfxky'
];

interface UpdateChannelRequest {
	slug: string;
	title?: string;
	status?: 'public' | 'closed' | 'private';
	description?: string;
}

export const PUT: RequestHandler = async ({ request, platform }) => {
	const accessToken = platform?.env?.ARENA_API_TOKEN;

	if (!accessToken) {
		return json(
			{ error: 'Are.na API token not configured' },
			{ status: 500 }
		);
	}

	let body: UpdateChannelRequest;
	try {
		body = await request.json();
	} catch {
		return json(
			{ error: 'Invalid JSON' },
			{ status: 400 }
		);
	}

	if (!body.slug) {
		return json(
			{ error: 'Missing slug', managedChannels: MANAGED_CHANNELS },
			{ status: 400 }
		);
	}

	if (!MANAGED_CHANNELS.includes(body.slug)) {
		return json(
			{
				error: 'Channel not managed',
				message: `Channel must be one of: ${MANAGED_CHANNELS.join(', ')}`,
				managedChannels: MANAGED_CHANNELS
			},
			{ status: 400 }
		);
	}

	const client = new ArenaClient({
		cache: platform?.env?.CACHE,
		accessToken
	});

	try {
		const updates: { title?: string; status?: 'public' | 'closed' | 'private'; description?: string } = {};
		if (body.title) updates.title = body.title;
		if (body.status) updates.status = body.status;
		if (body.description) updates.description = body.description;

		if (Object.keys(updates).length === 0) {
			return json(
				{ error: 'No updates provided', hint: 'Provide title and/or status' },
				{ status: 400 }
			);
		}

		const channel = await client.updateChannel(body.slug, updates);

		return json({
			success: true,
			channel: {
				id: channel.id,
				slug: channel.slug,
				title: channel.title,
				status: channel.status,
				url: `https://www.are.na/create-something/${channel.slug}`
			}
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';

		if (message.includes('401') || message.includes('403')) {
			return json(
				{ error: 'Authentication failed', message: 'Are.na API token is invalid' },
				{ status: 401 }
			);
		}

		return json(
			{ error: 'Channel update failed', message },
			{ status: 500 }
		);
	}
};

/**
 * GET: List managed channels with their current status
 */
export const GET: RequestHandler = async ({ platform }) => {
	const accessToken = platform?.env?.ARENA_API_TOKEN;

	const client = new ArenaClient({
		cache: platform?.env?.CACHE,
		accessToken
	});

	const channels = await Promise.all(
		MANAGED_CHANNELS.map(async (slug) => {
			try {
				const channel = await client.getChannel(slug);
				return {
					slug,
					title: channel.title,
					status: channel.status,
					length: channel.length,
					url: `https://www.are.na/create-something/${slug}`
				};
			} catch {
				return {
					slug,
					error: 'Failed to fetch',
					url: `https://www.are.na/create-something/${slug}`
				};
			}
		})
	);

	return json({
		managedChannels: channels,
		hasToken: !!accessToken
	});
};
