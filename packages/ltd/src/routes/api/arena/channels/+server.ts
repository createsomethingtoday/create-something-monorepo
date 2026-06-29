/**
 * Are.na Channel Management API
 *
 * PUT: Update channel settings (open for collaboration, etc.).
 *
 * Paused for production. Channel settings are managed directly in Are.na.
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

export const PUT: RequestHandler = async () => {
	return json(
		{
			error: 'Are.na channel writes paused',
			message:
				'Manage channel settings directly in Are.na. CREATE SOMETHING only reads channel state.'
		},
		{ status: 410 }
	);
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
