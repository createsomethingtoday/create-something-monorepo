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
         SET display_label = ?, auth_config_id = ?, sync_enabled = ?, metadata_json = ?, updated_at = datetime('now')
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
