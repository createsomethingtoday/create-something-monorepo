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
  renameNotionAccountLabel,
  recordNotionEvent,
  refreshNotionAccountState,
  setNotionPin,
  setSyncEnabled,
  upsertNotionAccount,
  type NotionAccountRow,
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
  | 'list_accounts'
  | 'get_status'
  | 'rename_account'
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
    'wizard',
    'list_accounts',
    'get_status',
    'rename_account',
    'create_connect_link',
    'disable_account',
    'pin_account',
    'set_sync_enabled',
  ]),
  args: z.record(z.unknown()).default({}),
};

const syncToolSchema = {
  action: z.enum(['preview_page_content', 'copy_page_content']),
  source_account_slug: z.string(),
  target_account_slug: z.string(),
  source_page_id: z.string(),
  target_page_id: z.string(),
};

const routerToolSchema = {
  request: z.string(),
  context: z.record(z.unknown()).optional(),
};

const routerAgentDecisionSchema = z.object({
  intent: z.enum(['wizard', 'list_accounts', 'get_status', 'rename_account', 'pin_account', 'sync_guidance', 'help']),
  account_slug: z.string().optional(),
  display_label: z.string().optional(),
  pin_tool_name: z.string().optional(),
});

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
    'Manage operator-bound Notion accounts, including onboarding, display-label renames, and connect-link/API-key flow.',
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
    case 'rename_account': {
      const accountSlug = normalizeSlug(String(args.account_slug ?? ''));
      const displayLabel = sanitizeDisplayLabel(args.display_label);
      if (!accountSlug) throw new Error('args.account_slug is required');
      if (!displayLabel) throw new Error('args.display_label is required');
      const account = await requireAccount(deps.db, client.id, accountSlug);
      if (account.display_label === displayLabel) {
        return toJsonResult({
          ok: true,
          action,
          renamed: false,
          account: serializeAccount(account),
        });
      }
      await renameNotionAccountLabel(deps.db, account.id, displayLabel);
      const renamedAccount = await requireAccount(deps.db, client.id, accountSlug);
      await recordNotionEvent(deps.db, {
        partnerClientId: client.id,
        accountSlug,
        eventType: 'account_renamed',
        actor,
        metadata: {
          previous_display_label: account.display_label,
          display_label: renamedAccount.display_label,
        },
      });
      return toJsonResult({
        ok: true,
        action,
        renamed: true,
        account: serializeAccount(renamedAccount),
      });
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

async function runAccountsWizard(
  args: Record<string, unknown>,
  deps: OperatorNotionToolsDeps,
  partnerClientId: string,
  actor: string,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const accountSlug = normalizeSlug(String(args.account_slug ?? ''));
  const displayLabel = String(args.display_label ?? '').trim();
  const authConfigId = String(args.auth_config_id ?? deps.notionAuthConfigId ?? '').trim();
  const syncEnabled = typeof args.sync_enabled === 'boolean' ? args.sync_enabled : true;
  const metadata = isPlainObject(args.metadata) ? args.metadata : {};
  const pinToolName = String(args.pin_tool_name ?? '').trim();

  const missing: string[] = [];
  if (!accountSlug) missing.push('account_slug');
  if (!displayLabel) missing.push('display_label');
  if (!authConfigId) missing.push('auth_config_id');

  if (missing.length > 0) {
    return toJsonResult({
      ok: true,
      action: 'wizard',
      status: 'needs_input',
      next_questions: buildAccountWizardQuestions(missing, deps),
      instructions: [
        'Provide workspace slug and display label first.',
        'If auth_config_id is omitted, deployment default COMPOSIO_NOTION_AUTH_CONFIG_ID is used.',
      ],
    });
  }

  const composioUserId = `hd_notion_${deps.partnerClientSlug.replace(/-/g, '_')}_${accountSlug.replace(/-/g, '_')}`;
  await upsertNotionAccount(deps.db, {
    partnerClientId,
    accountSlug,
    displayLabel,
    composioUserId,
    authConfigId,
    syncEnabled,
    metadata: { ...metadata, created_via: 'operator_notion_accounts_wizard' },
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
      'I can help with: connect workspace, check account status, list accounts, and pin workspace tools. Tell me which one you want.',
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

  if (mentionsAny(lower, ['rename', 'relabel', 'change label', 'change display name', 'rename label'])) {
    return runRouterIntent('rename_account', mergedArgs, deps);
  }

  if (mentionsAny(lower, ['status', 'active', 'connected'])) {
    return runRouterIntent('get_status', mergedArgs, deps);
  }

  if (mentionsAny(lower, ['pin ', 'set pinned', 'use for halfdozen', 'use for blondish', 'pin workspace'])) {
    return runRouterIntent('pin_account', mergedArgs, deps);
  }

  if (mentionsAny(lower, ['sync', 'workflow'])) {
    return runRouterIntent('sync_guidance', mergedArgs, deps);
  }

  if (mentionsAny(lower, ['connect', 'add workspace', 'new workspace', 'api key', 'onboard'])) {
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

  if (intent === 'rename_account') {
    const slug = normalizeSlug(String(mergedArgs.account_slug ?? ''));
    const displayLabel = sanitizeDisplayLabel(mergedArgs.display_label);
    if (!slug || !displayLabel) {
      return toJsonResult({
        ok: true,
        action: 'router',
        intent: 'rename_account',
        status: 'needs_input',
        next_questions: [
          'Which account_slug should be renamed?',
          'What should the new display_label be?',
        ],
      });
    }
    return runAccountsTool('rename_account', { account_slug: slug, display_label: displayLabel }, deps);
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
        'Use operator_notion_accounts wizard to connect workspaces first. After connection, choose workflow/sync via available Notion tools.',
      next_actions: [
        { tool: 'operator_notion_accounts', action: 'wizard', args: mergedArgs },
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
      'I can help with: connect workspace, rename workspace labels, check account status, list accounts, and pin workspace tools. Tell me which one you want.',
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
        'Allowed intents: wizard, list_accounts, get_status, rename_account, pin_account, sync_guidance, help.',
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

function buildAccountWizardQuestions(missing: string[], deps: OperatorNotionToolsDeps): string[] {
  const questions: string[] = [];
  for (const field of missing) {
    if (field === 'account_slug') {
      questions.push('What internal workspace slug should be used? (example: halfdozen, blondish, c3)');
    } else if (field === 'display_label') {
      questions.push('What display name should this workspace use? (example: Half Dozen Workspace)');
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

export function extractAccountSlug(request: string): string | null {
  const slugMatch = request.match(/\bslug\s*(?:is|=|:)?\s*["'`]?([a-zA-Z0-9_-]{2,64})["'`]?/i);
  if (slugMatch?.[1]) {
    return normalizeSlug(slugMatch[1]);
  }
  const renameWorkspaceMatch = request.match(
    /\b(?:rename|relabel|change\s+(?:the\s+)?(?:label|display\s*name|name))\s+workspace\s+["'`]?([a-zA-Z0-9_-]{2,64})["'`]?/i,
  );
  if (renameWorkspaceMatch?.[1]) {
    return normalizeSlug(renameWorkspaceMatch[1]);
  }
  const workspaceMatch = request.match(/\bworkspace\s*(?:named|name|called)\s*["'`]?([a-zA-Z0-9_-]{2,64})["'`]?/i);
  if (workspaceMatch?.[1]) {
    return normalizeSlug(workspaceMatch[1]);
  }
  return null;
}

export function extractDisplayLabel(request: string): string | null {
  const renameToMatch = request.match(
    /\b(?:rename|relabel|change\s+(?:the\s+)?(?:label|display\s*name|name))\b[\s\S]*?\bto\s*["']([^"']{2,120})["']/i,
  );
  if (renameToMatch?.[1]) return renameToMatch[1].trim();
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
