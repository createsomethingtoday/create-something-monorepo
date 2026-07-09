import { requireDb } from '$lib/server/db';
import { APP_GOVERNANCE_SOURCE_TYPES, sourceTypePlaceholders } from '$lib/server/source-scope';
import type { EventRow } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, url }) => {
  const db = requireDb(platform);
  const placeholders = sourceTypePlaceholders();

  const entityType = url.searchParams.get('entity_type') ?? '';
  const actor = url.searchParams.get('actor') ?? '';

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

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const [events, entityTypes, actors] = await Promise.all([
    db
      .prepare(
        `SELECT id, actor, action, entity_type, entity_id, payload_json, created_at
         FROM events ${whereClause} ORDER BY id DESC LIMIT 200`
      )
      .bind(...bindings)
      .all<EventRow>(),
    db
      .prepare(`SELECT DISTINCT entity_type FROM events WHERE ${eventScope} ORDER BY entity_type`)
      .bind(...APP_GOVERNANCE_SOURCE_TYPES)
      .all<{ entity_type: string }>(),
    db
      .prepare(`SELECT DISTINCT actor FROM events WHERE ${eventScope} ORDER BY actor`)
      .bind(...APP_GOVERNANCE_SOURCE_TYPES)
      .all<{ actor: string }>()
  ]);

  return {
    events: events.results,
    entityTypes: entityTypes.results.map((row) => row.entity_type),
    actors: actors.results.map((row) => row.actor),
    filters: { entityType, actor }
  };
};
