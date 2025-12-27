/**
 * Are.na Block Connection API
 *
 * POST: Connect an existing Are.na block to a managed channel
 *
 * This enables curation of existing Are.na content rather than
 * only creating new blocks. Essential for the hermeneutic flow:
 * discover → curate → connect → sync.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ArenaClient } from '$lib/integrations/arena';

// Channels that accept curated connections
const CURATED_CHANNELS = [
	'canon-minimalism',
	'motion-language-4hbfmugttwe',
	'claude-code-puz_2pgfxky'
];

interface ConnectBlockRequest {
	channel: string;
	blockId: number;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	// Check env var first, then fall back to KV-stored OAuth token
	let accessToken = platform?.env?.ARENA_API_TOKEN;
	if (!accessToken && platform?.env?.CACHE) {
		accessToken = (await platform.env.CACHE.get('arena:access_token')) ?? undefined;
	}

	if (!accessToken) {
		return json(
			{
				error: 'Are.na API token not configured',
				message: 'Server configuration missing. Complete OAuth flow at /api/arena/authorize'
			},
			{ status: 500 }
		);
	}

	let body: ConnectBlockRequest;
	try {
		body = await request.json();
	} catch {
		return json(
			{
				error: 'Invalid JSON',
				message: 'Request body must be valid JSON'
			},
			{ status: 400 }
		);
	}

	// Validate channel
	if (!body.channel) {
		return json(
			{
				error: 'Missing channel',
				message: 'channel field is required',
				allowedChannels: CURATED_CHANNELS
			},
			{ status: 400 }
		);
	}

	if (!CURATED_CHANNELS.includes(body.channel)) {
		return json(
			{
				error: 'Invalid channel',
				message: `Channel must be one of: ${CURATED_CHANNELS.join(', ')}`,
				allowedChannels: CURATED_CHANNELS
			},
			{ status: 400 }
		);
	}

	// Validate block ID
	if (!body.blockId || typeof body.blockId !== 'number') {
		return json(
			{
				error: 'Missing or invalid blockId',
				message: 'blockId must be a number (Are.na block ID)'
			},
			{ status: 400 }
		);
	}

	const client = new ArenaClient({
		cache: platform?.env?.CACHE,
		accessToken
	});

	try {
		const block = await client.connectBlock(body.channel, body.blockId);

		return json(
			{
				success: true,
				message: 'Block connected to channel',
				block: {
					id: block.id,
					title: block.title,
					class: block.class,
					url: `https://www.are.na/block/${block.id}`
				},
				channel: body.channel
			},
			{ status: 200 }
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';

		if (message.includes('401') || message.includes('403')) {
			return json(
				{
					error: 'Authentication failed',
					message: 'Are.na API token is invalid or expired'
				},
				{ status: 401 }
			);
		}

		if (message.includes('404')) {
			return json(
				{
					error: 'Block not found',
					message: `Block ${body.blockId} does not exist on Are.na`
				},
				{ status: 404 }
			);
		}

		return json(
			{
				error: 'Connection failed',
				message
			},
			{ status: 500 }
		);
	}
};
