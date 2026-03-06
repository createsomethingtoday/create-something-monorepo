import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Composio } from '@composio/core';
import { ComposioNotionDispatcher, type PinnedNotionAction } from './composio-notion.js';
import {
  accountSnapshot,
} from './resources.js';
import {
  disableNotionAccount,
  getNotionAccountBySlug,
  getPartnerClient,
  getPinForTool,
  listNotionAccounts,
  listNotionPins,
  normalizeSlug,
  parseJsonObject,
  randomId,
  recordNotionEvent,
  refreshNotionAccountState,
  setNotionPin,
  setSyncEnabled,
  upsertNotionAccount,
  type NotionAccountRow,
} from './db.js';

export interface OperatorNotionToolsDeps {
  db: D1Database;
  composio: Composio;
  dispatcher: ComposioNotionDispatcher;
  partnerKey: string;
  partnerClientSlug: string;
  notionAuthConfigId?: string;
  pinnedHalfdozenToolName: string;
  pinnedClientToolName: string;
  getActor: () => string;
}

const pinnedToolSchema = {
  action: z.enum([
    'search',
    'list_databases',
    'get_database',
    'query_database',
    'get_page',
    'list_block_children',
    'create_page',
    'update_page',
    'append_blocks',
    'archive_page',
    'bulk_update',
    'bulk_archive',
  ]),
  args: z.record(z.unknown()).default({}),
};

const accountToolSchema = {
  action: z.enum([
    'list_accounts',
    'get_status',
    'create_connect_link',
    'disable_account',
    'pin_account',
    'set_sync_enabled',
  ]),
  args: z.record(z.unknown()).default({}),
};

const syncToolSchema = {
  action: z.enum(['wizard', 'preview_page_content', 'copy_page_content']).default('wizard'),
  mode: z.enum(['preview_page_content', 'copy_page_content']).optional(),
  direction: z.enum(['halfdozen_to_client', 'client_to_halfdozen']).optional(),
  source_account_slug: z.string().optional(),
  target_account_slug: z.string().optional(),
  source_page_id: z.string().optional(),
  target_page_id: z.string().optional(),
  confirm_write: z.boolean().optional(),
};

export function registerOperatorNotionTools(server: McpServer, deps: OperatorNotionToolsDeps): void {
  server.tool(
    deps.pinnedHalfdozenToolName,
    'Pinned Notion workspace tool for Half Dozen. Rejects caller workspace/account overrides.',
    pinnedToolSchema,
    async (params) => runPinnedTool(params.action as PinnedNotionAction, params.args as Record<string, unknown>, deps.pinnedHalfdozenToolName, deps)
  );

  server.tool(
    deps.pinnedClientToolName,
    'Pinned Notion workspace tool for the client account configured on this deployment. Rejects caller workspace/account overrides.',
    pinnedToolSchema,
    async (params) => runPinnedTool(params.action as PinnedNotionAction, params.args as Record<string, unknown>, deps.pinnedClientToolName, deps)
  );

  server.tool(
    'operator_notion_accounts',
    'Manage operator-bound Notion accounts: list, connect, pin, disable, and control sync availability.',
    accountToolSchema,
    async (params) => runAccountsTool(params.action as string, params.args as Record<string, unknown>, deps)
  );

  server.tool(
    'operator_notion_sync',
    'Guided sync helper for managed Notion accounts. Supports wizard prompts, dry-run preview, and explicit copy confirmation.',
    syncToolSchema,
    async (params) => runSyncTool(params, deps)
  );
}

async function runPinnedTool(
  action: PinnedNotionAction,
  args: Record<string, unknown>,
  toolName: string,
  deps: OperatorNotionToolsDeps,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  rejectControlArgs(args);
  const { client } = await requirePartnerClient(deps);
  const pin = await getPinForTool(deps.db, client.id, toolName);
  if (!pin) {
    throw new Error(`Pinned tool "${toolName}" is not configured for client "${client.slug}".`);
  }

  const account = await requireActiveAccount(deps, client.id, pin.account_slug, { requireSyncEnabled: false });
  const data = await deps.dispatcher.execute(action, args, account.composio_user_id);
  await recordNotionEvent(deps.db, {
    partnerClientId: client.id,
    accountSlug: account.account_slug,
    eventType: 'pinned_tool_executed',
    actor: deps.getActor(),
    metadata: { tool_name: toolName, action },
  });

  return toJsonResult({ ok: true, tool: toolName, workspace: account.account_slug, action, data, meta: responseMeta(account) });
}

async function runAccountsTool(
  action: string,
  args: Record<string, unknown>,
  deps: OperatorNotionToolsDeps,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { client } = await requirePartnerClient(deps);
  const actor = deps.getActor();

  switch (action) {
    case 'list_accounts': {
      const accounts = await syncAllAccounts(deps, client.id);
      const pins = await listNotionPins(deps.db, client.id);
      return toJsonResult({ ok: true, action, client_slug: client.slug, ...accountSnapshot(accounts, pins) });
    }
    case 'get_status': {
      const accountSlug = normalizeSlug(String(args.account_slug ?? ''));
      if (!accountSlug) throw new Error('args.account_slug is required');
      const account = await requireAccount(deps.db, client.id, accountSlug);
      const refreshed = await refreshNotionAccountState(deps.db, deps.composio, account);
      return toJsonResult({ ok: true, action, account: serializeAccount(refreshed) });
    }
    case 'create_connect_link': {
      const accountSlug = normalizeSlug(String(args.account_slug ?? ''));
      if (!accountSlug) throw new Error('args.account_slug is required');
      const displayLabel = String(args.display_label ?? accountSlug).trim() || accountSlug;
      const syncEnabled = typeof args.sync_enabled === 'boolean' ? args.sync_enabled : true;
      const authConfigId = String(args.auth_config_id ?? deps.notionAuthConfigId ?? '').trim();
      if (!authConfigId) throw new Error('No Notion auth config ID configured for this deployment.');
      const metadata = isPlainObject(args.metadata) ? args.metadata : {};
      const composioUserId = `hd_notion_${client.slug.replace(/-/g, '_')}_${accountSlug.replace(/-/g, '_')}`;
      await upsertNotionAccount(deps.db, {
        partnerClientId: client.id,
        accountSlug,
        displayLabel,
        composioUserId,
        authConfigId,
        syncEnabled,
        metadata: { ...metadata, created_via: 'operator_notion_accounts' },
      });
      const account = await requireAccount(deps.db, client.id, accountSlug);
      const connectionRequest = await deps.composio.connectedAccounts.link(account.composio_user_id, authConfigId, {});
      await recordNotionEvent(deps.db, {
        partnerClientId: client.id,
        accountSlug,
        eventType: 'connect_link_created',
        actor,
        metadata: { connection_request_id: connectionRequest.id ?? null, auth_config_id: authConfigId },
      });
      return toJsonResult({
        ok: true,
        action,
        account_slug: accountSlug,
        composio_user_id: account.composio_user_id,
        auth_config_id: authConfigId,
        connect_link: connectionRequest.redirectUrl ?? null,
        connection_request_id: connectionRequest.id ?? null,
      });
    }
    case 'disable_account': {
      const accountSlug = normalizeSlug(String(args.account_slug ?? ''));
      if (!accountSlug) throw new Error('args.account_slug is required');
      const account = await requireAccount(deps.db, client.id, accountSlug);
      await disableNotionAccount(deps.db, account.id);
      await recordNotionEvent(deps.db, {
        partnerClientId: client.id,
        accountSlug,
        eventType: 'account_disabled',
        actor,
        metadata: {},
      });
      return toJsonResult({ ok: true, action, account_slug: accountSlug, status: 'disabled' });
    }
    case 'pin_account': {
      const accountSlug = normalizeSlug(String(args.account_slug ?? ''));
      const toolName = String(args.tool_name ?? '').trim();
      if (!accountSlug) throw new Error('args.account_slug is required');
      if (!toolName || ![deps.pinnedHalfdozenToolName, deps.pinnedClientToolName].includes(toolName)) {
        throw new Error(`args.tool_name must be one of: ${deps.pinnedHalfdozenToolName}, ${deps.pinnedClientToolName}`);
      }
      const account = await requireActiveAccount(deps, client.id, accountSlug, { requireSyncEnabled: false });
      await setNotionPin(deps.db, {
        partnerClientId: client.id,
        toolName,
        accountSlug: account.account_slug,
        metadata: { pinned_by: actor },
      });
      await recordNotionEvent(deps.db, {
        partnerClientId: client.id,
        accountSlug,
        eventType: 'tool_pinned',
        actor,
        metadata: { tool_name: toolName },
      });
      return toJsonResult({ ok: true, action, tool_name: toolName, account_slug: accountSlug });
    }
    case 'set_sync_enabled': {
      const accountSlug = normalizeSlug(String(args.account_slug ?? ''));
      if (!accountSlug) throw new Error('args.account_slug is required');
      if (typeof args.sync_enabled !== 'boolean') throw new Error('args.sync_enabled must be boolean');
      const account = await requireAccount(deps.db, client.id, accountSlug);
      await setSyncEnabled(deps.db, account.id, args.sync_enabled);
      await recordNotionEvent(deps.db, {
        partnerClientId: client.id,
        accountSlug,
        eventType: 'sync_enabled_updated',
        actor,
        metadata: { sync_enabled: args.sync_enabled },
      });
      return toJsonResult({ ok: true, action, account_slug: accountSlug, sync_enabled: args.sync_enabled });
    }
    default:
      throw new Error(`Unsupported operator_notion_accounts action: ${action}`);
  }
}

async function runSyncTool(
  params: Record<string, unknown>,
  deps: OperatorNotionToolsDeps,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { client } = await requirePartnerClient(deps);
  const action = String(params.action ?? 'wizard').trim() || 'wizard';
  const mode =
    action === 'preview_page_content' || action === 'copy_page_content'
      ? action
      : String(params.mode ?? '').trim();

  let sourceAccountSlug = normalizeSlug(String(params.source_account_slug ?? ''));
  let targetAccountSlug = normalizeSlug(String(params.target_account_slug ?? ''));
  const direction = String(params.direction ?? '').trim();
  const sourcePageId = String(params.source_page_id ?? '').trim();
  const targetPageId = String(params.target_page_id ?? '').trim();
  const confirmWrite = params.confirm_write === true;

  if (!sourceAccountSlug && !targetAccountSlug && direction === 'halfdozen_to_client') {
    sourceAccountSlug = 'halfdozen';
    targetAccountSlug = normalizeSlug(client.slug);
  } else if (!sourceAccountSlug && !targetAccountSlug && direction === 'client_to_halfdozen') {
    sourceAccountSlug = normalizeSlug(client.slug);
    targetAccountSlug = 'halfdozen';
  } else if (!sourceAccountSlug && !targetAccountSlug && action === 'wizard') {
    sourceAccountSlug = 'halfdozen';
    targetAccountSlug = normalizeSlug(client.slug);
  }

  if (action === 'wizard') {
    const missing: string[] = [];
    if (!sourceAccountSlug) missing.push('source_account_slug');
    if (!targetAccountSlug) missing.push('target_account_slug');
    if (!mode) missing.push('mode');
    if (!sourcePageId) missing.push('source_page_id');
    if (!targetPageId) missing.push('target_page_id');

    const defaults = {
      source_account_slug: sourceAccountSlug || null,
      target_account_slug: targetAccountSlug || null,
      mode: mode || null,
    };

    if (missing.length > 0) {
      return toJsonResult({
        ok: true,
        action,
        status: 'needs_input',
        defaults,
        next_questions: buildSyncWizardQuestions(missing),
      });
    }
  }

  if (!sourceAccountSlug || !targetAccountSlug || !sourcePageId || !targetPageId) {
    throw new Error('source_account_slug, target_account_slug, source_page_id, and target_page_id are required.');
  }
  if (sourceAccountSlug === targetAccountSlug) {
    throw new Error('source_account_slug and target_account_slug must differ.');
  }
  if (mode !== 'preview_page_content' && mode !== 'copy_page_content') {
    throw new Error('mode must be preview_page_content or copy_page_content.');
  }

  const source = await requireActiveAccount(deps, client.id, sourceAccountSlug, { requireSyncEnabled: true });
  const target = await requireActiveAccount(deps, client.id, targetAccountSlug, { requireSyncEnabled: true });

  const preview = await buildSyncPreview(deps, source, target, sourcePageId, targetPageId);

  if (mode === 'preview_page_content') {
    return toJsonResult({ ok: true, action: mode, status: 'preview_ready', preview: preview.summary });
  }

  if (!confirmWrite) {
    return toJsonResult({
      ok: true,
      action: 'wizard',
      status: 'awaiting_confirmation',
      preview: preview.summary,
      confirmation_prompt: 'Set confirm_write=true to execute copy_page_content.',
    });
  }

  await deps.dispatcher.execute(
    'append_blocks',
    { page_id: targetPageId, children: preview.source_blocks },
    target.composio_user_id,
  );
  await recordNotionEvent(deps.db, {
    partnerClientId: client.id,
    eventType: 'sync_executed',
    actor: deps.getActor(),
    metadata: preview.summary,
  });

  return toJsonResult({
    ok: true,
    action: 'copy_page_content',
    status: 'completed',
    preview: preview.summary,
    copied: true,
  });
}

function buildSyncWizardQuestions(missing: string[]): string[] {
  const questions: string[] = [];
  for (const field of missing) {
    if (field === 'source_account_slug') {
      questions.push('Which account slug is the source? (example: halfdozen)');
    } else if (field === 'target_account_slug') {
      questions.push('Which account slug is the target? (example: blondish)');
    } else if (field === 'mode') {
      questions.push('Do you want preview_page_content or copy_page_content?');
    } else if (field === 'source_page_id') {
      questions.push('What is the source_page_id?');
    } else if (field === 'target_page_id') {
      questions.push('What is the target_page_id?');
    }
  }
  return questions;
}

async function buildSyncPreview(
  deps: OperatorNotionToolsDeps,
  source: NotionAccountRow,
  target: NotionAccountRow,
  sourcePageId: string,
  targetPageId: string,
): Promise<{
  summary: Record<string, unknown>;
  source_blocks: unknown[];
}> {
  const page = await deps.dispatcher.execute('get_page', { page_id: sourcePageId }, source.composio_user_id);
  const blocks = await deps.dispatcher.execute('list_block_children', { block_id: sourcePageId }, source.composio_user_id);
  const sourceBlocks = Array.isArray(blocks.results) ? blocks.results : [];

  const summary = {
    source_account_slug: source.account_slug,
    target_account_slug: target.account_slug,
    source_page_id: sourcePageId,
    target_page_id: targetPageId,
    block_count: sourceBlocks.length,
    page_title: extractPageTitle(page),
  };

  return { summary, source_blocks: sourceBlocks };
}

async function requirePartnerClient(deps: OperatorNotionToolsDeps) {
  const client = await getPartnerClient(deps.db, deps.partnerKey, deps.partnerClientSlug);
  if (!client) {
    throw new Error(`Partner client "${deps.partnerClientSlug}" is not configured.`);
  }
  return { client };
}

async function syncAllAccounts(deps: OperatorNotionToolsDeps, partnerClientId: string): Promise<NotionAccountRow[]> {
  const accounts = await listNotionAccounts(deps.db, partnerClientId);
  const refreshed: NotionAccountRow[] = [];
  for (const account of accounts) {
    refreshed.push(await refreshNotionAccountState(deps.db, deps.composio, account));
  }
  return refreshed;
}

async function requireAccount(db: D1Database, partnerClientId: string, accountSlug: string): Promise<NotionAccountRow> {
  const account = await getNotionAccountBySlug(db, partnerClientId, accountSlug);
  if (!account) throw new Error(`Account slug "${accountSlug}" was not found.`);
  return account;
}

async function requireActiveAccount(
  deps: OperatorNotionToolsDeps,
  partnerClientId: string,
  accountSlug: string,
  options: { requireSyncEnabled: boolean },
): Promise<NotionAccountRow> {
  const account = await requireAccount(deps.db, partnerClientId, accountSlug);
  const refreshed = await refreshNotionAccountState(deps.db, deps.composio, account);
  if (refreshed.status !== 'active') {
    throw new Error(`Account "${accountSlug}" is ${refreshed.status}.`);
  }
  if (refreshed.connection_status !== 'ACTIVE') {
    throw new Error(`Account "${accountSlug}" is not connected.`);
  }
  if (options.requireSyncEnabled && !Boolean(refreshed.sync_enabled)) {
    throw new Error(`Account "${accountSlug}" is not enabled for sync jobs.`);
  }
  return refreshed;
}

function rejectControlArgs(args: Record<string, unknown>): void {
  for (const key of ['workspace', 'entity_id', 'account_id', '__dm_entity_id']) {
    if (key in args) {
      throw new Error(`Pinned tools do not accept caller override for "${key}".`);
    }
  }
}

function responseMeta(account: NotionAccountRow): Record<string, unknown> {
  return {
    provider: 'composio',
    composio_user_id: account.composio_user_id,
    connected_account_id: account.connected_account_id,
  };
}

function serializeAccount(account: NotionAccountRow): Record<string, unknown> {
  return {
    account_slug: account.account_slug,
    display_label: account.display_label,
    composio_user_id: account.composio_user_id,
    auth_config_id: account.auth_config_id,
    connected_account_id: account.connected_account_id,
    connection_status: account.connection_status,
    status: account.status,
    sync_enabled: Boolean(account.sync_enabled),
    last_checked_at: account.last_checked_at,
    connected_at: account.connected_at,
    disabled_at: account.disabled_at,
    metadata: parseJsonObject(account.metadata_json),
  };
}

function toJsonResult(payload: Record<string, unknown>): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractPageTitle(page: Record<string, unknown>): string | null {
  const properties = isPlainObject(page.properties) ? page.properties : null;
  if (!properties) return null;

  for (const value of Object.values(properties)) {
    if (!isPlainObject(value)) continue;
    const title = value.title;
    if (!Array.isArray(title)) continue;
    const text = title
      .map((item) => (isPlainObject(item) && typeof item.plain_text === 'string' ? item.plain_text : ''))
      .join('')
      .trim();
    if (text) return text;
  }
  return null;
}
