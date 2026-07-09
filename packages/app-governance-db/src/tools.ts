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

interface SourceRecordProjectionRow {
  id: number;
  source_id: number;
  source_type: string;
  source_external_id: string;
  source_name: string | null;
  external_id: string;
  title: string | null;
  canonical_type: string;
  substrate_id: string | null;
  atlas_canvas_id: string | null;
  atlas_node_id: string | null;
  identity_state: string;
  migration_state: string;
  payload_json: string | null;
}

interface SourceRecordRelationRow {
  id: number;
  source_record_id: number;
  target_source_record_id: number;
  relation_kind: string;
  evidence_kind: string;
  confidence: number;
  reason: string | null;
  metadata_json: string | null;
}

interface SourceTransferReviewActionCandidate {
  review_id: number;
  source_record_id: number;
  review_kind: string;
  review_status: string;
  reason: string | null;
  review_owner: string | null;
  reviewed_by: string | null;
  review_metadata_json: string | null;
  source_type: string;
  source_name: string | null;
  source_external_id: string;
  external_id: string;
  title: string | null;
  canonical_type: string;
  substrate_id: string | null;
  atlas_canvas_id: string | null;
  atlas_node_id: string | null;
  has_binding_gap: number;
  has_relation_island: number;
  existing_action_id: string | null;
}

interface SourceUpdateWorkflowActionRow {
  action_id: string;
  action_status: string;
  action_title: string;
  action_description: string | null;
  action_kind: string;
  gate_kind: string;
  priority: string;
  owner: string | null;
  proposed_by: string | null;
  approved_by: string | null;
  action_updated_at: string;
  source_kind: string | null;
  source_id: string | null;
  evidence: string | null;
  action_metadata_json: string | null;
  canvas_id: string;
  canvas_title: string;
  node_id: string | null;
  node_label: string | null;
  review_id: number;
  source_record_id: number;
  review_kind: string;
  review_status: string;
  reason: string | null;
  review_owner: string | null;
  reviewed_by: string | null;
  review_metadata_json: string | null;
  review_created_at: string;
  review_updated_at: string;
  source_type: string;
  source_external_id: string;
  source_name: string | null;
  workspace: string | null;
  record_external_id: string;
  record_title: string | null;
  record_kind: string;
  canonical_type: string;
  substrate_id: string | null;
  identity_state: string;
  migration_state: string;
  record_atlas_canvas_id: string | null;
  record_atlas_node_id: string | null;
  has_binding_gap: number;
  has_relation_island: number;
  latest_receipt_id: number | null;
  latest_receipt_type: string | null;
  latest_receipt_summary: string | null;
  latest_receipt_created_at: string | null;
}

interface SourceUpdateWorkflowActionTransitionRow {
  action_id: string;
  canvas_id: string;
  node_id: string | null;
  status: string;
  source_id: string;
  review_id: number;
  external_id: string;
  title: string | null;
  source_external_id: string;
}

interface ClientProjectionMatch {
  record: SourceRecordProjectionRow;
  reason: string;
  confidence: number;
  evidence_kind: string;
  relation_id: number | null;
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

const FINDING_STATUSES = ['flagged', 'in_progress', 'needs_decision', 'shipped', 'parked'] as const;
const TRIAGE_STATES = ['new', 'categorized', 'linked', 'ignored'] as const;
const NOTIFICATION_STATUSES = ['queued', 'sent', 'skipped', 'failed'] as const;
const LINK_KINDS = ['zendesk', 'airtable', 'slack_thread', 'doc', 'app', 'other'] as const;
const ATLAS_STATUSES = ['run', 'wait', 'stop', 'unknown'] as const;
const ATLAS_NODE_KINDS = ['actor', 'human', 'ai', 'system', 'data', 'constraint', 'touchpoint'] as const;
const WORKFLOW_RUN_STATUSES = ['started', 'succeeded', 'failed', 'skipped', 'blocked'] as const;
const WORKFLOW_RECEIPT_TYPES = ['proof', 'decision', 'handoff', 'sync', 'error', 'note'] as const;
const WORKFLOW_ACTION_KINDS = ['task', 'approval', 'question', 'decision', 'handoff', 'automation'] as const;
const WORKFLOW_ACTION_STATUSES = ['proposed', 'approved', 'rejected', 'ready', 'running', 'completed', 'blocked', 'canceled'] as const;
const WORKFLOW_ACTION_GATES = ['safe', 'review', 'approval'] as const;
const WORKFLOW_ACTION_PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
const SOURCE_UPDATE_ACTION_STATUSES = ['proposed', 'running', 'blocked'] as const;
const SOURCE_RECORD_KINDS = ['database', 'page', 'row', 'block', 'relation', 'other'] as const;
const SOURCE_CANONICAL_TYPES = [
  'client',
  'engagement',
  'workflow',
  'agent',
  'mcp_service',
  'evidence',
  'decision',
  'task',
  'risk',
  'deliverable',
  'milestone',
  'unknown',
] as const;
const SOURCE_IDENTITY_STATES = ['unmapped', 'mapped', 'missing_substrate', 'duplicate', 'blocked'] as const;
const SOURCE_MIGRATION_STATES = ['discovered', 'ready', 'imported', 'skipped', 'error'] as const;
const SOURCE_IMPORT_STATUSES = ['started', 'succeeded', 'failed', 'blocked', 'rate_limited'] as const;
const SOURCE_RELATION_KINDS = ['owns', 'references', 'corresponds_to', 'depends_on', 'blocks', 'related_to'] as const;
const SOURCE_RELATION_EVIDENCE_KINDS = ['imported', 'payload_explicit', 'alias_inferred', 'title_inferred', 'manual'] as const;
const SOURCE_TRANSFER_REVIEW_KINDS = ['binding_gap', 'relation_island', 'source_truth', 'other'] as const;
const SOURCE_TRANSFER_REVIEW_STATUSES = ['open', 'reviewed', 'waived', 'needs_source_update', 'resolved'] as const;
const DEFAULT_RELATION_EXPANSION_CANONICAL_TYPES = ['evidence', 'decision', 'risk', 'task', 'deliverable', 'milestone'] as const;
const CREATE_SOMETHING_NOTION_SOURCES = [
  { name: 'Agents', external_id: '6f43caa1-7c2f-42a0-8576-9058b451ac72' },
  { name: 'Clients', external_id: '761c843e-3e55-4389-a4a0-043e9d0f2e6e' },
  { name: 'Decisions', external_id: 'f7f8e399-c7a4-43ac-9e61-3a448d8610e9' },
  { name: 'Deliverables', external_id: '873f20f8-083d-4aaa-b47b-6adbac793da1' },
  { name: 'Delivery Milestones', external_id: '5545ca40-228b-4e46-80ea-d502e60c1146' },
  { name: 'Engagements', external_id: 'd3873b66-762c-4f3a-bd9e-97267f58faf5' },
  { name: 'Evidence', external_id: '7eda3fac-e224-45c3-8cfd-31527dc748e7' },
  { name: 'MCP Services', external_id: 'd9c214ec-af88-4f25-ae64-3979a8b57ee3' },
  { name: 'Risks / Blockers', external_id: 'b062bb58-87c4-4ec1-8192-52626dad5601' },
  { name: 'Tasks / Actions', external_id: '0fda6783-5c78-40b9-ba71-46b0f93f1c15' },
  { name: 'Workstreams', external_id: '72390229-f6b3-44aa-a2e4-5deb2a55ceb1' },
] as const;

function normalizeSourceExternalId(sourceType: string, externalId: string): string {
  if (sourceType === 'notion_database' && externalId.startsWith('collection://')) {
    return externalId.slice('collection://'.length);
  }
  return externalId;
}

function normalizeSourceRecordExternalId(externalId: string): string {
  const compact = externalId.replace(/-/g, '').trim().toLowerCase();
  const notionId = compact.match(/[0-9a-f]{32}/);
  return notionId ? notionId[0] : externalId;
}

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function hashId(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

function slugId(input: string, fallback = 'record'): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || fallback;
}

function derivedSubstrateId(record: { source_external_id: string; external_id: string; title: string | null; canonical_type: string }): string {
  const label = slugId(record.title ?? record.external_id);
  const suffix = hashId(`${record.source_external_id}:${record.external_id}`);
  return `substrate:${record.canonical_type}:${label}:${suffix}`;
}

function atlasNodeIdForSourceRecord(substrateId: string, externalId: string): string {
  return `source_record_${hashId(`${substrateId}:${externalId}`)}`;
}

function atlasNodeKindForCanonicalType(canonicalType: string): (typeof ATLAS_NODE_KINDS)[number] {
  switch (canonicalType) {
    case 'agent':
      return 'ai';
    case 'mcp_service':
      return 'system';
    case 'client':
      return 'human';
    case 'evidence':
      return 'data';
    case 'decision':
    case 'risk':
      return 'constraint';
    default:
      return 'touchpoint';
  }
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

function atlasStatusFromRecord(record: { identity_state: string; migration_state: string; payload_json: string | null }): (typeof ATLAS_STATUSES)[number] {
  if (record.identity_state === 'blocked' || record.migration_state === 'error') return 'stop';
  const payload = safeParseObject(record.payload_json);
  const status = String(payload.status ?? '').toLowerCase();
  if (['blocked', 'canceled', 'cancelled', 'rejected'].includes(status)) return 'stop';
  if (['next', 'planned', 'waiting', 'review', 'in progress', 'building'].includes(status)) return 'wait';
  if (['active', 'approved', 'accepted', 'complete', 'completed', 'delivered', 'done', 'monitoring'].includes(status)) return 'run';
  return record.identity_state === 'mapped' ? 'run' : 'wait';
}

function textForMatching(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(textForMatching).join(' ');
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(textForMatching).join(' ');
  return '';
}

function normalizeMatchText(value: string): string {
  return ` ${value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

function defaultAliasesForClient(title: string): string[] {
  const aliases = new Set<string>();
  const base = title.replace(/\s+/g, ' ').trim();
  if (base.length >= 4) aliases.add(base);
  const withoutParens = base.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (withoutParens.length >= 4) aliases.add(withoutParens);
  const parenMatches = [...base.matchAll(/\(([^)]*)\)/g)].map((match) => match[1]?.trim()).filter(Boolean) as string[];
  for (const value of parenMatches) {
    if (value.length >= 4) aliases.add(value);
  }
  return [...aliases];
}

function parseAliasMap(value: string | undefined): Record<string, string[]> {
  if (!value) return {};
  const parsed = safeParseObject(value);
  const out: Record<string, string[]> = {};
  for (const [key, aliases] of Object.entries(parsed)) {
    if (Array.isArray(aliases)) {
      out[key] = aliases.map((alias) => String(alias)).filter((alias) => alias.trim().length >= 3);
    }
  }
  return out;
}

function clientRecordMatchReason(client: SourceRecordProjectionRow, record: SourceRecordProjectionRow, aliases: string[]): string | null {
  const haystack = normalizeMatchText(
    [
      record.title ?? '',
      record.substrate_id ?? '',
      record.external_id,
      textForMatching(safeParseObject(record.payload_json)),
    ].join(' '),
  );
  for (const alias of aliases) {
    const normalizedAlias = normalizeMatchText(alias).trim();
    if (normalizedAlias.length >= 3 && haystack.includes(` ${normalizedAlias} `)) {
      return `matched alias "${alias}" for ${client.title ?? client.external_id}`;
    }
  }
  return null;
}

function compactRecordTitle(value: string | null): string {
  return (value ?? '')
    .replace(/^deliverable:\s*/i, '')
    .replace(/^milestone:\s*/i, '')
    .replace(/^[^:]{2,48}:\s*/, '')
    .replace(/[—–-]\s*(active scope|pm lane)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedTitleKey(value: string | null): string {
  return compactRecordTitle(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function relationRank(relation: { evidence_kind: string; confidence: number }): number {
  const evidenceRank = relation.evidence_kind === 'imported' || relation.evidence_kind === 'payload_explicit'
    ? 10
    : relation.evidence_kind === 'manual'
      ? 8
      : relation.evidence_kind === 'title_inferred'
        ? 6
        : 4;
  return evidenceRank + relation.confidence;
}

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
      params.push(limit ?? 100);
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
    'governance_record_source_records',
    'Idempotently record row-level source records from Notion or another database-layer source. Use this before projecting rows into Atlas so identity hygiene, cursor state, and retry/backoff evidence are durable.',
    {
      source_type: z.string().default('notion_database').describe('Source type, e.g. notion_database, notion_page, airtable_table'),
      source_external_id: z.string().describe('Stable source id, e.g. a Notion database id'),
      source_name: z.string().optional(),
      workspace: z.string().optional(),
      atlas_canvas_id: z.string().optional().describe('Canvas this source feeds, if known'),
      source_metadata_json: z.string().optional(),
      run_id: z.string().optional().describe('Stable run id for retrying this import batch'),
      status: z.enum(SOURCE_IMPORT_STATUSES).default('succeeded'),
      cursor_before: z.string().optional(),
      cursor_after: z.string().optional(),
      retry_after_seconds: z.number().int().min(0).optional().describe('Set when the source API rate-limits or asks the agent to back off'),
      error: z.string().optional(),
      payload_json: z.string().optional().describe('Run-level metadata as JSON string'),
      records: z
        .array(
          z.object({
            external_id: z.string().describe('Stable source row/page/block id'),
            parent_external_id: z.string().optional(),
            record_kind: z.enum(SOURCE_RECORD_KINDS).default('row'),
            title: z.string().optional(),
            canonical_type: z.enum(SOURCE_CANONICAL_TYPES).default('unknown'),
            substrate_id: z.string().optional().describe('CREATE SOMETHING canonical id when known'),
            atlas_canvas_id: z.string().optional(),
            atlas_node_id: z.string().optional(),
            identity_state: z.enum(SOURCE_IDENTITY_STATES).optional(),
            migration_state: z.enum(SOURCE_MIGRATION_STATES).optional(),
            source_updated_at: z.string().optional(),
            payload_json: z.string().optional().describe('Raw source row payload as JSON string'),
            error: z.string().optional(),
          }),
        )
        .default([]),
      actor: z.string().default('claude-code'),
    },
    async (input) => {
      const db = getDb();
      const sourceExternalId = normalizeSourceExternalId(input.source_type, input.source_external_id);
      const sourceName = input.source_name ?? `${input.source_type}:${sourceExternalId}`;
      await db
        .prepare(
          `INSERT INTO sources (source_type, external_id, name, workspace, atlas_canvas_id, metadata_json)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (source_type, external_id)
           DO UPDATE SET
             name = COALESCE(excluded.name, sources.name),
             workspace = COALESCE(excluded.workspace, sources.workspace),
             atlas_canvas_id = COALESCE(excluded.atlas_canvas_id, sources.atlas_canvas_id),
             metadata_json = COALESCE(excluded.metadata_json, sources.metadata_json)`,
        )
        .bind(
          input.source_type,
          sourceExternalId,
          sourceName,
          input.workspace ?? null,
          input.atlas_canvas_id ?? null,
          input.source_metadata_json ?? null,
        )
        .run();

      const source = await db
        .prepare('SELECT id FROM sources WHERE source_type = ? AND external_id = ?')
        .bind(input.source_type, sourceExternalId)
        .first<{ id: number }>();
      if (!source) {
        return json({ ok: false, error: `Unable to resolve source ${input.source_type}/${sourceExternalId}.` });
      }

      let upserted = 0;
      let missingSubstrate = 0;
      let errorCount = 0;
      for (const record of input.records) {
        const identityState = record.identity_state ?? (record.substrate_id ? 'mapped' : 'missing_substrate');
        const migrationState = record.migration_state ?? (record.error ? 'error' : record.substrate_id ? 'ready' : 'discovered');
        if (!record.substrate_id || identityState === 'missing_substrate') missingSubstrate += 1;
        if (record.error || migrationState === 'error') errorCount += 1;

        const result = await db
          .prepare(
            `INSERT INTO source_records (
               source_id, external_id, parent_external_id, record_kind, title, canonical_type,
               substrate_id, atlas_canvas_id, atlas_node_id, identity_state, migration_state,
               source_updated_at, payload_json, error
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (source_id, external_id)
             DO UPDATE SET
               parent_external_id = COALESCE(excluded.parent_external_id, source_records.parent_external_id),
               record_kind = excluded.record_kind,
               title = COALESCE(excluded.title, source_records.title),
               canonical_type = excluded.canonical_type,
               substrate_id = COALESCE(excluded.substrate_id, source_records.substrate_id),
               atlas_canvas_id = COALESCE(excluded.atlas_canvas_id, source_records.atlas_canvas_id),
               atlas_node_id = COALESCE(excluded.atlas_node_id, source_records.atlas_node_id),
               identity_state = excluded.identity_state,
               migration_state = excluded.migration_state,
               source_updated_at = COALESCE(excluded.source_updated_at, source_records.source_updated_at),
               last_seen_at = datetime('now'),
               payload_json = COALESCE(excluded.payload_json, source_records.payload_json),
               error = excluded.error,
               updated_at = datetime('now')`,
          )
          .bind(
            source.id,
            record.external_id,
            record.parent_external_id ?? null,
            record.record_kind,
            record.title ?? null,
            record.canonical_type,
            record.substrate_id ?? null,
            record.atlas_canvas_id ?? input.atlas_canvas_id ?? null,
            record.atlas_node_id ?? null,
            identityState,
            migrationState,
            record.source_updated_at ?? null,
            record.payload_json ?? null,
            record.error ?? null,
          )
          .run();
        upserted += result.meta.changes ?? 0;
      }

      const runId = input.run_id ?? crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO source_import_runs (
             run_id, source_id, status, actor, cursor_before, cursor_after, retry_after_seconds,
             received, upserted, missing_substrate, error_count, error, payload_json, completed_at
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'started' THEN NULL ELSE datetime('now') END)
           ON CONFLICT (run_id)
           DO UPDATE SET
             status = excluded.status,
             cursor_after = COALESCE(excluded.cursor_after, source_import_runs.cursor_after),
             retry_after_seconds = excluded.retry_after_seconds,
             received = excluded.received,
             upserted = excluded.upserted,
             missing_substrate = excluded.missing_substrate,
             error_count = excluded.error_count,
             error = excluded.error,
             payload_json = COALESCE(excluded.payload_json, source_import_runs.payload_json),
             completed_at = excluded.completed_at,
             updated_at = datetime('now')`,
        )
        .bind(
          runId,
          source.id,
          input.status,
          input.actor,
          input.cursor_before ?? null,
          input.cursor_after ?? null,
          input.retry_after_seconds ?? null,
          input.records.length,
          upserted,
          missingSubstrate,
          errorCount,
          input.error ?? null,
          input.payload_json ?? null,
          input.status,
        )
        .run();

      const cursorValue = input.cursor_after ?? (input.status === 'succeeded' ? runId : undefined);
      if (cursorValue) {
        await db
          .prepare(
            `INSERT INTO sync_cursors (source_type, source_external_id, cursor_value, last_synced_at, synced_by, metadata_json)
             VALUES (?, ?, ?, datetime('now'), ?, ?)
             ON CONFLICT (source_type, source_external_id)
             DO UPDATE SET
               cursor_value = excluded.cursor_value,
               last_synced_at = excluded.last_synced_at,
               synced_by = excluded.synced_by,
               metadata_json = COALESCE(excluded.metadata_json, sync_cursors.metadata_json)`,
          )
          .bind(input.source_type, sourceExternalId, cursorValue, input.actor, input.payload_json ?? null)
          .run();
      }

      await logEvent(db, input.actor, 'record_source_records', 'source', sourceExternalId, {
        run_id: runId,
        source_type: input.source_type,
        received: input.records.length,
        upserted,
        missing_substrate: missingSubstrate,
        status: input.status,
        retry_after_seconds: input.retry_after_seconds ?? null,
      });

      return json({
        ok: true,
        run_id: runId,
        source_id: source.id,
        received: input.records.length,
        upserted,
        missing_substrate: missingSubstrate,
        error_count: errorCount,
        cursor_after: input.cursor_after ?? null,
        retry_after_seconds: input.retry_after_seconds ?? null,
        status: input.status,
      });
    },
  );

  server.tool(
    'governance_list_source_records',
    'List row-level source records captured for migration. Use missing_substrate=true to find identity hygiene work before Atlas/client projection.',
    {
      source_type: z.string().optional(),
      source_external_id: z.string().optional(),
      canonical_type: z.enum(SOURCE_CANONICAL_TYPES).optional(),
      identity_state: z.enum(SOURCE_IDENTITY_STATES).optional(),
      migration_state: z.enum(SOURCE_MIGRATION_STATES).optional(),
      missing_substrate: z.boolean().optional(),
      atlas_canvas_id: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    },
    async ({ source_type, source_external_id, canonical_type, identity_state, migration_state, missing_substrate, atlas_canvas_id, search, limit }) => {
      const db = getDb();
      const normalizedSourceExternalId = source_external_id && source_type
        ? normalizeSourceExternalId(source_type, source_external_id)
        : source_external_id;
      const where: string[] = [];
      const params: unknown[] = [];
      if (source_type) {
        where.push('s.source_type = ?');
        params.push(source_type);
      }
      if (normalizedSourceExternalId) {
        where.push('s.external_id = ?');
        params.push(normalizedSourceExternalId);
      }
      if (canonical_type) {
        where.push('r.canonical_type = ?');
        params.push(canonical_type);
      }
      if (identity_state) {
        where.push('r.identity_state = ?');
        params.push(identity_state);
      }
      if (migration_state) {
        where.push('r.migration_state = ?');
        params.push(migration_state);
      }
      if (missing_substrate !== undefined) {
        where.push(missing_substrate ? '(r.substrate_id IS NULL OR r.substrate_id = \'\')' : "(r.substrate_id IS NOT NULL AND r.substrate_id != '')");
      }
      if (atlas_canvas_id) {
        where.push('r.atlas_canvas_id = ?');
        params.push(atlas_canvas_id);
      }
      if (search) {
        where.push('(r.title LIKE ? OR r.external_id LIKE ? OR r.substrate_id LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      const result = await db
        .prepare(
          `SELECT r.*, s.source_type, s.external_id AS source_external_id, s.name AS source_name
           FROM source_records r
           JOIN sources s ON s.id = r.source_id
           ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
           ORDER BY r.updated_at DESC, r.id DESC
           LIMIT ?`,
        )
        .bind(...params, limit)
        .all();
      return json(result.results);
    },
  );

  server.tool(
    'governance_source_hygiene',
    'Summarize source-record migration health: identity gaps, migration states, recent import runs, and cursor/backoff state.',
    {
      source_type: z.string().optional(),
      source_external_id: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(10),
    },
    async ({ source_type, source_external_id, limit }) => {
      const db = getDb();
      const normalizedSourceExternalId = source_external_id && source_type
        ? normalizeSourceExternalId(source_type, source_external_id)
        : source_external_id;
      const sourceWhere: string[] = [];
      const sourceParams: unknown[] = [];
      if (source_type) {
        sourceWhere.push('s.source_type = ?');
        sourceParams.push(source_type);
      }
      if (normalizedSourceExternalId) {
        sourceWhere.push('s.external_id = ?');
        sourceParams.push(normalizedSourceExternalId);
      }
      const sourceClause = sourceWhere.length ? `WHERE ${sourceWhere.join(' AND ')}` : '';

      const [sources, byCanonical, byIdentity, byMigration, recentRuns] = await Promise.all([
        db
          .prepare(
            `SELECT s.source_type, s.external_id, s.name, s.workspace,
                    c.cursor_value, c.last_synced_at, c.synced_by,
                    COUNT(r.id) AS records,
                    SUM(CASE WHEN r.id IS NOT NULL AND (r.substrate_id IS NULL OR r.substrate_id = '') THEN 1 ELSE 0 END) AS missing_substrate
             FROM sources s
             LEFT JOIN sync_cursors c ON c.source_type = s.source_type AND c.source_external_id = s.external_id
             LEFT JOIN source_records r ON r.source_id = s.id
             ${sourceClause}
             GROUP BY s.id
             ORDER BY s.source_type, s.name`,
          )
          .bind(...sourceParams)
          .all(),
        db
          .prepare(
            `SELECT s.source_type, s.external_id, r.canonical_type AS key, COUNT(*) AS n
             FROM source_records r JOIN sources s ON s.id = r.source_id
             ${sourceClause}
             GROUP BY s.source_type, s.external_id, r.canonical_type
             ORDER BY s.source_type, s.external_id, r.canonical_type`,
          )
          .bind(...sourceParams)
          .all(),
        db
          .prepare(
            `SELECT s.source_type, s.external_id, r.identity_state AS key, COUNT(*) AS n
             FROM source_records r JOIN sources s ON s.id = r.source_id
             ${sourceClause}
             GROUP BY s.source_type, s.external_id, r.identity_state
             ORDER BY s.source_type, s.external_id, r.identity_state`,
          )
          .bind(...sourceParams)
          .all(),
        db
          .prepare(
            `SELECT s.source_type, s.external_id, r.migration_state AS key, COUNT(*) AS n
             FROM source_records r JOIN sources s ON s.id = r.source_id
             ${sourceClause}
             GROUP BY s.source_type, s.external_id, r.migration_state
             ORDER BY s.source_type, s.external_id, r.migration_state`,
          )
          .bind(...sourceParams)
          .all(),
        db
          .prepare(
            `SELECT ir.run_id, s.source_type, s.external_id AS source_external_id, ir.status, ir.actor,
                    ir.cursor_before, ir.cursor_after, ir.retry_after_seconds,
                    ir.received, ir.upserted, ir.missing_substrate, ir.error_count, ir.error,
                    ir.started_at, ir.completed_at, ir.updated_at
             FROM source_import_runs ir
             JOIN sources s ON s.id = ir.source_id
             ${sourceClause}
             ORDER BY ir.updated_at DESC
             LIMIT ?`,
          )
          .bind(...sourceParams, limit)
          .all(),
      ]);

      return json({
        sources: sources.results,
        by_canonical_type: byCanonical.results,
        by_identity_state: byIdentity.results,
        by_migration_state: byMigration.results,
        recent_runs: recentRuns.results,
      });
    },
  );

  server.tool(
    'governance_get_notion_transfer_audit',
    'Audit CREATE SOMETHING Notion-to-Atlas transfer completeness across expected Notion databases: captured records, identity coverage, Atlas bindings, relation coverage, and recent import state.',
    {
      source_external_id: z.string().optional(),
      include_expected_empty: z.boolean().default(true),
    },
    async ({ source_external_id, include_expected_empty }) => {
      const db = getDb();
      const normalizedSourceExternalId = source_external_id
        ? normalizeSourceExternalId('notion_database', source_external_id)
        : undefined;
      const where = ["s.source_type = 'notion_database'"];
      const params: unknown[] = [];
      if (normalizedSourceExternalId) {
        where.push('s.external_id = ?');
        params.push(normalizedSourceExternalId);
      }

      const [sourceRows, importRows] = await Promise.all([
        db
          .prepare(
            `SELECT s.id, s.name, s.external_id, s.workspace, s.atlas_canvas_id,
                    c.cursor_value, c.last_synced_at, c.synced_by,
                    (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id) AS records,
                    (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id AND r.substrate_id IS NOT NULL AND r.substrate_id != '') AS mapped_records,
                    (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id AND r.migration_state = 'ready') AS ready_records,
                    (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id AND r.migration_state = 'error') AS error_records,
                    (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id AND (r.substrate_id IS NULL OR r.substrate_id = '' OR r.identity_state IN ('missing_substrate', 'blocked', 'duplicate'))) AS identity_gaps,
                    (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id AND r.atlas_canvas_id IS NOT NULL AND r.atlas_node_id IS NOT NULL) AS source_projected_records,
	                    (SELECT COUNT(DISTINCT b.source_record_id)
	                       FROM source_record_atlas_bindings b
	                       JOIN source_records r ON r.id = b.source_record_id
	                      WHERE r.source_id = s.id) AS bound_records,
	                    (SELECT COUNT(*)
	                       FROM source_records r
	                      WHERE r.source_id = s.id
	                        AND NOT EXISTS (
	                          SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id
	                        )) AS unbound_records,
	                    (SELECT COUNT(*)
	                       FROM source_records r
	                       JOIN source_record_transfer_reviews review
	                         ON review.source_record_id = r.id
	                        AND review.review_kind = 'binding_gap'
	                        AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
	                      WHERE r.source_id = s.id
	                        AND NOT EXISTS (
	                          SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id
	                        )) AS reviewed_unbound_records,
	                    (SELECT COUNT(*)
	                       FROM source_record_relations rel
	                       JOIN source_records r ON r.id = rel.source_record_id
	                      WHERE r.source_id = s.id) AS outgoing_relations,
	                    (SELECT COUNT(*)
	                       FROM source_record_relations rel
	                       JOIN source_records r ON r.id = rel.target_source_record_id
	                      WHERE r.source_id = s.id) AS incoming_relations,
	                    (SELECT COUNT(*)
	                       FROM source_records r
	                      WHERE r.source_id = s.id
	                        AND NOT EXISTS (
	                          SELECT 1
	                          FROM source_record_relations rel
	                          WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
	                        )) AS relation_isolated_records,
	                    (SELECT COUNT(*)
	                       FROM source_records r
	                       JOIN source_record_transfer_reviews review
	                         ON review.source_record_id = r.id
	                        AND review.review_kind = 'relation_island'
	                        AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
	                      WHERE r.source_id = s.id
	                        AND NOT EXISTS (
	                          SELECT 1
	                          FROM source_record_relations rel
	                          WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
	                        )) AS reviewed_relation_isolated_records,
	                    (SELECT COUNT(*)
	                       FROM source_record_relations rel
	                       JOIN source_records r ON r.id = rel.source_record_id
	                      WHERE r.source_id = s.id AND rel.evidence_kind = 'imported') AS imported_relations
             FROM sources s
             LEFT JOIN sync_cursors c ON c.source_type = s.source_type AND c.source_external_id = s.external_id
             WHERE ${where.join(' AND ')}
             ORDER BY s.name`,
          )
          .bind(...params)
          .all<Record<string, unknown> & { external_id: string; name: string }>(),
        db
          .prepare(
            `SELECT s.external_id, ir.run_id, ir.status, ir.actor, ir.received, ir.upserted,
                    ir.missing_substrate, ir.error_count, ir.retry_after_seconds, ir.updated_at
             FROM source_import_runs ir
             JOIN sources s ON s.id = ir.source_id
             WHERE ${where.join(' AND ')}
             ORDER BY ir.updated_at DESC`,
          )
          .bind(...params)
          .all<Record<string, unknown> & { external_id: string }>(),
      ]);

      const latestRunBySource = new Map<string, Record<string, unknown>>();
      for (const run of importRows.results) {
        if (!latestRunBySource.has(run.external_id)) latestRunBySource.set(run.external_id, run);
      }

      const rowByExternalId = new Map(sourceRows.results.map((row) => [row.external_id, row]));
      const expected = normalizedSourceExternalId
        ? CREATE_SOMETHING_NOTION_SOURCES.filter((source) => normalizeSourceExternalId('notion_database', source.external_id) === normalizedSourceExternalId)
        : CREATE_SOMETHING_NOTION_SOURCES;
      const sourceList = include_expected_empty
        ? expected.map((expectedSource) => rowByExternalId.get(expectedSource.external_id) ?? { ...expectedSource, id: null })
        : sourceRows.results;

      const sources = sourceList.map((row) => {
        const externalId = String(row.external_id);
        const records = Number(row.records ?? 0);
        const mappedRecords = Number(row.mapped_records ?? 0);
        const sourceProjectedRecords = Number(row.source_projected_records ?? 0);
        const boundRecords = Number(row.bound_records ?? 0);
        const unboundRecords = Number(row.unbound_records ?? Math.max(0, records - boundRecords));
        const reviewedUnboundRecords = Number(row.reviewed_unbound_records ?? 0);
        const outgoingRelations = Number(row.outgoing_relations ?? 0);
        const incomingRelations = Number(row.incoming_relations ?? 0);
        const relationIsolatedRecords = Number(row.relation_isolated_records ?? 0);
        const reviewedRelationIsolatedRecords = Number(row.reviewed_relation_isolated_records ?? 0);
        const captured = records > 0;
        const identityComplete = captured && Number(row.identity_gaps ?? 0) === 0 && mappedRecords === records;
        const sourceProjected = captured && sourceProjectedRecords === records;
        const hasAtlasBindings = boundRecords > 0;
        const hasRelations = outgoingRelations + incomingRelations > 0;
        const state = !captured
          ? 'missing'
          : Number(row.error_records ?? 0) > 0
            ? 'error'
            : !identityComplete
              ? 'identity_gaps'
              : !sourceProjected
                ? 'projection_gaps'
                : 'ready';
        return {
          name: row.name,
          external_id: externalId,
          workspace: row.workspace ?? null,
          atlas_canvas_id: row.atlas_canvas_id ?? null,
          cursor_value: row.cursor_value ?? null,
          last_synced_at: row.last_synced_at ?? null,
          synced_by: row.synced_by ?? null,
          records,
          mapped_records: mappedRecords,
          ready_records: Number(row.ready_records ?? 0),
          error_records: Number(row.error_records ?? 0),
          identity_gaps: Number(row.identity_gaps ?? 0),
          source_projected_records: sourceProjectedRecords,
          bound_records: boundRecords,
          unbound_records: unboundRecords,
          reviewed_unbound_records: reviewedUnboundRecords,
          outgoing_relations: outgoingRelations,
          incoming_relations: incomingRelations,
          relation_isolated_records: relationIsolatedRecords,
          reviewed_relation_isolated_records: reviewedRelationIsolatedRecords,
          imported_relations: Number(row.imported_relations ?? 0),
          latest_import_run: latestRunBySource.get(externalId) ?? null,
          transfer_state: state,
          captured,
          identity_complete: identityComplete,
          source_projected: sourceProjected,
          has_atlas_bindings: hasAtlasBindings,
          has_relations: hasRelations,
        };
      });

      const summary = sources.reduce(
        (acc, source) => {
          acc.expected_sources += 1;
          acc.captured_sources += source.captured ? 1 : 0;
          acc.ready_sources += source.transfer_state === 'ready' ? 1 : 0;
          acc.records += source.records;
          acc.identity_gaps += source.identity_gaps;
          acc.source_projection_gaps += Math.max(0, source.records - source.source_projected_records);
          acc.binding_gaps += source.bound_records > 0 || source.records === 0 ? 0 : 1;
          acc.unbound_records += source.unbound_records;
          acc.reviewed_unbound_records += source.reviewed_unbound_records;
          acc.relation_gaps += source.has_relations || source.records === 0 ? 0 : 1;
          acc.relation_isolated_records += source.relation_isolated_records;
          acc.reviewed_relation_isolated_records += source.reviewed_relation_isolated_records;
          acc.outgoing_relations += source.outgoing_relations;
          acc.incoming_relations += source.incoming_relations;
          acc.imported_relations += source.imported_relations;
          return acc;
        },
        {
          expected_sources: 0,
          captured_sources: 0,
          ready_sources: 0,
          records: 0,
          identity_gaps: 0,
          source_projection_gaps: 0,
          binding_gaps: 0,
          unbound_records: 0,
          reviewed_unbound_records: 0,
          relation_gaps: 0,
          relation_isolated_records: 0,
          reviewed_relation_isolated_records: 0,
          outgoing_relations: 0,
          incoming_relations: 0,
          imported_relations: 0,
        },
      );

      return json({ ok: true, summary, sources });
    },
  );

  server.tool(
    'governance_get_notion_transfer_readiness',
    'Return an explicit readiness verdict for the CREATE SOMETHING Notion-to-Atlas transfer. Use this before claiming the product dogfood migration is ready for client-map rollout.',
    {
      include_sources: z.boolean().default(true),
    },
    async ({ include_sources }) => {
      const db = getDb();
      const [sourceRows, importRows, reviewRows, actionRows, clientMapRows] = await Promise.all([
        db
          .prepare(
            `SELECT s.id, s.name, s.external_id, s.workspace,
                    (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id) AS records,
                    (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id AND r.substrate_id IS NOT NULL AND r.substrate_id != '') AS mapped_records,
                    (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id AND (r.substrate_id IS NULL OR r.substrate_id = '' OR r.identity_state IN ('missing_substrate', 'blocked', 'duplicate'))) AS identity_gaps,
                    (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id AND r.atlas_canvas_id IS NOT NULL AND r.atlas_node_id IS NOT NULL) AS source_projected_records,
                    (SELECT COUNT(DISTINCT b.source_record_id)
                       FROM source_record_atlas_bindings b
                       JOIN source_records r ON r.id = b.source_record_id
                      WHERE r.source_id = s.id) AS bound_records,
                    (SELECT COUNT(*)
                       FROM source_records r
                      WHERE r.source_id = s.id
                        AND NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)) AS unbound_records,
                    (SELECT COUNT(*)
                       FROM source_records r
                       JOIN source_record_transfer_reviews review
                         ON review.source_record_id = r.id
                        AND review.review_kind = 'binding_gap'
                        AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
                      WHERE r.source_id = s.id
                        AND NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)) AS reviewed_unbound_records,
                    (SELECT COUNT(*)
                       FROM source_records r
                      WHERE r.source_id = s.id
                        AND NOT EXISTS (
                          SELECT 1
                          FROM source_record_relations rel
                          WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                        )) AS relation_isolated_records,
                    (SELECT COUNT(*)
                       FROM source_records r
                       JOIN source_record_transfer_reviews review
                         ON review.source_record_id = r.id
                        AND review.review_kind = 'relation_island'
                        AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
                      WHERE r.source_id = s.id
                        AND NOT EXISTS (
                          SELECT 1
                          FROM source_record_relations rel
                          WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                        )) AS reviewed_relation_isolated_records,
                    (SELECT COUNT(*)
                       FROM source_record_relations rel
                       JOIN source_records r ON r.id = rel.source_record_id
                      WHERE r.source_id = s.id) AS outgoing_relations,
                    (SELECT COUNT(*)
                       FROM source_record_relations rel
                       JOIN source_records r ON r.id = rel.target_source_record_id
                      WHERE r.source_id = s.id) AS incoming_relations
             FROM sources s
             WHERE s.source_type = 'notion_database'
             ORDER BY s.name`,
          )
          .all<Record<string, unknown> & { external_id: string; name: string }>(),
        db
          .prepare(
            `SELECT s.external_id, ir.run_id, ir.status, ir.error, ir.updated_at
             FROM source_import_runs ir
             JOIN sources s ON s.id = ir.source_id
             WHERE s.source_type = 'notion_database'
             ORDER BY ir.updated_at DESC`,
          )
          .all<Record<string, unknown> & { external_id: string }>(),
        db
          .prepare(
            `SELECT status, review_kind, COUNT(*) AS n
             FROM source_record_transfer_reviews
             GROUP BY status, review_kind
             ORDER BY status, review_kind`,
          )
          .all<{ status: string; review_kind: string; n: number }>(),
        db
          .prepare(
            `SELECT action.status, review.review_kind, COUNT(*) AS n
             FROM workflow_actions action
             JOIN source_record_transfer_reviews review
               ON action.source_kind = 'source_record_transfer_review'
              AND action.source_id = CAST(review.id AS TEXT)
             WHERE review.status = 'needs_source_update'
             GROUP BY action.status, review.review_kind
             ORDER BY action.status, review.review_kind`,
          )
          .all<{ status: string; review_kind: string; n: number }>(),
        db
          .prepare(
            `SELECT COUNT(*) AS client_map_count,
                    COALESCE(SUM(node_count), 0) AS client_map_nodes,
                    COALESCE(SUM(edge_count), 0) AS client_map_edges
             FROM (
               SELECT c.canvas_id,
                      COUNT(DISTINCT n.node_id) AS node_count,
                      COUNT(DISTINCT e.edge_id) AS edge_count
               FROM atlas_canvases c
               LEFT JOIN atlas_nodes n ON n.canvas_id = c.canvas_id
               LEFT JOIN atlas_edges e ON e.canvas_id = c.canvas_id
               WHERE c.workflow = 'Client workflow source projection'
               GROUP BY c.canvas_id
             )`,
          )
          .first<{ client_map_count: number; client_map_nodes: number; client_map_edges: number }>(),
      ]);

      const latestRunBySource = new Map<string, Record<string, unknown>>();
      for (const run of importRows.results) {
        if (!latestRunBySource.has(run.external_id)) latestRunBySource.set(run.external_id, run);
      }

      const rowByExternalId = new Map(sourceRows.results.map((row) => [row.external_id, row]));
      const sources = CREATE_SOMETHING_NOTION_SOURCES.map((expectedSource) => {
        const row = rowByExternalId.get(expectedSource.external_id) ?? { ...expectedSource, id: null };
        const records = Number(row.records ?? 0);
        const mappedRecords = Number(row.mapped_records ?? 0);
        const sourceProjectedRecords = Number(row.source_projected_records ?? 0);
        const unboundRecords = Number(row.unbound_records ?? 0);
        const reviewedUnboundRecords = Number(row.reviewed_unbound_records ?? 0);
        const relationIsolatedRecords = Number(row.relation_isolated_records ?? 0);
        const reviewedRelationIsolatedRecords = Number(row.reviewed_relation_isolated_records ?? 0);
        return {
          name: row.name,
          external_id: String(row.external_id),
          captured: records > 0,
          records,
          mapped_records: mappedRecords,
          identity_gaps: Number(row.identity_gaps ?? 0),
          source_projected_records: sourceProjectedRecords,
          source_projection_gaps: Math.max(0, records - sourceProjectedRecords),
          bound_records: Number(row.bound_records ?? 0),
          unbound_records: unboundRecords,
          reviewed_unbound_records: reviewedUnboundRecords,
          unreviewed_unbound_records: Math.max(0, unboundRecords - reviewedUnboundRecords),
          outgoing_relations: Number(row.outgoing_relations ?? 0),
          incoming_relations: Number(row.incoming_relations ?? 0),
          relation_isolated_records: relationIsolatedRecords,
          reviewed_relation_isolated_records: reviewedRelationIsolatedRecords,
          unreviewed_relation_islands: Math.max(0, relationIsolatedRecords - reviewedRelationIsolatedRecords),
          latest_import_run: latestRunBySource.get(String(row.external_id)) ?? null,
        };
      });

      const summary = sources.reduce(
        (acc, source) => {
          acc.expected_sources += 1;
          acc.captured_sources += source.captured ? 1 : 0;
          acc.records += source.records;
          acc.identity_gaps += source.identity_gaps;
          acc.source_projection_gaps += source.source_projection_gaps;
          acc.unbound_records += source.unbound_records;
          acc.reviewed_unbound_records += source.reviewed_unbound_records;
          acc.unreviewed_unbound_records += source.unreviewed_unbound_records;
          acc.relation_isolated_records += source.relation_isolated_records;
          acc.reviewed_relation_isolated_records += source.reviewed_relation_isolated_records;
          acc.unreviewed_relation_islands += source.unreviewed_relation_islands;
          return acc;
        },
        {
          expected_sources: 0,
          captured_sources: 0,
          records: 0,
          identity_gaps: 0,
          source_projection_gaps: 0,
          unbound_records: 0,
          reviewed_unbound_records: 0,
          unreviewed_unbound_records: 0,
          relation_isolated_records: 0,
          reviewed_relation_isolated_records: 0,
          unreviewed_relation_islands: 0,
        },
      );

      const reviewCounts = reviewRows.results.map((row) => ({ status: row.status, review_kind: row.review_kind, n: row.n }));
      const actionCounts = actionRows.results.map((row) => ({ status: row.status, review_kind: row.review_kind, n: row.n }));
      const needsSourceUpdateReviews = reviewRows.results
        .filter((row) => row.status === 'needs_source_update')
        .reduce((sum, row) => sum + Number(row.n), 0);
      const openSourceUpdateActions = actionRows.results
        .filter((row) => ['proposed', 'approved', 'ready', 'running', 'blocked'].includes(row.status))
        .reduce((sum, row) => sum + Number(row.n), 0);

      const blockers: Array<Record<string, unknown>> = [];
      const warnings: Array<Record<string, unknown>> = [];
      if (summary.captured_sources < summary.expected_sources) {
        blockers.push({
          kind: 'missing_sources',
          message: `${summary.expected_sources - summary.captured_sources} expected Notion source(s) have no captured records.`,
        });
      }
      if (summary.identity_gaps > 0) {
        blockers.push({ kind: 'identity_gaps', message: `${summary.identity_gaps} source record(s) still lack clean canonical identity.` });
      }
      if (summary.source_projection_gaps > 0) {
        blockers.push({ kind: 'projection_gaps', message: `${summary.source_projection_gaps} source record(s) are not projected into the source-led Atlas map.` });
      }
      if (summary.unreviewed_unbound_records > 0) {
        blockers.push({
          kind: 'unreviewed_binding_gaps',
          message: `${summary.unreviewed_unbound_records} unbound source record(s) still need review, waiver, source update, or binding repair.`,
        });
      }
      if (summary.unreviewed_relation_islands > 0) {
        blockers.push({
          kind: 'unreviewed_relation_islands',
          message: `${summary.unreviewed_relation_islands} relation-isolated source record(s) still need review, waiver, source update, or relation repair.`,
        });
      }
      if (needsSourceUpdateReviews > 0) {
        blockers.push({
          kind: 'source_update_reviews',
          message: `${needsSourceUpdateReviews} transfer review(s) are still marked needs_source_update.`,
          counts: reviewCounts.filter((row) => row.status === 'needs_source_update'),
        });
      }
      if (openSourceUpdateActions > 0) {
        blockers.push({
          kind: 'open_source_update_actions',
          message: `${openSourceUpdateActions} source-update workflow action(s) are still open.`,
          counts: actionCounts,
        });
      }

      const importWarnings = sources
        .filter((source) => {
          const status = String(source.latest_import_run?.status ?? '');
          return status === 'failed' || status === 'rate_limited';
        })
        .map((source) => ({
          source: source.name,
          status: source.latest_import_run?.status,
          run_id: source.latest_import_run?.run_id,
          updated_at: source.latest_import_run?.updated_at,
        }));
      if (importWarnings.length) {
        warnings.push({
          kind: 'latest_import_not_clean',
          message: `${importWarnings.length} source(s) have latest import runs that are failed or rate-limited; prior captured records may still be usable.`,
          sources: importWarnings,
        });
      }

      const clientsSource = sources.find((source) => source.name === 'Clients');
      if (clientsSource && Number(clientMapRows?.client_map_count ?? 0) < clientsSource.records) {
        warnings.push({
          kind: 'client_map_coverage_requires_judgment',
          message: `${clientMapRows?.client_map_count ?? 0} client workflow map(s) exist for ${clientsSource.records} captured client row(s). Confirm which client rows should become rollout maps.`,
        });
      }

      return json({
        ok: true,
        ready: blockers.length === 0,
        verdict: blockers.length === 0 ? 'ready' : 'not_ready',
        summary,
        review_counts: reviewCounts,
        source_update_action_counts: actionCounts,
        client_maps: clientMapRows ?? { client_map_count: 0, client_map_nodes: 0, client_map_edges: 0 },
        blockers,
        warnings,
        sources: include_sources ? sources : undefined,
      });
    },
  );

  server.tool(
    'governance_list_notion_transfer_readiness_blockers',
    'List the concrete rows and actions behind the Notion transfer readiness blockers: unreviewed binding gaps, unreviewed relation islands, and open source-update workflow actions.',
    {
      blocker_kind: z.enum(['all', 'binding_gap', 'relation_island', 'source_update_action']).default('all'),
      source_external_id: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    },
    async ({ blocker_kind, source_external_id, limit }) => {
      const db = getDb();
      const normalizedSourceExternalId = source_external_id ? normalizeSourceExternalId('notion_database', source_external_id) : null;

      const sourceFilter = normalizedSourceExternalId ? 'AND s.external_id = ?' : '';
      const sourceParams = normalizedSourceExternalId ? [normalizedSourceExternalId] : [];
      const result: Record<string, unknown> = {
        ok: true,
        blocker_kind,
        source_external_id: normalizedSourceExternalId,
      };

      if (blocker_kind === 'all' || blocker_kind === 'binding_gap') {
        const [count, rows] = await Promise.all([
          db
            .prepare(
              `SELECT COUNT(*) AS n
               FROM source_records r
               JOIN sources s ON s.id = r.source_id
               WHERE s.source_type = 'notion_database'
                 ${sourceFilter}
                 AND NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)
                 AND NOT EXISTS (
                   SELECT 1
                   FROM source_record_transfer_reviews review
                   WHERE review.source_record_id = r.id
                     AND review.review_kind = 'binding_gap'
                     AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
                 )`,
            )
            .bind(...sourceParams)
            .first<{ n: number }>(),
          db
            .prepare(
              `SELECT 'binding_gap' AS blocker_kind,
                      r.id AS source_record_id,
                      s.name AS source_name,
                      s.external_id AS source_external_id,
                      r.external_id,
                      r.title,
                      r.canonical_type,
                      r.substrate_id,
                      r.atlas_canvas_id,
                      r.atlas_node_id,
                      review.id AS open_review_id,
                      review.status AS open_review_status,
                      CASE WHEN EXISTS (
                        SELECT 1
                        FROM source_record_relations rel
                        WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                      ) THEN 0 ELSE 1 END AS has_relation_island
               FROM source_records r
               JOIN sources s ON s.id = r.source_id
               LEFT JOIN source_record_transfer_reviews review
                 ON review.source_record_id = r.id
                AND review.review_kind = 'binding_gap'
                AND review.status = 'open'
               WHERE s.source_type = 'notion_database'
                 ${sourceFilter}
                 AND NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)
                 AND NOT EXISTS (
                   SELECT 1
                   FROM source_record_transfer_reviews reviewed
                   WHERE reviewed.source_record_id = r.id
                     AND reviewed.review_kind = 'binding_gap'
                     AND reviewed.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
                 )
               ORDER BY s.name, r.canonical_type, r.title, r.external_id
               LIMIT ?`,
            )
            .bind(...sourceParams, limit)
            .all(),
        ]);
        result.binding_gaps = { total: Number(count?.n ?? 0), rows: rows.results };
      }

      if (blocker_kind === 'all' || blocker_kind === 'relation_island') {
        const [count, rows] = await Promise.all([
          db
            .prepare(
              `SELECT COUNT(*) AS n
               FROM source_records r
               JOIN sources s ON s.id = r.source_id
               WHERE s.source_type = 'notion_database'
                 ${sourceFilter}
                 AND NOT EXISTS (
                   SELECT 1
                   FROM source_record_relations rel
                   WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                 )
                 AND NOT EXISTS (
                   SELECT 1
                   FROM source_record_transfer_reviews review
                   WHERE review.source_record_id = r.id
                     AND review.review_kind = 'relation_island'
                     AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
                 )`,
            )
            .bind(...sourceParams)
            .first<{ n: number }>(),
          db
            .prepare(
              `SELECT 'relation_island' AS blocker_kind,
                      r.id AS source_record_id,
                      s.name AS source_name,
                      s.external_id AS source_external_id,
                      r.external_id,
                      r.title,
                      r.canonical_type,
                      r.substrate_id,
                      r.atlas_canvas_id,
                      r.atlas_node_id,
                      review.id AS open_review_id,
                      review.status AS open_review_status,
                      CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap
               FROM source_records r
               JOIN sources s ON s.id = r.source_id
               LEFT JOIN source_record_transfer_reviews review
                 ON review.source_record_id = r.id
                AND review.review_kind = 'relation_island'
                AND review.status = 'open'
               WHERE s.source_type = 'notion_database'
                 ${sourceFilter}
                 AND NOT EXISTS (
                   SELECT 1
                   FROM source_record_relations rel
                   WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                 )
                 AND NOT EXISTS (
                   SELECT 1
                   FROM source_record_transfer_reviews reviewed
                   WHERE reviewed.source_record_id = r.id
                     AND reviewed.review_kind = 'relation_island'
                     AND reviewed.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
                 )
               ORDER BY s.name, r.canonical_type, r.title, r.external_id
               LIMIT ?`,
            )
            .bind(...sourceParams, limit)
            .all(),
        ]);
        result.relation_islands = { total: Number(count?.n ?? 0), rows: rows.results };
      }

      if (blocker_kind === 'all' || blocker_kind === 'source_update_action') {
        const [count, rows] = await Promise.all([
          db
            .prepare(
              `SELECT COUNT(*) AS n
               FROM workflow_actions action
               JOIN source_record_transfer_reviews review
                 ON action.source_kind = 'source_record_transfer_review'
                AND action.source_id = CAST(review.id AS TEXT)
               JOIN source_records r ON r.id = review.source_record_id
               JOIN sources s ON s.id = r.source_id
               WHERE s.source_type = 'notion_database'
                 ${sourceFilter}
                 AND review.status = 'needs_source_update'
                 AND action.status IN ('proposed', 'approved', 'ready', 'running', 'blocked')`,
            )
            .bind(...sourceParams)
            .first<{ n: number }>(),
          db
            .prepare(
              `SELECT 'source_update_action' AS blocker_kind,
                      action.action_id,
                      action.status AS action_status,
                      action.priority,
                      action.owner,
                      action.updated_at AS action_updated_at,
                      review.id AS review_id,
                      review.review_kind,
                      review.status AS review_status,
                      review.reason,
                      s.name AS source_name,
                      s.external_id AS source_external_id,
                      r.id AS source_record_id,
                      r.external_id,
                      r.title,
                      r.canonical_type,
                      CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                      CASE WHEN EXISTS (
                        SELECT 1
                        FROM source_record_relations rel
                        WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                      ) THEN 0 ELSE 1 END AS has_relation_island,
                      (
                        SELECT receipt.receipt_type
                        FROM workflow_receipts receipt
                        WHERE json_extract(receipt.payload_json, '$.workflow_action_id') = action.action_id
                        ORDER BY receipt.created_at DESC, receipt.id DESC
                        LIMIT 1
                      ) AS latest_receipt_type,
                      (
                        SELECT receipt.summary
                        FROM workflow_receipts receipt
                        WHERE json_extract(receipt.payload_json, '$.workflow_action_id') = action.action_id
                        ORDER BY receipt.created_at DESC, receipt.id DESC
                        LIMIT 1
                      ) AS latest_receipt_summary
               FROM workflow_actions action
               JOIN source_record_transfer_reviews review
                 ON action.source_kind = 'source_record_transfer_review'
                AND action.source_id = CAST(review.id AS TEXT)
               JOIN source_records r ON r.id = review.source_record_id
               JOIN sources s ON s.id = r.source_id
               WHERE s.source_type = 'notion_database'
                 ${sourceFilter}
                 AND review.status = 'needs_source_update'
                 AND action.status IN ('proposed', 'approved', 'ready', 'running', 'blocked')
               ORDER BY
                 CASE action.priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
                 action.updated_at DESC,
                 action.action_id
               LIMIT ?`,
            )
            .bind(...sourceParams, limit)
            .all(),
        ]);
        result.source_update_actions = { total: Number(count?.n ?? 0), rows: rows.results };
      }

      return json(result);
    },
  );

  server.tool(
    'governance_plan_notion_transfer_blocker_reviews',
    'Group current Notion transfer readiness blockers into proposal-only review batches. This is read-only: it does not review, waive, resolve, bind, or mutate source records.',
    {
      group_by: z.enum(['source', 'canonical_type', 'source_and_type']).default('source_and_type'),
      source_external_id: z.string().optional(),
      sample_limit: z.number().int().min(1).max(10).default(3),
      row_limit: z.number().int().min(25).max(1000).default(500),
    },
    async ({ group_by, source_external_id, sample_limit, row_limit }) => {
      const db = getDb();
      const normalizedSourceExternalId = source_external_id ? normalizeSourceExternalId('notion_database', source_external_id) : null;
      const sourceFilter = normalizedSourceExternalId ? 'AND s.external_id = ?' : '';
      const sourceParams = normalizedSourceExternalId ? [normalizedSourceExternalId] : [];
      const rows = await db
        .prepare(
          `WITH blockers AS (
             SELECT 'binding_gap' AS blocker_kind,
                    s.name AS source_name,
                    s.external_id AS source_external_id,
                    r.id AS source_record_id,
                    r.external_id,
                    r.title,
                    r.canonical_type,
                    NULL AS review_id,
                    NULL AS review_kind,
                    NULL AS action_id,
                    NULL AS action_status,
                    NULL AS action_priority,
                    1 AS has_binding_gap,
                    CASE WHEN EXISTS (
                      SELECT 1
                      FROM source_record_relations rel
                      WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                    ) THEN 0 ELSE 1 END AS has_relation_island
             FROM source_records r
             JOIN sources s ON s.id = r.source_id
             WHERE s.source_type = 'notion_database'
               ${sourceFilter}
               AND NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)
               AND NOT EXISTS (
                 SELECT 1
                 FROM source_record_transfer_reviews review
                 WHERE review.source_record_id = r.id
                   AND review.review_kind = 'binding_gap'
                   AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
               )
             UNION ALL
             SELECT 'relation_island' AS blocker_kind,
                    s.name AS source_name,
                    s.external_id AS source_external_id,
                    r.id AS source_record_id,
                    r.external_id,
                    r.title,
                    r.canonical_type,
                    NULL AS review_id,
                    NULL AS review_kind,
                    NULL AS action_id,
                    NULL AS action_status,
                    NULL AS action_priority,
                    CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                    1 AS has_relation_island
             FROM source_records r
             JOIN sources s ON s.id = r.source_id
             WHERE s.source_type = 'notion_database'
               ${sourceFilter}
               AND NOT EXISTS (
                 SELECT 1
                 FROM source_record_relations rel
                 WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
               )
               AND NOT EXISTS (
                 SELECT 1
                 FROM source_record_transfer_reviews review
                 WHERE review.source_record_id = r.id
                   AND review.review_kind = 'relation_island'
                   AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
               )
             UNION ALL
             SELECT 'source_update_action' AS blocker_kind,
                    s.name AS source_name,
                    s.external_id AS source_external_id,
                    r.id AS source_record_id,
                    r.external_id,
                    r.title,
                    r.canonical_type,
                    review.id AS review_id,
                    review.review_kind,
                    action.action_id,
                    action.status AS action_status,
                    action.priority AS action_priority,
                    CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                    CASE WHEN EXISTS (
                      SELECT 1
                      FROM source_record_relations rel
                      WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                    ) THEN 0 ELSE 1 END AS has_relation_island
             FROM workflow_actions action
             JOIN source_record_transfer_reviews review
               ON action.source_kind = 'source_record_transfer_review'
              AND action.source_id = CAST(review.id AS TEXT)
             JOIN source_records r ON r.id = review.source_record_id
             JOIN sources s ON s.id = r.source_id
             WHERE s.source_type = 'notion_database'
               ${sourceFilter}
               AND review.status = 'needs_source_update'
               AND action.status IN ('proposed', 'approved', 'ready', 'running', 'blocked')
           )
           SELECT *
           FROM blockers
           ORDER BY source_name, canonical_type, blocker_kind, title, external_id
           LIMIT ?`,
        )
        .bind(...sourceParams, ...sourceParams, ...sourceParams, row_limit + 1)
        .all<{
          blocker_kind: 'binding_gap' | 'relation_island' | 'source_update_action';
          source_name: string;
          source_external_id: string;
          source_record_id: number;
          external_id: string;
          title: string | null;
          canonical_type: string;
          review_id: number | null;
          review_kind: string | null;
          action_id: string | null;
          action_status: string | null;
          action_priority: string | null;
          has_binding_gap: number;
          has_relation_island: number;
        }>();

      const truncated = rows.results.length > row_limit;
      const sourceRows = truncated ? rows.results.slice(0, row_limit) : rows.results;
      const groups = new Map<
        string,
        {
          group_key: string;
          source_name: string | null;
          source_external_id: string | null;
          canonical_type: string | null;
          total: number;
          blocker_counts: Record<string, number>;
          action_status_counts: Record<string, number>;
          proposed_review_action: string;
          samples: Array<Record<string, unknown>>;
        }
      >();

      for (const row of sourceRows) {
        const groupKey =
          group_by === 'source'
            ? row.source_name
            : group_by === 'canonical_type'
              ? row.canonical_type
              : `${row.source_name} / ${row.canonical_type}`;
        const group =
          groups.get(groupKey) ??
          {
            group_key: groupKey,
            source_name: group_by === 'canonical_type' ? null : row.source_name,
            source_external_id: group_by === 'canonical_type' ? null : row.source_external_id,
            canonical_type: group_by === 'source' ? null : row.canonical_type,
            total: 0,
            blocker_counts: {},
            action_status_counts: {},
            proposed_review_action:
              row.blocker_kind === 'source_update_action'
                ? 'collect_source_truth_proof'
                : row.blocker_kind === 'binding_gap'
                  ? 'review_binding_or_mark_source_update'
                  : 'review_relation_or_mark_source_update',
            samples: [],
          };
        group.total += 1;
        group.blocker_counts[row.blocker_kind] = (group.blocker_counts[row.blocker_kind] ?? 0) + 1;
        if (row.action_status) {
          group.action_status_counts[row.action_status] = (group.action_status_counts[row.action_status] ?? 0) + 1;
          group.proposed_review_action = 'collect_source_truth_proof';
        }
        if (group.samples.length < sample_limit) {
          group.samples.push({
            blocker_kind: row.blocker_kind,
            source_record_id: row.source_record_id,
            external_id: row.external_id,
            title: row.title,
            canonical_type: row.canonical_type,
            review_kind: row.review_kind,
            action_id: row.action_id,
            action_status: row.action_status,
            action_priority: row.action_priority,
            has_binding_gap: Boolean(row.has_binding_gap),
            has_relation_island: Boolean(row.has_relation_island),
          });
        }
        groups.set(groupKey, group);
      }

      return json({
        ok: true,
        group_by,
        source_external_id: normalizedSourceExternalId,
        row_limit,
        sample_limit,
        truncated,
        total_blockers: sourceRows.length,
        groups: Array.from(groups.values()).sort((a, b) => b.total - a.total || a.group_key.localeCompare(b.group_key)),
      });
    },
  );

  server.tool(
    'governance_create_notion_transfer_blocker_review_handoff',
    'Create or update a workflow action handoff for one Notion transfer blocker group. This does not review, waive, resolve, bind, or mutate source records; it only records the batch review action and receipt.',
    {
      source_external_id: z.string().describe('Notion source database id for the blocker group.'),
      canonical_type: z.string().describe('Canonical type for the blocker group, such as task, client, evidence, or agent.'),
      owner: z.string().default('CREATE SOMETHING'),
      priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P1'),
      actor: z.string().default('codex-agent'),
      sample_limit: z.number().int().min(1).max(10).default(5),
      row_limit: z.number().int().min(25).max(1000).default(500),
    },
    async ({ source_external_id, canonical_type, owner, priority, actor, sample_limit, row_limit }) => {
      const db = getDb();
      const normalizedSourceExternalId = normalizeSourceExternalId('notion_database', source_external_id);
      const rows = await db
        .prepare(
          `WITH blockers AS (
             SELECT 'binding_gap' AS blocker_kind,
                    s.name AS source_name,
                    s.external_id AS source_external_id,
                    r.id AS source_record_id,
                    r.external_id,
                    r.title,
                    r.canonical_type,
                    NULL AS review_kind,
                    NULL AS action_id,
                    NULL AS action_status,
                    NULL AS action_priority,
                    1 AS has_binding_gap,
                    CASE WHEN EXISTS (
                      SELECT 1
                      FROM source_record_relations rel
                      WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                    ) THEN 0 ELSE 1 END AS has_relation_island
             FROM source_records r
             JOIN sources s ON s.id = r.source_id
             WHERE s.source_type = 'notion_database'
               AND s.external_id = ?
               AND r.canonical_type = ?
               AND NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)
               AND NOT EXISTS (
                 SELECT 1
                 FROM source_record_transfer_reviews review
                 WHERE review.source_record_id = r.id
                   AND review.review_kind = 'binding_gap'
                   AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
               )
             UNION ALL
             SELECT 'relation_island' AS blocker_kind,
                    s.name AS source_name,
                    s.external_id AS source_external_id,
                    r.id AS source_record_id,
                    r.external_id,
                    r.title,
                    r.canonical_type,
                    NULL AS review_kind,
                    NULL AS action_id,
                    NULL AS action_status,
                    NULL AS action_priority,
                    CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                    1 AS has_relation_island
             FROM source_records r
             JOIN sources s ON s.id = r.source_id
             WHERE s.source_type = 'notion_database'
               AND s.external_id = ?
               AND r.canonical_type = ?
               AND NOT EXISTS (
                 SELECT 1
                 FROM source_record_relations rel
                 WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
               )
               AND NOT EXISTS (
                 SELECT 1
                 FROM source_record_transfer_reviews review
                 WHERE review.source_record_id = r.id
                   AND review.review_kind = 'relation_island'
                   AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
               )
             UNION ALL
             SELECT 'source_update_action' AS blocker_kind,
                    s.name AS source_name,
                    s.external_id AS source_external_id,
                    r.id AS source_record_id,
                    r.external_id,
                    r.title,
                    r.canonical_type,
                    review.review_kind,
                    action.action_id,
                    action.status AS action_status,
                    action.priority AS action_priority,
                    CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                    CASE WHEN EXISTS (
                      SELECT 1
                      FROM source_record_relations rel
                      WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                    ) THEN 0 ELSE 1 END AS has_relation_island
             FROM workflow_actions action
             JOIN source_record_transfer_reviews review
               ON action.source_kind = 'source_record_transfer_review'
              AND action.source_id = CAST(review.id AS TEXT)
             JOIN source_records r ON r.id = review.source_record_id
             JOIN sources s ON s.id = r.source_id
             WHERE s.source_type = 'notion_database'
               AND s.external_id = ?
               AND r.canonical_type = ?
               AND review.status = 'needs_source_update'
               AND action.status IN ('proposed', 'approved', 'ready', 'running', 'blocked')
           )
           SELECT *
           FROM blockers
           ORDER BY source_name, canonical_type, blocker_kind, title, external_id
           LIMIT ?`,
        )
        .bind(
          normalizedSourceExternalId,
          canonical_type,
          normalizedSourceExternalId,
          canonical_type,
          normalizedSourceExternalId,
          canonical_type,
          row_limit + 1,
        )
        .all<{
          blocker_kind: 'binding_gap' | 'relation_island' | 'source_update_action';
          source_name: string;
          source_external_id: string;
          source_record_id: number;
          external_id: string;
          title: string | null;
          canonical_type: string;
          review_kind: string | null;
          action_id: string | null;
          action_status: string | null;
          action_priority: string | null;
          has_binding_gap: number;
          has_relation_island: number;
        }>();

      const truncated = rows.results.length > row_limit;
      const blockerRows = truncated ? rows.results.slice(0, row_limit) : rows.results;
      if (blockerRows.length === 0) {
        return json({
          ok: false,
          error: `No active Notion transfer blockers found for ${normalizedSourceExternalId} / ${canonical_type}.`,
          source_external_id: normalizedSourceExternalId,
          canonical_type,
        });
      }

      const sourceName = blockerRows[0]?.source_name ?? normalizedSourceExternalId;
      const blockerCounts: Record<string, number> = {};
      const actionStatusCounts: Record<string, number> = {};
      for (const row of blockerRows) {
        blockerCounts[row.blocker_kind] = (blockerCounts[row.blocker_kind] ?? 0) + 1;
        if (row.action_status) actionStatusCounts[row.action_status] = (actionStatusCounts[row.action_status] ?? 0) + 1;
      }
      const proposedReviewAction =
        Object.keys(actionStatusCounts).length > 0
          ? 'collect_source_truth_proof'
          : (blockerCounts.binding_gap ?? 0) > 0
            ? 'review_binding_or_mark_source_update'
            : 'review_relation_or_mark_source_update';
      const samples = blockerRows.slice(0, sample_limit).map((row) => ({
        blocker_kind: row.blocker_kind,
        source_record_id: row.source_record_id,
        external_id: row.external_id,
        title: row.title,
        canonical_type: row.canonical_type,
        review_kind: row.review_kind,
        action_id: row.action_id,
        action_status: row.action_status,
        action_priority: row.action_priority,
        has_binding_gap: Boolean(row.has_binding_gap),
        has_relation_island: Boolean(row.has_relation_island),
      }));
      const canvasId = 'create-something-internal-operating-system-source-map';
      const groupKey = `${sourceName} / ${canonical_type}`;
      const actionId = `workflow_action_notion_transfer_blocker_group_${hashId(`${normalizedSourceExternalId}:${canonical_type}`)}`;
      const metadata = {
        source_external_id: normalizedSourceExternalId,
        source_name: sourceName,
        canonical_type,
        group_key: groupKey,
        blocker_counts: blockerCounts,
        action_status_counts: actionStatusCounts,
        proposed_review_action: proposedReviewAction,
        sample_limit,
        row_limit,
        truncated,
        samples,
      };
      const title = `Review Notion transfer blockers: ${groupKey}`;
      const description = `${blockerRows.length} active blocker(s). Proposed action: ${proposedReviewAction.replaceAll('_', ' ')}.`;

      await db
        .prepare(
          `INSERT INTO atlas_canvases (canvas_id, title, client, workflow, owner, status, source_kind, source_id, metadata_json)
           VALUES (?, 'CREATE SOMETHING internal operating source map', 'CREATE SOMETHING', 'Notion transfer', ?, 'run', 'notion_transfer', 'create-something', ?)
           ON CONFLICT (canvas_id)
           DO UPDATE SET
             workflow = COALESCE(atlas_canvases.workflow, excluded.workflow),
             owner = COALESCE(atlas_canvases.owner, excluded.owner),
             updated_at = datetime('now')`,
        )
        .bind(canvasId, owner, JSON.stringify({ purpose: 'notion_transfer_blocker_review_handoffs' }))
        .run();
      await db
        .prepare(
          `INSERT INTO workflow_actions (
             action_id, canvas_id, title, description, action_kind, status, gate_kind,
             priority, owner, proposed_by, source_kind, source_id, artifact_url, metadata_json
           )
           VALUES (?, ?, ?, ?, 'handoff', 'proposed', 'review', ?, ?, ?, 'notion_transfer_blocker_group', ?, '/sources', ?)
           ON CONFLICT (action_id)
           DO UPDATE SET
             title = excluded.title,
             description = excluded.description,
             priority = excluded.priority,
             owner = excluded.owner,
             proposed_by = excluded.proposed_by,
             artifact_url = excluded.artifact_url,
             metadata_json = excluded.metadata_json,
             updated_at = datetime('now')`,
        )
        .bind(actionId, canvasId, title, description, priority, owner, actor, `${normalizedSourceExternalId}:${canonical_type}`, JSON.stringify(metadata))
        .run();
      await db
        .prepare(
          `INSERT INTO workflow_receipts (canvas_id, receipt_type, summary, artifact_url, payload_json, created_by)
           VALUES (?, 'handoff', ?, '/sources', ?, ?)`,
        )
        .bind(canvasId, `Created blocker review handoff ${actionId} for ${groupKey}.`, JSON.stringify({ workflow_action_id: actionId, ...metadata }), actor)
        .run();
      await logEvent(db, actor, 'create_notion_transfer_blocker_review_handoff', 'workflow_action', actionId, {
        source_external_id: normalizedSourceExternalId,
        canonical_type,
        total_blockers: blockerRows.length,
        blocker_counts: blockerCounts,
        action_status_counts: actionStatusCounts,
      });

      const action = await db.prepare('SELECT * FROM workflow_actions WHERE action_id = ?').bind(actionId).first();
      return json({
        ok: true,
        action,
        group: {
          group_key: groupKey,
          source_name: sourceName,
          source_external_id: normalizedSourceExternalId,
          canonical_type,
          total: blockerRows.length,
          blocker_counts: blockerCounts,
          action_status_counts: actionStatusCounts,
          proposed_review_action: proposedReviewAction,
          truncated,
          samples,
        },
      });
    },
  );

  server.tool(
    'governance_update_notion_transfer_blocker_review_handoff_status',
    'Move a Notion transfer blocker-group handoff between proposed, running, and blocked. This only updates the handoff workflow action and writes receipts/events; it does not review, waive, resolve, bind, or mutate source records.',
    {
      action_id: z.string().regex(/^workflow_action_notion_transfer_blocker_group_[a-z0-9]+$/),
      status: z.enum(SOURCE_UPDATE_ACTION_STATUSES),
      actor: z.string().default('codex-agent'),
    },
    async ({ action_id, status, actor }) => {
      const db = getDb();
      const action = await db
        .prepare(
          `SELECT action_id, canvas_id, node_id, status, title, source_id, metadata_json
           FROM workflow_actions
           WHERE action_id = ?
             AND source_kind = 'notion_transfer_blocker_group'
           LIMIT 1`,
        )
        .bind(action_id)
        .first<{
          action_id: string;
          canvas_id: string;
          node_id: string | null;
          status: string;
          title: string;
          source_id: string | null;
          metadata_json: string | null;
        }>();

      if (!action) {
        return json({ ok: false, error: `Blocker review handoff ${action_id} was not found.` });
      }

      await db
        .prepare(
          `UPDATE workflow_actions
           SET status = ?,
               approved_by = CASE WHEN ? IN ('running') THEN COALESCE(approved_by, ?) ELSE approved_by END,
               approved_at = CASE WHEN ? IN ('running') THEN COALESCE(approved_at, datetime('now')) ELSE approved_at END,
               completed_at = NULL,
               updated_at = datetime('now')
           WHERE action_id = ?
             AND source_kind = 'notion_transfer_blocker_group'`,
        )
        .bind(status, status, actor, status, action_id)
        .run();

      const payload = {
        workflow_action_id: action_id,
        previous_status: action.status,
        status,
        source_id: action.source_id,
        title: action.title,
      };
      await db
        .prepare(
          `INSERT INTO workflow_receipts (canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by)
           VALUES (?, ?, ?, ?, '/sources', ?, ?)`,
        )
        .bind(
          action.canvas_id,
          action.node_id,
          status === 'blocked' ? 'error' : status === 'running' ? 'handoff' : 'note',
          `${actor} moved blocker review handoff ${action_id} from ${action.status} to ${status}.`,
          JSON.stringify(payload),
          actor,
        )
        .run();
      await logEvent(db, actor, 'update_notion_transfer_blocker_review_handoff_status', 'workflow_action', action_id, payload);
      const updated = await db.prepare('SELECT * FROM workflow_actions WHERE action_id = ?').bind(action_id).first();
      return json({ ok: true, action: updated, previous_status: action.status, status });
    },
  );

  server.tool(
    'governance_get_notion_transfer_blocker_review_handoff',
    'Get the current blocker rows behind a Notion transfer blocker-group handoff. This is read-only and is intended as the execution context for a running/proposed handoff action.',
    {
      action_id: z.string().regex(/^workflow_action_notion_transfer_blocker_group_[a-z0-9]+$/),
      limit: z.number().int().min(1).max(500).default(100),
    },
    async ({ action_id, limit }) => {
      const db = getDb();
      const action = await db
        .prepare(
          `SELECT *
           FROM workflow_actions
           WHERE action_id = ?
             AND source_kind = 'notion_transfer_blocker_group'
           LIMIT 1`,
        )
        .bind(action_id)
        .first<{ action_id: string; source_id: string | null; status: string; metadata_json: string | null }>();

      if (!action?.source_id || !action.source_id.includes(':')) {
        return json({ ok: false, error: `Blocker review handoff ${action_id} was not found or has no group source id.` });
      }

      const separatorIndex = action.source_id.lastIndexOf(':');
      const sourceExternalId = action.source_id.slice(0, separatorIndex);
      const canonicalType = action.source_id.slice(separatorIndex + 1);
      const rows = await db
        .prepare(
          `WITH blockers AS (
             SELECT 'binding_gap' AS blocker_kind,
                    s.name AS source_name,
                    s.external_id AS source_external_id,
                    r.id AS source_record_id,
                    r.external_id,
                    r.title,
                    r.canonical_type,
                    NULL AS review_id,
                    NULL AS review_kind,
                    NULL AS action_id,
                    NULL AS action_status,
                    NULL AS action_priority,
                    1 AS has_binding_gap,
                    CASE WHEN EXISTS (
                      SELECT 1
                      FROM source_record_relations rel
                      WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                    ) THEN 0 ELSE 1 END AS has_relation_island
             FROM source_records r
             JOIN sources s ON s.id = r.source_id
             WHERE s.source_type = 'notion_database'
               AND s.external_id = ?
               AND r.canonical_type = ?
               AND NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)
               AND NOT EXISTS (
                 SELECT 1
                 FROM source_record_transfer_reviews review
                 WHERE review.source_record_id = r.id
                   AND review.review_kind = 'binding_gap'
                   AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
               )
             UNION ALL
             SELECT 'relation_island' AS blocker_kind,
                    s.name AS source_name,
                    s.external_id AS source_external_id,
                    r.id AS source_record_id,
                    r.external_id,
                    r.title,
                    r.canonical_type,
                    NULL AS review_id,
                    NULL AS review_kind,
                    NULL AS action_id,
                    NULL AS action_status,
                    NULL AS action_priority,
                    CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                    1 AS has_relation_island
             FROM source_records r
             JOIN sources s ON s.id = r.source_id
             WHERE s.source_type = 'notion_database'
               AND s.external_id = ?
               AND r.canonical_type = ?
               AND NOT EXISTS (
                 SELECT 1
                 FROM source_record_relations rel
                 WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
               )
               AND NOT EXISTS (
                 SELECT 1
                 FROM source_record_transfer_reviews review
                 WHERE review.source_record_id = r.id
                   AND review.review_kind = 'relation_island'
                   AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
               )
             UNION ALL
             SELECT 'source_update_action' AS blocker_kind,
                    s.name AS source_name,
                    s.external_id AS source_external_id,
                    r.id AS source_record_id,
                    r.external_id,
                    r.title,
                    r.canonical_type,
                    review.id AS review_id,
                    review.review_kind,
                    source_action.action_id,
                    source_action.status AS action_status,
                    source_action.priority AS action_priority,
                    CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                    CASE WHEN EXISTS (
                      SELECT 1
                      FROM source_record_relations rel
                      WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                    ) THEN 0 ELSE 1 END AS has_relation_island
             FROM workflow_actions source_action
             JOIN source_record_transfer_reviews review
               ON source_action.source_kind = 'source_record_transfer_review'
              AND source_action.source_id = CAST(review.id AS TEXT)
             JOIN source_records r ON r.id = review.source_record_id
             JOIN sources s ON s.id = r.source_id
             WHERE s.source_type = 'notion_database'
               AND s.external_id = ?
               AND r.canonical_type = ?
               AND review.status = 'needs_source_update'
               AND source_action.status IN ('proposed', 'approved', 'ready', 'running', 'blocked')
           )
           SELECT *
           FROM blockers
           ORDER BY blocker_kind, title, external_id
           LIMIT ?`,
        )
        .bind(sourceExternalId, canonicalType, sourceExternalId, canonicalType, sourceExternalId, canonicalType, limit + 1)
        .all<{
          blocker_kind: 'binding_gap' | 'relation_island' | 'source_update_action';
          source_name: string;
          source_external_id: string;
          source_record_id: number;
          external_id: string;
          title: string | null;
          canonical_type: string;
          review_id: number | null;
          review_kind: string | null;
          action_id: string | null;
          action_status: string | null;
          action_priority: string | null;
          has_binding_gap: number;
          has_relation_island: number;
        }>();

      const truncated = rows.results.length > limit;
      const blockerRows = truncated ? rows.results.slice(0, limit) : rows.results;
      const blockerCounts: Record<string, number> = {};
      const actionStatusCounts: Record<string, number> = {};
      for (const row of blockerRows) {
        blockerCounts[row.blocker_kind] = (blockerCounts[row.blocker_kind] ?? 0) + 1;
        if (row.action_status) actionStatusCounts[row.action_status] = (actionStatusCounts[row.action_status] ?? 0) + 1;
      }

      return json({
        ok: true,
        action,
        group: {
          source_external_id: sourceExternalId,
          canonical_type: canonicalType,
          total: blockerRows.length,
          blocker_counts: blockerCounts,
          action_status_counts: actionStatusCounts,
          truncated,
        },
        rows: blockerRows.map((row) => ({
          ...row,
          has_binding_gap: Boolean(row.has_binding_gap),
          has_relation_island: Boolean(row.has_relation_island),
        })),
      });
    },
  );

  server.tool(
    'governance_upsert_source_record_transfer_review',
    'Review or waive a source-record transfer gap. Use this for binding gaps, relation islands, source-truth issues, and explicit waivers before client Atlas rollout.',
    {
      source_type: z.string().default('notion_database'),
      source_external_id: z.string().optional().describe('Optional source database id to scope record lookup.'),
      record_external_id: z.string(),
      review_kind: z.enum(SOURCE_TRANSFER_REVIEW_KINDS),
      status: z.enum(SOURCE_TRANSFER_REVIEW_STATUSES).default('reviewed'),
      reason: z.string().optional(),
      owner: z.string().optional(),
      reviewed_by: z.string().optional(),
      metadata_json: z.string().optional(),
      handoff_action_id: z
        .string()
        .regex(/^workflow_action_notion_transfer_blocker_group_[a-z0-9]+$/)
        .optional()
        .describe('Optional Notion transfer blocker-group handoff action to attach a decision receipt to.'),
      actor: z.string().default('claude-code'),
    },
    async ({
      source_type,
      source_external_id,
      record_external_id,
      review_kind,
      status,
      reason,
      owner,
      reviewed_by,
      metadata_json,
      handoff_action_id,
      actor,
    }) => {
      const db = getDb();
      const normalizedSourceExternalId = source_external_id ? normalizeSourceExternalId(source_type, source_external_id) : null;
      const normalizedRecordExternalId = normalizeSourceRecordExternalId(record_external_id);
      const where = ['s.source_type = ?'];
      const params: unknown[] = [source_type];
      if (normalizedSourceExternalId) {
        where.push('s.external_id = ?');
        params.push(normalizedSourceExternalId);
      }
      const record = await db
        .prepare(
          `SELECT r.id, r.external_id, r.title, r.canonical_type, s.external_id AS source_external_id, s.name AS source_name
           FROM source_records r
           JOIN sources s ON s.id = r.source_id
           WHERE ${where.join(' AND ')}
             AND (
               r.external_id = ?
               OR lower(replace(r.external_id, '-', '')) = ?
             )
           LIMIT 1`,
        )
        .bind(...params, record_external_id, normalizedRecordExternalId)
        .first<{ id: number; external_id: string; title: string | null; canonical_type: string; source_external_id: string; source_name: string }>();
      if (!record) {
        return json({ ok: false, error: `Source record ${record_external_id} was not found.` });
      }

      const handoff = handoff_action_id
        ? await db
            .prepare(
              `SELECT action_id, canvas_id, node_id
               FROM workflow_actions
               WHERE action_id = ?
                 AND source_kind = 'notion_transfer_blocker_group'
               LIMIT 1`,
            )
            .bind(handoff_action_id)
            .first<{ action_id: string; canvas_id: string; node_id: string | null }>()
        : null;
      if (handoff_action_id && !handoff) {
        return json({ ok: false, error: `Blocker handoff action ${handoff_action_id} was not found.` });
      }

      await db
        .prepare(
          `INSERT INTO source_record_transfer_reviews (
             source_record_id, review_kind, status, reason, owner, reviewed_by, metadata_json
           )
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (source_record_id, review_kind)
           DO UPDATE SET
             status = excluded.status,
             reason = COALESCE(excluded.reason, source_record_transfer_reviews.reason),
             owner = COALESCE(excluded.owner, source_record_transfer_reviews.owner),
             reviewed_by = excluded.reviewed_by,
             metadata_json = COALESCE(excluded.metadata_json, source_record_transfer_reviews.metadata_json),
             updated_at = datetime('now')`,
        )
        .bind(record.id, review_kind, status, reason ?? null, owner ?? null, reviewed_by ?? actor, metadata_json ?? null)
        .run();

      const review = await db
        .prepare(
          `SELECT review.*, r.external_id, r.title, r.canonical_type, s.name AS source_name, s.external_id AS source_external_id
           FROM source_record_transfer_reviews review
           JOIN source_records r ON r.id = review.source_record_id
           JOIN sources s ON s.id = r.source_id
           WHERE review.source_record_id = ? AND review.review_kind = ?`,
        )
        .bind(record.id, review_kind)
        .first<{ id: number; source_record_id: number; review_kind: string; status: string }>();

      if (handoff) {
        const payload = {
          workflow_action_id: handoff.action_id,
          source_record_id: record.id,
          source_record: `${record.source_external_id}:${record.external_id}`,
          review_id: review?.id ?? null,
          review_kind,
          status,
          source_name: record.source_name,
          canonical_type: record.canonical_type,
          title: record.title,
        };
        await db
          .prepare(
            `INSERT INTO workflow_receipts (canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by)
             VALUES (?, ?, 'decision', ?, ?, ?, ?)`,
          )
          .bind(
            handoff.canvas_id,
            handoff.node_id,
            `${actor} marked ${review_kind} for ${record.title ?? record.external_id} as ${status}.`,
            `/sources?handoff=${handoff.action_id}`,
            JSON.stringify(payload),
            actor,
          )
          .run();
      }
      await logEvent(db, actor, 'upsert_source_record_transfer_review', 'source_record', `${record.source_external_id}:${record.external_id}`, {
        review_kind,
        status,
        owner: owner ?? null,
        handoff_action_id: handoff_action_id ?? null,
      });
      return json({ ok: true, review });
    },
  );

  server.tool(
    'governance_list_source_record_transfer_reviews',
    'List source-record transfer reviews and current gap candidates. Use open_gaps_only to find unreviewed binding gaps and relation islands.',
    {
      source_type: z.string().default('notion_database'),
      source_external_id: z.string().optional(),
      review_kind: z.enum(SOURCE_TRANSFER_REVIEW_KINDS).optional(),
      status: z.enum(SOURCE_TRANSFER_REVIEW_STATUSES).optional(),
      open_gaps_only: z.boolean().default(false),
      limit: z.number().int().min(1).max(500).default(100),
    },
    async ({ source_type, source_external_id, review_kind, status, open_gaps_only, limit }) => {
      const db = getDb();
      const normalizedSourceExternalId = source_external_id ? normalizeSourceExternalId(source_type, source_external_id) : null;
      const where = ['s.source_type = ?'];
      const params: unknown[] = [source_type];
      if (normalizedSourceExternalId) {
        where.push('s.external_id = ?');
        params.push(normalizedSourceExternalId);
      }
      if (review_kind) {
        where.push('review.review_kind = ?');
        params.push(review_kind);
      }
      if (status) {
        where.push('review.status = ?');
        params.push(status);
      }

      const reviews = await db
        .prepare(
          `SELECT review.*, r.external_id, r.title, r.canonical_type, s.name AS source_name, s.external_id AS source_external_id,
                  CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                  CASE WHEN EXISTS (
                    SELECT 1 FROM source_record_relations rel WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                  ) THEN 0 ELSE 1 END AS has_relation_island
           FROM source_record_transfer_reviews review
           JOIN source_records r ON r.id = review.source_record_id
           JOIN sources s ON s.id = r.source_id
           WHERE ${where.join(' AND ')}
           ORDER BY review.updated_at DESC, review.id DESC
           LIMIT ?`,
        )
        .bind(...params, limit)
        .all();

      let openGaps: unknown[] = [];
      if (open_gaps_only) {
        const gapWhere = ['candidate.source_type = ?'];
        const gapParams: unknown[] = [source_type];
        if (normalizedSourceExternalId) {
          gapWhere.push('candidate.source_external_id = ?');
          gapParams.push(normalizedSourceExternalId);
        }
        if (review_kind) {
          gapWhere.push('candidate.review_kind = ?');
          gapParams.push(review_kind);
        }
        if (status) {
          gapWhere.push('? = ?');
          gapParams.push(status, 'open');
        }
        openGaps = (
          await db
            .prepare(
              `WITH candidate AS (
                 SELECT r.id AS source_record_id, s.source_type, s.name AS source_name, s.external_id AS source_external_id,
                        r.external_id, r.title, r.canonical_type, 'binding_gap' AS review_kind,
                        1 AS has_binding_gap,
                        CASE WHEN EXISTS (
                          SELECT 1 FROM source_record_relations rel WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                        ) THEN 0 ELSE 1 END AS has_relation_island
                 FROM source_records r
                 JOIN sources s ON s.id = r.source_id
                 WHERE NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)
                   AND NOT EXISTS (
                     SELECT 1
                     FROM source_record_transfer_reviews review
                     WHERE review.source_record_id = r.id
                       AND review.review_kind = 'binding_gap'
                       AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
                   )
                 UNION ALL
                 SELECT r.id AS source_record_id, s.source_type, s.name AS source_name, s.external_id AS source_external_id,
                        r.external_id, r.title, r.canonical_type, 'relation_island' AS review_kind,
                        CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                        1 AS has_relation_island
                 FROM source_records r
                 JOIN sources s ON s.id = r.source_id
                 WHERE NOT EXISTS (
                     SELECT 1
                     FROM source_record_relations rel
                     WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                   )
                   AND NOT EXISTS (
                     SELECT 1
                     FROM source_record_transfer_reviews review
                     WHERE review.source_record_id = r.id
                       AND review.review_kind = 'relation_island'
                       AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
                   )
               )
               SELECT review.id, candidate.source_record_id, candidate.source_name, candidate.source_external_id,
                      candidate.external_id, candidate.title, candidate.canonical_type, candidate.review_kind,
                      COALESCE(review.status, 'open') AS status,
                      review.reason, review.owner, review.reviewed_by, review.metadata_json,
                      review.created_at, review.updated_at,
                      candidate.has_binding_gap, candidate.has_relation_island
               FROM candidate
               LEFT JOIN source_record_transfer_reviews review
                 ON review.source_record_id = candidate.source_record_id
                AND review.review_kind = candidate.review_kind
                AND review.status = 'open'
               WHERE ${gapWhere.join(' AND ')}
               ORDER BY candidate.source_name, candidate.canonical_type, candidate.title, candidate.review_kind
               LIMIT ?`,
            )
            .bind(...gapParams, limit)
            .all()
        ).results;
      }

      return json({ reviews: reviews.results, open_gaps: openGaps });
    },
  );

  server.tool(
    'governance_materialize_source_update_actions',
    'Create idempotent workflow actions from reviewed source-record transfer rows that need source-truth updates. This turns the transfer review ledger into agent/API-managed workflow work without mutating the source system.',
    {
      canvas_id: z.string().default('create-something-internal-operating-system-source-map'),
      source_type: z.string().default('notion_database'),
      source_external_id: z.string().optional(),
      review_kind: z.enum(SOURCE_TRANSFER_REVIEW_KINDS).optional(),
      action_status: z.enum(WORKFLOW_ACTION_STATUSES).default('proposed'),
      gate_kind: z.enum(WORKFLOW_ACTION_GATES).default('review'),
      priority: z.enum(WORKFLOW_ACTION_PRIORITIES).default('P1'),
      owner: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(25),
      actor: z.string().default('claude-code'),
    },
    async ({ canvas_id, source_type, source_external_id, review_kind, action_status, gate_kind, priority, owner, limit, actor }) => {
      const db = getDb();
      const canvas = await db.prepare('SELECT canvas_id FROM atlas_canvases WHERE canvas_id = ?').bind(canvas_id).first();
      if (!canvas) {
        return json({ ok: false, error: `Atlas canvas ${canvas_id} not found.` });
      }

      const normalizedSourceExternalId = source_external_id ? normalizeSourceExternalId(source_type, source_external_id) : null;
      const where = ['s.source_type = ?', "review.status = 'needs_source_update'"];
      const params: unknown[] = [source_type];
      if (normalizedSourceExternalId) {
        where.push('s.external_id = ?');
        params.push(normalizedSourceExternalId);
      }
      if (review_kind) {
        where.push('review.review_kind = ?');
        params.push(review_kind);
      }

      const candidates = (
        await db
          .prepare(
            `SELECT review.id AS review_id, review.source_record_id, review.review_kind,
                    review.status AS review_status, review.reason, review.owner AS review_owner,
                    review.reviewed_by, review.metadata_json AS review_metadata_json,
                    s.source_type, s.name AS source_name, s.external_id AS source_external_id,
                    r.external_id, r.title, r.canonical_type, r.substrate_id,
                    r.atlas_canvas_id, r.atlas_node_id,
                    CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                    CASE WHEN EXISTS (
                      SELECT 1 FROM source_record_relations rel WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                    ) THEN 0 ELSE 1 END AS has_relation_island,
                    existing.action_id AS existing_action_id
             FROM source_record_transfer_reviews review
             JOIN source_records r ON r.id = review.source_record_id
             JOIN sources s ON s.id = r.source_id
             LEFT JOIN workflow_actions existing
               ON existing.action_id = ('workflow_action_source_transfer_review_' || review.id)
             WHERE ${where.join(' AND ')}
             ORDER BY review.updated_at DESC, review.id DESC
             LIMIT ?`,
          )
          .bind(...params, limit)
          .all<SourceTransferReviewActionCandidate>()
      ).results;

      const actions: unknown[] = [];
      for (const candidate of candidates) {
        const actionId = `workflow_action_source_transfer_review_${candidate.review_id}`;
        const nodeId = candidate.atlas_canvas_id === canvas_id ? candidate.atlas_node_id : null;
        const recordTitle = candidate.title ?? candidate.external_id;
        const actionOwner = owner ?? candidate.review_owner ?? 'CREATE SOMETHING';
        const title = `Repair source truth: ${recordTitle}`;
        const description = [
          `Source transfer review ${candidate.review_id} is marked needs_source_update for ${candidate.review_kind}.`,
          `Source: ${candidate.source_name ?? candidate.source_external_id} (${candidate.source_external_id}).`,
          `Record: ${candidate.external_id}; canonical type: ${candidate.canonical_type}.`,
          candidate.reason ? `Reason: ${candidate.reason}` : null,
        ]
          .filter(Boolean)
          .join('\n');
        const metadata = {
          source_transfer_review_id: candidate.review_id,
          source_record_id: candidate.source_record_id,
          source_type: candidate.source_type,
          source_external_id: candidate.source_external_id,
          source_name: candidate.source_name,
          record_external_id: candidate.external_id,
          canonical_type: candidate.canonical_type,
          substrate_id: candidate.substrate_id,
          review_kind: candidate.review_kind,
          review_status: candidate.review_status,
          reviewed_by: candidate.reviewed_by,
          review_metadata_json: candidate.review_metadata_json,
          has_binding_gap: Boolean(candidate.has_binding_gap),
          has_relation_island: Boolean(candidate.has_relation_island),
        };

        await db
          .prepare(
            `INSERT INTO workflow_actions (
               action_id, canvas_id, node_id, title, description, action_kind, status,
               gate_kind, priority, owner, proposed_by, approved_by, source_kind, source_id,
               artifact_url, evidence, metadata_json, approved_at, completed_at
             )
             VALUES (?, ?, ?, ?, ?, 'task', ?, ?, ?, ?, ?, CASE WHEN ? THEN ? ELSE NULL END,
                     'source_record_transfer_review', ?, ?, ?, ?, CASE WHEN ? THEN datetime('now') ELSE NULL END, NULL)
             ON CONFLICT (action_id)
             DO UPDATE SET
               canvas_id = excluded.canvas_id,
               node_id = COALESCE(excluded.node_id, workflow_actions.node_id),
               title = excluded.title,
               description = excluded.description,
               action_kind = excluded.action_kind,
               status = excluded.status,
               gate_kind = excluded.gate_kind,
               priority = excluded.priority,
               owner = excluded.owner,
               approved_by = COALESCE(excluded.approved_by, workflow_actions.approved_by),
               source_kind = excluded.source_kind,
               source_id = excluded.source_id,
               artifact_url = excluded.artifact_url,
               evidence = excluded.evidence,
               metadata_json = excluded.metadata_json,
               approved_at = COALESCE(excluded.approved_at, workflow_actions.approved_at),
               updated_at = datetime('now')`,
          )
          .bind(
            actionId,
            canvas_id,
            nodeId,
            title,
            description,
            action_status,
            gate_kind,
            priority,
            actionOwner,
            actor,
            ['approved', 'ready', 'running', 'completed'].includes(action_status) ? 1 : 0,
            actor,
            String(candidate.review_id),
            'https://app-governance-dash.createsomething.agency/sources',
            candidate.reason ?? description,
            JSON.stringify(metadata),
            ['approved', 'ready', 'running', 'completed'].includes(action_status) ? 1 : 0,
          )
          .run();

        const action = await db
          .prepare(
            `SELECT a.*, n.label AS node_label, c.title AS canvas_title
             FROM workflow_actions a
             JOIN atlas_canvases c ON c.canvas_id = a.canvas_id
             LEFT JOIN atlas_nodes n ON n.node_id = a.node_id
             WHERE a.action_id = ?`,
          )
          .bind(actionId)
          .first();
        actions.push(action);
      }

      await logEvent(db, actor, 'materialize_source_update_actions', 'atlas_canvas', canvas_id, {
        source_type,
        source_external_id: normalizedSourceExternalId,
        review_kind: review_kind ?? null,
        actions: actions.length,
      });

      return json({
        ok: true,
        canvas_id,
        considered: candidates.length,
        created: candidates.filter((candidate) => !candidate.existing_action_id).length,
        updated: candidates.filter((candidate) => candidate.existing_action_id).length,
        actions,
      });
    },
  );

  server.tool(
    'governance_list_source_update_workflow_actions',
    'List source-update workflow actions that were materialized from transfer reviews. Use this read-only queue when an agent needs the same Notion source-truth handoff state shown in the dashboard.',
    {
      canvas_id: z.string().default('create-something-internal-operating-system-source-map'),
      source_type: z.string().default('notion_database'),
      source_external_id: z.string().optional(),
      review_kind: z.enum(SOURCE_TRANSFER_REVIEW_KINDS).optional(),
      action_status: z.enum(WORKFLOW_ACTION_STATUSES).optional(),
      open_only: z.boolean().default(true),
      limit: z.number().int().min(1).max(100).default(25),
    },
    async ({ canvas_id, source_type, source_external_id, review_kind, action_status, open_only, limit }) => {
      const db = getDb();
      const normalizedSourceExternalId = source_external_id ? normalizeSourceExternalId(source_type, source_external_id) : null;
      const where = [
        'action.canvas_id = ?',
        "action.source_kind = 'source_record_transfer_review'",
        "review.status = 'needs_source_update'",
        's.source_type = ?',
      ];
      const params: unknown[] = [canvas_id, source_type];

      if (normalizedSourceExternalId) {
        where.push('s.external_id = ?');
        params.push(normalizedSourceExternalId);
      }
      if (review_kind) {
        where.push('review.review_kind = ?');
        params.push(review_kind);
      }
      if (action_status) {
        where.push('action.status = ?');
        params.push(action_status);
      } else if (open_only) {
        where.push("action.status IN ('proposed', 'approved', 'ready', 'running', 'blocked')");
      }

      const rows = (
        await db
          .prepare(
            `SELECT action.action_id,
                    action.status AS action_status,
                    action.title AS action_title,
                    action.description AS action_description,
                    action.action_kind,
                    action.gate_kind,
                    action.priority,
                    action.owner,
                    action.proposed_by,
                    action.approved_by,
                    action.updated_at AS action_updated_at,
                    action.source_kind,
                    action.source_id,
                    action.evidence,
                    action.metadata_json AS action_metadata_json,
                    action.canvas_id,
                    canvas.title AS canvas_title,
                    action.node_id,
                    node.label AS node_label,
                    review.id AS review_id,
                    review.source_record_id,
                    review.review_kind,
                    review.status AS review_status,
                    review.reason,
                    review.owner AS review_owner,
                    review.reviewed_by,
                    review.metadata_json AS review_metadata_json,
                    review.created_at AS review_created_at,
                    review.updated_at AS review_updated_at,
                    s.source_type,
                    s.external_id AS source_external_id,
                    s.name AS source_name,
                    s.workspace,
                    r.external_id AS record_external_id,
                    r.title AS record_title,
                    r.record_kind,
                    r.canonical_type,
                    r.substrate_id,
                    r.identity_state,
                    r.migration_state,
                    r.atlas_canvas_id AS record_atlas_canvas_id,
                    r.atlas_node_id AS record_atlas_node_id,
                    CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                    CASE WHEN EXISTS (
                      SELECT 1
                      FROM source_record_relations rel
                      WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                    ) THEN 0 ELSE 1 END AS has_relation_island,
                    (
                      SELECT receipt.id
                      FROM workflow_receipts receipt
                      WHERE json_extract(receipt.payload_json, '$.workflow_action_id') = action.action_id
                      ORDER BY receipt.created_at DESC, receipt.id DESC
                      LIMIT 1
                    ) AS latest_receipt_id,
                    (
                      SELECT receipt.receipt_type
                      FROM workflow_receipts receipt
                      WHERE json_extract(receipt.payload_json, '$.workflow_action_id') = action.action_id
                      ORDER BY receipt.created_at DESC, receipt.id DESC
                      LIMIT 1
                    ) AS latest_receipt_type,
                    (
                      SELECT receipt.summary
                      FROM workflow_receipts receipt
                      WHERE json_extract(receipt.payload_json, '$.workflow_action_id') = action.action_id
                      ORDER BY receipt.created_at DESC, receipt.id DESC
                      LIMIT 1
                    ) AS latest_receipt_summary,
                    (
                      SELECT receipt.created_at
                      FROM workflow_receipts receipt
                      WHERE json_extract(receipt.payload_json, '$.workflow_action_id') = action.action_id
                      ORDER BY receipt.created_at DESC, receipt.id DESC
                      LIMIT 1
                    ) AS latest_receipt_created_at
             FROM workflow_actions action
             JOIN source_record_transfer_reviews review
               ON action.source_kind = 'source_record_transfer_review'
              AND action.source_id = CAST(review.id AS TEXT)
             JOIN source_records r ON r.id = review.source_record_id
             JOIN sources s ON s.id = r.source_id
             JOIN atlas_canvases canvas ON canvas.canvas_id = action.canvas_id
             LEFT JOIN atlas_nodes node ON node.node_id = action.node_id
             WHERE ${where.join(' AND ')}
             ORDER BY
               CASE action.priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
               action.updated_at DESC,
               review.id DESC
             LIMIT ?`,
          )
          .bind(...params, limit)
          .all<SourceUpdateWorkflowActionRow>()
      ).results;

      const counts = (
        await db
          .prepare(
            `SELECT action.status, review.review_kind, COUNT(*) AS n
             FROM workflow_actions action
             JOIN source_record_transfer_reviews review
               ON action.source_kind = 'source_record_transfer_review'
              AND action.source_id = CAST(review.id AS TEXT)
             JOIN source_records r ON r.id = review.source_record_id
             JOIN sources s ON s.id = r.source_id
             WHERE ${where.join(' AND ')}
             GROUP BY action.status, review.review_kind
             ORDER BY action.status, review.review_kind`,
          )
          .bind(...params)
          .all()
      ).results;

      return json({
        ok: true,
        canvas_id,
        source_type,
        source_external_id: normalizedSourceExternalId,
        open_only: action_status ? false : open_only,
        actions: rows.map((row) => ({
          ...row,
          has_binding_gap: Boolean(row.has_binding_gap),
          has_relation_island: Boolean(row.has_relation_island),
        })),
        counts,
      });
    },
  );

  server.tool(
    'governance_update_source_update_workflow_action_status',
    'Move one source-update workflow action between proposed, running, and blocked with the same validation and receipt logging as the dashboard. This does not mutate Notion, resolve the transfer review, or create Atlas bindings.',
    {
      action_id: z.string().regex(/^workflow_action_source_transfer_review_\d+$/),
      status: z.enum(SOURCE_UPDATE_ACTION_STATUSES),
      actor: z.string().default('claude-code'),
    },
    async ({ action_id, status, actor }) => {
      const db = getDb();
      const action = await db
        .prepare(
          `SELECT action.action_id, action.canvas_id, action.node_id, action.status, action.source_id, review.id AS review_id,
                  r.external_id, r.title, s.external_id AS source_external_id
           FROM workflow_actions action
           JOIN source_record_transfer_reviews review
             ON action.source_kind = 'source_record_transfer_review'
            AND action.source_id = CAST(review.id AS TEXT)
           JOIN source_records r ON r.id = review.source_record_id
           JOIN sources s ON s.id = r.source_id
           WHERE action.action_id = ?
             AND action.source_kind = 'source_record_transfer_review'
             AND review.status = 'needs_source_update'
             AND s.source_type = 'notion_database'
           LIMIT 1`,
        )
        .bind(action_id)
        .first<SourceUpdateWorkflowActionTransitionRow>();

      if (!action) {
        return json({ ok: false, error: 'Source-update workflow action was not found.' });
      }

      await db
        .prepare(
          `UPDATE workflow_actions
           SET status = ?,
               approved_by = CASE WHEN ? IN ('running') THEN COALESCE(approved_by, ?) ELSE approved_by END,
               approved_at = CASE WHEN ? IN ('running') THEN COALESCE(approved_at, datetime('now')) ELSE approved_at END,
               completed_at = NULL,
               updated_at = datetime('now')
           WHERE action_id = ?`,
        )
        .bind(status, status, actor, status, action_id)
        .run();

      const receiptSummary = `${actor} moved source-update action ${action_id} from ${action.status} to ${status}.`;
      const payload = {
        workflow_action_id: action_id,
        review_id: action.review_id,
        previous_status: action.status,
        status,
        source_record: `${action.source_external_id}:${action.external_id}`,
        title: action.title,
      };
      const receipt = await db
        .prepare(
          `INSERT INTO workflow_receipts (
             canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by
           )
           VALUES (?, ?, ?, ?, '/sources', ?, ?)`,
        )
        .bind(
          action.canvas_id,
          action.node_id,
          status === 'blocked' ? 'error' : status === 'running' ? 'handoff' : 'note',
          receiptSummary,
          JSON.stringify(payload),
          actor,
        )
        .run();

      await logEvent(db, actor, 'update_source_update_action_status', 'workflow_action', action_id, payload);

      const updated = await db.prepare('SELECT * FROM workflow_actions WHERE action_id = ?').bind(action_id).first();
      return json({
        ok: true,
        action: updated,
        previous_status: action.status,
        status,
        receipt_id: receipt.meta.last_row_id,
        receipt_summary: receiptSummary,
      });
    },
  );

  server.tool(
    'governance_record_source_update_result',
    'Record the result of a source-truth update for a source-update workflow action. Use resolved only after source truth has been updated elsewhere; this records proof, completes the action, and resolves the transfer review without mutating Notion or creating Atlas bindings.',
    {
      action_id: z.string().regex(/^workflow_action_source_transfer_review_\d+$/),
      result: z.enum(['resolved', 'blocked']),
      evidence: z.string().min(10),
      artifact_url: z.string().optional(),
      actor: z.string().default('claude-code'),
      dry_run: z.boolean().default(false),
    },
    async ({ action_id, result, evidence, artifact_url, actor, dry_run }) => {
      const db = getDb();
      const action = await db
        .prepare(
          `SELECT action.action_id, action.canvas_id, action.node_id, action.status, action.source_id, review.id AS review_id,
                  r.external_id, r.title, s.external_id AS source_external_id
           FROM workflow_actions action
           JOIN source_record_transfer_reviews review
             ON action.source_kind = 'source_record_transfer_review'
            AND action.source_id = CAST(review.id AS TEXT)
           JOIN source_records r ON r.id = review.source_record_id
           JOIN sources s ON s.id = r.source_id
           WHERE action.action_id = ?
             AND action.source_kind = 'source_record_transfer_review'
             AND review.status = 'needs_source_update'
             AND s.source_type = 'notion_database'
           LIMIT 1`,
        )
        .bind(action_id)
        .first<SourceUpdateWorkflowActionTransitionRow>();

      if (!action) {
        return json({ ok: false, error: 'Open source-update workflow action was not found.' });
      }

      const nextActionStatus = result === 'resolved' ? 'completed' : 'blocked';
      const nextReviewStatus = result === 'resolved' ? 'resolved' : 'needs_source_update';
      const receiptType = result === 'resolved' ? 'proof' : 'error';
      const receiptSummary =
        result === 'resolved'
          ? `${actor} recorded source-update proof for ${action_id}; action completed and transfer review resolved.`
          : `${actor} recorded source-update blocker for ${action_id}; action blocked and transfer review remains needs_source_update.`;
      const payload = {
        workflow_action_id: action_id,
        review_id: action.review_id,
        previous_status: action.status,
        status: nextActionStatus,
        review_status: nextReviewStatus,
        result,
        evidence,
        source_record: `${action.source_external_id}:${action.external_id}`,
        title: action.title,
      };

      if (dry_run) {
        return json({
          ok: true,
          dry_run: true,
          action_id,
          planned_action_status: nextActionStatus,
          planned_review_status: nextReviewStatus,
          planned_receipt_type: receiptType,
          receipt_summary: receiptSummary,
          payload,
        });
      }

      await db
        .prepare(
          `UPDATE workflow_actions
           SET status = ?,
               approved_by = COALESCE(approved_by, ?),
               approved_at = COALESCE(approved_at, datetime('now')),
               completed_at = CASE WHEN ? = 'completed' THEN COALESCE(completed_at, datetime('now')) ELSE NULL END,
               evidence = ?,
               artifact_url = COALESCE(?, artifact_url),
               updated_at = datetime('now')
           WHERE action_id = ?`,
        )
        .bind(nextActionStatus, actor, nextActionStatus, evidence, artifact_url ?? null, action_id)
        .run();

      await db
        .prepare(
          `UPDATE source_record_transfer_reviews
           SET status = ?,
               reason = ?,
               reviewed_by = ?,
               updated_at = datetime('now')
           WHERE id = ?`,
        )
        .bind(nextReviewStatus, evidence, actor, action.review_id)
        .run();

      const receipt = await db
        .prepare(
          `INSERT INTO workflow_receipts (
             canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by
           )
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(action.canvas_id, action.node_id, receiptType, receiptSummary, artifact_url ?? '/sources', JSON.stringify(payload), actor)
        .run();

      await logEvent(db, actor, 'record_source_update_result', 'workflow_action', action_id, payload);

      const [updatedAction, updatedReview] = await Promise.all([
        db.prepare('SELECT * FROM workflow_actions WHERE action_id = ?').bind(action_id).first(),
        db.prepare('SELECT * FROM source_record_transfer_reviews WHERE id = ?').bind(action.review_id).first(),
      ]);
      return json({
        ok: true,
        dry_run: false,
        action: updatedAction,
        review: updatedReview,
        previous_status: action.status,
        result,
        receipt_id: receipt.meta.last_row_id,
        receipt_summary: receiptSummary,
      });
    },
  );

  server.tool(
    'governance_update_source_record_mapping',
    'Attach or correct canonical identity and Atlas bindings for one captured source record. Use this to resolve Notion identity hygiene before importing a row into a client/workflow map.',
    {
      source_type: z.string().default('notion_database'),
      source_external_id: z.string(),
      record_external_id: z.string(),
      substrate_id: z.string().optional(),
      canonical_type: z.enum(SOURCE_CANONICAL_TYPES).optional(),
      atlas_canvas_id: z.string().optional(),
      atlas_node_id: z.string().optional(),
      identity_state: z.enum(SOURCE_IDENTITY_STATES).optional(),
      migration_state: z.enum(SOURCE_MIGRATION_STATES).optional(),
      error: z.string().optional(),
      actor: z.string().default('claude-code'),
    },
    async ({ source_type, source_external_id, record_external_id, actor, ...fields }) => {
      const db = getDb();
      const normalizedSourceExternalId = normalizeSourceExternalId(source_type, source_external_id);
      const source = await db
        .prepare('SELECT id FROM sources WHERE source_type = ? AND external_id = ?')
        .bind(source_type, normalizedSourceExternalId)
        .first<{ id: number }>();
      if (!source) {
        return json({ ok: false, error: `Unknown source ${source_type}/${normalizedSourceExternalId}.` });
      }

      const sets: string[] = [];
      const params: unknown[] = [];
      const columns: Record<string, unknown> = {
        substrate_id: fields.substrate_id,
        canonical_type: fields.canonical_type,
        atlas_canvas_id: fields.atlas_canvas_id,
        atlas_node_id: fields.atlas_node_id,
        identity_state: fields.identity_state,
        migration_state: fields.migration_state,
        error: fields.error,
      };
      for (const [column, value] of Object.entries(columns)) {
        if (value !== undefined) {
          sets.push(`${column} = ?`);
          params.push(value);
        }
      }
      if (!sets.length) {
        return json({ ok: false, error: 'No mapping fields to update.' });
      }
      sets.push("updated_at = datetime('now')");
      params.push(source.id, record_external_id);
      const result = await db
        .prepare(`UPDATE source_records SET ${sets.join(', ')} WHERE source_id = ? AND external_id = ?`)
        .bind(...params)
        .run();
      if (!result.meta.changes) {
        return json({ ok: false, error: `Source record ${record_external_id} not found.` });
      }

      await logEvent(db, actor, 'update_source_record_mapping', 'source_record', `${normalizedSourceExternalId}:${record_external_id}`, fields);
      const record = await db
        .prepare('SELECT * FROM source_records WHERE source_id = ? AND external_id = ?')
        .bind(source.id, record_external_id)
        .first();
      return json({ ok: true, record });
    },
  );

  server.tool(
    'governance_resolve_source_record_identities',
    'Derive stable CREATE SOMETHING canonical ids for captured source records that are missing Substrate IDs. Use before Atlas projection when the source system lacks explicit IDs.',
    {
      source_type: z.string().optional(),
      source_external_id: z.string().optional(),
      canonical_type: z.enum(SOURCE_CANONICAL_TYPES).optional(),
      atlas_canvas_id: z.string().optional(),
      missing_only: z.boolean().default(true),
      limit: z.number().int().min(1).max(1000).default(500),
      actor: z.string().default('claude-code'),
    },
    async ({ source_type, source_external_id, canonical_type, atlas_canvas_id, missing_only, limit, actor }) => {
      const db = getDb();
      const normalizedSourceExternalId = source_external_id && source_type
        ? normalizeSourceExternalId(source_type, source_external_id)
        : source_external_id;
      const where: string[] = [];
      const params: unknown[] = [];
      if (source_type) {
        where.push('s.source_type = ?');
        params.push(source_type);
      }
      if (normalizedSourceExternalId) {
        where.push('s.external_id = ?');
        params.push(normalizedSourceExternalId);
      }
      if (canonical_type) {
        where.push('r.canonical_type = ?');
        params.push(canonical_type);
      }
      if (atlas_canvas_id) {
        where.push('(r.atlas_canvas_id = ? OR s.atlas_canvas_id = ?)');
        params.push(atlas_canvas_id, atlas_canvas_id);
      }
      if (missing_only) {
        where.push("(r.substrate_id IS NULL OR r.substrate_id = '' OR r.identity_state = 'missing_substrate')");
      }

      const rows = await db
        .prepare(
          `SELECT r.id, r.source_id, s.source_type, s.external_id AS source_external_id, s.name AS source_name,
                  r.external_id, r.title, r.canonical_type, r.substrate_id, r.atlas_canvas_id, r.atlas_node_id,
                  r.identity_state, r.migration_state, r.payload_json
           FROM source_records r
           JOIN sources s ON s.id = r.source_id
           ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
           ORDER BY s.name, r.canonical_type, r.title
           LIMIT ?`,
        )
        .bind(...params, limit)
        .all<SourceRecordProjectionRow>();

      let resolved = 0;
      const examples: Array<{ external_id: string; title: string | null; substrate_id: string }> = [];
      for (const row of rows.results) {
        const substrateId = row.substrate_id && row.substrate_id.length > 0 ? row.substrate_id : derivedSubstrateId(row);
        await db
          .prepare(
            `UPDATE source_records
             SET substrate_id = ?,
                 identity_state = 'mapped',
                 migration_state = CASE WHEN migration_state = 'error' THEN migration_state ELSE 'ready' END,
                 updated_at = datetime('now')
             WHERE id = ?`,
          )
          .bind(substrateId, row.id)
          .run();
        resolved += 1;
        if (examples.length < 5) {
          examples.push({ external_id: row.external_id, title: row.title, substrate_id: substrateId });
        }
      }

      await logEvent(db, actor, 'resolve_source_record_identities', 'source_record', normalizedSourceExternalId ?? canonical_type ?? 'all', {
        source_type: source_type ?? null,
        source_external_id: normalizedSourceExternalId ?? null,
        canonical_type: canonical_type ?? null,
        missing_only,
        resolved,
      });

      return json({ ok: true, resolved, examples });
    },
  );

  server.tool(
    'governance_project_source_records_to_atlas',
    'Project captured source records into a canonical Atlas canvas. Creates source database nodes, source-record nodes, containment edges, and updates each source record with its Atlas binding.',
    {
      canvas_id: z.string(),
      title: z.string().optional(),
      client: z.string().optional(),
      workflow: z.string().optional(),
      owner: z.string().optional(),
      source_type: z.string().optional(),
      source_external_id: z.string().optional(),
      canonical_type: z.enum(SOURCE_CANONICAL_TYPES).optional(),
      identity_state: z.enum(SOURCE_IDENTITY_STATES).optional(),
      missing_substrate: z.boolean().optional(),
      derive_missing_identities: z.boolean().default(true),
      limit: z.number().int().min(1).max(1000).default(500),
      actor: z.string().default('claude-code'),
    },
    async ({
      canvas_id,
      title,
      client,
      workflow,
      owner,
      source_type,
      source_external_id,
      canonical_type,
      identity_state,
      missing_substrate,
      derive_missing_identities,
      limit,
      actor,
    }) => {
      const db = getDb();
      const normalizedSourceExternalId = source_external_id && source_type
        ? normalizeSourceExternalId(source_type, source_external_id)
        : source_external_id;

      await db
        .prepare(
          `INSERT INTO atlas_canvases (canvas_id, title, client, workflow, owner, status, source_kind, source_id, metadata_json)
           VALUES (?, ?, ?, ?, ?, 'run', 'database_projection', ?, ?)
           ON CONFLICT (canvas_id)
           DO UPDATE SET
             title = excluded.title,
             client = COALESCE(excluded.client, atlas_canvases.client),
             workflow = COALESCE(excluded.workflow, atlas_canvases.workflow),
             owner = COALESCE(excluded.owner, atlas_canvases.owner),
             status = 'run',
             source_kind = excluded.source_kind,
             source_id = excluded.source_id,
             metadata_json = excluded.metadata_json,
             updated_at = datetime('now')`,
        )
        .bind(
          canvas_id,
          title ?? 'CREATE SOMETHING source-record Atlas projection',
          client ?? null,
          workflow ?? null,
          owner ?? null,
          normalizedSourceExternalId ?? source_type ?? 'source_records',
          JSON.stringify({ projected_by: actor, source_type: source_type ?? null, source_external_id: normalizedSourceExternalId ?? null }),
        )
        .run();

      const where: string[] = [];
      const params: unknown[] = [];
      if (source_type) {
        where.push('s.source_type = ?');
        params.push(source_type);
      }
      if (normalizedSourceExternalId) {
        where.push('s.external_id = ?');
        params.push(normalizedSourceExternalId);
      }
      if (canonical_type) {
        where.push('r.canonical_type = ?');
        params.push(canonical_type);
      }
      if (identity_state) {
        where.push('r.identity_state = ?');
        params.push(identity_state);
      }
      if (missing_substrate !== undefined) {
        where.push(missing_substrate ? "(r.substrate_id IS NULL OR r.substrate_id = '')" : "(r.substrate_id IS NOT NULL AND r.substrate_id != '')");
      }

      const rows = await db
        .prepare(
          `SELECT r.id, r.source_id, s.source_type, s.external_id AS source_external_id, s.name AS source_name,
                  r.external_id, r.title, r.canonical_type, r.substrate_id, r.atlas_canvas_id, r.atlas_node_id,
                  r.identity_state, r.migration_state, r.payload_json
           FROM source_records r
           JOIN sources s ON s.id = r.source_id
           ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
           ORDER BY s.name, r.canonical_type, r.title
           LIMIT ?`,
        )
        .bind(...params, limit)
        .all<SourceRecordProjectionRow>();

      const sourceNodes = new Map<string, { node_id: string; label: string; source_type: string; source_external_id: string }>();
      let recordsProjected = 0;
      let identitiesDerived = 0;
      let edgesUpserted = 0;
      for (const row of rows.results) {
        const sourceNodeId = `source_database_${hashId(`${row.source_type}:${row.source_external_id}`)}`;
        if (!sourceNodes.has(sourceNodeId)) {
          const sourceNode = {
            node_id: sourceNodeId,
            label: row.source_name ?? `${row.source_type}:${row.source_external_id}`,
            source_type: row.source_type,
            source_external_id: row.source_external_id,
          };
          sourceNodes.set(sourceNodeId, sourceNode);
          await db
            .prepare(
              `INSERT INTO atlas_nodes (node_id, canvas_id, kind, label, status, notes, evidence, metadata_json)
               VALUES (?, ?, 'data', ?, 'run', ?, ?, ?)
               ON CONFLICT (node_id)
               DO UPDATE SET
                 canvas_id = excluded.canvas_id,
                 kind = excluded.kind,
                 label = excluded.label,
                 status = excluded.status,
                 notes = excluded.notes,
                 evidence = excluded.evidence,
                 metadata_json = excluded.metadata_json,
                 updated_at = datetime('now')`,
            )
            .bind(
              sourceNode.node_id,
              canvas_id,
              sourceNode.label,
              'Source database projected into Atlas',
              `${sourceNode.source_type}:${sourceNode.source_external_id}`,
              JSON.stringify({ source_type: sourceNode.source_type, source_external_id: sourceNode.source_external_id }),
            )
            .run();
        }

        let substrateId = row.substrate_id;
        if ((!substrateId || substrateId.length === 0) && derive_missing_identities) {
          substrateId = derivedSubstrateId(row);
          identitiesDerived += 1;
        }
        if (!substrateId || substrateId.length === 0) {
          continue;
        }

        const nodeId = atlasNodeIdForSourceRecord(substrateId, row.external_id);
        const label = row.title ?? row.external_id;
        const metadata = {
          substrate_id: substrateId,
          canonical_type: row.canonical_type,
          source_type: row.source_type,
          source_external_id: row.source_external_id,
          source_record_external_id: row.external_id,
          payload: safeParseObject(row.payload_json),
        };

        await db
          .prepare(
            `INSERT INTO atlas_nodes (node_id, canvas_id, kind, label, status, notes, evidence, metadata_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (node_id)
             DO UPDATE SET
               canvas_id = excluded.canvas_id,
               kind = excluded.kind,
               label = excluded.label,
               status = excluded.status,
               notes = COALESCE(excluded.notes, atlas_nodes.notes),
               evidence = COALESCE(excluded.evidence, atlas_nodes.evidence),
               metadata_json = excluded.metadata_json,
               updated_at = datetime('now')`,
          )
          .bind(
            nodeId,
            canvas_id,
            atlasNodeKindForCanonicalType(row.canonical_type),
            label,
            atlasStatusFromRecord({
              identity_state: substrateId ? 'mapped' : row.identity_state,
              migration_state: row.migration_state,
              payload_json: row.payload_json,
            }),
            `${row.canonical_type} from ${row.source_name ?? row.source_external_id}`,
            `${row.source_type}:${row.source_external_id}:${row.external_id}`,
            JSON.stringify(metadata),
          )
          .run();

        await db
          .prepare(
            `UPDATE source_records
             SET substrate_id = ?,
                 atlas_canvas_id = ?,
                 atlas_node_id = ?,
                 identity_state = 'mapped',
                 migration_state = CASE WHEN migration_state = 'error' THEN migration_state ELSE 'ready' END,
                 updated_at = datetime('now')
             WHERE id = ?`,
          )
          .bind(substrateId, canvas_id, nodeId, row.id)
          .run();

        await db
          .prepare(
            `INSERT INTO source_record_atlas_bindings (
               source_record_id, canvas_id, node_id, binding_kind, confidence, reason, metadata_json
             )
             VALUES (?, ?, ?, 'source_map', 1.0, ?, ?)
             ON CONFLICT (source_record_id, canvas_id, node_id, binding_kind)
             DO UPDATE SET
               confidence = excluded.confidence,
               reason = excluded.reason,
               metadata_json = excluded.metadata_json,
               updated_at = datetime('now')`,
          )
          .bind(
            row.id,
            canvas_id,
            nodeId,
            `source-record projection into ${canvas_id}`,
            JSON.stringify({
              source_type: row.source_type,
              source_external_id: row.source_external_id,
              source_record_external_id: row.external_id,
              substrate_id: substrateId,
              canonical_type: row.canonical_type,
            }),
          )
          .run();

        const edgeId = `source_contains_${hashId(`${canvas_id}:${sourceNodeId}:${nodeId}`)}`;
        await db
          .prepare(
            `INSERT INTO atlas_edges (edge_id, canvas_id, source_node_id, target_node_id, label, evidence, metadata_json)
             VALUES (?, ?, ?, ?, 'contains', ?, ?)
             ON CONFLICT (edge_id)
             DO UPDATE SET
               canvas_id = excluded.canvas_id,
               source_node_id = excluded.source_node_id,
               target_node_id = excluded.target_node_id,
               label = excluded.label,
               evidence = excluded.evidence,
               metadata_json = excluded.metadata_json,
               updated_at = datetime('now')`,
          )
          .bind(
            edgeId,
            canvas_id,
            sourceNodeId,
            nodeId,
            `${row.source_name ?? row.source_external_id} contains ${label}`,
            JSON.stringify({ source_record_id: row.id, source_record_external_id: row.external_id }),
          )
          .run();
        edgesUpserted += 1;
        recordsProjected += 1;
      }

      await db
        .prepare(
          `INSERT INTO workflow_receipts (canvas_id, receipt_type, summary, payload_json, created_by)
           VALUES (?, 'sync', ?, ?, ?)`,
        )
        .bind(
          canvas_id,
          `Projected ${recordsProjected} source records into Atlas`,
          JSON.stringify({
            source_nodes: sourceNodes.size,
            records_projected: recordsProjected,
            identities_derived: identitiesDerived,
            edges_upserted: edgesUpserted,
            source_type: source_type ?? null,
            source_external_id: normalizedSourceExternalId ?? null,
          }),
          actor,
        )
        .run();

      await logEvent(db, actor, 'project_source_records_to_atlas', 'atlas_canvas', canvas_id, {
        source_nodes: sourceNodes.size,
        records_projected: recordsProjected,
        identities_derived: identitiesDerived,
        edges_upserted: edgesUpserted,
      });

      return json({
        ok: true,
        canvas_id,
        source_nodes: sourceNodes.size,
        records_seen: rows.results.length,
        records_projected: recordsProjected,
        identities_derived: identitiesDerived,
        edges_upserted: edgesUpserted,
      });
    },
  );

  server.tool(
    'governance_extract_source_record_relations',
    'Extract durable source-record relationships from imported source records. Explicit payload references are recorded at high confidence; client ownership and deliverable/milestone correspondence can be inferred with evidence and confidence for review.',
    {
      source_type: z.string().default('notion_database'),
      source_external_id: z.string().optional(),
      record_limit: z.number().int().min(1).max(2000).default(1000),
      include_past_clients: z.boolean().default(false),
      aliases_json: z.string().optional().describe('Optional JSON object keyed by client title or substrate_id with string-array aliases.'),
      infer_client_ownership: z.boolean().default(true),
      infer_title_correspondence: z.boolean().default(true),
      actor: z.string().default('claude-code'),
    },
    async ({
      source_type,
      source_external_id,
      record_limit,
      include_past_clients,
      aliases_json,
      infer_client_ownership,
      infer_title_correspondence,
      actor,
    }) => {
      const db = getDb();
      const aliasMap = parseAliasMap(aliases_json);
      const where = ['s.source_type = ?', "r.substrate_id IS NOT NULL", "r.substrate_id != ''"];
      const params: unknown[] = [source_type];
      const normalizedSourceExternalId = source_external_id ? normalizeSourceExternalId(source_type, source_external_id) : null;
      if (normalizedSourceExternalId) {
        where.push('s.external_id = ?');
        params.push(normalizedSourceExternalId);
      }

      const rows = await db
        .prepare(
          `SELECT r.id, r.source_id, s.source_type, s.external_id AS source_external_id, s.name AS source_name,
                  r.external_id, r.title, r.canonical_type, r.substrate_id, r.atlas_canvas_id, r.atlas_node_id,
                  r.identity_state, r.migration_state, r.payload_json
           FROM source_records r
           JOIN sources s ON s.id = r.source_id
           WHERE ${where.join(' AND ')}
           ORDER BY s.name, r.canonical_type, r.title
           LIMIT ?`,
        )
        .bind(...params, record_limit)
        .all<SourceRecordProjectionRow>();

      const records = rows.results;
      const recordByIdentifier = new Map<string, SourceRecordProjectionRow>();
      for (const record of records) {
        recordByIdentifier.set(record.external_id, record);
        if (record.substrate_id) recordByIdentifier.set(record.substrate_id, record);
      }

      const upsertRelation = async (
        source: SourceRecordProjectionRow,
        target: SourceRecordProjectionRow,
        relation_kind: (typeof SOURCE_RELATION_KINDS)[number],
        evidence_kind: (typeof SOURCE_RELATION_EVIDENCE_KINDS)[number],
        confidence: number,
        reason: string,
        metadata: Record<string, unknown>,
      ): Promise<boolean> => {
        if (source.id === target.id) return false;
        await db
          .prepare(
            `INSERT INTO source_record_relations (
               source_record_id, target_source_record_id, relation_kind, evidence_kind, confidence, reason, metadata_json
             )
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (source_record_id, target_source_record_id, relation_kind, evidence_kind)
             DO UPDATE SET
               confidence = excluded.confidence,
               reason = excluded.reason,
               metadata_json = excluded.metadata_json,
               updated_at = datetime('now')`,
          )
          .bind(source.id, target.id, relation_kind, evidence_kind, confidence, reason, JSON.stringify(metadata))
          .run();
        return true;
      };

      let payloadExplicit = 0;
      let aliasInferred = 0;
      let titleInferred = 0;

      for (const source of records) {
        const payloadText = textForMatching(safeParseObject(source.payload_json));
        if (!payloadText) continue;
        for (const [identifier, target] of recordByIdentifier.entries()) {
          if (identifier.length < 8 || target.id === source.id) continue;
          if (payloadText.includes(identifier)) {
            if (
              await upsertRelation(source, target, 'references', 'payload_explicit', 0.95, `payload mentions ${identifier}`, {
                matched_identifier: identifier,
                source_external_id: source.source_external_id,
              })
            ) {
              payloadExplicit += 1;
            }
          }
        }
      }

      if (infer_client_ownership) {
        const clients = records.filter((record) => {
          if (record.canonical_type !== 'client') return false;
          if (include_past_clients) return true;
          const status = String(safeParseObject(record.payload_json).status ?? '').toLowerCase();
          return status !== 'past';
        });
        const nonClients = records.filter((record) => record.canonical_type !== 'client');
        for (const client of clients) {
          const aliases = [
            ...defaultAliasesForClient(client.title ?? client.external_id),
            ...(aliasMap[client.title ?? ''] ?? []),
            ...(client.substrate_id ? aliasMap[client.substrate_id] ?? [] : []),
          ];
          const uniqueAliases = [...new Set(aliases.map((alias) => alias.trim()).filter((alias) => alias.length >= 3))];
          if (!uniqueAliases.length) continue;
          for (const record of nonClients) {
            const reason = clientRecordMatchReason(client, record, uniqueAliases);
            if (!reason) continue;
            if (
              await upsertRelation(client, record, 'owns', 'alias_inferred', 0.75, reason, {
                aliases: uniqueAliases,
                source_external_id: record.source_external_id,
              })
            ) {
              aliasInferred += 1;
            }
          }
        }
      }

      if (infer_title_correspondence) {
        const titleGroups = new Map<string, SourceRecordProjectionRow[]>();
        for (const record of records) {
          if (!['deliverable', 'milestone', 'workflow', 'task'].includes(record.canonical_type)) continue;
          const key = normalizedTitleKey(record.title);
          if (key.length < 8) continue;
          const list = titleGroups.get(key) ?? [];
          list.push(record);
          titleGroups.set(key, list);
        }
        for (const [title_key, group] of titleGroups.entries()) {
          const uniqueTypes = new Set(group.map((record) => record.canonical_type));
          if (group.length < 2 || uniqueTypes.size < 2) continue;
          const sorted = group.slice().sort((a, b) => a.id - b.id);
          for (let index = 0; index < sorted.length - 1; index += 1) {
            for (let inner = index + 1; inner < sorted.length; inner += 1) {
              if (sorted[index].canonical_type === sorted[inner].canonical_type) continue;
              if (
                await upsertRelation(
                  sorted[index],
                  sorted[inner],
                  'corresponds_to',
                  'title_inferred',
                  0.8,
                  `normalized titles match: ${title_key}`,
                  { title_key },
                )
              ) {
                titleInferred += 1;
              }
            }
          }
        }
      }

      await logEvent(db, actor, 'extract_source_record_relations', 'source_record_relation', normalizedSourceExternalId ?? source_type, {
        records_considered: records.length,
        payload_explicit: payloadExplicit,
        alias_inferred: aliasInferred,
        title_inferred: titleInferred,
      });

      return json({
        ok: true,
        records_considered: records.length,
        relations_upserted: payloadExplicit + aliasInferred + titleInferred,
        payload_explicit: payloadExplicit,
        alias_inferred: aliasInferred,
        title_inferred: titleInferred,
      });
    },
  );

  server.tool(
    'governance_record_source_record_relations',
    'Idempotently record explicit source-record relationships discovered by a source connector or agent. Use this for Notion relation properties, manual corrections, and imported workflow dependencies rather than relying on inference.',
    {
      source_type: z.string().default('notion_database'),
      source_external_id: z.string().optional().describe('Optional source database id to scope record lookup.'),
      relations: z
        .array(
          z.object({
            source_record_external_id: z.string(),
            target_record_external_id: z.string(),
            relation_kind: z.enum(SOURCE_RELATION_KINDS).default('related_to'),
            evidence_kind: z.enum(SOURCE_RELATION_EVIDENCE_KINDS).default('imported'),
            confidence: z.number().min(0).max(1).default(1),
            reason: z.string().optional(),
            metadata_json: z.string().optional(),
          }),
        )
        .min(1)
        .max(500),
      actor: z.string().default('claude-code'),
    },
    async ({ source_type, source_external_id, relations, actor }) => {
      const db = getDb();
      const normalizedSourceExternalId = source_external_id ? normalizeSourceExternalId(source_type, source_external_id) : null;
      const where = ['s.source_type = ?'];
      const params: unknown[] = [source_type];
      if (normalizedSourceExternalId) {
        where.push('s.external_id = ?');
        params.push(normalizedSourceExternalId);
      }
      const recordExternalIds = [
        ...new Set(relations.flatMap((relation) => [relation.source_record_external_id, relation.target_record_external_id])),
      ];
      const recordResults: Array<{
        id: number;
        external_id: string;
        title: string | null;
        canonical_type: string;
        source_external_id: string;
      }> = [];
      for (const recordExternalIdBatch of chunkArray(recordExternalIds, 40)) {
        const normalizedRecordExternalIds = [...new Set(recordExternalIdBatch.map(normalizeSourceRecordExternalId))];
        const records = await db
          .prepare(
            `SELECT r.id, r.external_id, r.title, r.canonical_type, s.external_id AS source_external_id
             FROM source_records r
             JOIN sources s ON s.id = r.source_id
             WHERE ${where.join(' AND ')}
               AND (
                 r.external_id IN (${recordExternalIdBatch.map(() => '?').join(',')})
                 OR lower(replace(r.external_id, '-', '')) IN (${normalizedRecordExternalIds.map(() => '?').join(',')})
               )`,
          )
          .bind(...params, ...recordExternalIdBatch, ...normalizedRecordExternalIds)
          .all<{ id: number; external_id: string; title: string | null; canonical_type: string; source_external_id: string }>();
        recordResults.push(...records.results);
      }

      const recordsByExternalId = new Map<string, (typeof recordResults)[number]>();
      for (const record of recordResults) {
        recordsByExternalId.set(record.external_id, record);
        recordsByExternalId.set(normalizeSourceRecordExternalId(record.external_id), record);
      }
      const missing = new Set<string>();
      let upserted = 0;
      const recorded: Array<{ relation_id: number; source_record_external_id: string; target_record_external_id: string }> = [];

      for (const relation of relations) {
        const source =
          recordsByExternalId.get(relation.source_record_external_id) ??
          recordsByExternalId.get(normalizeSourceRecordExternalId(relation.source_record_external_id));
        const target =
          recordsByExternalId.get(relation.target_record_external_id) ??
          recordsByExternalId.get(normalizeSourceRecordExternalId(relation.target_record_external_id));
        if (!source) missing.add(relation.source_record_external_id);
        if (!target) missing.add(relation.target_record_external_id);
        if (!source || !target || source.id === target.id) continue;

        const result = await db
          .prepare(
            `INSERT INTO source_record_relations (
               source_record_id, target_source_record_id, relation_kind, evidence_kind, confidence, reason, metadata_json
             )
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (source_record_id, target_source_record_id, relation_kind, evidence_kind)
             DO UPDATE SET
               confidence = excluded.confidence,
               reason = excluded.reason,
               metadata_json = excluded.metadata_json,
               updated_at = datetime('now')
             RETURNING id`,
          )
          .bind(
            source.id,
            target.id,
            relation.relation_kind,
            relation.evidence_kind,
            relation.confidence,
            relation.reason ?? `${relation.evidence_kind} ${relation.relation_kind} relation`,
            relation.metadata_json ?? null,
          )
          .first<{ id: number }>();
        if (result) {
          upserted += 1;
          recorded.push({
            relation_id: result.id,
            source_record_external_id: relation.source_record_external_id,
            target_record_external_id: relation.target_record_external_id,
          });
        }
      }

      await logEvent(db, actor, 'record_source_record_relations', 'source_record_relation', normalizedSourceExternalId ?? source_type, {
        requested: relations.length,
        upserted,
        missing: [...missing],
      });

      return json({
        ok: missing.size === 0,
        requested: relations.length,
        upserted,
        missing: [...missing],
        relations: recorded,
      });
    },
  );

  server.tool(
    'governance_project_client_workflow_canvases',
    'Derive client/workflow-specific Atlas canvases from canonical source records. Uses client aliases plus source payload/title evidence, records many-to-many bindings, and leaves the source-led Atlas map intact.',
    {
      canvas_prefix: z.string().default('client-workflow'),
      source_type: z.string().default('notion_database'),
      client_external_id: z.string().optional().describe('Optional client source-record external id for a single-client projection pass.'),
      client_search: z.string().optional().describe('Optional client title or substrate search for a single-client projection pass.'),
      client_limit: z.number().int().min(1).max(100).default(50),
      record_limit: z.number().int().min(1).max(1000).default(1000),
      min_matches: z.number().int().min(1).max(100).default(1),
      relation_expansion_depth: z
        .number()
        .int()
        .min(0)
        .max(3)
        .default(1)
        .describe('How many relation-led hops to add after direct client/alias matches. 0 keeps only direct matches.'),
      relation_expansion_canonical_types: z
        .array(z.enum(SOURCE_CANONICAL_TYPES))
        .default([...DEFAULT_RELATION_EXPANSION_CANONICAL_TYPES])
        .describe('Canonical record types eligible for relation-expanded inclusion. Direct client matches are unaffected.'),
      include_past_clients: z.boolean().default(false),
      aliases_json: z.string().optional().describe('Optional JSON object keyed by client title or substrate_id with string-array aliases.'),
      actor: z.string().default('claude-code'),
    },
    async ({
      canvas_prefix,
      source_type,
      client_external_id,
      client_search,
      client_limit,
      record_limit,
      min_matches,
      relation_expansion_depth,
      relation_expansion_canonical_types,
      include_past_clients,
      aliases_json,
      actor,
    }) => {
      const db = getDb();
      const aliasMap = parseAliasMap(aliases_json);
      const clientWhere = [
        's.source_type = ?',
        "r.canonical_type = 'client'",
        'r.substrate_id IS NOT NULL',
        "r.substrate_id != ''",
      ];
      const clientParams: unknown[] = [source_type];
      if (client_external_id) {
        clientWhere.push("(r.external_id = ? OR lower(replace(r.external_id, '-', '')) = ?)");
        clientParams.push(client_external_id, normalizeSourceRecordExternalId(client_external_id));
      }
      if (client_search) {
        clientWhere.push('(r.title LIKE ? OR r.substrate_id LIKE ?)');
        clientParams.push(`%${client_search}%`, `%${client_search}%`);
      }
      const relationExpansionTypeSet = new Set<string>(relation_expansion_canonical_types);
      const clients = await db
        .prepare(
          `SELECT r.id, r.source_id, s.source_type, s.external_id AS source_external_id, s.name AS source_name,
                  r.external_id, r.title, r.canonical_type, r.substrate_id, r.atlas_canvas_id, r.atlas_node_id,
                  r.identity_state, r.migration_state, r.payload_json
           FROM source_records r
           JOIN sources s ON s.id = r.source_id
           WHERE ${clientWhere.join(' AND ')}
           ORDER BY r.title
           LIMIT ?`,
        )
        .bind(...clientParams, client_limit)
        .all<SourceRecordProjectionRow>();

      const records = await db
        .prepare(
          `SELECT r.id, r.source_id, s.source_type, s.external_id AS source_external_id, s.name AS source_name,
                  r.external_id, r.title, r.canonical_type, r.substrate_id, r.atlas_canvas_id, r.atlas_node_id,
                  r.identity_state, r.migration_state, r.payload_json
           FROM source_records r
           JOIN sources s ON s.id = r.source_id
           WHERE s.source_type = ?
             AND r.canonical_type != 'client'
             AND r.substrate_id IS NOT NULL
             AND r.substrate_id != ''
           ORDER BY r.canonical_type, r.title
           LIMIT ?`,
        )
        .bind(source_type, record_limit)
        .all<SourceRecordProjectionRow>();

      const clientIds = clients.results.map((client) => client.id);
      const clientIdSet = new Set(clientIds);
      const allRelations = await db
        .prepare(
          `SELECT rel.id, rel.source_record_id, rel.target_source_record_id, rel.relation_kind,
                  rel.evidence_kind, rel.confidence, rel.reason, rel.metadata_json
           FROM source_record_relations rel
           JOIN source_records source ON source.id = rel.source_record_id
           JOIN sources source_source ON source_source.id = source.source_id
           JOIN source_records target ON target.id = rel.target_source_record_id
           JOIN sources target_source ON target_source.id = target.source_id
           WHERE source_source.source_type = ?
             AND target_source.source_type = ?`,
        )
        .bind(source_type, source_type)
        .all<SourceRecordRelationRow>();
      const relationByClientTarget = new Map<string, SourceRecordRelationRow>();
      const relationsByRecordId = new Map<number, SourceRecordRelationRow[]>();
      for (const relation of allRelations.results) {
        const sourceRelations = relationsByRecordId.get(relation.source_record_id) ?? [];
        sourceRelations.push(relation);
        relationsByRecordId.set(relation.source_record_id, sourceRelations);
        const targetRelations = relationsByRecordId.get(relation.target_source_record_id) ?? [];
        targetRelations.push(relation);
        relationsByRecordId.set(relation.target_source_record_id, targetRelations);
        if (relation.relation_kind !== 'owns' || !clientIdSet.has(relation.source_record_id)) continue;
        const key = `${relation.source_record_id}:${relation.target_source_record_id}`;
        const existing = relationByClientTarget.get(key);
        if (!existing || relationRank(relation) > relationRank(existing)) {
          relationByClientTarget.set(key, relation);
        }
      }
      const recordsById = new Map(records.results.map((record) => [record.id, record]));

      const canvases: Array<{ canvas_id: string; client: string | null; matches: number; nodes: number; edges: number }> = [];
      for (const client of clients.results) {
        const payload = safeParseObject(client.payload_json);
        const clientStatus = String(payload.status ?? '').toLowerCase();
        if (!include_past_clients && ['past'].includes(clientStatus)) {
          continue;
        }
        const aliases = [
          ...defaultAliasesForClient(client.title ?? client.external_id),
          ...(aliasMap[client.title ?? ''] ?? []),
          ...(client.substrate_id ? aliasMap[client.substrate_id] ?? [] : []),
        ];
        const uniqueAliases = [...new Set(aliases.map((alias) => alias.trim()).filter((alias) => alias.length >= 3))];
        if (!uniqueAliases.length) continue;

        const directMatches = records.results
          .map((record): ClientProjectionMatch | null => {
            const relation = relationByClientTarget.get(`${client.id}:${record.id}`);
            if (relation) {
              return {
                record,
                reason: relation.reason ?? `${relation.evidence_kind} ${relation.relation_kind} relation`,
                confidence: relation.confidence,
                evidence_kind: relation.evidence_kind,
                relation_id: relation.id,
              };
            }
            const reason = clientRecordMatchReason(client, record, uniqueAliases);
            if (!reason) return null;
            return {
              record,
              reason,
              confidence: 0.75,
              evidence_kind: 'alias_inferred',
              relation_id: null,
            };
          })
          .filter((match): match is ClientProjectionMatch => Boolean(match));
        const matchesByRecordId = new Map(directMatches.map((match) => [match.record.id, match]));
        for (let depth = 0; depth < relation_expansion_depth; depth += 1) {
          const additions: ClientProjectionMatch[] = [];
          const frontier = [...matchesByRecordId.values()];
          for (const match of frontier) {
            for (const relation of relationsByRecordId.get(match.record.id) ?? []) {
              const relatedRecordId = relation.source_record_id === match.record.id ? relation.target_source_record_id : relation.source_record_id;
              if (relatedRecordId === client.id || matchesByRecordId.has(relatedRecordId)) continue;
              const relatedRecord = recordsById.get(relatedRecordId);
              if (!relatedRecord || relatedRecord.canonical_type === 'client') continue;
              if (!relationExpansionTypeSet.has(relatedRecord.canonical_type)) continue;
              additions.push({
                record: relatedRecord,
                reason: `relation-expanded from ${match.record.title ?? match.record.external_id}: ${relation.relation_kind} (${relation.evidence_kind})`,
                confidence: Math.max(0.1, Math.min(match.confidence, relation.confidence) * 0.9),
                evidence_kind: `relation_expanded:${relation.evidence_kind}`,
                relation_id: relation.id,
              });
            }
          }
          if (!additions.length) break;
          for (const addition of additions) {
            if (!matchesByRecordId.has(addition.record.id)) matchesByRecordId.set(addition.record.id, addition);
          }
        }
        const matches = [...matchesByRecordId.values()];
        if (matches.length < min_matches) {
          continue;
        }

        const canvasId = `${canvas_prefix}-${slugId(client.title ?? client.external_id)}-${hashId(client.substrate_id ?? client.external_id)}`;
        const clientNodeId = `${canvasId}_client`;
        await db
          .prepare(
            `INSERT INTO atlas_canvases (canvas_id, title, client, workflow, owner, status, source_kind, source_id, metadata_json)
             VALUES (?, ?, ?, 'Client workflow source projection', ?, ?, 'client_source_projection', ?, ?)
             ON CONFLICT (canvas_id)
             DO UPDATE SET
               title = excluded.title,
               client = excluded.client,
               workflow = excluded.workflow,
               owner = COALESCE(excluded.owner, atlas_canvases.owner),
               status = excluded.status,
               source_kind = excluded.source_kind,
               source_id = excluded.source_id,
               metadata_json = excluded.metadata_json,
               updated_at = datetime('now')`,
          )
          .bind(
            canvasId,
            `${client.title ?? client.external_id} Client Workflow Map`,
            client.title ?? client.external_id,
            actor,
            atlasStatusFromRecord(client),
            client.substrate_id ?? client.external_id,
            JSON.stringify({ aliases: uniqueAliases, source_record_id: client.id, source_external_id: client.source_external_id }),
          )
          .run();

        await db
          .prepare(
            `DELETE FROM atlas_edges
             WHERE canvas_id = ?
               AND (instr(edge_id, '_client_match_') > 0 OR instr(edge_id, '_source_relation_') > 0)`,
          )
          .bind(canvasId)
          .run();

        await db
          .prepare(
            `DELETE FROM source_record_atlas_bindings
             WHERE canvas_id = ?
               AND binding_kind = 'client_map'`,
          )
          .bind(canvasId)
          .run();

        await db
          .prepare(
            `DELETE FROM atlas_nodes
             WHERE canvas_id = ?
               AND (node_id = ? OR instr(node_id, '_source_record_') > 0)
               AND NOT EXISTS (SELECT 1 FROM workflow_runs wr WHERE wr.node_id = atlas_nodes.node_id)
               AND NOT EXISTS (SELECT 1 FROM workflow_receipts receipt WHERE receipt.node_id = atlas_nodes.node_id)
               AND NOT EXISTS (SELECT 1 FROM workflow_actions action WHERE action.node_id = atlas_nodes.node_id)`,
          )
          .bind(canvasId, clientNodeId)
          .run();

        await db
          .prepare(
            `INSERT INTO atlas_nodes (node_id, canvas_id, kind, label, status, notes, evidence, metadata_json)
             VALUES (?, ?, 'human', ?, ?, 'Client source record', ?, ?)
             ON CONFLICT (node_id)
             DO UPDATE SET
               canvas_id = excluded.canvas_id,
               kind = excluded.kind,
               label = excluded.label,
               status = excluded.status,
               notes = excluded.notes,
               evidence = excluded.evidence,
               metadata_json = excluded.metadata_json,
               updated_at = datetime('now')`,
          )
          .bind(
            clientNodeId,
            canvasId,
            client.title ?? client.external_id,
            atlasStatusFromRecord(client),
            `${client.source_type}:${client.source_external_id}:${client.external_id}`,
            JSON.stringify({
              substrate_id: client.substrate_id,
              canonical_type: 'client',
              source_record_external_id: client.external_id,
              payload: payload,
            }),
          )
          .run();

        await db
          .prepare(
            `INSERT INTO source_record_atlas_bindings (source_record_id, canvas_id, node_id, binding_kind, confidence, reason, metadata_json)
             VALUES (?, ?, ?, 'client_map', 1.0, 'client root node', ?)
             ON CONFLICT (source_record_id, canvas_id, node_id, binding_kind)
             DO UPDATE SET confidence = excluded.confidence, reason = excluded.reason, metadata_json = excluded.metadata_json, updated_at = datetime('now')`,
          )
          .bind(client.id, canvasId, clientNodeId, JSON.stringify({ aliases: uniqueAliases }))
          .run();

        let edges = 0;
        const nodeIdBySourceRecordId = new Map<number, string>([[client.id, clientNodeId]]);
        for (const { record, reason, confidence, evidence_kind, relation_id } of matches) {
          const nodeId = `${canvasId}_${atlasNodeIdForSourceRecord(record.substrate_id ?? record.external_id, record.external_id)}`;
          nodeIdBySourceRecordId.set(record.id, nodeId);
          await db
            .prepare(
              `INSERT INTO atlas_nodes (node_id, canvas_id, kind, label, status, notes, evidence, metadata_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT (node_id)
               DO UPDATE SET
                 canvas_id = excluded.canvas_id,
                 kind = excluded.kind,
                 label = excluded.label,
                 status = excluded.status,
                 notes = excluded.notes,
                 evidence = excluded.evidence,
                 metadata_json = excluded.metadata_json,
                 updated_at = datetime('now')`,
            )
            .bind(
              nodeId,
              canvasId,
              atlasNodeKindForCanonicalType(record.canonical_type),
              record.title ?? record.external_id,
              atlasStatusFromRecord(record),
              `${record.canonical_type} matched to ${client.title ?? client.external_id}`,
              `${record.source_type}:${record.source_external_id}:${record.external_id}`,
              JSON.stringify({
                substrate_id: record.substrate_id,
                canonical_type: record.canonical_type,
                source_record_external_id: record.external_id,
                match_reason: reason,
                relation_id,
                relation_evidence_kind: evidence_kind,
                payload: safeParseObject(record.payload_json),
              }),
            )
            .run();

          await db
            .prepare(
              `INSERT INTO source_record_atlas_bindings (source_record_id, canvas_id, node_id, binding_kind, confidence, reason, metadata_json)
               VALUES (?, ?, ?, 'client_map', ?, ?, ?)
               ON CONFLICT (source_record_id, canvas_id, node_id, binding_kind)
               DO UPDATE SET confidence = excluded.confidence, reason = excluded.reason, metadata_json = excluded.metadata_json, updated_at = datetime('now')`,
            )
            .bind(
              record.id,
              canvasId,
              nodeId,
              confidence,
              reason,
              JSON.stringify({ client_source_record_id: client.id, aliases: uniqueAliases, relation_id, relation_evidence_kind: evidence_kind }),
            )
            .run();

          const edgeId = `${canvasId}_client_match_${hashId(`${client.id}:${record.id}:${reason}`)}`;
          await db
            .prepare(
              `INSERT INTO atlas_edges (edge_id, canvas_id, source_node_id, target_node_id, label, evidence, metadata_json)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT (edge_id)
               DO UPDATE SET
                 canvas_id = excluded.canvas_id,
                 source_node_id = excluded.source_node_id,
                 target_node_id = excluded.target_node_id,
                 label = excluded.label,
                 evidence = excluded.evidence,
                 metadata_json = excluded.metadata_json,
                 updated_at = datetime('now')`,
            )
            .bind(
              edgeId,
              canvasId,
              clientNodeId,
              nodeId,
              record.canonical_type,
              reason,
              JSON.stringify({
                confidence,
                source_record_id: record.id,
                client_source_record_id: client.id,
                source_record_relation_id: relation_id,
                relation_evidence_kind: evidence_kind,
              }),
            )
            .run();
          edges += 1;
        }

        const canvasRecordIds = [...nodeIdBySourceRecordId.keys()];
        const intraCanvasRelationsById = new Map<number, SourceRecordRelationRow>();
        for (const sourceIdBatch of chunkArray(canvasRecordIds, 40)) {
          for (const targetIdBatch of chunkArray(canvasRecordIds, 40)) {
            const intraCanvasRelations = await db
              .prepare(
                `SELECT id, source_record_id, target_source_record_id, relation_kind, evidence_kind, confidence, reason, metadata_json
                 FROM source_record_relations
                 WHERE source_record_id IN (${sourceIdBatch.map(() => '?').join(',')})
                   AND target_source_record_id IN (${targetIdBatch.map(() => '?').join(',')})`,
              )
              .bind(...sourceIdBatch, ...targetIdBatch)
              .all<SourceRecordRelationRow>();
            for (const relation of intraCanvasRelations.results) {
              if (relation.source_record_id === relation.target_source_record_id) continue;
              if (relation.source_record_id === client.id && relation.relation_kind === 'owns') continue;
              intraCanvasRelationsById.set(relation.id, relation);
            }
          }
        }

        for (const relation of intraCanvasRelationsById.values()) {
          const sourceNodeId = nodeIdBySourceRecordId.get(relation.source_record_id);
          const targetNodeId = nodeIdBySourceRecordId.get(relation.target_source_record_id);
          if (!sourceNodeId || !targetNodeId) continue;
          const edgeId = `${canvasId}_source_relation_${relation.id}`;
          await db
            .prepare(
              `INSERT INTO atlas_edges (edge_id, canvas_id, source_node_id, target_node_id, label, evidence, metadata_json)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT (edge_id)
               DO UPDATE SET
                 canvas_id = excluded.canvas_id,
                 source_node_id = excluded.source_node_id,
                 target_node_id = excluded.target_node_id,
                 label = excluded.label,
                 evidence = excluded.evidence,
                 metadata_json = excluded.metadata_json,
                 updated_at = datetime('now')`,
            )
            .bind(
              edgeId,
              canvasId,
              sourceNodeId,
              targetNodeId,
              relation.relation_kind,
              relation.reason ?? `${relation.evidence_kind} ${relation.relation_kind} relation`,
              JSON.stringify({
                confidence: relation.confidence,
                source_record_relation_id: relation.id,
                relation_evidence_kind: relation.evidence_kind,
                relation_kind: relation.relation_kind,
                intra_canvas_relation: true,
              }),
            )
            .run();
          edges += 1;
        }

        await db
          .prepare(
            `INSERT INTO workflow_receipts (canvas_id, receipt_type, summary, payload_json, created_by)
             VALUES (?, 'sync', ?, ?, ?)`,
          )
          .bind(
            canvasId,
            `Projected ${matches.length} matched source records into client workflow map`,
            JSON.stringify({ client_source_record_id: client.id, matches: matches.length, aliases: uniqueAliases }),
            actor,
          )
          .run();

        canvases.push({ canvas_id: canvasId, client: client.title, matches: matches.length, nodes: matches.length + 1, edges });
      }

      await logEvent(db, actor, 'project_client_workflow_canvases', 'atlas_canvas', canvas_prefix, {
        source_type,
        client_external_id: client_external_id ?? null,
        client_search: client_search ?? null,
        canvases: canvases.length,
        records_considered: records.results.length,
        client_records_considered: clients.results.length,
        relation_expansion_depth,
        relation_expansion_canonical_types,
      });

      return json({
        ok: true,
        canvases_created: canvases.length,
        records_considered: records.results.length,
        client_records_considered: clients.results.length,
        relation_expansion_depth,
        relation_expansion_canonical_types,
        canvases,
      });
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
    'governance_upsert_atlas_canvas',
    'Create or update a canonical Atlas canvas plus optional nodes and edges. This is the database-layer source of truth; UI renderers consume this state.',
    {
      canvas: z.object({
        canvas_id: z.string().describe('Stable Atlas canvas id, e.g. a session slug or generated database id'),
        title: z.string(),
        client: z.string().optional(),
        workflow: z.string().optional(),
        owner: z.string().optional(),
        status: z.enum(ATLAS_STATUSES).default('unknown'),
        source_kind: z.string().optional().describe('notion | atlas_studio | slack_canvas | manual | api | other'),
        source_id: z.string().optional(),
        metadata_json: z.string().optional(),
      }),
      nodes: z
        .array(
          z.object({
            node_id: z.string(),
            kind: z.enum(ATLAS_NODE_KINDS),
            label: z.string(),
            owner: z.string().optional(),
            status: z.enum(ATLAS_STATUSES).default('unknown'),
            notes: z.string().optional(),
            evidence: z.string().optional(),
            x: z.number().optional(),
            y: z.number().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
            metadata_json: z.string().optional(),
          }),
        )
        .default([]),
      edges: z
        .array(
          z.object({
            edge_id: z.string(),
            source_node_id: z.string(),
            target_node_id: z.string(),
            label: z.string().optional(),
            evidence: z.string().optional(),
            metadata_json: z.string().optional(),
          }),
        )
        .default([]),
      actor: z.string().default('claude-code'),
    },
    async ({ canvas, nodes, edges, actor }) => {
      const db = getDb();
      await db
        .prepare(
          `INSERT INTO atlas_canvases (canvas_id, title, client, workflow, owner, status, source_kind, source_id, metadata_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (canvas_id)
           DO UPDATE SET
             title = excluded.title,
             client = COALESCE(excluded.client, atlas_canvases.client),
             workflow = COALESCE(excluded.workflow, atlas_canvases.workflow),
             owner = COALESCE(excluded.owner, atlas_canvases.owner),
             status = excluded.status,
             source_kind = COALESCE(excluded.source_kind, atlas_canvases.source_kind),
             source_id = COALESCE(excluded.source_id, atlas_canvases.source_id),
             metadata_json = COALESCE(excluded.metadata_json, atlas_canvases.metadata_json),
             updated_at = datetime('now')`,
        )
        .bind(
          canvas.canvas_id,
          canvas.title,
          canvas.client ?? null,
          canvas.workflow ?? null,
          canvas.owner ?? null,
          canvas.status,
          canvas.source_kind ?? null,
          canvas.source_id ?? null,
          canvas.metadata_json ?? null,
        )
        .run();

      for (const node of nodes) {
        await db
          .prepare(
            `INSERT INTO atlas_nodes (node_id, canvas_id, kind, label, owner, status, notes, evidence, x, y, width, height, metadata_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (node_id)
             DO UPDATE SET
               canvas_id = excluded.canvas_id,
               kind = excluded.kind,
               label = excluded.label,
               owner = COALESCE(excluded.owner, atlas_nodes.owner),
               status = excluded.status,
               notes = COALESCE(excluded.notes, atlas_nodes.notes),
               evidence = COALESCE(excluded.evidence, atlas_nodes.evidence),
               x = COALESCE(excluded.x, atlas_nodes.x),
               y = COALESCE(excluded.y, atlas_nodes.y),
               width = COALESCE(excluded.width, atlas_nodes.width),
               height = COALESCE(excluded.height, atlas_nodes.height),
               metadata_json = COALESCE(excluded.metadata_json, atlas_nodes.metadata_json),
               updated_at = datetime('now')`,
          )
          .bind(
            node.node_id,
            canvas.canvas_id,
            node.kind,
            node.label,
            node.owner ?? null,
            node.status,
            node.notes ?? null,
            node.evidence ?? null,
            node.x ?? null,
            node.y ?? null,
            node.width ?? null,
            node.height ?? null,
            node.metadata_json ?? null,
          )
          .run();
      }

      for (const edge of edges) {
        await db
          .prepare(
            `INSERT INTO atlas_edges (edge_id, canvas_id, source_node_id, target_node_id, label, evidence, metadata_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (edge_id)
             DO UPDATE SET
               canvas_id = excluded.canvas_id,
               source_node_id = excluded.source_node_id,
               target_node_id = excluded.target_node_id,
               label = COALESCE(excluded.label, atlas_edges.label),
               evidence = COALESCE(excluded.evidence, atlas_edges.evidence),
               metadata_json = COALESCE(excluded.metadata_json, atlas_edges.metadata_json),
               updated_at = datetime('now')`,
          )
          .bind(
            edge.edge_id,
            canvas.canvas_id,
            edge.source_node_id,
            edge.target_node_id,
            edge.label ?? null,
            edge.evidence ?? null,
            edge.metadata_json ?? null,
          )
          .run();
      }

      await logEvent(db, actor, 'upsert_atlas_canvas', 'atlas_canvas', canvas.canvas_id, {
        nodes: nodes.length,
        edges: edges.length,
        source_kind: canvas.source_kind ?? null,
        source_id: canvas.source_id ?? null,
      });

      return json({ ok: true, canvas_id: canvas.canvas_id, nodes_upserted: nodes.length, edges_upserted: edges.length });
    },
  );

  server.tool(
    'governance_list_atlas_canvases',
    'List canonical Atlas canvases/workflow maps managed by the database layer.',
    {
      status: z.enum(ATLAS_STATUSES).optional(),
      client: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    },
    async ({ status, client, search, limit }) => {
      const db = getDb();
      const where: string[] = [];
      const params: unknown[] = [];
      if (status) {
        where.push('c.status = ?');
        params.push(status);
      }
      if (client) {
        where.push('c.client LIKE ?');
        params.push(`%${client}%`);
      }
      if (search) {
        where.push('(c.title LIKE ? OR c.workflow LIKE ? OR c.source_id LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      const result = await db
        .prepare(
          `SELECT c.*,
                  COUNT(DISTINCT n.node_id) AS node_count,
                  COUNT(DISTINCT e.edge_id) AS edge_count
           FROM atlas_canvases c
           LEFT JOIN atlas_nodes n ON n.canvas_id = c.canvas_id
           LEFT JOIN atlas_edges e ON e.canvas_id = c.canvas_id
           ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
           GROUP BY c.canvas_id
           ORDER BY c.updated_at DESC
           LIMIT ?`,
        )
        .bind(...params, limit)
        .all();
      return json(result.results);
    },
  );

  server.tool(
    'governance_get_atlas_canvas',
    'Fetch a canonical Atlas canvas with nodes, edges, recent workflow runs, and receipts.',
    {
      canvas_id: z.string(),
      include_activity: z.boolean().default(true),
    },
    async ({ canvas_id, include_activity }) => {
      const db = getDb();
      const canvas = await db.prepare('SELECT * FROM atlas_canvases WHERE canvas_id = ?').bind(canvas_id).first();
      if (!canvas) {
        return json({ ok: false, error: `Atlas canvas ${canvas_id} not found.` });
      }
      const [nodes, edges, runs, receipts] = await Promise.all([
        db.prepare('SELECT * FROM atlas_nodes WHERE canvas_id = ? ORDER BY label').bind(canvas_id).all(),
        db.prepare('SELECT * FROM atlas_edges WHERE canvas_id = ? ORDER BY edge_id').bind(canvas_id).all(),
        include_activity
          ? db.prepare('SELECT * FROM workflow_runs WHERE canvas_id = ? ORDER BY updated_at DESC LIMIT 50').bind(canvas_id).all()
          : Promise.resolve({ results: [] }),
        include_activity
          ? db.prepare('SELECT * FROM workflow_receipts WHERE canvas_id = ? ORDER BY id DESC LIMIT 50').bind(canvas_id).all()
          : Promise.resolve({ results: [] }),
      ]);
      return json({ canvas, nodes: nodes.results, edges: edges.results, runs: runs.results, receipts: receipts.results });
    },
  );

  server.tool(
    'governance_get_workflow_runtime',
    'Fetch an executable runtime view for an Atlas workflow map: node readiness, dependencies, latest runs, binding counts, receipts, open runs, and next runnable nodes.',
    {
      canvas_id: z.string(),
      include_edges: z.boolean().default(true),
      include_recent_receipts: z.boolean().default(true),
      limit_recent: z.number().int().min(1).max(100).default(25),
    },
    async ({ canvas_id, include_edges, include_recent_receipts, limit_recent }) => {
      const db = getDb();
      const canvas = await db.prepare('SELECT * FROM atlas_canvases WHERE canvas_id = ?').bind(canvas_id).first();
      if (!canvas) {
        return json({ ok: false, error: `Atlas canvas ${canvas_id} not found.` });
      }

      const [nodes, edges, latestRuns, receiptCounts, bindingCounts, actionCounts, openActions, openRuns, recentReceipts] = await Promise.all([
        db.prepare('SELECT * FROM atlas_nodes WHERE canvas_id = ? ORDER BY kind, label').bind(canvas_id).all(),
        db.prepare('SELECT * FROM atlas_edges WHERE canvas_id = ? ORDER BY edge_id').bind(canvas_id).all(),
        db
          .prepare(
            `WITH ranked AS (
               SELECT wr.*,
                      ROW_NUMBER() OVER (
                        PARTITION BY COALESCE(wr.node_id, '__canvas__')
                        ORDER BY wr.updated_at DESC, wr.started_at DESC
                      ) AS rn
               FROM workflow_runs wr
               WHERE wr.canvas_id = ?
             )
             SELECT * FROM ranked WHERE rn = 1`,
          )
          .bind(canvas_id)
          .all(),
        db
          .prepare(
            `SELECT COALESCE(node_id, '__canvas__') AS node_id, COUNT(*) AS receipt_count, MAX(created_at) AS latest_receipt_at
             FROM workflow_receipts
             WHERE canvas_id = ?
             GROUP BY COALESCE(node_id, '__canvas__')`,
          )
          .bind(canvas_id)
          .all<{ node_id: string; receipt_count: number; latest_receipt_at: string | null }>(),
        db
          .prepare(
            `SELECT node_id, COUNT(*) AS binding_count
             FROM source_record_atlas_bindings
             WHERE canvas_id = ?
             GROUP BY node_id`,
          )
          .bind(canvas_id)
          .all<{ node_id: string; binding_count: number }>(),
        db
          .prepare(
            `SELECT status, gate_kind, COUNT(*) AS n
             FROM workflow_actions
             WHERE canvas_id = ?
             GROUP BY status, gate_kind
             ORDER BY status, gate_kind`,
          )
          .bind(canvas_id)
          .all<{ status: string; gate_kind: string; n: number }>(),
        db
          .prepare(
            `SELECT *
             FROM workflow_actions
             WHERE canvas_id = ? AND status IN ('proposed', 'approved', 'ready', 'running', 'blocked')
             ORDER BY
               CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
               updated_at DESC
             LIMIT ?`,
          )
          .bind(canvas_id, limit_recent)
          .all(),
        db
          .prepare(
            `SELECT * FROM workflow_runs
             WHERE canvas_id = ? AND status = 'started'
             ORDER BY updated_at DESC
             LIMIT ?`,
          )
          .bind(canvas_id, limit_recent)
          .all(),
        include_recent_receipts
          ? db
              .prepare(
                `SELECT * FROM workflow_receipts
                 WHERE canvas_id = ?
                 ORDER BY id DESC
                 LIMIT ?`,
              )
              .bind(canvas_id, limit_recent)
              .all()
          : Promise.resolve({ results: [] }),
      ]);

      const nodeRows = nodes.results as Array<Record<string, unknown> & { node_id: string; status: string; label: string; kind: string }>;
      const edgeRows = edges.results as Array<Record<string, unknown> & { edge_id: string; source_node_id: string; target_node_id: string }>;
      const latestRunByNode = new Map<string, Record<string, unknown> & { status?: string; node_id?: string | null }>();
      for (const run of latestRuns.results as Array<Record<string, unknown> & { node_id?: string | null; status?: string }>) {
        latestRunByNode.set(run.node_id ?? '__canvas__', run);
      }
      const receiptCountByNode = new Map(
        receiptCounts.results.map((row) => [row.node_id, { receipt_count: row.receipt_count, latest_receipt_at: row.latest_receipt_at }]),
      );
      const canvasReceiptSummary = receiptCountByNode.get('__canvas__') ?? { receipt_count: 0, latest_receipt_at: null };
      const bindingCountByNode = new Map(bindingCounts.results.map((row) => [row.node_id, row.binding_count]));
      const incoming = new Map<string, string[]>();
      const outgoing = new Map<string, string[]>();
      for (const node of nodeRows) {
        incoming.set(node.node_id, []);
        outgoing.set(node.node_id, []);
      }
      for (const edge of edgeRows) {
        incoming.get(edge.target_node_id)?.push(edge.source_node_id);
        outgoing.get(edge.source_node_id)?.push(edge.target_node_id);
      }

      const nodeById = new Map(nodeRows.map((node) => [node.node_id, node]));
      const isBlocked = (nodeId: string): boolean => {
        const node = nodeById.get(nodeId);
        const run = latestRunByNode.get(nodeId);
        return node?.status === 'stop' || run?.status === 'failed' || run?.status === 'blocked';
      };
      const isRunning = (nodeId: string): boolean => latestRunByNode.get(nodeId)?.status === 'started';

      const runtimeNodes = nodeRows.map((node) => {
        const upstream = incoming.get(node.node_id) ?? [];
        const downstream = outgoing.get(node.node_id) ?? [];
        const latestRun = latestRunByNode.get(node.node_id) ?? null;
        const receiptSummary = receiptCountByNode.get(node.node_id) ?? { receipt_count: 0, latest_receipt_at: null };
        const upstreamBlocked = upstream.some(isBlocked);
        const upstreamRunning = upstream.some(isRunning);
        const runtimeState = isBlocked(node.node_id)
          ? 'blocked'
          : isRunning(node.node_id)
            ? 'running'
            : upstreamBlocked
              ? 'blocked'
              : upstreamRunning || node.status === 'wait'
                ? 'waiting'
                : 'ready';
        return {
          node_id: node.node_id,
          label: node.label,
          kind: node.kind,
          owner: node.owner ?? null,
          atlas_status: node.status,
          runtime_state: runtimeState,
          upstream_node_ids: upstream,
          downstream_node_ids: downstream,
          incoming_edges: upstream.length,
          outgoing_edges: downstream.length,
          binding_count: bindingCountByNode.get(node.node_id) ?? 0,
          receipt_count: receiptSummary.receipt_count,
          latest_receipt_at: receiptSummary.latest_receipt_at,
          latest_run: latestRun,
        };
      });

      const summary = runtimeNodes.reduce(
        (acc, node) => {
          acc.nodes += 1;
          acc[node.runtime_state as 'ready' | 'waiting' | 'running' | 'blocked'] += 1;
          acc.bindings += node.binding_count;
          acc.receipts += node.receipt_count;
          return acc;
        },
        {
          nodes: 0,
          ready: 0,
          waiting: 0,
          running: 0,
          blocked: 0,
          bindings: 0,
          receipts: canvasReceiptSummary.receipt_count,
          canvas_receipts: canvasReceiptSummary.receipt_count,
          latest_canvas_receipt_at: canvasReceiptSummary.latest_receipt_at,
          actions: 0,
          open_actions: 0,
        },
      );
      for (const row of actionCounts.results) {
        summary.actions += row.n;
        if (['proposed', 'approved', 'ready', 'running', 'blocked'].includes(row.status)) {
          summary.open_actions += row.n;
        }
      }

      return json({
        ok: true,
        canvas,
        summary,
        action_counts: actionCounts.results,
        next_nodes: runtimeNodes
          .filter((node) => node.runtime_state === 'ready')
          .slice(0, 25)
          .map((node) => ({ node_id: node.node_id, label: node.label, kind: node.kind, owner: node.owner })),
        open_actions: openActions.results,
        canvas_latest_run: latestRunByNode.get('__canvas__') ?? null,
        open_runs: openRuns.results,
        nodes: runtimeNodes,
        edges: include_edges ? edgeRows : [],
        recent_receipts: recentReceipts.results,
      });
    },
  );

  server.tool(
    'governance_upsert_workflow_action',
    'Create or update a workflow action/gate for an Atlas canvas. Use actions to propose, approve, block, complete, or cancel the work units that run a mapped workflow.',
    {
      action_id: z.string().optional(),
      canvas_id: z.string(),
      node_id: z.string().optional(),
      run_id: z.string().optional(),
      title: z.string(),
      description: z.string().optional(),
      action_kind: z.enum(WORKFLOW_ACTION_KINDS).default('task'),
      status: z.enum(WORKFLOW_ACTION_STATUSES).default('proposed'),
      gate_kind: z.enum(WORKFLOW_ACTION_GATES).default('review'),
      priority: z.enum(WORKFLOW_ACTION_PRIORITIES).default('P2'),
      owner: z.string().optional(),
      proposed_by: z.string().optional(),
      approved_by: z.string().optional(),
      source_kind: z.string().optional(),
      source_id: z.string().optional(),
      artifact_url: z.string().optional(),
      evidence: z.string().optional(),
      metadata_json: z.string().optional(),
      actor: z.string().default('claude-code'),
    },
    async (input) => {
      const db = getDb();
      const canvas = await db.prepare('SELECT canvas_id FROM atlas_canvases WHERE canvas_id = ?').bind(input.canvas_id).first();
      if (!canvas) {
        return json({ ok: false, error: `Atlas canvas ${input.canvas_id} not found.` });
      }
      if (input.node_id) {
        const node = await db
          .prepare('SELECT node_id FROM atlas_nodes WHERE canvas_id = ? AND node_id = ?')
          .bind(input.canvas_id, input.node_id)
          .first();
        if (!node) {
          return json({ ok: false, error: `Atlas node ${input.node_id} not found on canvas ${input.canvas_id}.` });
        }
      }
      if (input.run_id) {
        const run = await db
          .prepare('SELECT run_id FROM workflow_runs WHERE canvas_id = ? AND run_id = ?')
          .bind(input.canvas_id, input.run_id)
          .first();
        if (!run) {
          return json({ ok: false, error: `Workflow run ${input.run_id} not found on canvas ${input.canvas_id}.` });
        }
      }

      const actionId = input.action_id ?? `workflow_action_${crypto.randomUUID()}`;
      const proposedBy = input.proposed_by ?? input.actor;
      const approvedBy = input.approved_by ?? (['approved', 'ready', 'running', 'completed'].includes(input.status) ? input.actor : null);
      const shouldSetApprovedAt = ['approved', 'ready', 'running', 'completed'].includes(input.status);
      const shouldSetCompletedAt = ['completed', 'rejected', 'canceled'].includes(input.status);

      await db
        .prepare(
          `INSERT INTO workflow_actions (
             action_id, canvas_id, node_id, run_id, title, description, action_kind, status,
             gate_kind, priority, owner, proposed_by, approved_by, source_kind, source_id,
             artifact_url, evidence, metadata_json, approved_at, completed_at
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? THEN datetime('now') ELSE NULL END, CASE WHEN ? THEN datetime('now') ELSE NULL END)
           ON CONFLICT (action_id)
           DO UPDATE SET
             canvas_id = excluded.canvas_id,
             node_id = COALESCE(excluded.node_id, workflow_actions.node_id),
             run_id = COALESCE(excluded.run_id, workflow_actions.run_id),
             title = excluded.title,
             description = COALESCE(excluded.description, workflow_actions.description),
             action_kind = excluded.action_kind,
             status = excluded.status,
             gate_kind = excluded.gate_kind,
             priority = excluded.priority,
             owner = COALESCE(excluded.owner, workflow_actions.owner),
             approved_by = COALESCE(excluded.approved_by, workflow_actions.approved_by),
             source_kind = COALESCE(excluded.source_kind, workflow_actions.source_kind),
             source_id = COALESCE(excluded.source_id, workflow_actions.source_id),
             artifact_url = COALESCE(excluded.artifact_url, workflow_actions.artifact_url),
             evidence = COALESCE(excluded.evidence, workflow_actions.evidence),
             metadata_json = COALESCE(excluded.metadata_json, workflow_actions.metadata_json),
             approved_at = COALESCE(excluded.approved_at, workflow_actions.approved_at),
             completed_at = COALESCE(excluded.completed_at, workflow_actions.completed_at),
             updated_at = datetime('now')`,
        )
        .bind(
          actionId,
          input.canvas_id,
          input.node_id ?? null,
          input.run_id ?? null,
          input.title,
          input.description ?? null,
          input.action_kind,
          input.status,
          input.gate_kind,
          input.priority,
          input.owner ?? null,
          proposedBy,
          approvedBy,
          input.source_kind ?? null,
          input.source_id ?? null,
          input.artifact_url ?? null,
          input.evidence ?? null,
          input.metadata_json ?? null,
          shouldSetApprovedAt ? 1 : 0,
          shouldSetCompletedAt ? 1 : 0,
        )
        .run();

      const action = await db.prepare('SELECT * FROM workflow_actions WHERE action_id = ?').bind(actionId).first();
      await logEvent(db, input.actor, 'upsert_workflow_action', 'workflow_action', actionId, {
        canvas_id: input.canvas_id,
        node_id: input.node_id ?? null,
        status: input.status,
        gate_kind: input.gate_kind,
        action_kind: input.action_kind,
      });

      return json({ ok: true, action });
    },
  );

  server.tool(
    'governance_list_workflow_actions',
    'List workflow actions/gates for Atlas operation. Use this to find proposed, approved, blocked, or completed work across a canvas, node, owner, or run.',
    {
      canvas_id: z.string().optional(),
      node_id: z.string().optional(),
      run_id: z.string().optional(),
      status: z.enum(WORKFLOW_ACTION_STATUSES).optional(),
      gate_kind: z.enum(WORKFLOW_ACTION_GATES).optional(),
      owner: z.string().optional(),
      open_only: z.boolean().default(false),
      limit: z.number().int().min(1).max(200).default(50),
    },
    async ({ canvas_id, node_id, run_id, status, gate_kind, owner, open_only, limit }) => {
      const db = getDb();
      const where: string[] = [];
      const params: unknown[] = [];
      if (canvas_id) {
        where.push('a.canvas_id = ?');
        params.push(canvas_id);
      }
      if (node_id) {
        where.push('a.node_id = ?');
        params.push(node_id);
      }
      if (run_id) {
        where.push('a.run_id = ?');
        params.push(run_id);
      }
      if (status) {
        where.push('a.status = ?');
        params.push(status);
      }
      if (gate_kind) {
        where.push('a.gate_kind = ?');
        params.push(gate_kind);
      }
      if (owner) {
        where.push('a.owner = ?');
        params.push(owner);
      }
      if (open_only) {
        where.push("a.status IN ('proposed', 'approved', 'ready', 'running', 'blocked')");
      }
      const result = await db
        .prepare(
          `SELECT a.*, n.label AS node_label, c.title AS canvas_title
           FROM workflow_actions a
           JOIN atlas_canvases c ON c.canvas_id = a.canvas_id
           LEFT JOIN atlas_nodes n ON n.node_id = a.node_id
           ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
           ORDER BY
             CASE a.priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
             a.updated_at DESC
           LIMIT ?`,
        )
        .bind(...params, limit)
        .all();
      const counts = await db
        .prepare(
          `SELECT status, gate_kind, COUNT(*) AS n
           FROM workflow_actions a
           ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
           GROUP BY status, gate_kind
           ORDER BY status, gate_kind`,
        )
        .bind(...params)
        .all();
      return json({ actions: result.results, counts: counts.results });
    },
  );

  server.tool(
    'governance_record_workflow_run',
    'Create or update a workflow run for an Atlas canvas/node without requiring a receipt. Use this to start, complete, fail, skip, or block executable workflow units through API/MCP/agent control.',
    {
      canvas_id: z.string(),
      node_id: z.string().optional(),
      run_id: z.string().optional(),
      status: z.enum(WORKFLOW_RUN_STATUSES).default('started'),
      actor: z.string().default('claude-code'),
      input_json: z.string().optional(),
      output_json: z.string().optional(),
      receipt_url: z.string().optional(),
      error: z.string().optional(),
      update_node_status: z.enum(ATLAS_STATUSES).optional().describe('Optionally update the node run/wait/stop state with this run update'),
      receipt_summary: z.string().optional().describe('Optional receipt summary to write with this run update'),
      receipt_type: z.enum(WORKFLOW_RECEIPT_TYPES).default('proof'),
      receipt_payload_json: z.string().optional(),
      artifact_url: z.string().optional(),
    },
    async (input) => {
      const db = getDb();
      const canvas = await db.prepare('SELECT canvas_id FROM atlas_canvases WHERE canvas_id = ?').bind(input.canvas_id).first();
      if (!canvas) {
        return json({ ok: false, error: `Atlas canvas ${input.canvas_id} not found.` });
      }
      if (input.node_id) {
        const node = await db
          .prepare('SELECT node_id FROM atlas_nodes WHERE canvas_id = ? AND node_id = ?')
          .bind(input.canvas_id, input.node_id)
          .first();
        if (!node) {
          return json({ ok: false, error: `Atlas node ${input.node_id} not found on canvas ${input.canvas_id}.` });
        }
      }

      const runId = input.run_id ?? crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO workflow_runs (run_id, canvas_id, node_id, status, actor, completed_at, input_json, output_json, receipt_url, error)
           VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 'started' THEN NULL ELSE datetime('now') END, ?, ?, ?, ?)
           ON CONFLICT (run_id)
           DO UPDATE SET
             status = excluded.status,
             node_id = COALESCE(excluded.node_id, workflow_runs.node_id),
             completed_at = excluded.completed_at,
             input_json = COALESCE(excluded.input_json, workflow_runs.input_json),
             output_json = COALESCE(excluded.output_json, workflow_runs.output_json),
             receipt_url = COALESCE(excluded.receipt_url, workflow_runs.receipt_url),
             error = COALESCE(excluded.error, workflow_runs.error),
             updated_at = datetime('now')`,
        )
        .bind(
          runId,
          input.canvas_id,
          input.node_id ?? null,
          input.status,
          input.actor,
          input.status,
          input.input_json ?? null,
          input.output_json ?? null,
          input.receipt_url ?? input.artifact_url ?? null,
          input.error ?? null,
        )
        .run();

      let receiptId: number | null = null;
      if (input.receipt_summary) {
        const receipt = await db
          .prepare(
            `INSERT INTO workflow_receipts (run_id, canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            runId,
            input.canvas_id,
            input.node_id ?? null,
            input.receipt_type,
            input.receipt_summary,
            input.artifact_url ?? input.receipt_url ?? null,
            input.receipt_payload_json ?? input.output_json ?? null,
            input.actor,
          )
          .run();
        receiptId = Number(receipt.meta.last_row_id);
      }

      if (input.node_id && input.update_node_status) {
        await db
          .prepare("UPDATE atlas_nodes SET status = ?, updated_at = datetime('now') WHERE canvas_id = ? AND node_id = ?")
          .bind(input.update_node_status, input.canvas_id, input.node_id)
          .run();
      }

      await logEvent(db, input.actor, 'record_workflow_run', 'workflow_run', runId, {
        canvas_id: input.canvas_id,
        node_id: input.node_id ?? null,
        status: input.status,
        receipt_id: receiptId,
      });

      return json({ ok: true, run_id: runId, status: input.status, receipt_id: receiptId });
    },
  );

  server.tool(
    'governance_record_workflow_receipt',
    'Record a workflow run receipt for an Atlas canvas/node. Use this after an agent/API action to preserve proof, decision, handoff, sync, or error evidence.',
    {
      canvas_id: z.string(),
      node_id: z.string().optional(),
      run_id: z.string().optional(),
      status: z.enum(WORKFLOW_RUN_STATUSES).default('succeeded'),
      receipt_type: z.enum(WORKFLOW_RECEIPT_TYPES).default('proof'),
      summary: z.string(),
      actor: z.string().default('claude-code'),
      artifact_url: z.string().optional(),
      input_json: z.string().optional(),
      output_json: z.string().optional(),
      payload_json: z.string().optional(),
      error: z.string().optional(),
      update_node_status: z.enum(ATLAS_STATUSES).optional().describe('Optionally update the node run/wait/stop state with this receipt'),
    },
    async (input) => {
      const db = getDb();
      const canvas = await db.prepare('SELECT canvas_id FROM atlas_canvases WHERE canvas_id = ?').bind(input.canvas_id).first();
      if (!canvas) {
        return json({ ok: false, error: `Atlas canvas ${input.canvas_id} not found.` });
      }
      if (input.node_id) {
        const node = await db
          .prepare('SELECT node_id FROM atlas_nodes WHERE canvas_id = ? AND node_id = ?')
          .bind(input.canvas_id, input.node_id)
          .first();
        if (!node) {
          return json({ ok: false, error: `Atlas node ${input.node_id} not found on canvas ${input.canvas_id}.` });
        }
      }

      const runId = input.run_id ?? crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO workflow_runs (run_id, canvas_id, node_id, status, actor, completed_at, input_json, output_json, receipt_url, error)
           VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 'started' THEN NULL ELSE datetime('now') END, ?, ?, ?, ?)
           ON CONFLICT (run_id)
           DO UPDATE SET
             status = excluded.status,
             completed_at = excluded.completed_at,
             output_json = COALESCE(excluded.output_json, workflow_runs.output_json),
             receipt_url = COALESCE(excluded.receipt_url, workflow_runs.receipt_url),
             error = COALESCE(excluded.error, workflow_runs.error),
             updated_at = datetime('now')`,
        )
        .bind(
          runId,
          input.canvas_id,
          input.node_id ?? null,
          input.status,
          input.actor,
          input.status,
          input.input_json ?? null,
          input.output_json ?? null,
          input.artifact_url ?? null,
          input.error ?? null,
        )
        .run();

      const receipt = await db
        .prepare(
          `INSERT INTO workflow_receipts (run_id, canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          runId,
          input.canvas_id,
          input.node_id ?? null,
          input.receipt_type,
          input.summary,
          input.artifact_url ?? null,
          input.payload_json ?? input.output_json ?? null,
          input.actor,
        )
        .run();

      if (input.node_id && input.update_node_status) {
        await db
          .prepare("UPDATE atlas_nodes SET status = ?, updated_at = datetime('now') WHERE canvas_id = ? AND node_id = ?")
          .bind(input.update_node_status, input.canvas_id, input.node_id)
          .run();
      }

      await logEvent(db, input.actor, 'record_workflow_receipt', 'atlas_canvas', input.canvas_id, {
        run_id: runId,
        node_id: input.node_id ?? null,
        status: input.status,
        receipt_type: input.receipt_type,
        receipt_id: receipt.meta.last_row_id,
      });

      return json({ ok: true, run_id: runId, receipt_id: receipt.meta.last_row_id, status: input.status });
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
