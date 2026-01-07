import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * GET /api/routing/experiments
 *
 * Returns routing experiment data from .beads/routing-experiments.jsonl
 * Simple read operation - Haiku task (trivial complexity)
 */
export const GET: RequestHandler = async () => {
	try {
		const experimentsPath = join(process.cwd(), '.beads', 'routing-experiments.jsonl');
		const content = readFileSync(experimentsPath, 'utf-8');

		const experiments = content
			.trim()
			.split('\n')
			.filter(line => line.length > 0)
			.map(line => JSON.parse(line));

		return json({
			success: true,
			data: experiments,
			count: experiments.length
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: 'Failed to read experiments',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
