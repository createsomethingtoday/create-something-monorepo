/**
 * Are.na Sync API
 *
 * Syncs blocks from Are.na channels to D1 examples/resources tables.
 * GET: Trigger sync for configured channels
 * POST: Trigger sync with custom channel list
 *
 * Human-curated taste → structured canon.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	ArenaClient,
	transformBlocks,
	getTransformStats,
	type ArenaSyncResult
} from '$lib/integrations/arena';
import type { Example, Resource } from '$lib/types';

// Default channels to sync (external high-quality sources)
const DEFAULT_CHANNELS = [
	'people-dieter-rams',
	'examples-swiss-design',
	'motion-minimal-simple',
	'brutalist-x-web-design',
	'interfaces-motion',
	'minimal-modern-web'
];

// Default master ID for synced examples (create a "Canon" master if needed)
const DEFAULT_MASTER_ID = 'arena-taste';

async function upsertExample(db: D1Database, example: Example): Promise<'created' | 'updated'> {
	const existing = await db
		.prepare('SELECT id FROM examples WHERE id = ?')
		.bind(example.id)
		.first();

	if (existing) {
		await db
			.prepare(
				`UPDATE examples SET
				 title = ?, image_url = ?, description = ?, year = ?,
				 master_id = ?
				 WHERE id = ?`
			)
			.bind(
				example.title ?? null,
				example.image_url ?? null,
				example.description ?? null,
				example.year ?? null,
				example.master_id,
				example.id
			)
			.run();
		return 'updated';
	}

	await db
		.prepare(
			`INSERT INTO examples (id, master_id, title, image_url, description, year, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			example.id,
			example.master_id,
			example.title ?? null,
			example.image_url ?? null,
			example.description ?? null,
			example.year ?? null,
			example.created_at
		)
		.run();
	return 'created';
}

async function upsertResource(db: D1Database, resource: Resource): Promise<'created' | 'updated'> {
	const existing = await db
		.prepare('SELECT id FROM resources WHERE id = ?')
		.bind(resource.id)
		.first();

	if (existing) {
		await db
			.prepare(
				`UPDATE resources SET
				 title = ?, type = ?, url = ?, description = ?,
				 year = ?, master_id = ?
				 WHERE id = ?`
			)
			.bind(
				resource.title,
				resource.type ?? null,
				resource.url ?? null,
				resource.description ?? null,
				resource.year ?? null,
				resource.master_id ?? null,
				resource.id
			)
			.run();
		return 'updated';
	}

	await db
		.prepare(
			`INSERT INTO resources (id, master_id, title, type, url, description, year, featured, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			resource.id,
			resource.master_id ?? null,
			resource.title,
			resource.type ?? null,
			resource.url ?? null,
			resource.description ?? null,
			resource.year ?? null,
			resource.featured,
			resource.created_at
		)
		.run();
	return 'created';
}

async function syncChannel(
	db: D1Database,
	client: ArenaClient,
	channelSlug: string,
	masterId: string
): Promise<ArenaSyncResult> {
	const result: ArenaSyncResult = {
		channel: channelSlug,
		blocksProcessed: 0,
		examplesCreated: 0,
		examplesUpdated: 0,
		resourcesCreated: 0,
		resourcesUpdated: 0,
		errors: []
	};

	try {
		const blocks = await client.getAllChannelBlocks(channelSlug);
		result.blocksProcessed = blocks.length;

		const { examples, resources } = transformBlocks(blocks, masterId);

		for (const example of examples) {
			try {
				const action = await upsertExample(db, example);
				if (action === 'created') {
					result.examplesCreated++;
				} else {
					result.examplesUpdated++;
				}
			} catch (e) {
				result.errors.push(`Example ${example.id}: ${(e as Error).message}`);
			}
		}

		for (const resource of resources) {
			try {
				const action = await upsertResource(db, resource);
				if (action === 'created') {
					result.resourcesCreated++;
				} else {
					result.resourcesUpdated++;
				}
			} catch (e) {
				result.errors.push(`Resource ${resource.id}: ${(e as Error).message}`);
			}
		}
	} catch (e) {
		result.errors.push(`Channel fetch failed: ${(e as Error).message}`);
	}

	return result;
}

export const GET: RequestHandler = async ({ platform, url }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	// Allow channel override via query param
	const channelParam = url.searchParams.get('channel');
	const channels = channelParam ? [channelParam] : DEFAULT_CHANNELS;
	const masterId = url.searchParams.get('master') ?? DEFAULT_MASTER_ID;

	// Create client (uses CACHE KV if available)
	const client = new ArenaClient({
		cache: platform?.env?.CACHE,
		accessToken: platform?.env?.ARENA_API_TOKEN
	});

	const results: ArenaSyncResult[] = [];
	const startTime = Date.now();

	for (const channel of channels) {
		const result = await syncChannel(db, client, channel, masterId);
		results.push(result);
	}

	const totalStats = results.reduce(
		(acc, r) => ({
			blocksProcessed: acc.blocksProcessed + r.blocksProcessed,
			examplesCreated: acc.examplesCreated + r.examplesCreated,
			examplesUpdated: acc.examplesUpdated + r.examplesUpdated,
			resourcesCreated: acc.resourcesCreated + r.resourcesCreated,
			resourcesUpdated: acc.resourcesUpdated + r.resourcesUpdated,
			errors: [...acc.errors, ...r.errors]
		}),
		{
			blocksProcessed: 0,
			examplesCreated: 0,
			examplesUpdated: 0,
			resourcesCreated: 0,
			resourcesUpdated: 0,
			errors: [] as string[]
		}
	);

	return json({
		success: true,
		duration: Date.now() - startTime,
		channels: channels.length,
		...totalStats,
		details: results
	});
};

export const POST: RequestHandler = async ({ platform, request }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		channels?: string[];
		master?: string;
	};
	const channels: string[] = body.channels ?? DEFAULT_CHANNELS;
	const masterId: string = body.master ?? DEFAULT_MASTER_ID;

	if (!Array.isArray(channels) || channels.length === 0) {
		return json({ error: 'Invalid channels array' }, { status: 400 });
	}

	const client = new ArenaClient({
		cache: platform?.env?.CACHE,
		accessToken: platform?.env?.ARENA_API_TOKEN
	});

	const results: ArenaSyncResult[] = [];
	const startTime = Date.now();

	for (const channel of channels) {
		const result = await syncChannel(db, client, channel, masterId);
		results.push(result);
	}

	return json({
		success: true,
		duration: Date.now() - startTime,
		results
	});
};
