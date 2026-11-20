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
import { ArenaClient } from '$lib/integrations/arena';
import type { ArenaSyncResult } from '$lib/integrations/arena';
import { syncArenaChannel } from '$lib/taste/provenance';

// CREATE SOMETHING curated channels (primary sources)
const CS_CHANNELS = [
  'canon-minimalism',
  'motion-language-4hbfmugttwe',
  'claude-code-puz_2pgfxky',
  'architectural-dwelling'
];

// External high-quality channels (secondary sources)
const EXTERNAL_CHANNELS = [
  'people-dieter-rams',
  'examples-swiss-design',
  'interfaces-motion',
  'minimal-modern-web',
  'clean-mymjklzsah4',
  'minimalism-cpx4fblmr3i'
];

// Default: sync our channels first, then external
const DEFAULT_CHANNELS = [...CS_CHANNELS, ...EXTERNAL_CHANNELS];

// Default master ID for synced examples (create a "Canon" master if needed)
const DEFAULT_MASTER_ID = 'arena-taste';

export const GET: RequestHandler = async ({ platform, url }) => {
  const db = platform?.env?.DB;

  if (!db) {
    return json({ error: 'Database not available' }, { status: 500 });
  }

  // Allow channel override via query param
  const channelParam = url.searchParams.get('channel');
  const channels = channelParam ? [channelParam] : DEFAULT_CHANNELS;
  const masterId = url.searchParams.get('master') ?? DEFAULT_MASTER_ID;

  // Fetch upstream directly: a sync must verify access rather than reuse cached channel contents.
  const client = new ArenaClient({
    accessToken: platform?.env?.ARENA_API_TOKEN
  });

  const results: ArenaSyncResult[] = [];
  const startTime = Date.now();

  for (const channel of channels) {
    const result = await syncArenaChannel(db, client, channel, masterId);
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

  return json(
    {
      success: totalStats.errors.length === 0,
      duration: Date.now() - startTime,
      channels: channels.length,
      ...totalStats,
      details: results
    },
    { status: totalStats.errors.length === 0 ? 200 : 502 }
  );
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
    accessToken: platform?.env?.ARENA_API_TOKEN
  });

  const results: ArenaSyncResult[] = [];
  const startTime = Date.now();

  for (const channel of channels) {
    const result = await syncArenaChannel(db, client, channel, masterId);
    results.push(result);
  }

  return json(
    {
      success: results.every((result) => result.errors.length === 0),
      duration: Date.now() - startTime,
      results
    },
    { status: results.every((result) => result.errors.length === 0) ? 200 : 502 }
  );
};
