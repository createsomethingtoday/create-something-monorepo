/**
 * Are.na Block Creation API
 *
 * POST: Create and contribute blocks to Are.na channels
 *
 * Requires authentication via ARENA_API_TOKEN.
 * Enables CREATE SOMETHING contributors to add taste references.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ArenaClient } from '$lib/integrations/arena';

// Allowed channels for contribution (CREATE SOMETHING curated)
const ALLOWED_CHANNELS = [
	'canon-minimalism',
	'motion-language-4hbfmugttwe',
	'claude-code-puz_2pgfxky'
];

interface CreateBlockRequest {
	channel: string;
	source?: string; // URL for images, links, embeds
	content?: string; // Text content (markdown)
	title?: string;
	description?: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const accessToken = platform?.env?.ARENA_API_TOKEN;

	if (!accessToken) {
		return json(
			{
				error: 'Are.na API token not configured',
				message: 'Server configuration missing'
			},
			{ status: 500 }
		);
	}

	let body: CreateBlockRequest;
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
				allowedChannels: ALLOWED_CHANNELS
			},
			{ status: 400 }
		);
	}

	if (!ALLOWED_CHANNELS.includes(body.channel)) {
		return json(
			{
				error: 'Invalid channel',
				message: `Channel must be one of: ${ALLOWED_CHANNELS.join(', ')}`,
				allowedChannels: ALLOWED_CHANNELS
			},
			{ status: 400 }
		);
	}

	// Validate block content
	if (!body.source && !body.content) {
		return json(
			{
				error: 'Missing content',
				message: 'Either source (URL) or content (text) is required'
			},
			{ status: 400 }
		);
	}

	if (body.source && body.content) {
		return json(
			{
				error: 'Conflicting content',
				message: 'Cannot specify both source and content - choose one'
			},
			{ status: 400 }
		);
	}

	// Validate URL format if source provided
	if (body.source) {
		try {
			new URL(body.source);
		} catch {
			return json(
				{
					error: 'Invalid source URL',
					message: 'source must be a valid URL'
				},
				{ status: 400 }
			);
		}
	}

	// Create client and block
	const client = new ArenaClient({
		cache: platform?.env?.CACHE,
		accessToken
	});

	try {
		const block = await client.createBlock(body.channel, {
			source: body.source,
			content: body.content,
			title: body.title,
			description: body.description
		});

		return json(
			{
				success: true,
				block: {
					id: block.id,
					title: block.title,
					class: block.class,
					created_at: block.created_at,
					url: `https://www.are.na/block/${block.id}`
				},
				channel: body.channel
			},
			{ status: 201 }
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';

		// Check for authentication errors
		if (message.includes('401') || message.includes('403')) {
			return json(
				{
					error: 'Authentication failed',
					message: 'Are.na API token is invalid or expired'
				},
				{ status: 401 }
			);
		}

		// Check for rate limiting
		if (message.includes('429')) {
			return json(
				{
					error: 'Rate limit exceeded',
					message: 'Too many requests to Are.na API'
				},
				{ status: 429 }
			);
		}

		// Generic error
		return json(
			{
				error: 'Block creation failed',
				message
			},
			{ status: 500 }
		);
	}
};
