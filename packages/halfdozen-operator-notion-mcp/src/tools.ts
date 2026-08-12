import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Composio } from '@composio/core';
import {
  buildComparablePropertyValue,
  buildWritablePropertiesPayload,
  ComposioNotionDispatcher,
  SUPPORTED_SYNC_FIELD_TYPES,
  type ComparablePropertyValue,
  type NotionDataSourceSchema,
  type NotionPageSnapshot,
  type PinnedNotionAction,
  type SupportedSyncFieldType,
} from './composio-notion.js';
import {
  accountSnapshot,
} from './resources.js';
import {
  completeNotionSyncRun,
  createNotionSyncContract,
  disableNotionAccount,
  deleteNotionSyncContract,
  getNotionAccountBySlug,
  getPartnerClient,
  getPinForTool,
  getNotionSyncContractBySlug,
  getNotionSyncContractSummary,
  getNotionSyncRunByIdempotencyKey,
  listNotionAccounts,
  listNotionPins,
  listNotionSyncContractFields,
  listNotionSyncContracts,
  listNotionSyncRecordMappings,
  listNotionSyncRuns,
  normalizeSlug,
  parseJsonObject,
  recordNotionEvent,
  refreshNotionAccountState,
  replaceNotionSyncContractFields,
  setNotionPin,
  setNotionSyncContractEnabled,
  setSyncEnabled,
  startNotionSyncRun,
  upsertNotionSyncRecordMapping,
  updateNotionSyncContract,
  upsertNotionAccount,
  type NotionAccountRow,
  type NotionSyncConflictPolicy,
  type NotionSyncContractFieldInput,
  type NotionSyncContractFieldRow,
  type NotionSyncContractRow,
  type NotionSyncContractSummaryRow,
  type NotionSyncFieldDirection,
  type NotionSyncRecordMappingRow,
  type NotionSyncRunRow,
  type NotionPinRow,
  type PartnerClientRow,
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
  routerOpenAiApiKey?: string;
  routerOpenAiModel?: string;
  routerOpenAiTimeoutMs?: number;
  routerOpenAiCacheTtlMs?: number;
  getActor: () => string;
}

const ACTIVE_ACCOUNT_REFRESH_TTL_MS = 60_000;
const LIST_ACCOUNTS_REFRESH_TTL_MS = 90_000;
const ROUTER_DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const ROUTER_DEFAULT_TIMEOUT_MS = 3_000;
const ROUTER_DEFAULT_CACHE_TTL_MS = 120_000;
const ROUTER_CACHE_MAX_ENTRIES = 256;
const PARTNER_CLIENT_CACHE_TTL_MS = 300_000;
const PARTNER_PIN_CACHE_TTL_MS = 60_000;
const PARTNER_CACHE_MAX_ENTRIES = 256;

type RouterIntent =
  | 'wizard'
  | 'upsert_account'
  | 'list_accounts'
  | 'get_status'
  | 'pin_account'
  | 'sync_guidance'
  | 'help';

interface RouterAgentDecision {
  intent: RouterIntent;
  account_slug?: string;
  display_label?: string;
  pin_tool_name?: string;
}

interface RouterCacheEntry {
  decision: RouterAgentDecision;
  expiresAt: number;
}

interface TimedCacheEntry<T> {
  value: T;
  expiresAt: number;
}

type AgentsSdk = typeof import('@openai/agents');

let agentsSdkPromise: Promise<AgentsSdk> | null = null;
const routerDecisionCache = new Map<string, RouterCacheEntry>();
const partnerClientCache = new Map<string, TimedCacheEntry<PartnerClientRow>>();
const partnerPinCache = new Map<string, TimedCacheEntry<NotionPinRow | null>>();
const SUPPORTED_SYNC_FIELD_TYPE_SET = new Set<string>(SUPPORTED_SYNC_FIELD_TYPES);
const SYNC_FIELD_DIRECTION_VALUES: NotionSyncFieldDirection[] = ['bidirectional', 'source_to_target', 'target_to_source'];
const SYNC_CONFLICT_POLICY_VALUES: NotionSyncConflictPolicy[] = ['manual', 'source_wins', 'target_wins'];
const SYNC_PAGE_SIZE = 100;

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
  args: z.record(z.string(), z.unknown()).default({}),
};

const accountToolSchema = {
  action: z.enum([
    'wizard',
    'upsert_account',
    'list_accounts',
    'get_status',
    'create_connect_link',
    'disable_account',
    'pin_account',
    'set_sync_enabled',
  ]),
  args: z.record(z.string(), z.unknown()).default({}),
};

const syncToolSchema = {
  action: z.enum(['preview_page_content', 'copy_page_content']),
  source_account_slug: z.string(),
  target_account_slug: z.string(),
  source_page_id: z.string(),
  target_page_id: z.string(),
};

const syncContractsToolSchema = {
  action: z.enum([
    'list_data_sources',
    'get_data_source_schema',
    'create_contract',
    'update_contract',
    'list_contracts',
    'get_contract',
    'delete_contract',
    'set_enabled',
    'validate_contract',
    'preview_run',
  ]),
  args: z.record(z.string(), z.unknown()).default({}),
};

const runSyncContractToolSchema = {
  contract_slug: z.string(),
  dry_run: z.boolean().optional(),
  idempotency_key: z.string().optional(),
};

const routerToolSchema = {
  request: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
};

const routerAgentDecisionSchema = z.object({
  intent: z.enum(['wizard', 'upsert_account', 'list_accounts', 'get_status', 'pin_account', 'sync_guidance', 'help']),
  account_slug: z.string().optional(),
  display_label: z.string().optional(),
  pin_tool_name: z.string().optional(),
});

interface SyncContractFieldDraft {
  source_field: string;
  target_field: string;
  direction: NotionSyncFieldDirection;
  ordinal: number;
  metadata: Record<string, unknown>;
}

interface SyncContractDraft {
  contract_slug: string;
  source_account_slug: string;
  target_account_slug: string;
  source_data_source_id: string;
  target_data_source_id: string;
  enabled: boolean;
  conflict_policy: NotionSyncConflictPolicy;
  propagate_create: boolean;
  propagate_update: boolean;
  propagate_archive: boolean;
  propagate_delete: boolean;
  delete_mode: 'archive';
  metadata: Record<string, unknown>;
  field_mappings: SyncContractFieldDraft[];
}

interface ValidatedSyncFieldBinding extends SyncContractFieldDraft {
  source_type: SupportedSyncFieldType;
  target_type: SupportedSyncFieldType;
}

interface SyncContractValidationError {
  code: string;
  message: string;
  field?: string;
  source_field?: string;
  target_field?: string;
}

interface SyncContractValidationResult {
  ok: boolean;
  errors: SyncContractValidationError[];
  draft: SyncContractDraft;
  source_account?: NotionAccountRow;
  target_account?: NotionAccountRow;
  source_schema?: NotionDataSourceSchema;
  target_schema?: NotionDataSourceSchema;
  field_bindings?: ValidatedSyncFieldBinding[];
}

interface SyncPairStateEntry {
  key: string;
  source_field: string;
  target_field: string;
  direction: NotionSyncFieldDirection;
  source_type: SupportedSyncFieldType;
  target_type: SupportedSyncFieldType;
  source_value: ComparablePropertyValue;
  target_value: ComparablePropertyValue;
}

interface SyncRunConflictRecord {
  source_page_id: string;
  target_page_id: string;
  source_field: string;
  target_field: string;
  direction: NotionSyncFieldDirection;
  policy: NotionSyncConflictPolicy;
  source_value: ComparablePropertyValue;
  target_value: ComparablePropertyValue;
  resolution: 'manual' | 'source_wins' | 'target_wins';
  message: string;
}

interface SyncRunErrorRecord {
  scope: string;
  message: string;
  source_page_id?: string;
  target_page_id?: string;
}

interface SyncRunState {
  created: number;
  updated: number;
  archived: number;
  conflicted: number;
  skipped: number;
  errors: SyncRunErrorRecord[];
  conflicts: SyncRunConflictRecord[];
}

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
    'Manage operator-bound Notion accounts, including API-first workspace upsert, optional connect-link issuance, and guided onboarding when useful.',
    accountToolSchema,
    async (params) => runAccountsTool(params.action as string, params.args as Record<string, unknown>, deps)
  );

  server.tool(
    'operator_notion_sync',
    'Preview or copy page content from one managed Notion account to another.',
    syncToolSchema,
    async (params) => runSyncTool(params, deps)
  );

  server.tool(
    'operator_notion_sync_contracts',
    'Manage deterministic Notion sync contracts for Codex automations, including data-source discovery, contract CRUD, validation, and dry-run preview.',
    syncContractsToolSchema,
    async (params) => runSyncContractsTool(params.action as string, params.args as Record<string, unknown>, deps)
  );

  server.tool(
    'operator_notion_run_sync_contract',
    'Execute or dry-run a stored Notion sync contract. Intended for Codex automations to call on a schedule.',
    runSyncContractToolSchema,
    async (params) => runSyncContractExecutionTool(params, deps)
  );

  server.tool(
    'operator_notion_router',
    'Natural-language router for operator Notion onboarding/account actions. It asks follow-up questions when required inputs are missing.',
    routerToolSchema,
    async (params) => runRouterTool(params, deps)
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
  const pin = await getCachedPinForTool(deps.db, client.id, toolName);
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
    case 'upsert_account': {
      return runAccountUpsert(args, deps, client.id, actor);
    }
    case 'wizard': {
      return runAccountsWizard(args, deps, client.id, actor);
    }
    case 'list_accounts': {
      const accounts = await syncAllAccounts(deps, client.id);
      const pins = await listNotionPins(deps.db, client.id);
      return toJsonResult({ ok: true, action, client_slug: client.slug, ...accountSnapshot(accounts, pins) });
    }
    case 'get_status': {
      const accountSlug = normalizeSlug(String(args.account_slug ?? ''));
      if (!accountSlug) throw new Error('args.account_slug is required');
      const account = await requireAccount(deps.db, client.id, accountSlug);
      const refreshed = await refreshNotionAccountState(deps.db, deps.composio, account, { force: true });
      return toJsonResult({ ok: true, action, account: serializeAccount(refreshed) });
    }
    case 'create_connect_link': {
      const accountSlug = normalizeSlug(String(args.account_slug ?? ''));
      if (!accountSlug) throw new Error('args.account_slug is required');
      const displayLabel = String(args.display_label ?? accountSlug).trim() || accountSlug;
      const syncEnabled = typeof args.sync_enabled === 'boolean' ? args.sync_enabled : true;
      const authConfigId = String(args.auth_config_id ?? deps.notionAuthConfigId ?? '').trim();
      if (!authConfigId) throw new Error('No Notion auth config ID configured for this deployment.');
      const existing = await getNotionAccountBySlug(deps.db, client.id, accountSlug);
      const metadata = isPlainObject(args.metadata) ? args.metadata : {};
      const composioUserId = `hd_notion_${client.slug.replace(/-/g, '_')}_${accountSlug.replace(/-/g, '_')}`;
      await upsertNotionAccount(deps.db, {
        partnerClientId: client.id,
        accountSlug,
        displayLabel,
        composioUserId,
        authConfigId,
        syncEnabled,
        metadata: {
          ...parseJsonObject(existing?.metadata_json),
          ...metadata,
          created_via: 'operator_notion_accounts',
        },
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
      invalidatePartnerPinCache(client.id, toolName);
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

async function runAccountUpsert(
  args: Record<string, unknown>,
  deps: OperatorNotionToolsDeps,
  partnerClientId: string,
  actor: string,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const accountSlug = normalizeSlug(String(args.account_slug ?? ''));
  if (!accountSlug) throw new Error('args.account_slug is required');

  const displayLabel = String(args.display_label ?? accountSlug).trim() || accountSlug;
  const syncEnabled = typeof args.sync_enabled === 'boolean' ? args.sync_enabled : true;
  const authConfigId = String(args.auth_config_id ?? deps.notionAuthConfigId ?? '').trim();
  if (!authConfigId) throw new Error('No Notion auth config ID configured for this deployment.');

  const existing = await getNotionAccountBySlug(deps.db, partnerClientId, accountSlug);
  const metadata = isPlainObject(args.metadata) ? args.metadata : {};
  const composioUserId = `hd_notion_${deps.partnerClientSlug.replace(/-/g, '_')}_${accountSlug.replace(/-/g, '_')}`;
  await upsertNotionAccount(deps.db, {
    partnerClientId,
    accountSlug,
    displayLabel,
    composioUserId,
    authConfigId,
    syncEnabled,
    metadata: {
      ...parseJsonObject(existing?.metadata_json),
      ...metadata,
      created_via: existing ? 'operator_notion_accounts_upsert' : 'operator_notion_accounts',
    },
  });
  const account = await requireAccount(deps.db, partnerClientId, accountSlug);
  const reactivated = Boolean(existing && existing.status !== 'active');
  await recordNotionEvent(deps.db, {
    partnerClientId,
    accountSlug,
    eventType: existing ? 'account_updated' : 'account_created',
    actor,
    metadata: { auth_config_id: authConfigId, sync_enabled: syncEnabled, reactivated },
  });

  return toJsonResult({
    ok: true,
    action: 'upsert_account',
    created: !existing,
    reactivated,
    account: serializeAccount(account),
    next_actions: [
      { tool: 'operator_notion_accounts', action: 'create_connect_link', args: { account_slug: accountSlug } },
    ],
  });
}

async function runAccountsWizard(
  args: Record<string, unknown>,
  deps: OperatorNotionToolsDeps,
  partnerClientId: string,
  actor: string,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const accountSlug = normalizeSlug(String(args.account_slug ?? ''));
  const displayLabel = String(args.display_label ?? accountSlug).trim() || accountSlug;
  const authConfigId = String(args.auth_config_id ?? deps.notionAuthConfigId ?? '').trim();
  const syncEnabled = typeof args.sync_enabled === 'boolean' ? args.sync_enabled : true;
  const metadata = isPlainObject(args.metadata) ? args.metadata : {};
  const pinToolName = String(args.pin_tool_name ?? '').trim();

  const missing: string[] = [];
  if (!accountSlug) missing.push('account_slug');
  if (!authConfigId) missing.push('auth_config_id');

  if (missing.length > 0) {
    return toJsonResult({
      ok: true,
      action: 'wizard',
      status: 'needs_input',
      next_questions: buildAccountWizardQuestions(missing, deps),
      instructions: [
        'Provide workspace slug first.',
        'display_label is optional; account_slug is used when no label is provided.',
        'If auth_config_id is omitted, deployment default COMPOSIO_NOTION_AUTH_CONFIG_ID is used.',
      ],
    });
  }

  const composioUserId = `hd_notion_${deps.partnerClientSlug.replace(/-/g, '_')}_${accountSlug.replace(/-/g, '_')}`;
  const existing = await getNotionAccountBySlug(deps.db, partnerClientId, accountSlug);
  await upsertNotionAccount(deps.db, {
    partnerClientId,
    accountSlug,
    displayLabel,
    composioUserId,
    authConfigId,
    syncEnabled,
    metadata: {
      ...parseJsonObject(existing?.metadata_json),
      ...metadata,
      created_via: 'operator_notion_accounts_wizard',
    },
  });

  const account = await requireAccount(deps.db, partnerClientId, accountSlug);
  const refreshed = await refreshNotionAccountState(deps.db, deps.composio, account, { force: true });

  if (refreshed.connection_status !== 'ACTIVE') {
    const connectionRequest = await deps.composio.connectedAccounts.link(refreshed.composio_user_id, authConfigId, {});
    await recordNotionEvent(deps.db, {
      partnerClientId,
      accountSlug,
      eventType: 'wizard_connect_link_created',
      actor,
      metadata: { connection_request_id: connectionRequest.id ?? null, auth_config_id: authConfigId },
    });
    return toJsonResult({
      ok: true,
      action: 'wizard',
      status: 'awaiting_connection',
      account: serializeAccount(refreshed),
      connect_link: connectionRequest.redirectUrl ?? null,
      instructions: [
        'Open connect_link and enter the Notion API key in Composio (if prompted).',
        'After browser auth, call operator_notion_accounts with action=get_status for this account_slug until connection_status=ACTIVE.',
      ],
      next_actions: [
        { tool: 'operator_notion_accounts', action: 'get_status', args: { account_slug: accountSlug } },
      ],
    });
  }

  let pinResult: Record<string, unknown> | null = null;
  if (pinToolName) {
    if (![deps.pinnedHalfdozenToolName, deps.pinnedClientToolName].includes(pinToolName)) {
      throw new Error(`args.pin_tool_name must be one of: ${deps.pinnedHalfdozenToolName}, ${deps.pinnedClientToolName}`);
    }
    await setNotionPin(deps.db, {
      partnerClientId,
      toolName: pinToolName,
      accountSlug: refreshed.account_slug,
      metadata: { pinned_by: actor, via: 'wizard' },
    });
    invalidatePartnerPinCache(partnerClientId, pinToolName);
    await recordNotionEvent(deps.db, {
      partnerClientId,
      accountSlug,
      eventType: 'wizard_tool_pinned',
      actor,
      metadata: { tool_name: pinToolName },
    });
    pinResult = { tool_name: pinToolName, account_slug: refreshed.account_slug };
  }

  return toJsonResult({
    ok: true,
    action: 'wizard',
    status: 'connected',
    account: serializeAccount(refreshed),
    pinned: pinResult,
    instructions: [
      'Workspace is connected.',
      'Operator can now choose workflows using halfdozen_notion / blondish_notion and other available Notion tools.',
    ],
  });
}

async function runRouterTool(
  params: Record<string, unknown>,
  deps: OperatorNotionToolsDeps,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const request = String(params.request ?? '').trim();
  if (!request) throw new Error('request is required');

  const lower = request.toLowerCase();
  const context = isPlainObject(params.context) ? params.context : {};
  const extractedAccountSlug = extractAccountSlug(request);
  const extractedDisplayLabel = extractDisplayLabel(request);
  const extractedPinTool = extractPinToolName(request, deps);

  const mergedArgs: Record<string, unknown> = { ...context };
  if (extractedAccountSlug && !mergedArgs.account_slug) mergedArgs.account_slug = extractedAccountSlug;
  if (extractedDisplayLabel && !mergedArgs.display_label) mergedArgs.display_label = extractedDisplayLabel;
  if (extractedPinTool && !mergedArgs.pin_tool_name) mergedArgs.pin_tool_name = extractedPinTool;

  const deterministic = await runDeterministicRouter(lower, mergedArgs, deps);
  if (deterministic) return deterministic;

  const agentDecision = await inferRouterIntentWithAgent(request, mergedArgs, deps);
  if (agentDecision) {
    if (agentDecision.account_slug && !mergedArgs.account_slug) mergedArgs.account_slug = agentDecision.account_slug;
    if (agentDecision.display_label && !mergedArgs.display_label) mergedArgs.display_label = agentDecision.display_label;
    if (agentDecision.pin_tool_name && !mergedArgs.pin_tool_name) mergedArgs.pin_tool_name = agentDecision.pin_tool_name;
    return runRouterIntent(agentDecision.intent, mergedArgs, deps);
  }

  return toJsonResult({
    ok: true,
    action: 'router',
    intent: 'fallback',
    status: 'needs_input',
    message:
      'I can help with: add workspace, issue connect links, check account status, list accounts, and pin workspace tools. Tell me which one you want.',
  });
}

async function runDeterministicRouter(
  lower: string,
  mergedArgs: Record<string, unknown>,
  deps: OperatorNotionToolsDeps,
): Promise<{ content: Array<{ type: 'text'; text: string }> } | null> {
  if (
    mentionsAny(lower, [
      'list accounts',
      'show accounts',
      'what accounts',
      'which accounts',
      'list workspaces',
      'show workspaces',
      'what workspaces',
      'which workspaces',
      'linked workspaces',
      'workspace inventory',
      'inventory of linked workspaces',
    ])
  ) {
    return runRouterIntent('list_accounts', mergedArgs, deps);
  }

  if (mentionsAny(lower, ['status', 'active', 'connected'])) {
    return runRouterIntent('get_status', mergedArgs, deps);
  }

  if (mentionsAny(lower, ['pin ', 'set pinned', 'use for halfdozen', 'use for blondish', 'pin workspace'])) {
    return runRouterIntent('pin_account', mergedArgs, deps);
  }

  if (mentionsAny(lower, ['add workspace', 'new workspace', 'register workspace'])) {
    return runRouterIntent('upsert_account', mergedArgs, deps);
  }

  if (mentionsAny(lower, ['sync', 'workflow'])) {
    return runRouterIntent('sync_guidance', mergedArgs, deps);
  }

  if (mentionsAny(lower, ['connect', 'connect link', 'api key', 'onboard'])) {
    return runRouterIntent('wizard', mergedArgs, deps);
  }

  return null;
}

async function runRouterIntent(
  intent: RouterIntent,
  mergedArgs: Record<string, unknown>,
  deps: OperatorNotionToolsDeps,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  if (intent === 'list_accounts') {
    return runAccountsTool('list_accounts', {}, deps);
  }

  if (intent === 'upsert_account') {
    const slug = normalizeSlug(String(mergedArgs.account_slug ?? ''));
    if (!slug) {
      return toJsonResult({
        ok: true,
        action: 'router',
        intent: 'upsert_account',
        status: 'needs_input',
        next_questions: ['What internal workspace slug should be added?'],
      });
    }
    return runAccountsTool('upsert_account', { ...mergedArgs, account_slug: slug }, deps);
  }

  if (intent === 'get_status') {
    const slug = normalizeSlug(String(mergedArgs.account_slug ?? ''));
    if (!slug) {
      return toJsonResult({
        ok: true,
        action: 'router',
        intent: 'get_status',
        status: 'needs_input',
        next_questions: ['Which account_slug should I check?'],
      });
    }
    return runAccountsTool('get_status', { account_slug: slug }, deps);
  }

  if (intent === 'pin_account') {
    const slug = normalizeSlug(String(mergedArgs.account_slug ?? ''));
    const toolName = normalizePinToolName(mergedArgs.pin_tool_name, deps);
    if (!slug || !toolName) {
      return toJsonResult({
        ok: true,
        action: 'router',
        intent: 'pin_account',
        status: 'needs_input',
        next_questions: [
          'Which account_slug should be pinned?',
          `Which pin tool should be used? (${deps.pinnedHalfdozenToolName} or ${deps.pinnedClientToolName})`,
        ],
      });
    }
    return runAccountsTool('pin_account', { account_slug: slug, tool_name: toolName }, deps);
  }

  if (intent === 'sync_guidance') {
    return toJsonResult({
      ok: true,
      action: 'router',
      intent: 'sync_guidance',
      status: 'info',
      message:
        'Use operator_notion_accounts action=upsert_account to register each workspace. Then issue connect links, confirm ACTIVE status, and use operator_notion_sync_contracts to define, validate, and preview a reusable sync contract.',
      next_actions: [
        { tool: 'operator_notion_accounts', action: 'upsert_account', args: mergedArgs },
        { tool: 'operator_notion_accounts', action: 'create_connect_link', args: mergedArgs },
        { tool: 'operator_notion_sync_contracts', action: 'validate_contract', args: mergedArgs },
      ],
    });
  }

  if (intent === 'wizard') {
    const wizardArgs: Record<string, unknown> = { ...mergedArgs };
    const pinToolName = normalizePinToolName(wizardArgs.pin_tool_name, deps);
    if (pinToolName) wizardArgs.pin_tool_name = pinToolName;
    return runAccountsTool('wizard', wizardArgs, deps);
  }

  return toJsonResult({
    ok: true,
    action: 'router',
    intent: 'help',
    status: 'needs_input',
    message:
      'I can help with: add workspace, issue connect links, check account status, list accounts, and pin workspace tools. Tell me which one you want.',
  });
}

async function inferRouterIntentWithAgent(
  request: string,
  context: Record<string, unknown>,
  deps: OperatorNotionToolsDeps,
): Promise<RouterAgentDecision | null> {
  const apiKey = deps.routerOpenAiApiKey?.trim();
  if (!apiKey) return null;
  if (request.length > 1_500) return null;

  const cacheKey = buildRouterCacheKey(request, context, deps);
  const cached = getCachedRouterDecision(cacheKey);
  if (cached) return cached;

  try {
    const agentsSdk = await loadAgentsSdk();
    agentsSdk.setDefaultOpenAIKey(apiKey);

    const model = deps.routerOpenAiModel?.trim() || ROUTER_DEFAULT_OPENAI_MODEL;
    const timeoutMs = deps.routerOpenAiTimeoutMs ?? ROUTER_DEFAULT_TIMEOUT_MS;
    const cacheTtlMs = deps.routerOpenAiCacheTtlMs ?? ROUTER_DEFAULT_CACHE_TTL_MS;

    const agent = new agentsSdk.Agent({
      name: 'Operator Notion Router',
      model,
      instructions: [
        'You route operator requests for Notion account management.',
        'Return only a single JSON object with keys: intent, account_slug, display_label, pin_tool_name.',
        'Allowed intents: wizard, upsert_account, list_accounts, get_status, pin_account, sync_guidance, help.',
        'If unsure, return intent=help.',
        'Never include prose or markdown.',
      ].join(' '),
    });

    const runner = new agentsSdk.Runner({ tracingDisabled: true });
    const prompt = buildRouterAgentPrompt(request, context, deps);
    const runPromise = runner.run(agent, prompt, { maxTurns: 1 }) as Promise<{ finalOutput: unknown }>;
    const runResult = await withTimeout(runPromise, timeoutMs, 'OpenAI router timeout');
    const decision = parseRouterAgentDecision(runResult.finalOutput, deps);
    if (!decision) return null;
    setCachedRouterDecision(cacheKey, decision, cacheTtlMs);
    return decision;
  } catch {
    return null;
  }
}

async function runSyncTool(
  params: Record<string, unknown>,
  deps: OperatorNotionToolsDeps,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { client } = await requirePartnerClient(deps);
  const action = String(params.action);
  const sourceAccountSlug = normalizeSlug(String(params.source_account_slug ?? ''));
  const targetAccountSlug = normalizeSlug(String(params.target_account_slug ?? ''));
  const sourcePageId = String(params.source_page_id ?? '').trim();
  const targetPageId = String(params.target_page_id ?? '').trim();

  if (!sourceAccountSlug || !targetAccountSlug || !sourcePageId || !targetPageId) {
    throw new Error('source_account_slug, target_account_slug, source_page_id, and target_page_id are required.');
  }
  if (sourceAccountSlug === targetAccountSlug) {
    throw new Error('source_account_slug and target_account_slug must differ.');
  }

  const source = await requireActiveAccount(deps, client.id, sourceAccountSlug, { requireSyncEnabled: true });
  const target = await requireActiveAccount(deps, client.id, targetAccountSlug, { requireSyncEnabled: true });

  const preview = await buildSyncPreview(deps, source, target, sourcePageId, targetPageId);

  if (action === 'preview_page_content') {
    return toJsonResult({ ok: true, action, preview: preview.summary });
  }

  if (action !== 'copy_page_content') {
    throw new Error(`Unsupported operator_notion_sync action: ${action}`);
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

  return toJsonResult({ ok: true, action, preview: preview.summary, copied: true });
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

async function runSyncContractsTool(
  action: string,
  args: Record<string, unknown>,
  deps: OperatorNotionToolsDeps,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { client } = await requirePartnerClient(deps);
  const actor = deps.getActor();

  switch (action) {
    case 'list_data_sources': {
      const accountSlug = normalizeSlug(String(args.account_slug ?? ''));
      if (!accountSlug) throw new Error('args.account_slug is required');
      const account = await requireActiveAccount(deps, client.id, accountSlug, { requireSyncEnabled: false });
      const dataSources = await listAllDataSourcesForAccount(deps, account);
      return toJsonResult({
        ok: true,
        action,
        account: serializeAccount(account),
        data_sources: dataSources.map(serializeDataSourceSummary),
      });
    }
    case 'get_data_source_schema': {
      const accountSlug = normalizeSlug(String(args.account_slug ?? ''));
      const dataSourceId = String(args.data_source_id ?? '').trim();
      if (!accountSlug) throw new Error('args.account_slug is required');
      if (!dataSourceId) throw new Error('args.data_source_id is required');
      const account = await requireActiveAccount(deps, client.id, accountSlug, { requireSyncEnabled: false });
      const schema = await deps.dispatcher.getDataSourceSchema(account.composio_user_id, dataSourceId);
      return toJsonResult({
        ok: true,
        action,
        account: serializeAccount(account),
        schema: serializeDataSourceSchema(schema),
      });
    }
    case 'create_contract': {
      const draft = parseSyncContractDraftFromArgs(args, { requireContractSlug: true });
      const validation = await validateSyncContractDraft(deps, client.id, draft);
      if (!validation.ok) {
        return toJsonResult({ ok: false, action, validation: serializeValidationResult(validation) });
      }
      if (await getNotionSyncContractBySlug(deps.db, client.id, draft.contract_slug)) {
        throw new Error(`Contract "${draft.contract_slug}" already exists.`);
      }
      const created = await createNotionSyncContract(deps.db, {
        partnerClientId: client.id,
        contractSlug: draft.contract_slug,
        sourceAccountSlug: draft.source_account_slug,
        targetAccountSlug: draft.target_account_slug,
        sourceDataSourceId: draft.source_data_source_id,
        targetDataSourceId: draft.target_data_source_id,
        enabled: draft.enabled,
        conflictPolicy: draft.conflict_policy,
        propagateCreate: draft.propagate_create,
        propagateUpdate: draft.propagate_update,
        propagateArchive: draft.propagate_archive,
        propagateDelete: draft.propagate_delete,
        metadata: draft.metadata,
        fields: draft.field_mappings.map(toContractFieldInput),
      });
      await recordNotionEvent(deps.db, {
        partnerClientId: client.id,
        eventType: 'sync_contract_created',
        actor,
        metadata: { contract_slug: created.contract_slug },
      });
      return runSyncContractsTool('get_contract', { contract_slug: created.contract_slug }, deps);
    }
    case 'update_contract': {
      const contractSlug = normalizeSlug(String(args.contract_slug ?? ''));
      if (!contractSlug) throw new Error('args.contract_slug is required');
      const existing = await getNotionSyncContractBySlug(deps.db, client.id, contractSlug);
      if (!existing) throw new Error(`Contract "${contractSlug}" was not found.`);
      const existingFields = await listNotionSyncContractFields(deps.db, existing.id);
      const mergedDraft = mergeSyncContractDraft(existing, existingFields, args);
      const validation = await validateSyncContractDraft(deps, client.id, mergedDraft);
      if (!validation.ok) {
        return toJsonResult({ ok: false, action, validation: serializeValidationResult(validation) });
      }
      await updateNotionSyncContract(deps.db, client.id, contractSlug, {
        sourceAccountSlug: mergedDraft.source_account_slug,
        targetAccountSlug: mergedDraft.target_account_slug,
        sourceDataSourceId: mergedDraft.source_data_source_id,
        targetDataSourceId: mergedDraft.target_data_source_id,
        enabled: mergedDraft.enabled,
        conflictPolicy: mergedDraft.conflict_policy,
        propagateCreate: mergedDraft.propagate_create,
        propagateUpdate: mergedDraft.propagate_update,
        propagateArchive: mergedDraft.propagate_archive,
        propagateDelete: mergedDraft.propagate_delete,
        metadata: mergedDraft.metadata,
      });
      await replaceNotionSyncContractFields(
        deps.db,
        client.id,
        existing.id,
        mergedDraft.field_mappings.map(toContractFieldInput),
      );
      await recordNotionEvent(deps.db, {
        partnerClientId: client.id,
        eventType: 'sync_contract_updated',
        actor,
        metadata: { contract_slug: contractSlug },
      });
      return runSyncContractsTool('get_contract', { contract_slug: contractSlug }, deps);
    }
    case 'list_contracts': {
      const contracts = await listNotionSyncContracts(deps.db, client.id);
      return toJsonResult({
        ok: true,
        action,
        contracts: contracts.map((contract) => serializeContractSummary(contract)),
      });
    }
    case 'get_contract': {
      const contractSlug = normalizeSlug(String(args.contract_slug ?? ''));
      if (!contractSlug) throw new Error('args.contract_slug is required');
      const summary = await getNotionSyncContractSummary(deps.db, client.id, contractSlug);
      if (!summary) throw new Error(`Contract "${contractSlug}" was not found.`);
      const fields = await listNotionSyncContractFields(deps.db, summary.id);
      const runs = await listNotionSyncRuns(deps.db, summary.id, 5);
      return toJsonResult({
        ok: true,
        action,
        contract: serializeContractSummary(summary, {
          fields,
          runs,
        }),
      });
    }
    case 'delete_contract': {
      const contractSlug = normalizeSlug(String(args.contract_slug ?? ''));
      if (!contractSlug) throw new Error('args.contract_slug is required');
      const deleted = await deleteNotionSyncContract(deps.db, client.id, contractSlug);
      if (!deleted) throw new Error(`Contract "${contractSlug}" was not found.`);
      await recordNotionEvent(deps.db, {
        partnerClientId: client.id,
        eventType: 'sync_contract_deleted',
        actor,
        metadata: { contract_slug: contractSlug },
      });
      return toJsonResult({ ok: true, action, contract_slug: contractSlug, deleted: true });
    }
    case 'set_enabled': {
      const contractSlug = normalizeSlug(String(args.contract_slug ?? ''));
      if (!contractSlug) throw new Error('args.contract_slug is required');
      if (typeof args.enabled !== 'boolean') throw new Error('args.enabled must be boolean');
      const updated = await setNotionSyncContractEnabled(deps.db, client.id, contractSlug, args.enabled);
      if (!updated) throw new Error(`Contract "${contractSlug}" was not found.`);
      await recordNotionEvent(deps.db, {
        partnerClientId: client.id,
        eventType: 'sync_contract_enabled_updated',
        actor,
        metadata: { contract_slug: contractSlug, enabled: args.enabled },
      });
      return runSyncContractsTool('get_contract', { contract_slug: contractSlug }, deps);
    }
    case 'validate_contract': {
      const validation = await loadOrValidateSyncContract(deps, client.id, args);
      return toJsonResult({
        ok: validation.ok,
        action,
        validation: serializeValidationResult(validation),
      });
    }
    case 'preview_run': {
      const contractSlug = normalizeSlug(String(args.contract_slug ?? ''));
      if (!contractSlug) throw new Error('args.contract_slug is required');
      return executeSyncContractRun(contractSlug, {
        dryRun: true,
        idempotencyKey: typeof args.idempotency_key === 'string' ? args.idempotency_key.trim() || null : null,
      }, deps);
    }
    default:
      throw new Error(`Unsupported operator_notion_sync_contracts action: ${action}`);
  }
}

async function runSyncContractExecutionTool(
  params: Record<string, unknown>,
  deps: OperatorNotionToolsDeps,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const contractSlug = normalizeSlug(String(params.contract_slug ?? ''));
  if (!contractSlug) throw new Error('contract_slug is required');
  return executeSyncContractRun(contractSlug, {
    dryRun: params.dry_run === true,
    idempotencyKey: typeof params.idempotency_key === 'string' ? params.idempotency_key.trim() || null : null,
  }, deps);
}

async function executeSyncContractRun(
  contractSlug: string,
  options: { dryRun: boolean; idempotencyKey: string | null },
  deps: OperatorNotionToolsDeps,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { client } = await requirePartnerClient(deps);
  const actor = deps.getActor();
  const contract = await getNotionSyncContractBySlug(deps.db, client.id, contractSlug);
  if (!contract) {
    throw new Error(`Contract "${contractSlug}" was not found.`);
  }

  if (options.idempotencyKey) {
    const existingRun = await getNotionSyncRunByIdempotencyKey(deps.db, contract.id, options.idempotencyKey);
    if (existingRun) {
      return toJsonResult({
        ok: existingRun.status !== 'failed',
        action: options.dryRun ? 'preview_run' : 'run_sync_contract',
        idempotent_reuse: true,
        run: serializeSyncRun(existingRun),
      });
    }
  }

  const run = await startNotionSyncRun(deps.db, {
    partnerClientId: client.id,
    contractId: contract.id,
    contractSlug: contract.contract_slug,
    dryRun: options.dryRun,
    idempotencyKey: options.idempotencyKey,
    metadata: { actor },
  });

  try {
    if (!Boolean(contract.enabled)) {
      throw new Error(`Contract "${contract.contract_slug}" is disabled.`);
    }

    const validation = await loadStoredSyncContractValidation(deps, client.id, contract);
    if (!validation.ok || !validation.source_account || !validation.target_account || !validation.field_bindings) {
      throw new Error(JSON.stringify(serializeValidationResult(validation)));
    }

    const syncState = await performSyncContractRun(
      deps,
      client.id,
      contract,
      validation.source_account,
      validation.target_account,
      validation.field_bindings,
      options.dryRun,
    );

    const completed = await completeNotionSyncRun(deps.db, {
      runId: run.id,
      status: options.dryRun ? 'dry_run' : 'completed',
      createdCount: syncState.created,
      updatedCount: syncState.updated,
      archivedCount: syncState.archived,
      conflictedCount: syncState.conflicted,
      skippedCount: syncState.skipped,
      errorCount: syncState.errors.length,
      errors: syncState.errors,
      conflicts: syncState.conflicts,
      metadata: {
        actor,
        dry_run: options.dryRun,
      },
    });
    await recordNotionEvent(deps.db, {
      partnerClientId: client.id,
      eventType: options.dryRun ? 'sync_contract_previewed' : 'sync_contract_ran',
      actor,
      metadata: {
        contract_slug: contract.contract_slug,
        run_id: completed?.id ?? run.id,
        created: syncState.created,
        updated: syncState.updated,
        archived: syncState.archived,
        conflicted: syncState.conflicted,
        skipped: syncState.skipped,
        errors: syncState.errors.length,
      },
    });
    return toJsonResult({
      ok: syncState.errors.length === 0,
      action: options.dryRun ? 'preview_run' : 'run_sync_contract',
      contract_slug: contract.contract_slug,
      run: serializeSyncRun(completed ?? run, {
        overrideCounts: {
          created: syncState.created,
          updated: syncState.updated,
          archived: syncState.archived,
          conflicted: syncState.conflicted,
          skipped: syncState.skipped,
        },
        errorDetails: syncState.errors,
        conflictDetails: syncState.conflicts,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed = await completeNotionSyncRun(deps.db, {
      runId: run.id,
      status: 'failed',
      errorCount: 1,
      errors: [{ scope: 'run', message }],
      metadata: { actor, dry_run: options.dryRun },
    });
    await recordNotionEvent(deps.db, {
      partnerClientId: client.id,
      eventType: 'sync_contract_run_failed',
      actor,
      metadata: { contract_slug: contract.contract_slug, run_id: failed?.id ?? run.id, error: message },
    });
    return toJsonResult({
      ok: false,
      action: options.dryRun ? 'preview_run' : 'run_sync_contract',
      contract_slug: contract.contract_slug,
      error: message,
      run: failed ? serializeSyncRun(failed) : serializeSyncRun(run),
    });
  }
}

async function performSyncContractRun(
  deps: OperatorNotionToolsDeps,
  partnerClientId: string,
  contract: NotionSyncContractRow,
  sourceAccount: NotionAccountRow,
  targetAccount: NotionAccountRow,
  fieldBindings: ValidatedSyncFieldBinding[],
  dryRun: boolean,
): Promise<SyncRunState> {
  const state: SyncRunState = {
    created: 0,
    updated: 0,
    archived: 0,
    conflicted: 0,
    skipped: 0,
    errors: [],
    conflicts: [],
  };

  const [sourcePages, targetPages, existingMappings] = await Promise.all([
    queryAllPagesForDataSource(deps, sourceAccount, contract.source_data_source_id),
    queryAllPagesForDataSource(deps, targetAccount, contract.target_data_source_id),
    listNotionSyncRecordMappings(deps.db, contract.id),
  ]);

  const sourcePagesById = new Map(sourcePages.map((page) => [page.id, page]));
  const targetPagesById = new Map(targetPages.map((page) => [page.id, page]));

  for (const mapping of existingMappings) {
    try {
      await reconcileMappedPages({
        deps,
        partnerClientId,
        contract,
        sourceAccount,
        targetAccount,
        fieldBindings,
        mapping,
        sourcePage: sourcePagesById.get(mapping.source_page_id) ?? null,
        targetPage: targetPagesById.get(mapping.target_page_id) ?? null,
        dryRun,
        state,
      });
    } catch (error) {
      state.errors.push({
        scope: 'mapped_pair',
        message: error instanceof Error ? error.message : String(error),
        source_page_id: mapping.source_page_id,
        target_page_id: mapping.target_page_id,
      });
    }
  }

  const mappedSourceIds = new Set(existingMappings.map((mapping) => mapping.source_page_id));
  const mappedTargetIds = new Set(existingMappings.map((mapping) => mapping.target_page_id));

  for (const sourcePage of sourcePages) {
    if (mappedSourceIds.has(sourcePage.id) || sourcePage.archived) continue;
    try {
      await createMappedPeerFromSource({
        deps,
        partnerClientId,
        contract,
        sourceAccount,
        targetAccount,
        fieldBindings,
        sourcePage,
        dryRun,
        state,
      });
    } catch (error) {
      state.errors.push({
        scope: 'create_from_source',
        message: error instanceof Error ? error.message : String(error),
        source_page_id: sourcePage.id,
      });
    }
  }

  for (const targetPage of targetPages) {
    if (mappedTargetIds.has(targetPage.id) || targetPage.archived) continue;
    try {
      await createMappedPeerFromTarget({
        deps,
        partnerClientId,
        contract,
        sourceAccount,
        targetAccount,
        fieldBindings,
        targetPage,
        dryRun,
        state,
      });
    } catch (error) {
      state.errors.push({
        scope: 'create_from_target',
        message: error instanceof Error ? error.message : String(error),
        target_page_id: targetPage.id,
      });
    }
  }

  return state;
}

async function reconcileMappedPages(input: {
  deps: OperatorNotionToolsDeps;
  partnerClientId: string;
  contract: NotionSyncContractRow;
  sourceAccount: NotionAccountRow;
  targetAccount: NotionAccountRow;
  fieldBindings: ValidatedSyncFieldBinding[];
  mapping: NotionSyncRecordMappingRow;
  sourcePage: NotionPageSnapshot | null;
  targetPage: NotionPageSnapshot | null;
  dryRun: boolean;
  state: SyncRunState;
}): Promise<void> {
  const sourcePresence = await resolveMappedPagePresence(
    input.deps,
    input.sourceAccount,
    input.mapping.source_page_id,
    input.sourcePage,
  );
  const targetPresence = await resolveMappedPagePresence(
    input.deps,
    input.targetAccount,
    input.mapping.target_page_id,
    input.targetPage,
  );

  if (sourcePresence.status !== 'active' || targetPresence.status !== 'active') {
    await handleNonActiveMapping({
      ...input,
      sourcePresence,
      targetPresence,
    });
    return;
  }

  const activeSourcePage = sourcePresence.page;
  const activeTargetPage = targetPresence.page;
  if (!activeSourcePage || !activeTargetPage) {
    throw new Error('Mapped page reconciliation expected active page snapshots on both sides.');
  }

  const pairState = buildPairState(input.fieldBindings, activeSourcePage, activeTargetPage);
  const previousState = parsePairState(input.mapping.metadata_json);
  const sourceChangedOverall = buildSideHash(pairState, 'source') !== (input.mapping.source_last_hash ?? buildSideHash(pairState, 'source'));
  const targetChangedOverall = buildSideHash(pairState, 'target') !== (input.mapping.target_last_hash ?? buildSideHash(pairState, 'target'));

  const sourceUpdates: Array<{ field: string; type: SupportedSyncFieldType; value: ComparablePropertyValue }> = [];
  const targetUpdates: Array<{ field: string; type: SupportedSyncFieldType; value: ComparablePropertyValue }> = [];
  const conflicts: SyncRunConflictRecord[] = [];

  for (const entry of pairState) {
    const previous = previousState[entry.key];
    const sourceFieldChanged = previous ? !valuesEqual(entry.source_value, previous.source_value) : sourceChangedOverall;
    const targetFieldChanged = previous ? !valuesEqual(entry.target_value, previous.target_value) : targetChangedOverall;
    const valuesDiffer = !valuesEqual(entry.source_value, entry.target_value);

    if (entry.direction === 'source_to_target') {
      if (sourceFieldChanged && valuesDiffer) {
        targetUpdates.push({ field: entry.target_field, type: entry.target_type, value: entry.source_value });
      }
      continue;
    }

    if (entry.direction === 'target_to_source') {
      if (targetFieldChanged && valuesDiffer) {
        sourceUpdates.push({ field: entry.source_field, type: entry.source_type, value: entry.target_value });
      }
      continue;
    }

    if (sourceFieldChanged && targetFieldChanged && valuesDiffer) {
      conflicts.push(buildConflictRecord(input.contract.conflict_policy, input.mapping, entry));
      continue;
    }
    if (sourceFieldChanged && valuesDiffer) {
      targetUpdates.push({ field: entry.target_field, type: entry.target_type, value: entry.source_value });
    } else if (targetFieldChanged && valuesDiffer) {
      sourceUpdates.push({ field: entry.source_field, type: entry.source_type, value: entry.target_value });
    } else if (input.mapping.mapping_status === 'conflicted' && valuesDiffer) {
      conflicts.push(buildConflictRecord(input.contract.conflict_policy, input.mapping, entry));
    }
  }

  const resolvedTargetUpdates = dedupeUpdateEntries(targetUpdates);
  const resolvedSourceUpdates = dedupeUpdateEntries(sourceUpdates);

  if (conflicts.length > 0) {
    if (input.contract.conflict_policy === 'manual') {
      input.state.conflicted += conflicts.length;
      input.state.conflicts.push(...conflicts);
      if (!input.dryRun) {
        await upsertNotionSyncRecordMapping(input.deps.db, {
          partnerClientId: input.partnerClientId,
          contractId: input.contract.id,
          sourcePageId: input.mapping.source_page_id,
          targetPageId: input.mapping.target_page_id,
          sourceLastEditedTime: input.mapping.source_last_edited_time,
          targetLastEditedTime: input.mapping.target_last_edited_time,
          sourceLastHash: input.mapping.source_last_hash,
          targetLastHash: input.mapping.target_last_hash,
          mappingStatus: 'conflicted',
          lastSyncedAt: input.mapping.last_synced_at,
          metadata: {
            ...parseJsonObject(input.mapping.metadata_json),
            last_conflicts: conflicts,
          },
        });
      }
      return;
    }

    for (const conflict of conflicts) {
      input.state.conflicted += 1;
      input.state.conflicts.push(conflict);
      if (input.contract.conflict_policy === 'source_wins') {
        resolvedTargetUpdates.push({
          field: conflict.target_field,
          type: findFieldBinding(input.fieldBindings, conflict.source_field, conflict.target_field)?.target_type ?? 'rich_text',
          value: conflict.source_value,
        });
      } else {
        resolvedSourceUpdates.push({
          field: conflict.source_field,
          type: findFieldBinding(input.fieldBindings, conflict.source_field, conflict.target_field)?.source_type ?? 'rich_text',
          value: conflict.target_value,
        });
      }
    }
  }

  if ((resolvedTargetUpdates.length > 0 || resolvedSourceUpdates.length > 0) && !Boolean(input.contract.propagate_update)) {
    input.state.skipped += 1;
    return;
  }

  let nextPairState = [...pairState];
  let nextSourceLastEdited = activeSourcePage.lastEditedTime;
  let nextTargetLastEdited = activeTargetPage.lastEditedTime;

  if (resolvedTargetUpdates.length > 0) {
    input.state.updated += 1;
    nextPairState = applyTargetUpdatesToPairState(nextPairState, resolvedTargetUpdates);
    if (!input.dryRun) {
      const updated = await input.deps.dispatcher.updatePage(
        input.targetAccount.composio_user_id,
        input.mapping.target_page_id,
        buildWritablePropertiesPayload(resolvedTargetUpdates),
      );
      nextTargetLastEdited = updated.page?.lastEditedTime ?? nowIso();
    }
  }

  if (resolvedSourceUpdates.length > 0) {
    input.state.updated += 1;
    nextPairState = applySourceUpdatesToPairState(nextPairState, resolvedSourceUpdates);
    if (!input.dryRun) {
      const updated = await input.deps.dispatcher.updatePage(
        input.sourceAccount.composio_user_id,
        input.mapping.source_page_id,
        buildWritablePropertiesPayload(resolvedSourceUpdates),
      );
      nextSourceLastEdited = updated.page?.lastEditedTime ?? nowIso();
    }
  }

  if (!input.dryRun && (resolvedTargetUpdates.length > 0 || resolvedSourceUpdates.length > 0 || conflicts.length > 0)) {
    await upsertNotionSyncRecordMapping(input.deps.db, {
      partnerClientId: input.partnerClientId,
      contractId: input.contract.id,
      sourcePageId: input.mapping.source_page_id,
      targetPageId: input.mapping.target_page_id,
      sourceLastEditedTime: nextSourceLastEdited,
      targetLastEditedTime: nextTargetLastEdited,
      sourceLastHash: buildSideHash(nextPairState, 'source'),
      targetLastHash: buildSideHash(nextPairState, 'target'),
      mappingStatus: input.contract.conflict_policy === 'manual' && conflicts.length > 0 ? 'conflicted' : 'active',
      lastSyncedAt: nowIso(),
      metadata: {
        pair_state: pairStateToMetadata(nextPairState),
      },
    });
  }
}

async function handleNonActiveMapping(input: {
  deps: OperatorNotionToolsDeps;
  partnerClientId: string;
  contract: NotionSyncContractRow;
  sourceAccount: NotionAccountRow;
  targetAccount: NotionAccountRow;
  mapping: NotionSyncRecordMappingRow;
  sourcePresence: { status: 'active' | 'archived' | 'missing'; page: NotionPageSnapshot | null };
  targetPresence: { status: 'active' | 'archived' | 'missing'; page: NotionPageSnapshot | null };
  dryRun: boolean;
  state: SyncRunState;
}): Promise<void> {
  const missingMeansDelete = input.sourcePresence.status === 'missing' || input.targetPresence.status === 'missing';
  const shouldPropagate = missingMeansDelete ? Boolean(input.contract.propagate_delete) : Boolean(input.contract.propagate_archive);

  if (input.sourcePresence.status !== 'active' && input.targetPresence.status !== 'active') {
    if (!input.dryRun) {
      await upsertNotionSyncRecordMapping(input.deps.db, {
        partnerClientId: input.partnerClientId,
        contractId: input.contract.id,
        sourcePageId: input.mapping.source_page_id,
        targetPageId: input.mapping.target_page_id,
        sourceLastEditedTime: input.sourcePresence.page?.lastEditedTime ?? input.mapping.source_last_edited_time,
        targetLastEditedTime: input.targetPresence.page?.lastEditedTime ?? input.mapping.target_last_edited_time,
        sourceLastHash: input.mapping.source_last_hash,
        targetLastHash: input.mapping.target_last_hash,
        mappingStatus: missingMeansDelete ? 'tombstoned' : 'archived',
        lastSyncedAt: nowIso(),
        archivedAt: missingMeansDelete ? input.mapping.archived_at : nowIso(),
        tombstonedAt: missingMeansDelete ? nowIso() : input.mapping.tombstoned_at,
        metadata: parseJsonObject(input.mapping.metadata_json),
      });
    }
    return;
  }

  if (!shouldPropagate) {
    input.state.skipped += 1;
    return;
  }

  const archiveTarget = input.sourcePresence.status !== 'active';
  input.state.archived += 1;

  if (!input.dryRun) {
    if (archiveTarget) {
      const result = await input.deps.dispatcher.archivePage(input.targetAccount.composio_user_id, input.mapping.target_page_id);
      await upsertNotionSyncRecordMapping(input.deps.db, {
        partnerClientId: input.partnerClientId,
        contractId: input.contract.id,
        sourcePageId: input.mapping.source_page_id,
        targetPageId: input.mapping.target_page_id,
        sourceLastEditedTime: input.sourcePresence.page?.lastEditedTime ?? input.mapping.source_last_edited_time,
        targetLastEditedTime: result.page?.lastEditedTime ?? nowIso(),
        sourceLastHash: input.mapping.source_last_hash,
        targetLastHash: input.mapping.target_last_hash,
        mappingStatus: missingMeansDelete ? 'tombstoned' : 'archived',
        lastSyncedAt: nowIso(),
        archivedAt: nowIso(),
        tombstonedAt: missingMeansDelete ? nowIso() : input.mapping.tombstoned_at,
        metadata: parseJsonObject(input.mapping.metadata_json),
      });
    } else {
      const result = await input.deps.dispatcher.archivePage(input.sourceAccount.composio_user_id, input.mapping.source_page_id);
      await upsertNotionSyncRecordMapping(input.deps.db, {
        partnerClientId: input.partnerClientId,
        contractId: input.contract.id,
        sourcePageId: input.mapping.source_page_id,
        targetPageId: input.mapping.target_page_id,
        sourceLastEditedTime: result.page?.lastEditedTime ?? nowIso(),
        targetLastEditedTime: input.targetPresence.page?.lastEditedTime ?? input.mapping.target_last_edited_time,
        sourceLastHash: input.mapping.source_last_hash,
        targetLastHash: input.mapping.target_last_hash,
        mappingStatus: missingMeansDelete ? 'tombstoned' : 'archived',
        lastSyncedAt: nowIso(),
        archivedAt: nowIso(),
        tombstonedAt: missingMeansDelete ? nowIso() : input.mapping.tombstoned_at,
        metadata: parseJsonObject(input.mapping.metadata_json),
      });
    }
  }
}

async function createMappedPeerFromSource(input: {
  deps: OperatorNotionToolsDeps;
  partnerClientId: string;
  contract: NotionSyncContractRow;
  sourceAccount: NotionAccountRow;
  targetAccount: NotionAccountRow;
  fieldBindings: ValidatedSyncFieldBinding[];
  sourcePage: NotionPageSnapshot;
  dryRun: boolean;
  state: SyncRunState;
}): Promise<void> {
  if (!Boolean(input.contract.propagate_create)) {
    input.state.skipped += 1;
    return;
  }

  const createEntries = input.fieldBindings
    .filter((binding) => binding.direction !== 'target_to_source')
    .map((binding) => ({
      field: binding.target_field,
      type: binding.target_type,
      value: buildComparablePropertyValue(binding.source_type, input.sourcePage.properties[binding.source_field]),
    }));

  const payload = buildWritablePropertiesPayload(createEntries);
  if (Object.keys(payload).length === 0) {
    input.state.skipped += 1;
    return;
  }

  input.state.created += 1;
  if (input.dryRun) return;

  const created = await input.deps.dispatcher.createPage(
    input.targetAccount.composio_user_id,
    input.contract.target_data_source_id,
    payload,
  );
  const targetPage = created.page ?? await safeGetPage(input.deps, input.targetAccount, created.id);
  const pairState = buildPairState(
    input.fieldBindings,
    input.sourcePage,
    targetPage ?? simulateCreatedPage(created.id, createEntries),
  );
  await upsertNotionSyncRecordMapping(input.deps.db, {
    partnerClientId: input.partnerClientId,
    contractId: input.contract.id,
    sourcePageId: input.sourcePage.id,
    targetPageId: created.id,
    sourceLastEditedTime: input.sourcePage.lastEditedTime,
    targetLastEditedTime: targetPage?.lastEditedTime ?? nowIso(),
    sourceLastHash: buildSideHash(pairState, 'source'),
    targetLastHash: buildSideHash(pairState, 'target'),
    mappingStatus: 'active',
    lastSyncedAt: nowIso(),
    metadata: { pair_state: pairStateToMetadata(pairState) },
  });
}

async function createMappedPeerFromTarget(input: {
  deps: OperatorNotionToolsDeps;
  partnerClientId: string;
  contract: NotionSyncContractRow;
  sourceAccount: NotionAccountRow;
  targetAccount: NotionAccountRow;
  fieldBindings: ValidatedSyncFieldBinding[];
  targetPage: NotionPageSnapshot;
  dryRun: boolean;
  state: SyncRunState;
}): Promise<void> {
  if (!Boolean(input.contract.propagate_create)) {
    input.state.skipped += 1;
    return;
  }

  const createEntries = input.fieldBindings
    .filter((binding) => binding.direction !== 'source_to_target')
    .map((binding) => ({
      field: binding.source_field,
      type: binding.source_type,
      value: buildComparablePropertyValue(binding.target_type, input.targetPage.properties[binding.target_field]),
    }));

  const payload = buildWritablePropertiesPayload(createEntries);
  if (Object.keys(payload).length === 0) {
    input.state.skipped += 1;
    return;
  }

  input.state.created += 1;
  if (input.dryRun) return;

  const created = await input.deps.dispatcher.createPage(
    input.sourceAccount.composio_user_id,
    input.contract.source_data_source_id,
    payload,
  );
  const sourcePage = created.page ?? await safeGetPage(input.deps, input.sourceAccount, created.id);
  const pairState = buildPairState(
    input.fieldBindings,
    sourcePage ?? simulateCreatedPage(created.id, createEntries),
    input.targetPage,
  );
  await upsertNotionSyncRecordMapping(input.deps.db, {
    partnerClientId: input.partnerClientId,
    contractId: input.contract.id,
    sourcePageId: created.id,
    targetPageId: input.targetPage.id,
    sourceLastEditedTime: sourcePage?.lastEditedTime ?? nowIso(),
    targetLastEditedTime: input.targetPage.lastEditedTime,
    sourceLastHash: buildSideHash(pairState, 'source'),
    targetLastHash: buildSideHash(pairState, 'target'),
    mappingStatus: 'active',
    lastSyncedAt: nowIso(),
    metadata: { pair_state: pairStateToMetadata(pairState) },
  });
}

async function loadOrValidateSyncContract(
  deps: OperatorNotionToolsDeps,
  partnerClientId: string,
  args: Record<string, unknown>,
): Promise<SyncContractValidationResult> {
  const contractSlug = normalizeSlug(String(args.contract_slug ?? ''));
  const hasDraftFields = [
    'source_account_slug',
    'target_account_slug',
    'source_data_source_id',
    'target_data_source_id',
    'field_mappings',
  ].some((key) => key in args);

  if (contractSlug && !hasDraftFields) {
    const contract = await getNotionSyncContractBySlug(deps.db, partnerClientId, contractSlug);
    if (!contract) {
      return {
        ok: false,
        errors: [{ code: 'contract_not_found', message: `Contract "${contractSlug}" was not found.`, field: 'contract_slug' }],
        draft: emptySyncContractDraft(contractSlug),
      };
    }
    return loadStoredSyncContractValidation(deps, partnerClientId, contract);
  }

  const draft = parseSyncContractDraftFromArgs(args, { requireContractSlug: Boolean(contractSlug) });
  return validateSyncContractDraft(deps, partnerClientId, draft);
}

async function loadStoredSyncContractValidation(
  deps: OperatorNotionToolsDeps,
  partnerClientId: string,
  contract: NotionSyncContractRow,
): Promise<SyncContractValidationResult> {
  const fields = await listNotionSyncContractFields(deps.db, contract.id);
  return validateSyncContractDraft(deps, partnerClientId, draftFromStoredContract(contract, fields));
}

async function validateSyncContractDraft(
  deps: OperatorNotionToolsDeps,
  partnerClientId: string,
  draft: SyncContractDraft,
): Promise<SyncContractValidationResult> {
  const errors: SyncContractValidationError[] = [];

  if (!draft.contract_slug) {
    errors.push({ code: 'missing_contract_slug', message: 'contract_slug is required.', field: 'contract_slug' });
  }
  if (!draft.source_account_slug) {
    errors.push({ code: 'missing_source_account', message: 'source_account_slug is required.', field: 'source_account_slug' });
  }
  if (!draft.target_account_slug) {
    errors.push({ code: 'missing_target_account', message: 'target_account_slug is required.', field: 'target_account_slug' });
  }
  if (draft.source_account_slug && draft.source_account_slug === draft.target_account_slug) {
    errors.push({
      code: 'duplicate_accounts',
      message: 'source_account_slug and target_account_slug must differ.',
      field: 'target_account_slug',
    });
  }
  if (!draft.source_data_source_id) {
    errors.push({ code: 'missing_source_data_source', message: 'source_data_source_id is required.', field: 'source_data_source_id' });
  }
  if (!draft.target_data_source_id) {
    errors.push({ code: 'missing_target_data_source', message: 'target_data_source_id is required.', field: 'target_data_source_id' });
  }
  if (draft.field_mappings.length === 0) {
    errors.push({ code: 'missing_field_mappings', message: 'At least one field mapping is required.', field: 'field_mappings' });
  }

  const seenSourceFields = new Set<string>();
  const seenTargetFields = new Set<string>();
  for (const field of draft.field_mappings) {
    if (!field.source_field) {
      errors.push({ code: 'missing_source_field', message: 'source_field is required.', field: 'field_mappings' });
    }
    if (!field.target_field) {
      errors.push({ code: 'missing_target_field', message: 'target_field is required.', field: 'field_mappings' });
    }
    if (!SYNC_FIELD_DIRECTION_VALUES.includes(field.direction)) {
      errors.push({
        code: 'invalid_direction',
        message: `direction must be one of: ${SYNC_FIELD_DIRECTION_VALUES.join(', ')}`,
        source_field: field.source_field,
        target_field: field.target_field,
      });
    }
    if (field.source_field && seenSourceFields.has(field.source_field)) {
      errors.push({
        code: 'duplicate_source_field',
        message: `source field "${field.source_field}" is mapped more than once.`,
        source_field: field.source_field,
      });
    }
    if (field.target_field && seenTargetFields.has(field.target_field)) {
      errors.push({
        code: 'duplicate_target_field',
        message: `target field "${field.target_field}" is mapped more than once.`,
        target_field: field.target_field,
      });
    }
    seenSourceFields.add(field.source_field);
    seenTargetFields.add(field.target_field);
  }

  let sourceAccount: NotionAccountRow | undefined;
  let targetAccount: NotionAccountRow | undefined;
  let sourceSchema: NotionDataSourceSchema | undefined;
  let targetSchema: NotionDataSourceSchema | undefined;
  const fieldBindings: ValidatedSyncFieldBinding[] = [];

  if (errors.length === 0) {
    try {
      sourceAccount = await requireActiveAccount(deps, partnerClientId, draft.source_account_slug, { requireSyncEnabled: true });
    } catch (error) {
      errors.push({
        code: 'invalid_source_account',
        message: error instanceof Error ? error.message : String(error),
        field: 'source_account_slug',
      });
    }
    try {
      targetAccount = await requireActiveAccount(deps, partnerClientId, draft.target_account_slug, { requireSyncEnabled: true });
    } catch (error) {
      errors.push({
        code: 'invalid_target_account',
        message: error instanceof Error ? error.message : String(error),
        field: 'target_account_slug',
      });
    }
  }

  if (sourceAccount && targetAccount) {
    try {
      sourceSchema = await deps.dispatcher.getDataSourceSchema(sourceAccount.composio_user_id, draft.source_data_source_id);
    } catch (error) {
      errors.push({
        code: 'source_data_source_inaccessible',
        message: error instanceof Error ? error.message : String(error),
        field: 'source_data_source_id',
      });
    }
    try {
      targetSchema = await deps.dispatcher.getDataSourceSchema(targetAccount.composio_user_id, draft.target_data_source_id);
    } catch (error) {
      errors.push({
        code: 'target_data_source_inaccessible',
        message: error instanceof Error ? error.message : String(error),
        field: 'target_data_source_id',
      });
    }
  }

  if (sourceSchema && targetSchema) {
    for (const field of draft.field_mappings) {
      const sourceProperty = sourceSchema.properties[field.source_field];
      const targetProperty = targetSchema.properties[field.target_field];
      if (!sourceProperty) {
        errors.push({
          code: 'missing_source_property',
          message: `Source field "${field.source_field}" was not found.`,
          source_field: field.source_field,
          target_field: field.target_field,
        });
        continue;
      }
      if (!targetProperty) {
        errors.push({
          code: 'missing_target_property',
          message: `Target field "${field.target_field}" was not found.`,
          source_field: field.source_field,
          target_field: field.target_field,
        });
        continue;
      }
      if (!SUPPORTED_SYNC_FIELD_TYPE_SET.has(sourceProperty.type)) {
        errors.push({
          code: 'unsupported_source_property_type',
          message: `Source field "${field.source_field}" uses unsupported type "${sourceProperty.type}".`,
          source_field: field.source_field,
          target_field: field.target_field,
        });
        continue;
      }
      if (!SUPPORTED_SYNC_FIELD_TYPE_SET.has(targetProperty.type)) {
        errors.push({
          code: 'unsupported_target_property_type',
          message: `Target field "${field.target_field}" uses unsupported type "${targetProperty.type}".`,
          source_field: field.source_field,
          target_field: field.target_field,
        });
        continue;
      }
      if (sourceProperty.type !== targetProperty.type) {
        errors.push({
          code: 'property_type_mismatch',
          message: `Mapped fields "${field.source_field}" and "${field.target_field}" must use the same Notion type.`,
          source_field: field.source_field,
          target_field: field.target_field,
        });
        continue;
      }
      fieldBindings.push({
        ...field,
        source_type: sourceProperty.type as SupportedSyncFieldType,
        target_type: targetProperty.type as SupportedSyncFieldType,
      });
    }
  }

  if (errors.length === 0 && draft.propagate_create) {
    const canCreateTarget = fieldBindings.some(
      (binding) => binding.direction !== 'target_to_source' && binding.target_type === 'title',
    );
    const canCreateSource = fieldBindings.some(
      (binding) => binding.direction !== 'source_to_target' && binding.source_type === 'title',
    );
    if (!canCreateTarget) {
      errors.push({
        code: 'missing_target_title_mapping',
        message: 'propagate_create requires a mapping that can populate the target title field.',
        field: 'field_mappings',
      });
    }
    if (!canCreateSource) {
      errors.push({
        code: 'missing_source_title_mapping',
        message: 'propagate_create requires a mapping that can populate the source title field.',
        field: 'field_mappings',
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    draft,
    ...(sourceAccount ? { source_account: sourceAccount } : {}),
    ...(targetAccount ? { target_account: targetAccount } : {}),
    ...(sourceSchema ? { source_schema: sourceSchema } : {}),
    ...(targetSchema ? { target_schema: targetSchema } : {}),
    ...(fieldBindings.length > 0 ? { field_bindings: fieldBindings } : {}),
  };
}

async function listAllDataSourcesForAccount(
  deps: OperatorNotionToolsDeps,
  account: NotionAccountRow,
): Promise<Array<{ id: string; title: string; url?: string }>> {
  const dataSources: Array<{ id: string; title: string; url?: string }> = [];
  let nextCursor: string | null = null;
  do {
    const response = await deps.dispatcher.listDataSources(account.composio_user_id, {
      page_size: SYNC_PAGE_SIZE,
      ...(nextCursor ? { start_cursor: nextCursor } : {}),
    });
    dataSources.push(...response.data_sources);
    nextCursor = response.has_more ? response.next_cursor : null;
  } while (nextCursor);
  return dedupeDataSources(dataSources);
}

async function queryAllPagesForDataSource(
  deps: OperatorNotionToolsDeps,
  account: NotionAccountRow,
  dataSourceId: string,
): Promise<NotionPageSnapshot[]> {
  const pages: NotionPageSnapshot[] = [];
  let nextCursor: string | null = null;
  do {
    const response = await deps.dispatcher.queryDataSourcePages(account.composio_user_id, dataSourceId, {
      page_size: SYNC_PAGE_SIZE,
      ...(nextCursor ? { start_cursor: nextCursor } : {}),
    });
    pages.push(...response.results);
    nextCursor = response.has_more ? response.next_cursor : null;
  } while (nextCursor);
  return dedupePages(pages);
}

async function resolveMappedPagePresence(
  deps: OperatorNotionToolsDeps,
  account: NotionAccountRow,
  pageId: string,
  page: NotionPageSnapshot | null,
): Promise<{ status: 'active' | 'archived' | 'missing'; page: NotionPageSnapshot | null }> {
  if (page) {
    return { status: page.archived ? 'archived' : 'active', page };
  }
  const fetched = await safeGetPage(deps, account, pageId);
  if (!fetched) return { status: 'missing', page: null };
  return { status: fetched.archived ? 'archived' : 'active', page: fetched };
}

async function safeGetPage(
  deps: OperatorNotionToolsDeps,
  account: NotionAccountRow,
  pageId: string,
): Promise<NotionPageSnapshot | null> {
  try {
    return await deps.dispatcher.getPage(account.composio_user_id, pageId);
  } catch {
    return null;
  }
}

function buildPairState(
  fieldBindings: ValidatedSyncFieldBinding[],
  sourcePage: NotionPageSnapshot,
  targetPage: NotionPageSnapshot,
): SyncPairStateEntry[] {
  return sortFieldMappings(fieldBindings).map((binding) => ({
    key: pairStateKey(binding),
    source_field: binding.source_field,
    target_field: binding.target_field,
    direction: binding.direction,
    source_type: binding.source_type,
    target_type: binding.target_type,
    source_value: buildComparablePropertyValue(binding.source_type, sourcePage.properties[binding.source_field]),
    target_value: buildComparablePropertyValue(binding.target_type, targetPage.properties[binding.target_field]),
  }));
}

function parsePairState(raw: string): Record<string, { source_value: ComparablePropertyValue; target_value: ComparablePropertyValue }> {
  const metadata = parseJsonObject(raw);
  const pairState = metadata.pair_state;
  if (!isPlainObject(pairState)) return {};
  const output: Record<string, { source_value: ComparablePropertyValue; target_value: ComparablePropertyValue }> = {};
  for (const [key, value] of Object.entries(pairState)) {
    if (!isPlainObject(value)) continue;
    output[key] = {
      source_value: (value.source_value ?? null) as ComparablePropertyValue,
      target_value: (value.target_value ?? null) as ComparablePropertyValue,
    };
  }
  return output;
}

function pairStateToMetadata(entries: SyncPairStateEntry[]): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const entry of entries) {
    output[entry.key] = {
      source_field: entry.source_field,
      target_field: entry.target_field,
      direction: entry.direction,
      source_type: entry.source_type,
      target_type: entry.target_type,
      source_value: entry.source_value,
      target_value: entry.target_value,
    };
  }
  return output;
}

function buildSideHash(entries: SyncPairStateEntry[], side: 'source' | 'target'): string {
  const payload = entries.map((entry) => ({
    key: entry.key,
    value: side === 'source' ? entry.source_value : entry.target_value,
  }));
  return stableStringify(payload);
}

function applyTargetUpdatesToPairState(
  entries: SyncPairStateEntry[],
  updates: Array<{ field: string; type: SupportedSyncFieldType; value: ComparablePropertyValue }>,
): SyncPairStateEntry[] {
  const updateMap = new Map(updates.map((entry) => [entry.field, entry.value]));
  return entries.map((entry) =>
    updateMap.has(entry.target_field)
      ? { ...entry, target_value: updateMap.get(entry.target_field) ?? null }
      : entry,
  );
}

function applySourceUpdatesToPairState(
  entries: SyncPairStateEntry[],
  updates: Array<{ field: string; type: SupportedSyncFieldType; value: ComparablePropertyValue }>,
): SyncPairStateEntry[] {
  const updateMap = new Map(updates.map((entry) => [entry.field, entry.value]));
  return entries.map((entry) =>
    updateMap.has(entry.source_field)
      ? { ...entry, source_value: updateMap.get(entry.source_field) ?? null }
      : entry,
  );
}

function dedupeUpdateEntries(
  entries: Array<{ field: string; type: SupportedSyncFieldType; value: ComparablePropertyValue }>,
): Array<{ field: string; type: SupportedSyncFieldType; value: ComparablePropertyValue }> {
  const deduped = new Map<string, { field: string; type: SupportedSyncFieldType; value: ComparablePropertyValue }>();
  for (const entry of entries) {
    deduped.set(entry.field, entry);
  }
  return Array.from(deduped.values());
}

function buildConflictRecord(
  policy: NotionSyncConflictPolicy,
  mapping: NotionSyncRecordMappingRow,
  entry: SyncPairStateEntry,
): SyncRunConflictRecord {
  return {
    source_page_id: mapping.source_page_id,
    target_page_id: mapping.target_page_id,
    source_field: entry.source_field,
    target_field: entry.target_field,
    direction: entry.direction,
    policy,
    source_value: entry.source_value,
    target_value: entry.target_value,
    resolution: policy === 'manual' ? 'manual' : policy,
    message:
      policy === 'manual'
        ? `Manual conflict on ${entry.source_field} <-> ${entry.target_field}.`
        : `Conflict resolved with ${policy}.`,
  };
}

function findFieldBinding(
  bindings: ValidatedSyncFieldBinding[],
  sourceField: string,
  targetField: string,
): ValidatedSyncFieldBinding | undefined {
  return bindings.find((binding) => binding.source_field === sourceField && binding.target_field === targetField);
}

function parseSyncContractDraftFromArgs(
  args: Record<string, unknown>,
  options: { requireContractSlug: boolean },
): SyncContractDraft {
  const contractSlug = normalizeSlug(String(args.contract_slug ?? ''));
  const sourceAccountSlug = normalizeSlug(String(args.source_account_slug ?? ''));
  const targetAccountSlug = normalizeSlug(String(args.target_account_slug ?? ''));
  return {
    contract_slug: contractSlug,
    source_account_slug: sourceAccountSlug,
    target_account_slug: targetAccountSlug,
    source_data_source_id: String(args.source_data_source_id ?? '').trim(),
    target_data_source_id: String(args.target_data_source_id ?? '').trim(),
    enabled: typeof args.enabled === 'boolean' ? args.enabled : true,
    conflict_policy: normalizeConflictPolicy(args.conflict_policy),
    propagate_create: typeof args.propagate_create === 'boolean' ? args.propagate_create : true,
    propagate_update: typeof args.propagate_update === 'boolean' ? args.propagate_update : true,
    propagate_archive: typeof args.propagate_archive === 'boolean' ? args.propagate_archive : true,
    propagate_delete: typeof args.propagate_delete === 'boolean' ? args.propagate_delete : true,
    delete_mode: 'archive',
    metadata: isPlainObject(args.metadata) ? args.metadata : {},
    field_mappings: parseSyncFieldMappings(args.field_mappings),
  };
}

function mergeSyncContractDraft(
  contract: NotionSyncContractRow,
  fields: NotionSyncContractFieldRow[],
  args: Record<string, unknown>,
): SyncContractDraft {
  const draft = draftFromStoredContract(contract, fields);
  return {
    ...draft,
    source_account_slug:
      'source_account_slug' in args ? normalizeSlug(String(args.source_account_slug ?? '')) : draft.source_account_slug,
    target_account_slug:
      'target_account_slug' in args ? normalizeSlug(String(args.target_account_slug ?? '')) : draft.target_account_slug,
    source_data_source_id:
      'source_data_source_id' in args ? String(args.source_data_source_id ?? '').trim() : draft.source_data_source_id,
    target_data_source_id:
      'target_data_source_id' in args ? String(args.target_data_source_id ?? '').trim() : draft.target_data_source_id,
    enabled: typeof args.enabled === 'boolean' ? args.enabled : draft.enabled,
    conflict_policy: 'conflict_policy' in args ? normalizeConflictPolicy(args.conflict_policy) : draft.conflict_policy,
    propagate_create: typeof args.propagate_create === 'boolean' ? args.propagate_create : draft.propagate_create,
    propagate_update: typeof args.propagate_update === 'boolean' ? args.propagate_update : draft.propagate_update,
    propagate_archive:
      typeof args.propagate_archive === 'boolean' ? args.propagate_archive : draft.propagate_archive,
    propagate_delete:
      typeof args.propagate_delete === 'boolean' ? args.propagate_delete : draft.propagate_delete,
    metadata: isPlainObject(args.metadata) ? args.metadata : draft.metadata,
    field_mappings: 'field_mappings' in args ? parseSyncFieldMappings(args.field_mappings) : draft.field_mappings,
  };
}

function draftFromStoredContract(
  contract: NotionSyncContractRow,
  fields: NotionSyncContractFieldRow[],
): SyncContractDraft {
  return {
    contract_slug: contract.contract_slug,
    source_account_slug: contract.source_account_slug,
    target_account_slug: contract.target_account_slug,
    source_data_source_id: contract.source_data_source_id,
    target_data_source_id: contract.target_data_source_id,
    enabled: Boolean(contract.enabled),
    conflict_policy: contract.conflict_policy,
    propagate_create: Boolean(contract.propagate_create),
    propagate_update: Boolean(contract.propagate_update),
    propagate_archive: Boolean(contract.propagate_archive),
    propagate_delete: Boolean(contract.propagate_delete),
    delete_mode: contract.delete_mode,
    metadata: parseJsonObject(contract.metadata_json),
    field_mappings: sortFieldMappings(
      fields.map((field, index) => ({
        source_field: field.source_field,
        target_field: field.target_field,
        direction: field.direction,
        ordinal: field.ordinal ?? index,
        metadata: parseJsonObject(field.metadata_json),
      })),
    ),
  };
}

function emptySyncContractDraft(contractSlug: string): SyncContractDraft {
  return {
    contract_slug: contractSlug,
    source_account_slug: '',
    target_account_slug: '',
    source_data_source_id: '',
    target_data_source_id: '',
    enabled: true,
    conflict_policy: 'manual',
    propagate_create: true,
    propagate_update: true,
    propagate_archive: true,
    propagate_delete: true,
    delete_mode: 'archive',
    metadata: {},
    field_mappings: [],
  };
}

function parseSyncFieldMappings(raw: unknown): SyncContractFieldDraft[] {
  if (!Array.isArray(raw)) return [];
  return sortFieldMappings(
    raw
      .filter((entry): entry is Record<string, unknown> => isPlainObject(entry))
      .map((entry, index) => ({
        source_field: String(entry.source_field ?? '').trim(),
        target_field: String(entry.target_field ?? '').trim(),
        direction: normalizeFieldDirection(entry.direction),
        ordinal: typeof entry.ordinal === 'number' && Number.isFinite(entry.ordinal) ? entry.ordinal : index,
        metadata: isPlainObject(entry.metadata) ? entry.metadata : {},
      })),
  );
}

function normalizeFieldDirection(value: unknown): NotionSyncFieldDirection {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'source_to_target' || raw === 'target_to_source' || raw === 'bidirectional') {
    return raw;
  }
  return 'bidirectional';
}

function normalizeConflictPolicy(value: unknown): NotionSyncConflictPolicy {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'source_wins' || raw === 'target_wins' || raw === 'manual') {
    return raw;
  }
  return 'manual';
}

function sortFieldMappings<T extends { ordinal: number; source_field: string; target_field: string }>(fields: T[]): T[] {
  return [...fields].sort((left, right) => {
    if (left.ordinal !== right.ordinal) return left.ordinal - right.ordinal;
    return `${left.source_field}:${left.target_field}`.localeCompare(`${right.source_field}:${right.target_field}`);
  });
}

function toContractFieldInput(field: SyncContractFieldDraft): NotionSyncContractFieldInput {
  return {
    source_field: field.source_field,
    target_field: field.target_field,
    direction: field.direction,
    ordinal: field.ordinal,
    metadata: field.metadata,
  };
}

function serializeValidationResult(result: SyncContractValidationResult): Record<string, unknown> {
  return {
    ok: result.ok,
    errors: result.errors,
    draft: serializeDraft(result.draft),
    ...(result.source_account ? { source_account: serializeAccount(result.source_account) } : {}),
    ...(result.target_account ? { target_account: serializeAccount(result.target_account) } : {}),
    ...(result.source_schema ? { source_schema: serializeDataSourceSchema(result.source_schema) } : {}),
    ...(result.target_schema ? { target_schema: serializeDataSourceSchema(result.target_schema) } : {}),
    ...(result.field_bindings
      ? {
          field_bindings: result.field_bindings.map((binding) => ({
            source_field: binding.source_field,
            target_field: binding.target_field,
            direction: binding.direction,
            source_type: binding.source_type,
            target_type: binding.target_type,
          })),
        }
      : {}),
  };
}

function serializeDraft(draft: SyncContractDraft): Record<string, unknown> {
  return {
    contract_slug: draft.contract_slug,
    source_account_slug: draft.source_account_slug,
    target_account_slug: draft.target_account_slug,
    source_data_source_id: draft.source_data_source_id,
    target_data_source_id: draft.target_data_source_id,
    enabled: draft.enabled,
    match_strategy: 'mapping_table',
    conflict_policy: draft.conflict_policy,
    propagate_create: draft.propagate_create,
    propagate_update: draft.propagate_update,
    propagate_archive: draft.propagate_archive,
    propagate_delete: draft.propagate_delete,
    delete_mode: draft.delete_mode,
    metadata: draft.metadata,
    field_mappings: draft.field_mappings.map((field) => ({
      source_field: field.source_field,
      target_field: field.target_field,
      direction: field.direction,
      ordinal: field.ordinal,
      metadata: field.metadata,
    })),
  };
}

function serializeContractSummary(
  contract: NotionSyncContractSummaryRow,
  options?: { fields?: NotionSyncContractFieldRow[]; runs?: NotionSyncRunRow[] },
): Record<string, unknown> {
  return {
    contract_slug: contract.contract_slug,
    source_account_slug: contract.source_account_slug,
    target_account_slug: contract.target_account_slug,
    source_data_source_id: contract.source_data_source_id,
    target_data_source_id: contract.target_data_source_id,
    enabled: Boolean(contract.enabled),
    match_strategy: contract.match_strategy,
    conflict_policy: contract.conflict_policy,
    propagate_create: Boolean(contract.propagate_create),
    propagate_update: Boolean(contract.propagate_update),
    propagate_archive: Boolean(contract.propagate_archive),
    propagate_delete: Boolean(contract.propagate_delete),
    delete_mode: contract.delete_mode,
    metadata: parseJsonObject(contract.metadata_json),
    created_at: contract.created_at,
    updated_at: contract.updated_at,
    last_run_status: contract.last_run_status,
    last_run_time: contract.last_run_time,
    recent_conflict_count: contract.recent_conflict_count,
    recent_error_count: contract.recent_error_count,
    ...(options?.fields
      ? {
          field_mappings: options.fields.map((field) => ({
            source_field: field.source_field,
            target_field: field.target_field,
            direction: field.direction,
            ordinal: field.ordinal,
            metadata: parseJsonObject(field.metadata_json),
          })),
        }
      : {}),
    ...(options?.runs ? { recent_runs: options.runs.map((run) => serializeSyncRun(run)) } : {}),
  };
}

function serializeSyncRun(
  run: NotionSyncRunRow,
  options?: {
    overrideCounts?: { created: number; updated: number; archived: number; conflicted: number; skipped: number };
    errorDetails?: unknown[];
    conflictDetails?: unknown[];
  },
): Record<string, unknown> {
  const errors = options?.errorDetails ?? safeJsonArray(run.errors_json);
  const conflicts = options?.conflictDetails ?? safeJsonArray(run.conflicts_json);
  return {
    run_id: run.id,
    contract_slug: run.contract_slug,
    status: run.status,
    dry_run: Boolean(run.dry_run),
    started_at: run.started_at,
    ended_at: run.ended_at,
    created: options?.overrideCounts?.created ?? run.created_count,
    updated: options?.overrideCounts?.updated ?? run.updated_count,
    archived: options?.overrideCounts?.archived ?? run.archived_count,
    conflicted: options?.overrideCounts?.conflicted ?? run.conflicted_count,
    skipped: options?.overrideCounts?.skipped ?? run.skipped_count,
    errors: Array.isArray(errors) ? errors.length : run.error_count,
    error_details: errors,
    conflict_details: conflicts,
    metadata: parseJsonObject(run.metadata_json),
  };
}

function serializeDataSourceSummary(dataSource: { id: string; title: string; url?: string }): Record<string, unknown> {
  return {
    id: dataSource.id,
    title: dataSource.title,
    ...(dataSource.url ? { url: dataSource.url } : {}),
  };
}

function serializeDataSourceSchema(schema: NotionDataSourceSchema): Record<string, unknown> {
  return {
    data_source_id: schema.dataSourceId,
    title: schema.title,
    properties: Object.values(schema.properties)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((property) => ({
        id: property.id,
        name: property.name,
        type: property.type,
        supported: property.supported,
      })),
  };
}

function dedupeDataSources(dataSources: Array<{ id: string; title: string; url?: string }>): Array<{ id: string; title: string; url?: string }> {
  const byId = new Map<string, { id: string; title: string; url?: string }>();
  for (const dataSource of dataSources) {
    if (!dataSource.id) continue;
    byId.set(dataSource.id, dataSource);
  }
  return Array.from(byId.values()).sort((left, right) => left.title.localeCompare(right.title));
}

function dedupePages(pages: NotionPageSnapshot[]): NotionPageSnapshot[] {
  const byId = new Map<string, NotionPageSnapshot>();
  for (const page of pages) {
    byId.set(page.id, page);
  }
  return Array.from(byId.values());
}

function simulateCreatedPage(
  pageId: string,
  entries: Array<{ field: string; type: SupportedSyncFieldType; value: ComparablePropertyValue }>,
): NotionPageSnapshot {
  const properties: Record<string, unknown> = {};
  for (const entry of entries) {
    properties[entry.field] = buildWritablePropertiesPayload([entry])[entry.field];
  }
  return {
    id: pageId,
    archived: false,
    lastEditedTime: nowIso(),
    properties,
    raw: { id: pageId, properties },
  };
}

function pairStateKey(field: { source_field: string; target_field: string; direction: NotionSyncFieldDirection }): string {
  return `${field.source_field}=>${field.target_field}::${field.direction}`;
}

function valuesEqual(left: ComparablePropertyValue, right: ComparablePropertyValue): boolean {
  return stableStringify(left) === stableStringify(right);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
}

function safeJsonArray(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildAccountWizardQuestions(missing: string[], deps: OperatorNotionToolsDeps): string[] {
  const questions: string[] = [];
  for (const field of missing) {
    if (field === 'account_slug') {
      questions.push('What internal workspace slug should be used? (example: halfdozen, blondish, c3)');
    } else if (field === 'auth_config_id') {
      questions.push(
        `Which Notion auth config ID should be used? (default from deployment: ${deps.notionAuthConfigId ?? 'not configured'})`,
      );
    }
  }
  return questions;
}

function mentionsAny(lower: string, phrases: string[]): boolean {
  return phrases.some((phrase) => lower.includes(phrase));
}

function extractAccountSlug(request: string): string | null {
  const slugMatch = request.match(/\bslug\s*(?:is|=|:)?\s*["'`]?([a-zA-Z0-9_-]{2,64})["'`]?/i);
  if (slugMatch?.[1]) {
    return normalizeSlug(slugMatch[1]);
  }
  const workspaceMatch = request.match(/\bworkspace\s*(?:named|name|called)\s*["'`]?([a-zA-Z0-9_-]{2,64})["'`]?/i);
  if (workspaceMatch?.[1]) {
    return normalizeSlug(workspaceMatch[1]);
  }
  return null;
}

function extractDisplayLabel(request: string): string | null {
  const labelMatch = request.match(/\b(?:display\s*name|name|label)\s*(?:is|=|:)?\s*["']([^"']{2,120})["']/i);
  if (labelMatch?.[1]) return labelMatch[1].trim();
  const unquotedDisplayName = request.match(/\bdisplay\s*name\s*(?:is|=|:)?\s*([a-zA-Z0-9][a-zA-Z0-9 _:-]{1,120})/i);
  if (unquotedDisplayName?.[1]) {
    return unquotedDisplayName[1].trim().replace(/[.,;!?]+$/, '');
  }
  return null;
}

function extractPinToolName(request: string, deps: OperatorNotionToolsDeps): string | null {
  const lower = request.toLowerCase();
  if (lower.includes('halfdozen_notion') || lower.includes('half dozen')) return deps.pinnedHalfdozenToolName;
  if (lower.includes('blondish_notion') || lower.includes('blond:ish') || lower.includes('blondish')) {
    return deps.pinnedClientToolName;
  }
  return null;
}

async function requirePartnerClient(deps: OperatorNotionToolsDeps) {
  const cacheKey = `${deps.partnerKey}::${deps.partnerClientSlug}`;
  const cached = getTimedCache(partnerClientCache, cacheKey);
  if (cached) return { client: cached };

  const client = await getPartnerClient(deps.db, deps.partnerKey, deps.partnerClientSlug);
  if (!client) {
    throw new Error(`Partner client "${deps.partnerClientSlug}" is not configured.`);
  }
  setTimedCache(partnerClientCache, cacheKey, client, PARTNER_CLIENT_CACHE_TTL_MS, PARTNER_CACHE_MAX_ENTRIES);
  return { client };
}

async function getCachedPinForTool(db: D1Database, partnerClientId: string, toolName: string): Promise<NotionPinRow | null> {
  const cacheKey = `${partnerClientId}::${toolName}`;
  const cached = getTimedCache(partnerPinCache, cacheKey);
  if (cached !== undefined) return cached;

  const pin = await getPinForTool(db, partnerClientId, toolName);
  setTimedCache(partnerPinCache, cacheKey, pin, PARTNER_PIN_CACHE_TTL_MS, PARTNER_CACHE_MAX_ENTRIES);
  return pin;
}

function invalidatePartnerPinCache(partnerClientId: string, toolName: string): void {
  const cacheKey = `${partnerClientId}::${toolName}`;
  partnerPinCache.delete(cacheKey);
}

async function syncAllAccounts(deps: OperatorNotionToolsDeps, partnerClientId: string): Promise<NotionAccountRow[]> {
  const accounts = await listNotionAccounts(deps.db, partnerClientId);
  return Promise.all(
    accounts.map((account) =>
      refreshNotionAccountState(deps.db, deps.composio, account, { minIntervalMs: LIST_ACCOUNTS_REFRESH_TTL_MS }),
    ),
  );
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
  if (account.status !== 'active') {
    throw new Error(`Account "${accountSlug}" is ${account.status}.`);
  }
  if (options.requireSyncEnabled && !Boolean(account.sync_enabled)) {
    throw new Error(`Account "${accountSlug}" is not enabled for sync jobs.`);
  }

  const refreshed = await refreshNotionAccountState(deps.db, deps.composio, account, { minIntervalMs: ACTIVE_ACCOUNT_REFRESH_TTL_MS });
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

function normalizePinToolName(value: unknown, deps: OperatorNotionToolsDeps): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (raw === deps.pinnedHalfdozenToolName || raw === deps.pinnedClientToolName) return raw;
  const lower = raw.toLowerCase();
  if (lower === 'halfdozen' || lower === 'halfdozen_notion' || lower === 'half-dozen') {
    return deps.pinnedHalfdozenToolName;
  }
  if (lower === 'blondish' || lower === 'blondish_notion' || lower === 'blond:ish') {
    return deps.pinnedClientToolName;
  }
  return null;
}

async function loadAgentsSdk(): Promise<AgentsSdk> {
  if (agentsSdkPromise) return agentsSdkPromise;

  // Force browser branch under nodejs_compat before SDK module initialization.
  const runtimeProcess = (globalThis as { process?: { browser?: boolean; type?: string } }).process;
  if (runtimeProcess) {
    runtimeProcess.browser = true;
    runtimeProcess.type = runtimeProcess.type ?? 'renderer';
  }

  agentsSdkPromise = import('@openai/agents');
  return agentsSdkPromise;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function buildRouterAgentPrompt(
  request: string,
  context: Record<string, unknown>,
  deps: OperatorNotionToolsDeps,
): string {
  const slimContext = {
    account_slug: normalizeSlug(String(context.account_slug ?? '')) || undefined,
    display_label: sanitizeDisplayLabel(context.display_label),
    pin_tool_name: normalizePinToolName(context.pin_tool_name, deps) ?? undefined,
  };

  return [
    'Classify this operator request into one allowed intent and extract optional fields.',
    `Pinned tools: ${deps.pinnedHalfdozenToolName}, ${deps.pinnedClientToolName}.`,
    `Request: ${request}`,
    `Context: ${JSON.stringify(slimContext)}`,
    'Return JSON only.',
  ].join('\n');
}

function parseRouterAgentDecision(output: unknown, deps: OperatorNotionToolsDeps): RouterAgentDecision | null {
  const parsedPayload = parseJsonObjectFromUnknown(output);
  if (!parsedPayload) return null;

  const parsed = routerAgentDecisionSchema.safeParse(parsedPayload);
  if (!parsed.success) return null;

  const accountSlug = normalizeSlug(parsed.data.account_slug ?? '');
  const displayLabel = sanitizeDisplayLabel(parsed.data.display_label);
  const pinToolName = normalizePinToolName(parsed.data.pin_tool_name, deps);

  return {
    intent: parsed.data.intent,
    ...(accountSlug ? { account_slug: accountSlug } : {}),
    ...(displayLabel ? { display_label: displayLabel } : {}),
    ...(pinToolName ? { pin_tool_name: pinToolName } : {}),
  };
}

function parseJsonObjectFromUnknown(value: unknown): Record<string, unknown> | null {
  if (isPlainObject(value)) return value;
  if (typeof value !== 'string') return null;

  const trimmed = stripCodeFence(value).trim();
  const parsed = parseJsonCandidate(trimmed);
  if (parsed) return parsed;

  const jsonBlock = trimmed.match(/\{[\s\S]*\}/);
  if (jsonBlock?.[0]) return parseJsonCandidate(jsonBlock[0]);
  return null;
}

function stripCodeFence(value: string): string {
  return value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

function parseJsonCandidate(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function sanitizeDisplayLabel(value: unknown): string | undefined {
  const label = String(value ?? '').trim();
  if (!label) return undefined;
  return label.slice(0, 120);
}

function getTimedCache<T>(cache: Map<string, TimedCacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setTimedCache<T>(
  cache: Map<string, TimedCacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
  maxEntries: number,
): void {
  if (cache.size >= maxEntries) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + Math.max(5_000, ttlMs) });
}

function buildRouterCacheKey(
  request: string,
  context: Record<string, unknown>,
  deps: OperatorNotionToolsDeps,
): string {
  const contextKey = JSON.stringify({
    account_slug: normalizeSlug(String(context.account_slug ?? '')) || null,
    display_label: sanitizeDisplayLabel(context.display_label) ?? null,
    pin_tool_name: normalizePinToolName(context.pin_tool_name, deps) ?? null,
  });
  const model = deps.routerOpenAiModel?.trim() || ROUTER_DEFAULT_OPENAI_MODEL;
  return `${model}::${request.trim().toLowerCase()}::${contextKey}`;
}

function getCachedRouterDecision(key: string): RouterAgentDecision | null {
  const cached = routerDecisionCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    routerDecisionCache.delete(key);
    return null;
  }
  return cached.decision;
}

function setCachedRouterDecision(key: string, decision: RouterAgentDecision, ttlMs: number): void {
  if (routerDecisionCache.size >= ROUTER_CACHE_MAX_ENTRIES) {
    const oldest = routerDecisionCache.keys().next().value;
    if (oldest) routerDecisionCache.delete(oldest);
  }
  routerDecisionCache.set(key, { decision, expiresAt: Date.now() + Math.max(5_000, ttlMs) });
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
