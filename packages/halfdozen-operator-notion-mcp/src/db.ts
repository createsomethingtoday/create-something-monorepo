import type { Composio } from '@composio/core';

export interface PartnerClientRow {
  id: string;
  slug: string;
  display_name: string | null;
  workspace_account_id: string;
  metadata_json: string;
}

export interface NotionAccountRow {
  id: string;
  partner_client_id: string;
  account_slug: string;
  display_label: string | null;
  composio_user_id: string;
  auth_config_id: string | null;
  connected_account_id: string | null;
  connection_status: string;
  status: 'active' | 'disabled' | 'revoked';
  sync_enabled: number;
  last_checked_at: string | null;
  connected_at: string | null;
  disabled_at: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface NotionPinRow {
  id: string;
  partner_client_id: string;
  tool_name: string;
  account_slug: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export type NotionSyncConflictPolicy = 'manual' | 'source_wins' | 'target_wins';
export type NotionSyncFieldDirection = 'bidirectional' | 'source_to_target' | 'target_to_source';
export type NotionSyncRecordMappingStatus = 'active' | 'archived' | 'tombstoned' | 'conflicted';
export type NotionSyncRunStatus = 'started' | 'completed' | 'failed' | 'dry_run';

export interface NotionSyncContractRow {
  id: string;
  partner_client_id: string;
  contract_slug: string;
  source_account_slug: string;
  target_account_slug: string;
  source_data_source_id: string;
  target_data_source_id: string;
  enabled: number;
  match_strategy: 'mapping_table';
  conflict_policy: NotionSyncConflictPolicy;
  propagate_create: number;
  propagate_update: number;
  propagate_archive: number;
  propagate_delete: number;
  delete_mode: 'archive';
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface NotionSyncContractFieldRow {
  id: string;
  partner_client_id: string;
  contract_id: string;
  source_field: string;
  target_field: string;
  direction: NotionSyncFieldDirection;
  ordinal: number;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface NotionSyncRecordMappingRow {
  id: string;
  partner_client_id: string;
  contract_id: string;
  source_page_id: string;
  target_page_id: string;
  source_last_edited_time: string | null;
  target_last_edited_time: string | null;
  source_last_hash: string | null;
  target_last_hash: string | null;
  mapping_status: NotionSyncRecordMappingStatus;
  last_synced_at: string | null;
  archived_at: string | null;
  tombstoned_at: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface NotionSyncRunRow {
  id: string;
  partner_client_id: string;
  contract_id: string;
  contract_slug: string;
  idempotency_key: string | null;
  status: NotionSyncRunStatus;
  dry_run: number;
  started_at: string;
  ended_at: string | null;
  created_count: number;
  updated_count: number;
  archived_count: number;
  conflicted_count: number;
  skipped_count: number;
  error_count: number;
  errors_json: string;
  conflicts_json: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface NotionSyncRunLeaseRow {
  id: string;
  partner_client_id: string;
  contract_id: string;
  run_id: string;
  lease_token: string;
  lease_expires_at: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface NotionSyncContractSummaryRow extends NotionSyncContractRow {
  last_run_status: NotionSyncRunStatus | null;
  last_run_time: string | null;
  recent_conflict_count: number;
  recent_error_count: number;
}

export interface NotionSyncContractFieldInput {
  source_field: string;
  target_field: string;
  direction: NotionSyncFieldDirection;
  ordinal?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateNotionSyncContractInput {
  partnerClientId: string;
  contractSlug: string;
  sourceAccountSlug: string;
  targetAccountSlug: string;
  sourceDataSourceId: string;
  targetDataSourceId: string;
  enabled?: boolean;
  conflictPolicy?: NotionSyncConflictPolicy;
  propagateCreate?: boolean;
  propagateUpdate?: boolean;
  propagateArchive?: boolean;
  propagateDelete?: boolean;
  metadata?: Record<string, unknown>;
  fields?: NotionSyncContractFieldInput[];
}

export interface UpdateNotionSyncContractInput {
  sourceAccountSlug?: string;
  targetAccountSlug?: string;
  sourceDataSourceId?: string;
  targetDataSourceId?: string;
  enabled?: boolean;
  conflictPolicy?: NotionSyncConflictPolicy;
  propagateCreate?: boolean;
  propagateUpdate?: boolean;
  propagateArchive?: boolean;
  propagateDelete?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpsertNotionSyncRecordMappingInput {
  partnerClientId: string;
  contractId: string;
  sourcePageId: string;
  targetPageId: string;
  sourceLastEditedTime?: string | null;
  targetLastEditedTime?: string | null;
  sourceLastHash?: string | null;
  targetLastHash?: string | null;
  mappingStatus?: NotionSyncRecordMappingStatus;
  lastSyncedAt?: string | null;
  archivedAt?: string | null;
  tombstonedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface StartNotionSyncRunInput {
  partnerClientId: string;
  contractId: string;
  contractSlug: string;
  dryRun?: boolean;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CompleteNotionSyncRunInput {
  runId: string;
  status: Extract<NotionSyncRunStatus, 'completed' | 'failed' | 'dry_run'>;
  createdCount?: number;
  updatedCount?: number;
  archivedCount?: number;
  conflictedCount?: number;
  skippedCount?: number;
  errorCount?: number;
  errors?: unknown[];
  conflicts?: unknown[];
  metadata?: Record<string, unknown>;
}

export interface TryAcquireNotionSyncRunLeaseInput {
  partnerClientId: string;
  contractId: string;
  runId: string;
  leaseToken?: string;
  ttlSeconds: number;
  metadata?: Record<string, unknown>;
}

export interface RenewNotionSyncRunLeaseInput {
  contractId: string;
  runId: string;
  leaseToken: string;
  ttlSeconds: number;
  metadata?: Record<string, unknown>;
}

export interface ReleaseNotionSyncRunLeaseInput {
  contractId: string;
  runId: string;
  leaseToken: string;
}

interface ConnectedAccountShape {
  id?: string;
  nanoid?: string;
  status?: string;
  userId?: string;
  entityId?: string;
  authConfigId?: string;
  toolkit?: { slug?: string; name?: string };
  appName?: string;
  app?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

export async function getPartnerClient(
  db: D1Database,
  partnerKey: string,
  slug: string,
): Promise<PartnerClientRow | null> {
  return db
    .prepare(
      `SELECT id, slug, display_name, workspace_account_id, metadata_json
       FROM partner_auth_clients
       WHERE partner_key = ? AND slug = ?
       LIMIT 1`
    )
    .bind(partnerKey, slug)
    .first<PartnerClientRow>();
}

export async function listNotionAccounts(db: D1Database, partnerClientId: string): Promise<NotionAccountRow[]> {
  const result = await db
    .prepare(
      `SELECT * FROM partner_auth_notion_accounts
       WHERE partner_client_id = ?
       ORDER BY account_slug ASC`
    )
    .bind(partnerClientId)
    .all<NotionAccountRow>();
  return result.results ?? [];
}

export async function getNotionAccountBySlug(
  db: D1Database,
  partnerClientId: string,
  accountSlug: string,
): Promise<NotionAccountRow | null> {
  return db
    .prepare(
      `SELECT * FROM partner_auth_notion_accounts
       WHERE partner_client_id = ? AND account_slug = ?
       LIMIT 1`
    )
    .bind(partnerClientId, accountSlug)
    .first<NotionAccountRow>();
}

export async function listNotionPins(db: D1Database, partnerClientId: string): Promise<NotionPinRow[]> {
  const result = await db
    .prepare(
      `SELECT * FROM partner_auth_notion_pins
       WHERE partner_client_id = ?
       ORDER BY tool_name ASC`
    )
    .bind(partnerClientId)
    .all<NotionPinRow>();
  return result.results ?? [];
}

export async function listNotionSyncContracts(
  db: D1Database,
  partnerClientId: string,
): Promise<NotionSyncContractSummaryRow[]> {
  const result = await db
    .prepare(
      `SELECT
         c.*,
         (
           SELECT r.status
           FROM partner_auth_notion_sync_runs r
           WHERE r.contract_id = c.id
           ORDER BY COALESCE(r.ended_at, r.created_at) DESC, r.created_at DESC
           LIMIT 1
         ) AS last_run_status,
         (
           SELECT COALESCE(r.ended_at, r.created_at)
           FROM partner_auth_notion_sync_runs r
           WHERE r.contract_id = c.id
           ORDER BY COALESCE(r.ended_at, r.created_at) DESC, r.created_at DESC
           LIMIT 1
         ) AS last_run_time,
         COALESCE((
           SELECT SUM(r.conflicted_count)
           FROM partner_auth_notion_sync_runs r
           WHERE r.contract_id = c.id
             AND r.created_at >= datetime('now', '-7 days')
         ), 0) AS recent_conflict_count,
         COALESCE((
           SELECT SUM(r.error_count)
           FROM partner_auth_notion_sync_runs r
           WHERE r.contract_id = c.id
             AND r.created_at >= datetime('now', '-7 days')
         ), 0) AS recent_error_count
       FROM partner_auth_notion_sync_contracts c
       WHERE c.partner_client_id = ?
       ORDER BY c.contract_slug ASC`
    )
    .bind(partnerClientId)
    .all<NotionSyncContractSummaryRow>();
  return result.results ?? [];
}

export async function getNotionSyncContractBySlug(
  db: D1Database,
  partnerClientId: string,
  contractSlug: string,
): Promise<NotionSyncContractRow | null> {
  const normalizedSlug = normalizeSlug(contractSlug);
  return db
    .prepare(
      `SELECT *
       FROM partner_auth_notion_sync_contracts
       WHERE partner_client_id = ? AND contract_slug = ?
       LIMIT 1`
    )
    .bind(partnerClientId, normalizedSlug)
    .first<NotionSyncContractRow>();
}

export async function getNotionSyncContractById(
  db: D1Database,
  contractId: string,
): Promise<NotionSyncContractRow | null> {
  return db
    .prepare(
      `SELECT *
       FROM partner_auth_notion_sync_contracts
       WHERE id = ?
       LIMIT 1`
    )
    .bind(contractId)
    .first<NotionSyncContractRow>();
}

export async function getNotionSyncContractSummary(
  db: D1Database,
  partnerClientId: string,
  contractSlug: string,
): Promise<NotionSyncContractSummaryRow | null> {
  const normalizedSlug = normalizeSlug(contractSlug);
  return db
    .prepare(
      `SELECT
         c.*,
         (
           SELECT r.status
           FROM partner_auth_notion_sync_runs r
           WHERE r.contract_id = c.id
           ORDER BY COALESCE(r.ended_at, r.created_at) DESC, r.created_at DESC
           LIMIT 1
         ) AS last_run_status,
         (
           SELECT COALESCE(r.ended_at, r.created_at)
           FROM partner_auth_notion_sync_runs r
           WHERE r.contract_id = c.id
           ORDER BY COALESCE(r.ended_at, r.created_at) DESC, r.created_at DESC
           LIMIT 1
         ) AS last_run_time,
         COALESCE((
           SELECT SUM(r.conflicted_count)
           FROM partner_auth_notion_sync_runs r
           WHERE r.contract_id = c.id
             AND r.created_at >= datetime('now', '-7 days')
         ), 0) AS recent_conflict_count,
         COALESCE((
           SELECT SUM(r.error_count)
           FROM partner_auth_notion_sync_runs r
           WHERE r.contract_id = c.id
             AND r.created_at >= datetime('now', '-7 days')
         ), 0) AS recent_error_count
       FROM partner_auth_notion_sync_contracts c
       WHERE c.partner_client_id = ? AND c.contract_slug = ?
       LIMIT 1`
    )
    .bind(partnerClientId, normalizedSlug)
    .first<NotionSyncContractSummaryRow>();
}

export async function createNotionSyncContract(
  db: D1Database,
  input: CreateNotionSyncContractInput,
): Promise<NotionSyncContractRow> {
  const contractId = randomId('pansync');
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO partner_auth_notion_sync_contracts (
         id, partner_client_id, contract_slug,
         source_account_slug, target_account_slug, source_data_source_id, target_data_source_id,
         enabled, match_strategy, conflict_policy,
         propagate_create, propagate_update, propagate_archive, propagate_delete, delete_mode, metadata_json,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'mapping_table', ?, ?, ?, ?, ?, 'archive', ?, ?, ?)`
    )
    .bind(
      contractId,
      input.partnerClientId,
      normalizeSlug(input.contractSlug),
      normalizeSlug(input.sourceAccountSlug),
      normalizeSlug(input.targetAccountSlug),
      input.sourceDataSourceId.trim(),
      input.targetDataSourceId.trim(),
      input.enabled === false ? 0 : 1,
      input.conflictPolicy ?? 'manual',
      input.propagateCreate === false ? 0 : 1,
      input.propagateUpdate === false ? 0 : 1,
      input.propagateArchive === false ? 0 : 1,
      input.propagateDelete === false ? 0 : 1,
      JSON.stringify(input.metadata ?? {}),
      now,
      now,
    )
    .run();

  if (Array.isArray(input.fields) && input.fields.length > 0) {
    await replaceNotionSyncContractFields(db, input.partnerClientId, contractId, input.fields);
  }

  const created = await getNotionSyncContractById(db, contractId);
  if (!created) {
    throw new Error('Contract insert succeeded but row could not be loaded.');
  }
  return created;
}

export async function updateNotionSyncContract(
  db: D1Database,
  partnerClientId: string,
  contractSlug: string,
  input: UpdateNotionSyncContractInput,
): Promise<NotionSyncContractRow | null> {
  const existing = await getNotionSyncContractBySlug(db, partnerClientId, contractSlug);
  if (!existing) return null;

  const nextSourceAccountSlug =
    input.sourceAccountSlug === undefined ? existing.source_account_slug : normalizeSlug(input.sourceAccountSlug);
  const nextTargetAccountSlug =
    input.targetAccountSlug === undefined ? existing.target_account_slug : normalizeSlug(input.targetAccountSlug);
  const nextSourceDataSourceId =
    input.sourceDataSourceId === undefined ? existing.source_data_source_id : input.sourceDataSourceId.trim();
  const nextTargetDataSourceId =
    input.targetDataSourceId === undefined ? existing.target_data_source_id : input.targetDataSourceId.trim();

  await db
    .prepare(
      `UPDATE partner_auth_notion_sync_contracts
       SET source_account_slug = ?, target_account_slug = ?,
           source_data_source_id = ?, target_data_source_id = ?,
           enabled = ?, conflict_policy = ?,
           propagate_create = ?, propagate_update = ?, propagate_archive = ?, propagate_delete = ?,
           metadata_json = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(
      nextSourceAccountSlug,
      nextTargetAccountSlug,
      nextSourceDataSourceId,
      nextTargetDataSourceId,
      input.enabled === undefined ? existing.enabled : input.enabled ? 1 : 0,
      input.conflictPolicy ?? existing.conflict_policy,
      input.propagateCreate === undefined ? existing.propagate_create : input.propagateCreate ? 1 : 0,
      input.propagateUpdate === undefined ? existing.propagate_update : input.propagateUpdate ? 1 : 0,
      input.propagateArchive === undefined ? existing.propagate_archive : input.propagateArchive ? 1 : 0,
      input.propagateDelete === undefined ? existing.propagate_delete : input.propagateDelete ? 1 : 0,
      JSON.stringify(input.metadata ?? parseJsonObject(existing.metadata_json)),
      existing.id,
    )
    .run();

  return getNotionSyncContractById(db, existing.id);
}

export async function deleteNotionSyncContract(
  db: D1Database,
  partnerClientId: string,
  contractSlug: string,
): Promise<boolean> {
  const existing = await getNotionSyncContractBySlug(db, partnerClientId, contractSlug);
  if (!existing) return false;
  await db
    .prepare(`DELETE FROM partner_auth_notion_sync_contracts WHERE id = ?`)
    .bind(existing.id)
    .run();
  return true;
}

export async function setNotionSyncContractEnabled(
  db: D1Database,
  partnerClientId: string,
  contractSlug: string,
  enabled: boolean,
): Promise<NotionSyncContractRow | null> {
  const existing = await getNotionSyncContractBySlug(db, partnerClientId, contractSlug);
  if (!existing) return null;
  await db
    .prepare(
      `UPDATE partner_auth_notion_sync_contracts
       SET enabled = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(enabled ? 1 : 0, existing.id)
    .run();
  return getNotionSyncContractById(db, existing.id);
}

export async function listNotionSyncContractFields(
  db: D1Database,
  contractId: string,
): Promise<NotionSyncContractFieldRow[]> {
  const result = await db
    .prepare(
      `SELECT *
       FROM partner_auth_notion_sync_contract_fields
       WHERE contract_id = ?
       ORDER BY ordinal ASC, created_at ASC`
    )
    .bind(contractId)
    .all<NotionSyncContractFieldRow>();
  return result.results ?? [];
}

export async function replaceNotionSyncContractFields(
  db: D1Database,
  partnerClientId: string,
  contractId: string,
  fields: NotionSyncContractFieldInput[],
): Promise<NotionSyncContractFieldRow[]> {
  await db
    .prepare(
      `DELETE FROM partner_auth_notion_sync_contract_fields
       WHERE partner_client_id = ? AND contract_id = ?`
    )
    .bind(partnerClientId, contractId)
    .run();

  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    await db
      .prepare(
        `INSERT INTO partner_auth_notion_sync_contract_fields (
           id, partner_client_id, contract_id, source_field, target_field, direction, ordinal, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        randomId('pansyncfield'),
        partnerClientId,
        contractId,
        field.source_field,
        field.target_field,
        field.direction,
        field.ordinal ?? index,
        JSON.stringify(field.metadata ?? {}),
      )
      .run();
  }

  return listNotionSyncContractFields(db, contractId);
}

export async function listNotionSyncRecordMappings(
  db: D1Database,
  contractId: string,
): Promise<NotionSyncRecordMappingRow[]> {
  const result = await db
    .prepare(
      `SELECT *
       FROM partner_auth_notion_sync_record_mappings
       WHERE contract_id = ?
       ORDER BY created_at ASC`
    )
    .bind(contractId)
    .all<NotionSyncRecordMappingRow>();
  return result.results ?? [];
}

export async function getNotionSyncRecordMappingBySourcePage(
  db: D1Database,
  contractId: string,
  sourcePageId: string,
): Promise<NotionSyncRecordMappingRow | null> {
  return db
    .prepare(
      `SELECT *
       FROM partner_auth_notion_sync_record_mappings
       WHERE contract_id = ? AND source_page_id = ?
       LIMIT 1`
    )
    .bind(contractId, sourcePageId)
    .first<NotionSyncRecordMappingRow>();
}

export async function getNotionSyncRecordMappingByTargetPage(
  db: D1Database,
  contractId: string,
  targetPageId: string,
): Promise<NotionSyncRecordMappingRow | null> {
  return db
    .prepare(
      `SELECT *
       FROM partner_auth_notion_sync_record_mappings
       WHERE contract_id = ? AND target_page_id = ?
       LIMIT 1`
    )
    .bind(contractId, targetPageId)
    .first<NotionSyncRecordMappingRow>();
}

export async function upsertNotionSyncRecordMapping(
  db: D1Database,
  input: UpsertNotionSyncRecordMappingInput,
): Promise<NotionSyncRecordMappingRow> {
  await db
    .prepare(
      `INSERT INTO partner_auth_notion_sync_record_mappings (
         id, partner_client_id, contract_id, source_page_id, target_page_id,
         source_last_edited_time, target_last_edited_time, source_last_hash, target_last_hash,
         mapping_status, last_synced_at, archived_at, tombstoned_at, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(contract_id, source_page_id) DO UPDATE SET
         target_page_id = excluded.target_page_id,
         source_last_edited_time = excluded.source_last_edited_time,
         target_last_edited_time = excluded.target_last_edited_time,
         source_last_hash = excluded.source_last_hash,
         target_last_hash = excluded.target_last_hash,
         mapping_status = excluded.mapping_status,
         last_synced_at = excluded.last_synced_at,
         archived_at = excluded.archived_at,
         tombstoned_at = excluded.tombstoned_at,
         metadata_json = excluded.metadata_json,
         updated_at = datetime('now')`
    )
    .bind(
      randomId('pansyncmap'),
      input.partnerClientId,
      input.contractId,
      input.sourcePageId,
      input.targetPageId,
      input.sourceLastEditedTime ?? null,
      input.targetLastEditedTime ?? null,
      input.sourceLastHash ?? null,
      input.targetLastHash ?? null,
      input.mappingStatus ?? 'active',
      input.lastSyncedAt ?? null,
      input.archivedAt ?? null,
      input.tombstonedAt ?? null,
      JSON.stringify(input.metadata ?? {}),
    )
    .run();

  const row = await getNotionSyncRecordMappingBySourcePage(db, input.contractId, input.sourcePageId);
  if (!row) {
    throw new Error('Record mapping upsert succeeded but row could not be loaded.');
  }
  return row;
}

export async function startNotionSyncRun(db: D1Database, input: StartNotionSyncRunInput): Promise<NotionSyncRunRow> {
  const runId = randomId('pansyncrun');
  const status: NotionSyncRunStatus = input.dryRun ? 'dry_run' : 'started';
  await db
    .prepare(
      `INSERT INTO partner_auth_notion_sync_runs (
         id, partner_client_id, contract_id, contract_slug, idempotency_key, status, dry_run, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      runId,
      input.partnerClientId,
      input.contractId,
      normalizeSlug(input.contractSlug),
      input.idempotencyKey ?? null,
      status,
      input.dryRun ? 1 : 0,
      JSON.stringify(input.metadata ?? {}),
    )
    .run();

  const run = await getNotionSyncRunById(db, runId);
  if (!run) {
    throw new Error('Run insert succeeded but row could not be loaded.');
  }
  return run;
}

export async function getNotionSyncRunById(db: D1Database, runId: string): Promise<NotionSyncRunRow | null> {
  return db
    .prepare(
      `SELECT *
       FROM partner_auth_notion_sync_runs
       WHERE id = ?
       LIMIT 1`
    )
    .bind(runId)
    .first<NotionSyncRunRow>();
}

export async function getNotionSyncRunByIdempotencyKey(
  db: D1Database,
  contractId: string,
  idempotencyKey: string,
): Promise<NotionSyncRunRow | null> {
  return db
    .prepare(
      `SELECT *
       FROM partner_auth_notion_sync_runs
       WHERE contract_id = ? AND idempotency_key = ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .bind(contractId, idempotencyKey)
    .first<NotionSyncRunRow>();
}

export async function getNotionSyncRunLeaseByContract(
  db: D1Database,
  contractId: string,
): Promise<NotionSyncRunLeaseRow | null> {
  return db
    .prepare(
      `SELECT *
       FROM partner_auth_notion_sync_run_leases
       WHERE contract_id = ?
       LIMIT 1`
    )
    .bind(contractId)
    .first<NotionSyncRunLeaseRow>();
}

export async function tryAcquireNotionSyncRunLease(
  db: D1Database,
  input: TryAcquireNotionSyncRunLeaseInput,
): Promise<{ acquired: boolean; lease: NotionSyncRunLeaseRow | null; leaseToken: string }> {
  const leaseToken = input.leaseToken ?? randomId('pansynlease');
  const ttlSeconds = Math.max(60, Math.trunc(input.ttlSeconds));
  const leaseTtlModifier = `+${ttlSeconds} seconds`;

  await db
    .prepare(
      `INSERT INTO partner_auth_notion_sync_run_leases (
         id, partner_client_id, contract_id, run_id, lease_token, lease_expires_at, metadata_json
       ) VALUES (?, ?, ?, ?, ?, datetime('now', ?), ?)
       ON CONFLICT(contract_id) DO UPDATE SET
         partner_client_id = excluded.partner_client_id,
         run_id = excluded.run_id,
         lease_token = excluded.lease_token,
         lease_expires_at = excluded.lease_expires_at,
         metadata_json = excluded.metadata_json,
         updated_at = datetime('now')
       WHERE partner_auth_notion_sync_run_leases.lease_expires_at <= datetime('now')`
    )
    .bind(
      randomId('pansynlease'),
      input.partnerClientId,
      input.contractId,
      input.runId,
      leaseToken,
      leaseTtlModifier,
      JSON.stringify(input.metadata ?? {}),
    )
    .run();

  const lease = await getNotionSyncRunLeaseByContract(db, input.contractId);
  return {
    acquired: Boolean(lease && lease.run_id === input.runId && lease.lease_token === leaseToken),
    lease,
    leaseToken,
  };
}

export async function renewNotionSyncRunLease(
  db: D1Database,
  input: RenewNotionSyncRunLeaseInput,
): Promise<NotionSyncRunLeaseRow | null> {
  const ttlSeconds = Math.max(60, Math.trunc(input.ttlSeconds));
  const leaseTtlModifier = `+${ttlSeconds} seconds`;
  const metadataJson = input.metadata === undefined ? null : JSON.stringify(input.metadata);

  await db
    .prepare(
      `UPDATE partner_auth_notion_sync_run_leases
       SET lease_expires_at = datetime('now', ?),
           metadata_json = COALESCE(?, metadata_json),
           updated_at = datetime('now')
       WHERE contract_id = ? AND run_id = ? AND lease_token = ?`
    )
    .bind(leaseTtlModifier, metadataJson, input.contractId, input.runId, input.leaseToken)
    .run();

  return getNotionSyncRunLeaseByContract(db, input.contractId);
}

export async function releaseNotionSyncRunLease(
  db: D1Database,
  input: ReleaseNotionSyncRunLeaseInput,
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM partner_auth_notion_sync_run_leases
       WHERE contract_id = ? AND run_id = ? AND lease_token = ?`
    )
    .bind(input.contractId, input.runId, input.leaseToken)
    .run();
}

export async function completeNotionSyncRun(
  db: D1Database,
  input: CompleteNotionSyncRunInput,
): Promise<NotionSyncRunRow | null> {
  await db
    .prepare(
      `UPDATE partner_auth_notion_sync_runs
       SET status = ?, ended_at = datetime('now'),
           created_count = ?, updated_count = ?, archived_count = ?, conflicted_count = ?, skipped_count = ?, error_count = ?,
           errors_json = ?, conflicts_json = ?, metadata_json = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(
      input.status,
      input.createdCount ?? 0,
      input.updatedCount ?? 0,
      input.archivedCount ?? 0,
      input.conflictedCount ?? 0,
      input.skippedCount ?? 0,
      input.errorCount ?? 0,
      JSON.stringify(input.errors ?? []),
      JSON.stringify(input.conflicts ?? []),
      JSON.stringify(input.metadata ?? {}),
      input.runId,
    )
    .run();
  return getNotionSyncRunById(db, input.runId);
}

export async function listNotionSyncRuns(
  db: D1Database,
  contractId: string,
  limit = 20,
): Promise<NotionSyncRunRow[]> {
  const boundedLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
  const result = await db
    .prepare(
      `SELECT *
       FROM partner_auth_notion_sync_runs
       WHERE contract_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(contractId, boundedLimit)
    .all<NotionSyncRunRow>();
  return result.results ?? [];
}

export async function getPinForTool(
  db: D1Database,
  partnerClientId: string,
  toolName: string,
): Promise<NotionPinRow | null> {
  return db
    .prepare(
      `SELECT * FROM partner_auth_notion_pins
       WHERE partner_client_id = ? AND tool_name = ?
       LIMIT 1`
    )
    .bind(partnerClientId, toolName)
    .first<NotionPinRow>();
}

export async function upsertNotionAccount(
  db: D1Database,
  input: {
    partnerClientId: string;
    accountSlug: string;
    displayLabel: string;
    composioUserId: string;
    authConfigId: string;
    syncEnabled: boolean;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  const existing = await getNotionAccountBySlug(db, input.partnerClientId, input.accountSlug);
  if (existing) {
    await db
      .prepare(
        `UPDATE partner_auth_notion_accounts
         SET display_label = ?, auth_config_id = ?, sync_enabled = ?, status = 'active',
             disabled_at = NULL, metadata_json = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        input.displayLabel,
        input.authConfigId,
        input.syncEnabled ? 1 : 0,
        JSON.stringify(input.metadata),
        existing.id,
      )
      .run();
    return;
  }

  await db
    .prepare(
      `INSERT INTO partner_auth_notion_accounts (
         id, partner_client_id, account_slug, display_label, composio_user_id, auth_config_id,
         connection_status, status, sync_enabled, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, 'INITIATED', 'active', ?, ?)`
    )
    .bind(
      randomId('panotion'),
      input.partnerClientId,
      input.accountSlug,
      input.displayLabel,
      input.composioUserId,
      input.authConfigId,
      input.syncEnabled ? 1 : 0,
      JSON.stringify(input.metadata),
    )
    .run();
}

export async function setNotionPin(
  db: D1Database,
  input: {
    partnerClientId: string;
    toolName: string;
    accountSlug: string;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  const existing = await getPinForTool(db, input.partnerClientId, input.toolName);
  if (existing) {
    await db
      .prepare(
        `UPDATE partner_auth_notion_pins
         SET account_slug = ?, metadata_json = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(input.accountSlug, JSON.stringify(input.metadata), existing.id)
      .run();
    return;
  }

  await db
    .prepare(
      `INSERT INTO partner_auth_notion_pins (
         id, partner_client_id, tool_name, account_slug, metadata_json
       ) VALUES (?, ?, ?, ?, ?)`
    )
    .bind(randomId('panpin'), input.partnerClientId, input.toolName, input.accountSlug, JSON.stringify(input.metadata))
    .run();
}

export async function disableNotionAccount(db: D1Database, accountId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE partner_auth_notion_accounts
       SET status = 'disabled', disabled_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(accountId)
    .run();
}

export async function setSyncEnabled(db: D1Database, accountId: string, enabled: boolean): Promise<void> {
  await db
    .prepare(
      `UPDATE partner_auth_notion_accounts
       SET sync_enabled = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(enabled ? 1 : 0, accountId)
    .run();
}

export async function recordNotionEvent(
  db: D1Database,
  input: {
    partnerClientId: string;
    accountSlug?: string | null;
    eventType: string;
    actor: string;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO partner_auth_notion_events (
         id, partner_client_id, account_slug, event_type, actor, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      randomId('panevent'),
      input.partnerClientId,
      input.accountSlug ?? null,
      input.eventType,
      input.actor,
      JSON.stringify(input.metadata),
    )
    .run();
}

function normalizeToolkitSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export async function refreshNotionAccountState(
  db: D1Database,
  composio: Composio,
  account: NotionAccountRow,
  options?: {
    force?: boolean;
    minIntervalMs?: number;
  },
): Promise<NotionAccountRow> {
  const minIntervalMs = options?.minIntervalMs ?? 0;
  if (!options?.force && minIntervalMs > 0) {
    const lastCheckedMs = parseDbTimestamp(account.last_checked_at);
    if (lastCheckedMs !== null && Date.now() - lastCheckedMs < minIntervalMs) {
      return account;
    }
  }

  const response = await composio.connectedAccounts.list({ userIds: [account.composio_user_id] });
  const items = Array.isArray((response as { items?: unknown[] }).items)
    ? (response as { items: unknown[] }).items
    : (Array.isArray(response) ? response : []);
  const notionAccounts = items
    .filter((item): item is ConnectedAccountShape => Boolean(item && typeof item === 'object'))
    .filter((item) => {
      const toolkit = normalizeToolkitSlug(
        item.toolkit?.slug ?? item.appName ?? item.app ?? item.toolkit?.name ?? '',
      );
      return toolkit === 'notion';
    });

  const active = notionAccounts.find((item) => String(item.status ?? '').toUpperCase() === 'ACTIVE');
  const current = active ?? notionAccounts[0] ?? null;
  const nextStatus = current ? String(current.status ?? 'UNKNOWN').toUpperCase() : 'NOT_CONNECTED';
  const connectedAccountId = current ? String(current.id ?? current.nanoid ?? '') || null : null;
  const connectedAt = account.connected_at ?? (nextStatus === 'ACTIVE' ? new Date().toISOString() : null);

  await db
    .prepare(
      `UPDATE partner_auth_notion_accounts
       SET connected_account_id = ?, connection_status = ?, auth_config_id = COALESCE(?, auth_config_id),
           last_checked_at = datetime('now'), connected_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(connectedAccountId, nextStatus, current?.authConfigId ?? null, connectedAt, account.id)
    .run();

  return {
    ...account,
    connected_account_id: connectedAccountId,
    connection_status: nextStatus,
    last_checked_at: new Date().toISOString(),
    connected_at: connectedAt,
  };
}

function parseDbTimestamp(value: string | null): number | null {
  if (!value) return null;

  const isoCandidate = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const isoMs = Date.parse(isoCandidate);
  if (!Number.isNaN(isoMs)) return isoMs;

  const fallbackMs = Date.parse(value);
  return Number.isNaN(fallbackMs) ? null : fallbackMs;
}
