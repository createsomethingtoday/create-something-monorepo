import { error } from '@sveltejs/kit';
import { requireDb } from '$lib/server/db';
import type { EventRow, FindingDetail, ItemRow, LinkRow, NotificationRow } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, params }) => {
  const db = requireDb(platform);
  const id = Number(params.id);

  if (!Number.isInteger(id) || id <= 0) {
    error(404, 'Finding not found');
  }

  const finding = await db
    .prepare(
      `SELECT f.id, f.title, f.summary, f.category_id, c.title AS category_title,
              f.status, f.priority, f.decision_needed, f.decision_summary,
              f.owner, f.app_name, f.app_client_id, f.created_by, f.verified_by_reviewer,
              f.airtable_record_id, f.atlas_canvas_id, f.atlas_node_id,
              f.created_at, f.updated_at
       FROM findings f
       LEFT JOIN categories c ON c.id = f.category_id
       WHERE f.id = ?`
    )
    .bind(id)
    .first<FindingDetail>();

  if (!finding) {
    error(404, 'Finding not found');
  }

  const [links, items, notifications, events] = await Promise.all([
    db
      .prepare(`SELECT id, kind, url, label FROM links WHERE finding_id = ? ORDER BY id`)
      .bind(id)
      .all<LinkRow>(),
    db
      .prepare(
        `SELECT i.id, s.name AS source_name, i.external_id, i.thread_ts,
                i.author, i.posted_at, i.text, i.permalink, i.triage_state
         FROM items i
         LEFT JOIN sources s ON s.id = i.source_id
         WHERE i.finding_id = ?
         ORDER BY i.posted_at DESC`
      )
      .bind(id)
      .all<ItemRow>(),
    db
      .prepare(
        `SELECT id, target, body, status, queued_by, sent_at, created_at
         FROM notifications WHERE finding_id = ? ORDER BY id DESC`
      )
      .bind(id)
      .all<NotificationRow>(),
    db
      .prepare(
        `SELECT id, actor, action, entity_type, entity_id, payload_json, created_at
         FROM events
         WHERE entity_type = 'finding' AND entity_id = ?
         ORDER BY id DESC`
      )
      .bind(String(id))
      .all<EventRow>()
  ]);

  return {
    finding,
    links: links.results,
    items: items.results,
    notifications: notifications.results,
    events: events.results
  };
};
