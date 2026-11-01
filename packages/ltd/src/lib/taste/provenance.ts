/** Observed channel membership and successful sync checkpoints for the TASTE corpus. */
import type { ArenaClient } from '../integrations/arena/client';
import { transformBlocks } from '../integrations/arena/transform';
import type { ArenaSyncResult } from '../integrations/arena/types';

interface SyncStatement {
  bind(...values: unknown[]): SyncStatement;
  all<T>(): Promise<{ results?: T[] }>;
}

/** Minimal storage boundary shared by D1 and the SQLite regression fixture. */
interface SyncDatabase {
  prepare(query: string): SyncStatement;
  batch(statements: SyncStatement[]): Promise<unknown>;
}

const TASTE_MASTER_ID = 'arena-taste';
const MOTION_SOURCE_SLUG = 'motion-language-4hbfmugttwe';

/** Canon's vocabulary uses a stable name for this existing upstream channel. */
export function normalizeTasteChannelSlug(slug: string): string {
  return slug === MOTION_SOURCE_SLUG ? 'motion-language' : slug;
}

export function getTasteSourceChannelSlug(slug: string): string {
  return normalizeTasteChannelSlug(slug) === 'motion-language' ? MOTION_SOURCE_SLUG : slug;
}

/**
 * Import one complete channel snapshot. Records, memberships and the successful
 * checkpoint commit together; a failed fetch or batch keeps the previous snapshot.
 * See D1 batch transaction semantics: https://developers.cloudflare.com/d1/worker-api/d1-database/#batch
 */
export async function syncArenaChannel(
  db: SyncDatabase,
  client: Pick<ArenaClient, 'getAllChannelBlocks'>,
  channelSlug: string,
  masterId: string
): Promise<ArenaSyncResult> {
  const channel = normalizeTasteChannelSlug(channelSlug);
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
    const blocks = await client.getAllChannelBlocks(getTasteSourceChannelSlug(channelSlug));
    result.blocksProcessed = blocks.length;
    const { examples, resources } = transformBlocks(blocks, masterId);
    const exampleJson = JSON.stringify(examples);
    const resourceJson = JSON.stringify(resources);
    const [existingExamples, existingResources] = await Promise.all([
      db
        .prepare(
          "SELECT id FROM examples WHERE id IN (SELECT json_extract(value, '$.id') FROM json_each(?))"
        )
        .bind(exampleJson)
        .all<{ id: string }>(),
      db
        .prepare(
          "SELECT id FROM resources WHERE id IN (SELECT json_extract(value, '$.id') FROM json_each(?))"
        )
        .bind(resourceJson)
        .all<{ id: string }>()
    ]);
    const statements = [
      db
        .prepare(
          `INSERT INTO examples (id, master_id, title, image_url, description, year, created_at)
    SELECT json_extract(value, '$.id'), json_extract(value, '$.master_id'),
     json_extract(value, '$.title'), json_extract(value, '$.image_url'),
     json_extract(value, '$.description'), json_extract(value, '$.year'),
     json_extract(value, '$.created_at') FROM json_each(?) WHERE true
    ON CONFLICT(id) DO UPDATE SET master_id=excluded.master_id, title=excluded.title,
     image_url=excluded.image_url, description=excluded.description, year=excluded.year`
        )
        .bind(exampleJson),
      db
        .prepare(
          `INSERT INTO resources (id, master_id, title, type, url, description, year, featured, created_at)
    SELECT json_extract(value, '$.id'), json_extract(value, '$.master_id'),
     json_extract(value, '$.title'), json_extract(value, '$.type'),
     json_extract(value, '$.url'), json_extract(value, '$.description'),
     json_extract(value, '$.year'), json_extract(value, '$.featured'),
     json_extract(value, '$.created_at') FROM json_each(?) WHERE true
    ON CONFLICT(id) DO UPDATE SET master_id=excluded.master_id, title=excluded.title,
     type=excluded.type, url=excluded.url, description=excluded.description, year=excluded.year`
        )
        .bind(resourceJson)
    ];
    // Custom master imports retain their existing contract; only the taste corpus
    // participates in TASTE attribution and freshness.
    if (masterId === TASTE_MASTER_ID) {
      const syncedAt = Math.floor(Date.now() / 1000);
      const ids = [...examples, ...resources].map((item) => item.id);
      statements.push(
        db.prepare('DELETE FROM taste_reference_channels WHERE channel_slug = ?').bind(channel),
        db
          .prepare(
            `INSERT INTO taste_reference_channels (reference_id, channel_slug, source_url, synced_at)
     SELECT value, ?, 'https://www.are.na/block/' || substr(value, 7), ? FROM json_each(?)`
          )
          .bind(channel, syncedAt, JSON.stringify(ids)),
        db
          .prepare(
            `INSERT INTO taste_sync_state (channel_slug, last_successful_sync_at) VALUES (?, ?)
     ON CONFLICT(channel_slug) DO UPDATE SET last_successful_sync_at=excluded.last_successful_sync_at`
          )
          .bind(channel, syncedAt)
      );
    }
    await db.batch(statements);
    result.examplesUpdated = existingExamples.results?.length ?? 0;
    result.examplesCreated = examples.length - result.examplesUpdated;
    result.resourcesUpdated = existingResources.results?.length ?? 0;
    result.resourcesCreated = resources.length - result.resourcesUpdated;
  } catch (error) {
    result.errors.push(
      `Channel sync failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  return result;
}
