/**
 * Are.na Integration
 *
 * Human-curated taste references synced to D1.
 * The tool recedes; the taste remains.
 */

export { ArenaClient, createArenaClient, type ArenaClientOptions } from './client';

export {
	classifyBlock,
	arenaBlockId,
	arenaBlockToExample,
	arenaBlockToResource,
	transformBlocks,
	getTransformStats,
	type TransformStats
} from './transform';

export type {
	ArenaBlock,
	ArenaChannel,
	ArenaChannelRef,
	ArenaChannelContentsResponse,
	ArenaImage,
	ArenaSearchResponse,
	ArenaSource,
	ArenaUser,
	ArenaSyncConfig,
	ArenaSyncResult
} from './types';
