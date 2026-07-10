import { requireDb } from '$lib/server/db';
import { APP_GOVERNANCE_SOURCE_TYPES, sourceTypePlaceholders } from '$lib/server/source-scope';
import type { EventRow } from '$lib/types';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 200;

export const load: PageServerLoad = async ({ platform, url }) => {
  const db = requireDb(platform);
  const placeholders = sourceTypePlaceholders();

  const entityType = url.searchParams.get('entity_type') ?? '';
  const actor = url.searchParams.get('actor') ?? '';
  const rawBefore = url.searchParams.get('before') ?? '';
  const before = /^\d+$/.test(rawBefore) ? rawBefore : '';

  const eventScope = `(
    entity_type NOT IN ('source', 'source_record')
    OR EXISTS (
      SELECT 1
      FROM sources s
      WHERE s.source_type IN (${placeholders})
        AND (
          events.entity_id = s.external_id
          OR events.entity_id LIKE s.external_id || ':%'
        )
    )
  )`;

  const where: string[] = [eventScope];
  const bindings: string[] = [...APP_GOVERNANCE_SOURCE_TYPES];

  if (entityType) {
    where.push('entity_type = ?');
    bindings.push(entityType);
  }
  if (actor) {
    where.push('actor = ?');
    bindings.push(actor);
  }
  if (before) {
    where.push('id < ?');
    bindings.push(before);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  // Fetch one extra row so we know whether an older page exists.
  const [events, entityTypes, actors] = await Promise.all([
    db
      .prepare(
        `SELECT id, actor, action, entity_type, entity_id, payload_json, created_at
         FROM events ${whereClause} ORDER BY id DESC LIMIT ${PAGE_SIZE + 1}`
      )
      .bind(...bindings)
      .all<EventRow>(),
    db
      .prepare(`SELECT DISTINCT entity_type FROM events WHERE ${eventScope} ORDER BY entity_type LIMIT 200`)
      .bind(...APP_GOVERNANCE_SOURCE_TYPES)
      .all<{ entity_type: string }>(),
    db
      .prepare(`SELECT DISTINCT actor FROM events WHERE ${eventScope} ORDER BY actor LIMIT 200`)
      .bind(...APP_GOVERNANCE_SOURCE_TYPES)
      .all<{ actor: string }>()
  ]);

  const hasOlder = events.results.length > PAGE_SIZE;

  return {
    events: hasOlder ? events.results.slice(0, PAGE_SIZE) : events.results,
    hasOlder,
    entityTypes: entityTypes.results.map((row) => row.entity_type),
    actors: actors.results.map((row) => row.actor),
    filters: { entityType, actor, before }
  };
};
