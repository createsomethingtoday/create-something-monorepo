import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type GetDb = () => D1Database;

function json(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

async function writeEvent(
  db: D1Database,
  actor: string,
  action: string,
  entityType: string,
  entityId: string | number | null,
  payload?: unknown,
): Promise<void> {
  await db
    .prepare('INSERT INTO events (actor, action, entity_type, entity_id, payload_json) VALUES (?, ?, ?, ?, ?)')
    .bind(actor, action, entityType, entityId === null ? null : String(entityId), payload ? JSON.stringify(payload) : null)
    .run();
}

interface SubscriptionRow {
  id: number;
  target: string;
  scope_kind: string;
  scope_key: string;
  reason: string | null;
}

/**
 * Match active subscriptions against a write's scope: doc paths match by
 * prefix, categories and sources by exact key.
 */
async function matchSubscriptions(
  db: D1Database,
  scope: { docPath?: string; categoryId?: string; sourceKey?: string },
): Promise<SubscriptionRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (scope.docPath) {
    clauses.push("(scope_kind = 'doc_path' AND ? LIKE scope_key || '%')");
    params.push(scope.docPath);
  }
  if (scope.categoryId) {
    clauses.push("(scope_kind = 'category' AND scope_key = ?)");
    params.push(scope.categoryId);
  }
  if (scope.sourceKey) {
    clauses.push("(scope_kind = 'source' AND scope_key = ?)");
    params.push(scope.sourceKey);
  }
  if (!clauses.length) return [];
  const result = await db
    .prepare(`SELECT id, target, scope_kind, scope_key, reason FROM subscriptions WHERE active = 1 AND (${clauses.join(' OR ')})`)
    .bind(...params)
    .all<SubscriptionRow>();
  return result.results;
}

async function queueNotifications(
  db: D1Database,
  subs: SubscriptionRow[],
  body: string,
  findingId: number | null,
  queuedBy: string,
): Promise<Array<{ notification_id: number; target: string }>> {
  const queued: Array<{ notification_id: number; target: string }> = [];
  const seen = new Set<string>();
  for (const sub of subs) {
    if (seen.has(sub.target)) continue;
    seen.add(sub.target);
    const result = await db
      .prepare('INSERT INTO notifications (finding_id, target, body, queued_by) VALUES (?, ?, ?, ?)')
      .bind(findingId, sub.target, body, queuedBy)
      .run();
    queued.push({ notification_id: Number(result.meta.last_row_id), target: sub.target });
  }
  return queued;
}

function safeParseObject(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

interface AppChangeDiff {
  [field: string]: { from: unknown; to: unknown };
}

interface AppEndpointReceiptRow {
  id: number;
  requested_patch_json: string | null;
  after_json: string | null;
}

function endpointSnapshotValue(snapshot: Record<string, unknown>, field: string): unknown {
  if (Object.prototype.hasOwnProperty.call(snapshot, field)) return snapshot[field];
  const mrp = snapshot.mrp;
  if (mrp && typeof mrp === 'object' && !Array.isArray(mrp) && Object.prototype.hasOwnProperty.call(mrp, field)) {
    return (mrp as Record<string, unknown>)[field];
  }
  return undefined;
}

function endpointValuesEqual(left: unknown, right: unknown): boolean {
  if (left === undefined || right === undefined) return false;
  return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
}

function endpointReceiptMatchesDiff(receipt: AppEndpointReceiptRow, diff: AppChangeDiff): boolean {
  const requested = safeParseObject(receipt.requested_patch_json);
  const after = safeParseObject(receipt.after_json);
  return Object.entries(diff).every(([field, change]) => {
    const requestedValue = endpointSnapshotValue(requested, field);
    const afterValue = endpointSnapshotValue(after, field);
    return endpointValuesEqual(requestedValue, change.to) || endpointValuesEqual(afterValue, change.to);
  });
}

async function findExpectedAppEndpointReceipt(db: D1Database, appSlug: string, diff: AppChangeDiff): Promise<AppEndpointReceiptRow | null> {
  const result = await db
    .prepare(
      `SELECT id, requested_patch_json, after_json
       FROM app_admin_endpoint_receipts
       WHERE app_slug = ?
         AND status IN ('approved', 'succeeded')
         AND (expected_until IS NULL OR expected_until > datetime('now'))
       ORDER BY created_at DESC
       LIMIT 10`,
    )
    .bind(appSlug)
    .all<AppEndpointReceiptRow>();
  return result.results.find((receipt) => endpointReceiptMatchesDiff(receipt, diff)) ?? null;
}

const FINDING_STATUSES = ['flagged', 'in_progress', 'needs_decision', 'shipped', 'parked'] as const;
const TRIAGE_STATES = ['new', 'categorized', 'linked', 'ignored'] as const;
const NOTIFICATION_STATUSES = ['queued', 'sent', 'skipped', 'failed'] as const;
const LINK_KINDS = ['zendesk', 'airtable', 'slack_thread', 'doc', 'app', 'other'] as const;

export type PresencePublish = (event: Record<string, unknown>) => void;

export function registerTools(server: McpServer, getDb: GetDb, publish?: PresencePublish): void {
  // Shadows the module-level writer: every audited write also fans out to the
  // presence hub (fire-and-forget) so connected clients see live collaboration.
  const logEvent = async (
    db: D1Database,
    actor: string,
    action: string,
    entityType: string,
    entityId: string | number | null,
    payload?: unknown,
  ): Promise<void> => {
    await writeEvent(db, actor, action, entityType, entityId, payload);
    try {
      publish?.({
        ts: new Date().toISOString(),
        actor,
        action,
        entity_type: entityType,
        entity_id: entityId === null ? null : String(entityId),
      });
    } catch {
      // presence is best-effort; never fail a write over it
    }
  };

  server.tool(
    'governance_sync_status',
    'Sources, sync cursors, and record counts for the app governance database. Call first in a sync session to learn where each source left off.',
    {},
    async () => {
      const db = getDb();
      const [sources, items, findings, notifications] = await Promise.all([
        db
          .prepare(
            `SELECT s.source_type, s.external_id, s.name, s.workspace, s.atlas_canvas_id,
                    c.cursor_value, c.last_synced_at, c.synced_by
             FROM sources s
             LEFT JOIN sync_cursors c
               ON c.source_type = s.source_type AND c.source_external_id = s.external_id
             ORDER BY s.id`,
          )
          .all(),
        db.prepare('SELECT triage_state, COUNT(*) AS count FROM items GROUP BY triage_state').all(),
        db.prepare('SELECT status, COUNT(*) AS count FROM findings GROUP BY status').all(),
        db.prepare("SELECT COUNT(*) AS queued FROM notifications WHERE status = 'queued'").all(),
      ]);
      return json({
        sources: sources.results,
        items_by_triage_state: items.results,
        findings_by_status: findings.results,
        notifications_queued: (notifications.results[0] as { queued: number } | undefined)?.queued ?? 0,
      });
    },
  );

  server.tool(
    'governance_list_categories',
    'List the categorization taxonomy (canvas workstreams §1–§8 plus triage-ops).',
    {},
    async () => {
      const db = getDb();
      const result = await db.prepare('SELECT * FROM categories ORDER BY canvas_section IS NULL, canvas_section').all();
      return json(result.results);
    },
  );

  server.tool(
    'governance_record_items',
    'Batch-record synced source items (e.g. Slack messages) idempotently and advance the sync cursor. Slack external_id convention: "<channel_id>:<ts>". Existing items are skipped, not overwritten.',
    {
      source_type: z.string().default('slack_channel').describe('Source type, e.g. slack_channel, slack_canvas, zendesk'),
      source_external_id: z.string().describe('Source external id, e.g. C05KPSPTPFT'),
      items: z
        .array(
          z.object({
            external_id: z.string().describe('Stable id, e.g. "C05KPSPTPFT:1751779414.123456"'),
            thread_ts: z.string().optional().describe('Parent thread ts if this is a reply'),
            author: z.string().optional(),
            posted_at: z.string().optional().describe('ISO timestamp'),
            text: z.string().optional(),
            permalink: z.string().optional(),
            payload_json: z.string().optional().describe('Raw payload as JSON string'),
          }),
        )
        .min(1),
      cursor_value: z.string().optional().describe('New high-water mark (newest Slack ts recorded)'),
      synced_by: z.string().default('claude-code').describe('Agent/session identifier for audit'),
    },
    async ({ source_type, source_external_id, items, cursor_value, synced_by }) => {
      const db = getDb();
      const source = await db
        .prepare('SELECT id FROM sources WHERE source_type = ? AND external_id = ?')
        .bind(source_type, source_external_id)
        .first<{ id: number }>();
      if (!source) {
        return json({ ok: false, error: `Unknown source ${source_type}/${source_external_id}. Register it in the sources table first.` });
      }

      let inserted = 0;
      for (const item of items) {
        const result = await db
          .prepare(
            `INSERT OR IGNORE INTO items (source_id, external_id, thread_ts, author, posted_at, text, permalink, payload_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            source.id,
            item.external_id,
            item.thread_ts ?? null,
            item.author ?? null,
            item.posted_at ?? null,
            item.text ?? null,
            item.permalink ?? null,
            item.payload_json ?? null,
          )
          .run();
        inserted += result.meta.changes ?? 0;
      }

      if (cursor_value) {
        await db
          .prepare(
            `INSERT INTO sync_cursors (source_type, source_external_id, cursor_value, last_synced_at, synced_by)
             VALUES (?, ?, ?, datetime('now'), ?)
             ON CONFLICT (source_type, source_external_id)
             DO UPDATE SET cursor_value = excluded.cursor_value, last_synced_at = excluded.last_synced_at, synced_by = excluded.synced_by`,
          )
          .bind(source_type, source_external_id, cursor_value, synced_by)
          .run();
      }

      await logEvent(db, synced_by, 'record_items', 'source', source_external_id, {
        received: items.length,
        inserted,
        cursor_value: cursor_value ?? null,
      });

      return json({ ok: true, received: items.length, inserted, skipped: items.length - inserted, cursor_value: cursor_value ?? null });
    },
  );

  server.tool(
    'governance_list_items',
    'List synced items. Default view is the triage queue (triage_state=new). Use search for LIKE matching on text/author.',
    {
      triage_state: z.enum(TRIAGE_STATES).optional(),
      source_external_id: z.string().optional(),
      category_id: z.string().optional(),
      finding_id: z.number().int().optional(),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    },
    async ({ triage_state, source_external_id, category_id, finding_id, search, limit }) => {
      const db = getDb();
      const where: string[] = [];
      const params: unknown[] = [];
      if (triage_state) {
        where.push('i.triage_state = ?');
        params.push(triage_state);
      }
      if (source_external_id) {
        where.push('s.external_id = ?');
        params.push(source_external_id);
      }
      if (category_id) {
        where.push('i.category_id = ?');
        params.push(category_id);
      }
      if (finding_id !== undefined) {
        where.push('i.finding_id = ?');
        params.push(finding_id);
      }
      if (search) {
        where.push('(i.text LIKE ? OR i.author LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }
      const sql = `SELECT i.id, i.external_id, i.thread_ts, i.author, i.posted_at, i.text, i.permalink,
                          i.triage_state, i.category_id, i.finding_id, s.external_id AS source_external_id, s.name AS source_name
                   FROM items i JOIN sources s ON s.id = i.source_id
                   ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
                   ORDER BY i.posted_at DESC, i.id DESC LIMIT ?`;
      params.push(limit);
      const result = await db.prepare(sql).bind(...params).all();
      return json(result.results);
    },
  );

  server.tool(
    'governance_categorize_items',
    'Categorize or route triaged items: assign a category, attach to a finding, or mark ignored. Sets triage_state accordingly.',
    {
      item_ids: z.array(z.number().int()).min(1),
      category_id: z.string().optional(),
      finding_id: z.number().int().optional().describe('Attach items to this finding (triage_state becomes linked)'),
      triage_state: z.enum(TRIAGE_STATES).optional().describe('Override; defaults to linked when finding_id set, else categorized'),
      actor: z.string().default('claude-code'),
    },
    async ({ item_ids, category_id, finding_id, triage_state, actor }) => {
      const db = getDb();
      const state = triage_state ?? (finding_id !== undefined ? 'linked' : 'categorized');
      let updated = 0;
      for (const id of item_ids) {
        const result = await db
          .prepare(
            `UPDATE items SET
               category_id = COALESCE(?, category_id),
               finding_id = COALESCE(?, finding_id),
               triage_state = ?,
               updated_at = datetime('now')
             WHERE id = ?`,
          )
          .bind(category_id ?? null, finding_id ?? null, state, id)
          .run();
        updated += result.meta.changes ?? 0;
      }
      await logEvent(db, actor, 'categorize_items', 'item', item_ids.join(','), { category_id, finding_id, triage_state: state });
      return json({ ok: true, updated, triage_state: state });
    },
  );

  server.tool(
    'governance_create_finding',
    'Create a governance finding (the canonical record). Optionally attach source items and evidence links in the same call.',
    {
      title: z.string(),
      summary: z.string().optional(),
      category_id: z.string().optional(),
      status: z.enum(FINDING_STATUSES).default('flagged'),
      priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
      decision_needed: z.boolean().default(false),
      decision_summary: z.string().optional(),
      owner: z.string().optional(),
      app_name: z.string().optional(),
      app_client_id: z.string().optional(),
      airtable_record_id: z.string().optional(),
      atlas_canvas_id: z.string().optional(),
      atlas_node_id: z.string().optional(),
      links: z
        .array(
          z.object({
            kind: z.enum(LINK_KINDS),
            url: z.string(),
            label: z.string().optional(),
          }),
        )
        .optional(),
      item_ids: z.array(z.number().int()).optional().describe('Synced items to attach as evidence'),
      actor: z.string().default('claude-code'),
    },
    async (input) => {
      const db = getDb();
      const result = await db
        .prepare(
          `INSERT INTO findings (title, summary, category_id, status, priority, decision_needed, decision_summary,
                                 owner, app_name, app_client_id, created_by, airtable_record_id, atlas_canvas_id, atlas_node_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          input.title,
          input.summary ?? null,
          input.category_id ?? null,
          input.status,
          input.priority ?? null,
          input.decision_needed ? 1 : 0,
          input.decision_summary ?? null,
          input.owner ?? null,
          input.app_name ?? null,
          input.app_client_id ?? null,
          input.actor,
          input.airtable_record_id ?? null,
          input.atlas_canvas_id ?? null,
          input.atlas_node_id ?? null,
        )
        .run();
      const findingId = result.meta.last_row_id;

      for (const link of input.links ?? []) {
        await db
          .prepare('INSERT INTO links (finding_id, kind, url, label) VALUES (?, ?, ?, ?)')
          .bind(findingId, link.kind, link.url, link.label ?? null)
          .run();
      }
      if (input.item_ids?.length) {
        for (const itemId of input.item_ids) {
          await db
            .prepare("UPDATE items SET finding_id = ?, triage_state = 'linked', updated_at = datetime('now') WHERE id = ?")
            .bind(findingId, itemId)
            .run();
        }
      }
      await logEvent(db, input.actor, 'create_finding', 'finding', findingId, { title: input.title, category_id: input.category_id });
      const finding = await db.prepare('SELECT * FROM findings WHERE id = ?').bind(findingId).first();
      return json({ ok: true, finding });
    },
  );

  server.tool(
    'governance_update_finding',
    'Update a finding: status, priority, category, owner, decision flags, reviewer verification, Atlas/Airtable references.',
    {
      id: z.number().int(),
      title: z.string().optional(),
      summary: z.string().optional(),
      category_id: z.string().optional(),
      status: z.enum(FINDING_STATUSES).optional(),
      priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
      decision_needed: z.boolean().optional(),
      decision_summary: z.string().optional(),
      owner: z.string().optional(),
      app_name: z.string().optional(),
      app_client_id: z.string().optional(),
      verified_by_reviewer: z.boolean().optional(),
      airtable_record_id: z.string().optional(),
      atlas_canvas_id: z.string().optional(),
      atlas_node_id: z.string().optional(),
      actor: z.string().default('claude-code'),
    },
    async ({ id, actor, ...fields }) => {
      const db = getDb();
      const sets: string[] = [];
      const params: unknown[] = [];
      const columns: Record<string, unknown> = {
        title: fields.title,
        summary: fields.summary,
        category_id: fields.category_id,
        status: fields.status,
        priority: fields.priority,
        decision_needed: fields.decision_needed === undefined ? undefined : fields.decision_needed ? 1 : 0,
        decision_summary: fields.decision_summary,
        owner: fields.owner,
        app_name: fields.app_name,
        app_client_id: fields.app_client_id,
        verified_by_reviewer: fields.verified_by_reviewer === undefined ? undefined : fields.verified_by_reviewer ? 1 : 0,
        airtable_record_id: fields.airtable_record_id,
        atlas_canvas_id: fields.atlas_canvas_id,
        atlas_node_id: fields.atlas_node_id,
      };
      for (const [column, value] of Object.entries(columns)) {
        if (value !== undefined) {
          sets.push(`${column} = ?`);
          params.push(value);
        }
      }
      if (!sets.length) {
        return json({ ok: false, error: 'No fields to update.' });
      }
      sets.push("updated_at = datetime('now')");
      params.push(id);
      const result = await db.prepare(`UPDATE findings SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
      if (!result.meta.changes) {
        return json({ ok: false, error: `Finding ${id} not found.` });
      }
      await logEvent(db, actor, 'update_finding', 'finding', id, fields);
      const finding = await db.prepare('SELECT * FROM findings WHERE id = ?').bind(id).first();
      return json({ ok: true, finding });
    },
  );

  server.tool(
    'governance_list_findings',
    'List findings with filters. decision_needed=true is the "⚖️ decisions needed" view.',
    {
      status: z.enum(FINDING_STATUSES).optional(),
      category_id: z.string().optional(),
      decision_needed: z.boolean().optional(),
      owner: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    },
    async ({ status, category_id, decision_needed, owner, search, limit }) => {
      const db = getDb();
      const where: string[] = [];
      const params: unknown[] = [];
      if (status) {
        where.push('status = ?');
        params.push(status);
      }
      if (category_id) {
        where.push('category_id = ?');
        params.push(category_id);
      }
      if (decision_needed !== undefined) {
        where.push('decision_needed = ?');
        params.push(decision_needed ? 1 : 0);
      }
      if (owner) {
        where.push('owner LIKE ?');
        params.push(`%${owner}%`);
      }
      if (search) {
        where.push('(title LIKE ? OR summary LIKE ? OR app_name LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      const sql = `SELECT * FROM findings ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY updated_at DESC LIMIT ?`;
      params.push(limit);
      const result = await db.prepare(sql).bind(...params).all();
      return json(result.results);
    },
  );

  server.tool(
    'governance_get_finding',
    'Fetch one finding with its links, attached items, and recent audit events.',
    { id: z.number().int() },
    async ({ id }) => {
      const db = getDb();
      const finding = await db.prepare('SELECT * FROM findings WHERE id = ?').bind(id).first();
      if (!finding) {
        return json({ ok: false, error: `Finding ${id} not found.` });
      }
      const [links, items, events] = await Promise.all([
        db.prepare('SELECT * FROM links WHERE finding_id = ? ORDER BY id').bind(id).all(),
        db
          .prepare('SELECT id, external_id, thread_ts, author, posted_at, text, permalink, triage_state FROM items WHERE finding_id = ? ORDER BY posted_at')
          .bind(id)
          .all(),
        db
          .prepare("SELECT * FROM events WHERE entity_type = 'finding' AND entity_id = ? ORDER BY id DESC LIMIT 20")
          .bind(String(id))
          .all(),
      ]);
      return json({ finding, links: links.results, items: items.results, events: events.results });
    },
  );

  server.tool(
    'governance_add_link',
    'Attach an evidence link (Zendesk ticket, Airtable record, Slack thread, doc, app listing) to a finding.',
    {
      finding_id: z.number().int(),
      kind: z.enum(LINK_KINDS),
      url: z.string(),
      label: z.string().optional(),
      actor: z.string().default('claude-code'),
    },
    async ({ finding_id, kind, url, label, actor }) => {
      const db = getDb();
      const result = await db
        .prepare('INSERT INTO links (finding_id, kind, url, label) VALUES (?, ?, ?, ?)')
        .bind(finding_id, kind, url, label ?? null)
        .run();
      await logEvent(db, actor, 'add_link', 'finding', finding_id, { kind, url });
      return json({ ok: true, link_id: result.meta.last_row_id });
    },
  );

  server.tool(
    'governance_record_apps',
    'Batch-upsert marketplace apps from a Webflow Apps admin snapshot. Detects drift: changes to visibility, review status, name, or client_id are logged as app_changed events (serves the listing/visibility-drift watch).',
    {
      apps: z
        .array(
          z.object({
            slug: z.string().describe('From /apps/detail/<slug>'),
            name: z.string().optional(),
            client_id: z.string().optional(),
            app_id: z.string().optional(),
            workspace_id: z.string().optional(),
            mrp_id: z.string().optional(),
            mrp_resource_type: z.string().optional(),
            mrp_status: z.string().optional(),
            mrp_visibility: z.string().optional(),
            mrp_update_supported: z.boolean().optional(),
            mrp_verified_at: z.string().optional(),
            mrp_update_error: z.string().optional(),
            visibility: z.string().optional().describe('PUBLIC | PRIVATE'),
            review_status: z.string().optional().describe('APPROVED | PENDING | DENIED | ...'),
            categories: z.array(z.string()).optional(),
            detail_url: z.string().optional(),
            payload_json: z.string().optional(),
          }),
        )
        .min(1),
      synced_by: z.string().default('claude-code'),
    },
    async ({ apps, synced_by }) => {
      const db = getDb();
      let created = 0;
      let changed = 0;
      let unchanged = 0;
      const drift: Array<{ slug: string; changes: Record<string, { from: unknown; to: unknown }> }> = [];
      const expectedDrift: Array<{ slug: string; receipt_id: number; changes: Record<string, { from: unknown; to: unknown }> }> = [];

      for (const app of apps) {
        const mrpUpdateSupported = app.mrp_update_supported === undefined ? null : app.mrp_update_supported ? 1 : 0;
        const existing = await db
          .prepare('SELECT slug, name, client_id, visibility, review_status, workspace_id FROM apps WHERE slug = ?')
          .bind(app.slug)
          .first<{ slug: string; name: string | null; client_id: string | null; visibility: string | null; review_status: string | null; workspace_id: string | null }>();

        if (!existing) {
          await db
            .prepare(
              `INSERT INTO apps (
                 slug, name, client_id, app_id, workspace_id,
                 visibility, review_status, categories, detail_url, payload_json,
                 mrp_id, mrp_resource_type, mrp_status, mrp_visibility,
                 mrp_update_supported, mrp_verified_at, mrp_update_error
               )
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              app.slug,
              app.name ?? null,
              app.client_id ?? null,
              app.app_id ?? null,
              app.workspace_id ?? null,
              app.visibility ?? null,
              app.review_status ?? null,
              app.categories ? JSON.stringify(app.categories) : null,
              app.detail_url ?? null,
              app.payload_json ?? null,
              app.mrp_id ?? null,
              app.mrp_resource_type ?? null,
              app.mrp_status ?? null,
              app.mrp_visibility ?? null,
              mrpUpdateSupported,
              app.mrp_verified_at ?? null,
              app.mrp_update_error ?? null,
            )
            .run();
          created += 1;
          continue;
        }

        const diff: Record<string, { from: unknown; to: unknown }> = {};
        for (const field of ['name', 'client_id', 'visibility', 'review_status', 'workspace_id'] as const) {
          const next = app[field];
          if (next !== undefined && next !== existing[field]) {
            diff[field] = { from: existing[field], to: next };
          }
        }

        await db
          .prepare(
            `UPDATE apps SET
               name = COALESCE(?, name),
               client_id = COALESCE(?, client_id),
               app_id = COALESCE(?, app_id),
               workspace_id = COALESCE(?, workspace_id),
               visibility = COALESCE(?, visibility),
               review_status = COALESCE(?, review_status),
               categories = COALESCE(?, categories),
               detail_url = COALESCE(?, detail_url),
               payload_json = COALESCE(?, payload_json),
               mrp_id = COALESCE(?, mrp_id),
               mrp_resource_type = COALESCE(?, mrp_resource_type),
               mrp_status = COALESCE(?, mrp_status),
               mrp_visibility = COALESCE(?, mrp_visibility),
               mrp_update_supported = COALESCE(?, mrp_update_supported),
               mrp_verified_at = COALESCE(?, mrp_verified_at),
               mrp_update_error = COALESCE(?, mrp_update_error),
               last_seen_at = datetime('now'),
               last_changed_at = CASE WHEN ? THEN datetime('now') ELSE last_changed_at END
             WHERE slug = ?`,
          )
          .bind(
            app.name ?? null,
            app.client_id ?? null,
            app.app_id ?? null,
            app.workspace_id ?? null,
            app.visibility ?? null,
            app.review_status ?? null,
            app.categories ? JSON.stringify(app.categories) : null,
            app.detail_url ?? null,
            app.payload_json ?? null,
            app.mrp_id ?? null,
            app.mrp_resource_type ?? null,
            app.mrp_status ?? null,
            app.mrp_visibility ?? null,
            mrpUpdateSupported,
            app.mrp_verified_at ?? null,
            app.mrp_update_error ?? null,
            Object.keys(diff).length ? 1 : 0,
            app.slug,
          )
          .run();

        if (Object.keys(diff).length) {
          changed += 1;
          const expectedReceipt = await findExpectedAppEndpointReceipt(db, app.slug, diff);
          if (expectedReceipt) {
            expectedDrift.push({ slug: app.slug, receipt_id: expectedReceipt.id, changes: diff });
            await logEvent(db, synced_by, 'app_expected_change', 'app', app.slug, { receipt_id: expectedReceipt.id, changes: diff });
          } else {
            drift.push({ slug: app.slug, changes: diff });
            await logEvent(db, synced_by, 'app_changed', 'app', app.slug, diff);
          }
        } else {
          unchanged += 1;
        }
      }

      if (drift.length) {
        const subs = await matchSubscriptions(db, { sourceKey: 'webflow.com/apps' });
        const body =
          `Listing drift detected in Apps Admin sync (${drift.length} app${drift.length > 1 ? 's' : ''}):\n` +
          drift.slice(0, 15).map((d) => `- ${d.slug}: ${JSON.stringify(d.changes)}`).join('\n');
        const queued = await queueNotifications(db, subs, body, null, synced_by);
        if (queued.length) {
          await logEvent(db, synced_by, 'drift_notifications', 'source', 'webflow.com/apps', { drift_count: drift.length, notified: queued });
        }
      }

      await db
        .prepare(
          `INSERT INTO sync_cursors (source_type, source_external_id, cursor_value, last_synced_at, synced_by)
           VALUES ('webflow_admin', 'webflow.com/apps', ?, datetime('now'), ?)
           ON CONFLICT (source_type, source_external_id)
           DO UPDATE SET cursor_value = excluded.cursor_value, last_synced_at = excluded.last_synced_at, synced_by = excluded.synced_by`,
        )
        .bind(new Date().toISOString(), synced_by)
        .run();
      await logEvent(db, synced_by, 'record_apps', 'source', 'webflow.com/apps', { received: apps.length, created, changed, unchanged, expected: expectedDrift.length });

      return json({ ok: true, received: apps.length, created, changed, unchanged, expected_drift: expectedDrift, drift });
    },
  );

  server.tool(
    'governance_record_app_endpoint_access',
    'Record Webflow Admin endpoint capability/readback state and optional operator-approved write receipt for an app or unsupported template without storing secrets.',
    {
      entity_type: z.enum(['app', 'template', 'library', 'other']).default('app'),
      entity_key: z.string().optional().describe('Stable entity key. Defaults to app_slug, mrp_id, app_id, or client_id.'),
      app_slug: z.string().optional(),
      app_id: z.string().optional(),
      client_id: z.string().optional(),
      workspace_id: z.string().optional(),
      mrp_id: z.string().optional(),
      resource_type: z.string().optional(),
      resource_id: z.string().optional(),
      endpoint_method: z.string().default('PUT'),
      endpoint_path: z.string().default('/admin/api/mrp/airtable'),
      supports_noop_read: z.boolean().default(false),
      supports_write: z.boolean().default(false),
      http_status: z.number().int().optional(),
      status: z.enum(['verified', 'unsupported', 'error', 'unknown']).default('unknown'),
      unsupported_reason: z.string().optional(),
      error: z.string().optional(),
      response_summary_json: z.string().optional(),
      verified_at: z.string().optional(),
      receipt: z
        .object({
          operation: z.enum(['noop_read', 'update', 'unsupported_probe']).default('noop_read'),
          status: z.enum(['requested', 'approved', 'succeeded', 'failed', 'unsupported']).default('succeeded'),
          http_status: z.number().int().optional(),
          requested_patch_json: z.string().optional(),
          before_json: z.string().optional(),
          after_json: z.string().optional(),
          response_summary_json: z.string().optional(),
          error: z.string().optional(),
          expected_until: z.string().optional(),
        })
        .optional(),
      recorded_by: z.string().default('app-governance'),
    },
    async (input) => {
      const db = getDb();
      const entityKey = input.entity_key ?? input.app_slug ?? input.mrp_id ?? input.app_id ?? input.client_id;
      if (!entityKey) return json({ ok: false, error: 'entity_key, app_slug, mrp_id, app_id, or client_id is required' });
      const endpointMethod = input.endpoint_method ?? 'PUT';
      const endpointPath = input.endpoint_path ?? '/admin/api/mrp/airtable';

      if (input.app_slug) {
        await db
          .prepare(
            `UPDATE apps SET
               app_id = COALESCE(?, app_id),
               client_id = COALESCE(?, client_id),
               workspace_id = COALESCE(?, workspace_id),
               mrp_id = COALESCE(?, mrp_id),
               mrp_resource_type = COALESCE(?, mrp_resource_type),
               mrp_update_supported = COALESCE(?, mrp_update_supported),
               mrp_verified_at = COALESCE(?, mrp_verified_at),
               mrp_update_error = COALESCE(?, mrp_update_error),
               last_seen_at = datetime('now')
             WHERE slug = ?`,
          )
          .bind(
            input.app_id ?? null,
            input.client_id ?? null,
            input.workspace_id ?? null,
            input.mrp_id ?? null,
            input.resource_type ?? null,
            input.supports_write ? 1 : input.status === 'unsupported' ? 0 : null,
            input.verified_at ?? null,
            input.error ?? input.unsupported_reason ?? null,
            input.app_slug,
          )
          .run();
      }

      await db
        .prepare(
          `INSERT INTO app_admin_endpoint_capabilities (
             entity_type, entity_key, app_slug, app_id, client_id, workspace_id,
             mrp_id, resource_type, resource_id, endpoint_method, endpoint_path,
             supports_noop_read, supports_write, http_status, status,
             unsupported_reason, error, response_summary_json, verified_at, updated_at
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT (entity_type, entity_key, endpoint_method, endpoint_path)
           DO UPDATE SET
             app_slug = COALESCE(excluded.app_slug, app_admin_endpoint_capabilities.app_slug),
             app_id = COALESCE(excluded.app_id, app_admin_endpoint_capabilities.app_id),
             client_id = COALESCE(excluded.client_id, app_admin_endpoint_capabilities.client_id),
             workspace_id = COALESCE(excluded.workspace_id, app_admin_endpoint_capabilities.workspace_id),
             mrp_id = COALESCE(excluded.mrp_id, app_admin_endpoint_capabilities.mrp_id),
             resource_type = COALESCE(excluded.resource_type, app_admin_endpoint_capabilities.resource_type),
             resource_id = COALESCE(excluded.resource_id, app_admin_endpoint_capabilities.resource_id),
             supports_noop_read = excluded.supports_noop_read,
             supports_write = excluded.supports_write,
             http_status = COALESCE(excluded.http_status, app_admin_endpoint_capabilities.http_status),
             status = excluded.status,
             unsupported_reason = COALESCE(excluded.unsupported_reason, app_admin_endpoint_capabilities.unsupported_reason),
             error = COALESCE(excluded.error, app_admin_endpoint_capabilities.error),
             response_summary_json = COALESCE(excluded.response_summary_json, app_admin_endpoint_capabilities.response_summary_json),
             verified_at = COALESCE(excluded.verified_at, app_admin_endpoint_capabilities.verified_at),
             updated_at = datetime('now')`,
        )
        .bind(
          input.entity_type,
          entityKey,
          input.app_slug ?? null,
          input.app_id ?? null,
          input.client_id ?? null,
          input.workspace_id ?? null,
          input.mrp_id ?? null,
          input.resource_type ?? null,
          input.resource_id ?? null,
          endpointMethod,
          endpointPath,
          input.supports_noop_read ? 1 : 0,
          input.supports_write ? 1 : 0,
          input.http_status ?? null,
          input.status,
          input.unsupported_reason ?? null,
          input.error ?? null,
          input.response_summary_json ?? null,
          input.verified_at ?? null,
        )
        .run();

      let receiptId: number | null = null;
      if (input.receipt) {
        const receipt = input.receipt;
        const receiptResult = await db
          .prepare(
            `INSERT INTO app_admin_endpoint_receipts (
               app_slug, app_id, client_id, workspace_id, mrp_id,
               endpoint_method, endpoint_path, operation, status, http_status,
               requested_patch_json, before_json, after_json, response_summary_json,
               error, expected_until, actor
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            input.app_slug ?? null,
            input.app_id ?? null,
            input.client_id ?? null,
            input.workspace_id ?? null,
            input.mrp_id ?? null,
            endpointMethod,
            endpointPath,
            receipt.operation ?? 'noop_read',
            receipt.status ?? 'succeeded',
            receipt.http_status ?? input.http_status ?? null,
            receipt.requested_patch_json ?? null,
            receipt.before_json ?? null,
            receipt.after_json ?? null,
            receipt.response_summary_json ?? input.response_summary_json ?? null,
            receipt.error ?? input.error ?? null,
            receipt.expected_until ?? null,
            input.recorded_by,
          )
          .run();
        receiptId = Number(receiptResult.meta?.last_row_id ?? 0) || null;
      }

      await logEvent(db, input.recorded_by, 'record_app_endpoint_access', input.entity_type, entityKey, {
        app_slug: input.app_slug ?? null,
        mrp_id: input.mrp_id ?? null,
        endpoint_path: endpointPath,
        status: input.status,
        supports_write: input.supports_write,
        receipt_id: receiptId,
      });

      return json({ ok: true, entity_type: input.entity_type, entity_key: entityKey, receipt_id: receiptId });
    },
  );

  server.tool(
    'governance_list_apps',
    'List synced marketplace apps. changed_since surfaces recent drift (visibility/status changes).',
    {
      visibility: z.string().optional(),
      review_status: z.string().optional(),
      client_id: z.string().optional(),
      app_id: z.string().optional(),
      mrp_id: z.string().optional(),
      search: z.string().optional(),
      changed_since: z.string().optional().describe('ISO date — only apps with last_changed_at after this'),
      limit: z.number().int().min(1).max(500).default(100),
    },
    async ({ visibility, review_status, client_id, app_id, mrp_id, search, changed_since, limit }) => {
      const db = getDb();
      const resolvedLimit = limit ?? 100;
      const where: string[] = [];
      const params: unknown[] = [];
      if (visibility) {
        where.push('visibility = ?');
        params.push(visibility);
      }
      if (review_status) {
        where.push('review_status = ?');
        params.push(review_status);
      }
      if (client_id) {
        where.push('client_id = ?');
        params.push(client_id);
      }
      if (app_id) {
        where.push('app_id = ?');
        params.push(app_id);
      }
      if (mrp_id) {
        where.push('mrp_id = ?');
        params.push(mrp_id);
      }
      if (search) {
        where.push('(name LIKE ? OR slug LIKE ? OR client_id = ? OR app_id = ? OR workspace_id = ? OR mrp_id = ? OR client_id LIKE ? OR app_id LIKE ? OR workspace_id LIKE ? OR mrp_id LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, search, search, search, search, `${search}%`, `${search}%`, `${search}%`, `${search}%`);
      }
      if (changed_since) {
        where.push('last_changed_at > ?');
        params.push(changed_since);
      }
      const sql = `SELECT * FROM apps ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY last_seen_at DESC LIMIT ?`;
      params.push(resolvedLimit);
      const result = await db.prepare(sql).bind(...params).all();
      return json(result.results);
    },
  );

  server.tool(
    'governance_set_cursor',
    'Set a sync cursor for any registered source (high-water mark + attribution). Use when a sync mechanism does not flow through governance_record_items (e.g. the docs repo check).',
    {
      source_type: z.string(),
      source_external_id: z.string(),
      cursor_value: z.string(),
      synced_by: z.string().default('claude-code'),
      metadata_json: z.string().optional(),
    },
    async ({ source_type, source_external_id, cursor_value, synced_by, metadata_json }) => {
      const db = getDb();
      const source = await db
        .prepare('SELECT id FROM sources WHERE source_type = ? AND external_id = ?')
        .bind(source_type, source_external_id)
        .first();
      if (!source) {
        return json({ ok: false, error: `Unknown source ${source_type}/${source_external_id}` });
      }
      await db
        .prepare(
          `INSERT INTO sync_cursors (source_type, source_external_id, cursor_value, last_synced_at, synced_by, metadata_json)
           VALUES (?, ?, ?, datetime('now'), ?, ?)
           ON CONFLICT (source_type, source_external_id)
           DO UPDATE SET cursor_value = excluded.cursor_value, last_synced_at = excluded.last_synced_at, synced_by = excluded.synced_by, metadata_json = COALESCE(excluded.metadata_json, sync_cursors.metadata_json)`,
        )
        .bind(source_type, source_external_id, cursor_value, synced_by, metadata_json ?? null)
        .run();
      await logEvent(db, synced_by, 'set_cursor', 'source', source_external_id, { cursor_value });
      return json({ ok: true, source_type, source_external_id, cursor_value });
    },
  );

  server.tool(
    'governance_list_doc_locations',
    'List governed documentation locations (webflow/openapi-internal paths) with their categories.',
    {
      prefix: z.string().optional().describe('Path prefix filter'),
      category_id: z.string().optional(),
    },
    async ({ prefix, category_id }) => {
      const db = getDb();
      const where: string[] = [];
      const params: unknown[] = [];
      if (prefix) {
        where.push("path LIKE ? || '%'");
        params.push(prefix);
      }
      if (category_id) {
        where.push('category_id = ?');
        params.push(category_id);
      }
      const result = await db
        .prepare(`SELECT * FROM doc_locations ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY path`)
        .bind(...params)
        .all();
      return json(result.results);
    },
  );

  server.tool(
    'governance_subscribe',
    'Subscribe a team/person/channel to a scope: a doc path prefix, a category, or a source. Matching writes (misalignment flags, app drift) queue notifications to the target programmatically.',
    {
      target: z.string().describe('Who gets notified, e.g. "@paige", "#triage-marketplace-apps", "security@"'),
      scope_kind: z.enum(['doc_path', 'category', 'source']),
      scope_key: z.string().describe('Path prefix, category id, or source external id'),
      reason: z.string().optional(),
      actor: z.string().default('claude-code'),
    },
    async ({ target, scope_kind, scope_key, reason, actor }) => {
      const db = getDb();
      const result = await db
        .prepare('INSERT INTO subscriptions (target, scope_kind, scope_key, reason, created_by) VALUES (?, ?, ?, ?, ?)')
        .bind(target, scope_kind, scope_key, reason ?? null, actor)
        .run();
      await logEvent(db, actor, 'subscribe', 'subscription', result.meta.last_row_id, { target, scope_kind, scope_key });
      return json({ ok: true, subscription_id: result.meta.last_row_id });
    },
  );

  server.tool(
    'governance_list_subscriptions',
    'List active subscriptions (who is watching which doc paths, categories, and sources).',
    { include_inactive: z.boolean().default(false) },
    async ({ include_inactive }) => {
      const db = getDb();
      const result = await db
        .prepare(`SELECT * FROM subscriptions ${include_inactive ? '' : 'WHERE active = 1'} ORDER BY scope_kind, scope_key`)
        .all();
      return json(result.results);
    },
  );

  server.tool(
    'governance_record_doc_change',
    'Record the latest commit touching a governed doc location. First observation sets the baseline silently; later, newer commits mark the doc changed and queue notifications to doc-path subscribers (the governed surface moved).',
    {
      path: z.string().describe('Governed doc path (must exist in doc_locations)'),
      commit_iso: z.string().describe('ISO timestamp of the latest commit touching the path'),
      commit_summary: z.string().optional().describe('Commit subject line'),
      actor: z.string().default('doc-change-check'),
    },
    async ({ path, commit_iso, commit_summary, actor }) => {
      const db = getDb();
      const loc = await db
        .prepare('SELECT id, title, category_id, last_verified_at FROM doc_locations WHERE path = ?')
        .bind(path)
        .first<{ id: number; title: string | null; category_id: string | null; last_verified_at: string | null }>();
      if (!loc) {
        return json({ ok: false, error: `Unknown doc location: ${path}. Register it first.` });
      }
      if (!loc.last_verified_at) {
        await db.prepare('UPDATE doc_locations SET last_verified_at = ? WHERE id = ?').bind(commit_iso, loc.id).run();
        await logEvent(db, actor, 'doc_baseline', 'doc_location', loc.id, { path, commit_iso });
        return json({ ok: true, action: 'baseline', path, verified_at: commit_iso });
      }
      if (commit_iso <= loc.last_verified_at) {
        return json({ ok: true, action: 'unchanged', path, verified_at: loc.last_verified_at });
      }
      await db.prepare('UPDATE doc_locations SET last_verified_at = ? WHERE id = ?').bind(commit_iso, loc.id).run();
      const subs = await matchSubscriptions(db, { docPath: path, categoryId: loc.category_id ?? undefined });
      const body = [
        `Governed doc changed: ${loc.title ?? path}`,
        `Location: ${path}`,
        `Commit: ${commit_iso}${commit_summary ? ` — ${commit_summary}` : ''}`,
        'Review whether policy/review practice and the doc still align.',
      ].join('\n');
      const queued = await queueNotifications(db, subs, body, null, actor);
      await logEvent(db, actor, 'doc_changed', 'doc_location', loc.id, { path, commit_iso, commit_summary, notified: queued });
      return json({ ok: true, action: 'changed', path, verified_at: commit_iso, subscribers_notified: queued });
    },
  );

  server.tool(
    'governance_flag_misalignment',
    'Flag a submission/observation as misaligned with governed documentation. Creates a finding, links the doc location, and programmatically queues notifications to every subscriber of that doc path and category — the receipts land in notifications + events.',
    {
      title: z.string(),
      summary: z.string().describe('What is misaligned: submission behavior vs what the doc says (or fails to say)'),
      doc_path: z.string().optional().describe('Governed doc path, e.g. fern/products/data/pages/MARKETPLACE/private-apps.mdx'),
      category_id: z.string().default('docs-overhaul'),
      submission_ref: z.string().optional().describe('App slug, client_id, ZD ticket, or item external_id that surfaced this'),
      priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
      actor: z.string().default('claude-code'),
    },
    async ({ title, summary, doc_path, category_id, submission_ref, priority, actor }) => {
      const db = getDb();
      const finding = await db
        .prepare(
          `INSERT INTO findings (title, summary, category_id, status, priority, decision_needed, created_by, atlas_canvas_id, atlas_node_id)
           VALUES (?, ?, ?, 'flagged', ?, 0, ?, 'webflow-app-marketplace-governance-control-plane-mapping-mqsd1vwd', 'data_mqsd4e9w_0fh4bs')`,
        )
        .bind(title, summary + (submission_ref ? `\n\nSubmission ref: ${submission_ref}` : ''), category_id, priority ?? null, actor)
        .run();
      const findingId = Number(finding.meta.last_row_id);

      if (doc_path) {
        await db
          .prepare('INSERT INTO links (finding_id, kind, url, label) VALUES (?, ?, ?, ?)')
          .bind(findingId, 'doc', `https://github.com/webflow/openapi-internal/blob/main/${doc_path}`, doc_path)
          .run();
      }

      const subs = await matchSubscriptions(db, { docPath: doc_path, categoryId: category_id });
      const body = [
        `Doc misalignment flagged: ${title}`,
        doc_path ? `Location: ${doc_path}` : null,
        submission_ref ? `Submission: ${submission_ref}` : null,
        `Finding #${findingId} — ${summary.slice(0, 300)}`,
      ]
        .filter(Boolean)
        .join('\n');
      const queued = await queueNotifications(db, subs, body, findingId, actor);

      await logEvent(db, actor, 'flag_misalignment', 'finding', findingId, { doc_path, category_id, submission_ref, notified: queued });
      return json({ ok: true, finding_id: findingId, subscribers_notified: queued });
    },
  );

  server.tool(
    'governance_queue_notification',
    'Queue an outbound notification (e.g. Slack post to a channel or owner). Delivery is performed by an agent or human with Slack access, then marked via governance_mark_notification.',
    {
      target: z.string().describe('Where it should go, e.g. "#triage-marketplace-apps" or "@pablo"'),
      body: z.string(),
      finding_id: z.number().int().optional(),
      queued_by: z.string().default('claude-code'),
    },
    async ({ target, body, finding_id, queued_by }) => {
      const db = getDb();
      const result = await db
        .prepare('INSERT INTO notifications (finding_id, target, body, queued_by) VALUES (?, ?, ?, ?)')
        .bind(finding_id ?? null, target, body, queued_by)
        .run();
      await logEvent(db, queued_by, 'queue_notification', 'notification', result.meta.last_row_id, { target, finding_id });
      return json({ ok: true, notification_id: result.meta.last_row_id });
    },
  );

  server.tool(
    'governance_list_notifications',
    'List notifications, default queued (the outbox to deliver).',
    {
      status: z.enum(NOTIFICATION_STATUSES).default('queued'),
      limit: z.number().int().min(1).max(200).default(50),
    },
    async ({ status, limit }) => {
      const db = getDb();
      const result = await db
        .prepare('SELECT * FROM notifications WHERE status = ? ORDER BY id LIMIT ?')
        .bind(status, limit)
        .all();
      return json(result.results);
    },
  );

  server.tool(
    'governance_mark_notification',
    'Record a notification delivery outcome (sent, skipped, or failed).',
    {
      id: z.number().int(),
      status: z.enum(['sent', 'skipped', 'failed']),
      actor: z.string().default('claude-code'),
    },
    async ({ id, status, actor }) => {
      const db = getDb();
      const result = await db
        .prepare("UPDATE notifications SET status = ?, sent_at = CASE WHEN ? = 'sent' THEN datetime('now') ELSE sent_at END WHERE id = ?")
        .bind(status, status, id)
        .run();
      if (!result.meta.changes) {
        return json({ ok: false, error: `Notification ${id} not found.` });
      }
      await logEvent(db, actor, 'mark_notification', 'notification', id, { status });
      return json({ ok: true, id, status });
    },
  );
}
