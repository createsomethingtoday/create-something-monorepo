/**
 * Transform Are.na blocks to CREATE SOMETHING D1 schema
 *
 * Maps ArenaBlock to Example (visual) or Resource (link/text)
 */

import type { ArenaBlock } from './types';
import type { Example, Resource } from '../../types';

/**
 * Determine if a block should become an Example (visual) or Resource (link/text)
 */
export function classifyBlock(block: ArenaBlock): 'example' | 'resource' | 'skip' {
	switch (block.class) {
		case 'Image':
		case 'Media':
			return block.image ? 'example' : 'skip';
		case 'Link':
			return 'resource';
		case 'Text':
			return block.content ? 'resource' : 'skip';
		case 'Attachment':
			return 'skip';
		default:
			return 'skip';
	}
}

/**
 * Generate a stable ID for an Arena block
 */
export function arenaBlockId(block: ArenaBlock): string {
	return `arena-${block.id}`;
}

/**
 * Extract year from Arena block (uses created_at as fallback)
 */
function extractYear(block: ArenaBlock): number {
	return new Date(block.created_at).getFullYear();
}

/**
 * Get the best display URL for an image block
 */
function getImageUrl(block: ArenaBlock): string | undefined {
	if (!block.image) return undefined;

	// Prefer display size, fall back to large, then original
	return block.image.display?.url || block.image.large?.url || block.image.original?.url;
}

/**
 * Get the source URL for a link/embed block
 */
function getSourceUrl(block: ArenaBlock): string | undefined {
	return block.source?.url || block.embed?.source_url || block.embed?.url;
}

/**
 * Transform an Arena Image/Media block to a D1 Example
 */
export function arenaBlockToExample(block: ArenaBlock, masterId: string): Example | null {
	if (classifyBlock(block) !== 'example') {
		return null;
	}

	const imageUrl = getImageUrl(block);
	if (!imageUrl) {
		return null;
	}

	return {
		id: arenaBlockId(block),
		master_id: masterId,
		title: block.title || block.generated_title || undefined,
		image_url: imageUrl,
		description: block.description || undefined,
		year: extractYear(block),
		created_at: Math.floor(new Date(block.created_at).getTime() / 1000)
	};
}

/**
 * Transform an Arena Link/Text block to a D1 Resource
 */
export function arenaBlockToResource(block: ArenaBlock, masterId?: string): Resource | null {
	if (classifyBlock(block) !== 'resource') {
		return null;
	}

	const url = getSourceUrl(block);
	const title = block.title || block.generated_title || block.source?.title;

	if (!title) {
		return null;
	}

	// Determine resource type based on block class and source
	let type: Resource['type'] = 'article';
	if (block.class === 'Text') {
		type = 'article';
	} else if (block.embed?.type === 'video') {
		type = 'video';
	} else if (url?.includes('youtube.com') || url?.includes('vimeo.com')) {
		type = 'video';
	}

	return {
		id: arenaBlockId(block),
		master_id: masterId,
		title,
		type,
		url: url || undefined,
		description: block.description || block.content || undefined,
		year: extractYear(block),
		featured: 0,
		created_at: Math.floor(new Date(block.created_at).getTime() / 1000)
	};
}

/**
 * Process a batch of Arena blocks and separate into examples/resources
 */
export function transformBlocks(
	blocks: ArenaBlock[],
	masterId: string
): { examples: Example[]; resources: Resource[] } {
	const examples: Example[] = [];
	const resources: Resource[] = [];

	for (const block of blocks) {
		const classification = classifyBlock(block);

		if (classification === 'example') {
			const example = arenaBlockToExample(block, masterId);
			if (example) {
				examples.push(example);
			}
		} else if (classification === 'resource') {
			const resource = arenaBlockToResource(block, masterId);
			if (resource) {
				resources.push(resource);
			}
		}
	}

	return { examples, resources };
}

/**
 * Generate sync statistics
 */
export interface TransformStats {
	totalBlocks: number;
	images: number;
	links: number;
	texts: number;
	skipped: number;
}

export function getTransformStats(blocks: ArenaBlock[]): TransformStats {
	const stats: TransformStats = {
		totalBlocks: blocks.length,
		images: 0,
		links: 0,
		texts: 0,
		skipped: 0
	};

	for (const block of blocks) {
		const classification = classifyBlock(block);
		if (classification === 'example') {
			stats.images++;
		} else if (classification === 'resource' && block.class === 'Link') {
			stats.links++;
		} else if (classification === 'resource' && block.class === 'Text') {
			stats.texts++;
		} else {
			stats.skipped++;
		}
	}

	return stats;
}
