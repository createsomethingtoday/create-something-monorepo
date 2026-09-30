/** Local operator command. Never import this module in the Worker. */
import { execFile as execFileCallback } from 'node:child_process';
import { open } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Data, Effect } from 'effect';
import { recoverStaleLinked, type LinkedAttempt, type RecoveryPorts, type RecoveryEvidence,
  type AccountRecord, type AccountScan, type ScanKind, type DeploymentReceipt } from './linked-recovery.ts';

const execFile = promisify(execFileCallback);
const workerDirectory = dirname(fileURLToPath(import.meta.url));
const config = resolve(workerDirectory, 'wrangler.toml');
const database = 'gigi-connector-consent';
const endpoint = 'https://backend.composio.dev/api/v3.1/connected_accounts';
const ACCOUNT = '9645bd52e640b8a4f40a3a55ff1dd75a';
const VERSION = 'e6c10c86-94ae-44ae-9a2d-7fdd8fc9fc90';

/** Infisical may inject a scoped API token that gives D1 error 7403. Use ambient Wrangler OAuth only. */
function wranglerEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.CLOUDFLARE_API_TOKEN;
  delete env.CF_API_TOKEN;
  delete env.CLOUDFLARE_API_KEY;
  delete env.CLOUDFLARE_EMAIL;
  return env;
}
async function wrangler(args: string[]): Promise<string> {
  const { stdout } = await execFile(process.env.GIGI_WRANGLER_BIN || 'wrangler', args,
    { cwd: workerDirectory, env: wranglerEnvironment(), maxBuffer: 2 * 1024 * 1024 });
  return stdout;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_remote_object');
  return value as Record<string, unknown>;
}
async function verifyWranglerAccount(): Promise<void> {
  const who = object(JSON.parse(await wrangler(['whoami', '--json'])));
  if (who.loggedIn !== true || who.authType !== 'OAuth Token' || !Array.isArray(who.accounts) ||
    !who.accounts.some((entry: unknown) => object(entry).id === ACCOUNT))
    throw new Error('wrangler_oauth_account_unverified');
}
function quote(value: string | number): string {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('invalid_sql_number');
    return String(value);
  }
  return "'" + value.replaceAll("'", "''") + "'";
}
function d1Rows(raw: string): { results: Record<string, unknown>[]; changes: number } {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length !== 1) throw new Error('d1_invalid_result');
  const entry = object(parsed[0]);
  if (entry.success !== true || !Array.isArray(entry.results)) throw new Error('d1_invalid_result');
  const changes = object(entry.meta).changes;
  if (typeof changes !== 'number' || !Number.isSafeInteger(changes)) throw new Error('d1_missing_changes');
  return { results: entry.results.map(object), changes };
}
async function d1(sql: string): Promise<{ results: Record<string, unknown>[]; changes: number }> {
  await verifyWranglerAccount();
  return d1Rows(await wrangler(['d1', 'execute', database, '--config', config, '--remote',
    '--yes', '--json', '--command', sql]));
}
function exactRow(value: Record<string, unknown>): LinkedAttempt {
  const fields = ['subject', 'provider', 'request_id', 'status', 'connected_account_id',
    'reconnectable', 'redirect_url', 'expires_at', 'created_at'];
  if (fields.some((field) => !(field in value))) throw new Error('d1_incomplete_row');
  return value as unknown as LinkedAttempt;
}
function account(value: unknown): AccountRecord {
  const item = object(value);
  const auth = object(item.auth_config);
  if (typeof item.id !== 'string' || typeof item.user_id !== 'string' || typeof auth.id !== 'string')
    throw new Error('composio_account_invalid');
  return { id: item.id, user_id: item.user_id, auth_config: { id: auth.id } };
}
function binding(bindings: unknown, name: string): Record<string, unknown> {
  if (!Array.isArray(bindings)) throw new Error('wrangler_bindings_invalid');
  const matches = bindings.map(object).filter((entry) => entry.name === name);
  if (matches.length !== 1) throw new Error('wrangler_binding_missing_or_duplicate');
  return matches[0]!;
}
async function readDeployment(createdAt: string): Promise<DeploymentReceipt> {
  await verifyWranglerAccount();
  const source = await execFile('git', ['show', '1e0decc916:packages/gigi-integrations/worker/wrangler.toml'],
    { cwd: resolve(workerDirectory, '../../..'), maxBuffer: 128 * 1024 });
  if (!/^GIGI_GMAIL_AUTH_CONFIG_ID = "ac_s2YEkh21bMT8"$/mu.test(source.stdout) ||
    !/^GIGI_GMAIL_APPROVED_SCOPES = "https:\/\/www\.googleapis\.com\/auth\/gmail\.readonly"$/mu.test(source.stdout))
    throw new Error('historical_committed_source_unverified');
  const deployments: unknown = JSON.parse(await wrangler(['deployments', 'list', '--name', 'gigi-connector', '--json']));
  if (!Array.isArray(deployments) || deployments.length === 0 || deployments.length >= 10)
    throw new Error('deployment_history_incomplete');
  const entries = deployments.map(object).sort((a, b) => Date.parse(String(a.created_on)) - Date.parse(String(b.created_on)));
  const attemptTime = Date.parse(createdAt);
  if (!Number.isFinite(attemptTime) || entries.some((entry) => !Number.isFinite(Date.parse(String(entry.created_on)))))
    throw new Error('deployment_timestamp_invalid');
  const selected = entries.filter((entry) => Date.parse(String(entry.created_on)) <= attemptTime).at(-1);
  if (!selected || selected.id !== '2c9066a0-b7a5-4f1d-a7c7-d1c3b420f027')
    throw new Error('deployment_at_creation_unverified');
  const versions = selected.versions;
  if (!Array.isArray(versions) || versions.length !== 1 || object(versions[0]).version_id !== VERSION ||
    object(versions[0]).percentage !== 100) throw new Error('deployment_percentage_unverified');
  const version = object(JSON.parse(await wrangler(['versions', 'view', VERSION, '--name', 'gigi-connector', '--json'])));
  if (version.id !== VERSION) throw new Error('deployment_version_unverified');
  const bindings = object(version.resources).bindings;
  return {
    accountId: ACCOUNT, deploymentId: String(selected.id), deployedAt: String(selected.created_on),
    versionId: VERSION, percentage: 100,
    gmailConfigId: String(binding(bindings, 'GIGI_GMAIL_AUTH_CONFIG_ID').text),
    gmailScopes: String(binding(bindings, 'GIGI_GMAIL_APPROVED_SCOPES').text),
    databaseId: String(binding(bindings, 'DB').database_id),
    completeHistory: true, coversAttemptCreation: true,
  };
}
async function scanAccounts(kind: ScanKind, owner: string, oldConfig: string, headers: Record<string, string>): Promise<AccountScan> {
  let cursor: string | null = null;
  let pages = 0;
  const items: AccountRecord[] = [];
  const seen = new Set<string>();
  do {
    if (++pages > 100) throw new Error('composio_scan_page_limit');
    const url = new URL(endpoint);
    url.searchParams.set('limit', '100');
    if (kind === 'owner' || kind === 'combined') url.searchParams.set('user_ids', owner);
    if (kind === 'old_config' || kind === 'combined') url.searchParams.set('auth_config_ids', oldConfig);
    if (cursor) url.searchParams.set('cursor', cursor);
    const response = await fetch(url, { method: 'GET', headers, redirect: 'manual', signal: AbortSignal.timeout(8_000) });
    if (response.status !== 200) return { status: response.status, items, complete: false, pages };
    const body = object(await response.json());
    if (!Array.isArray(body.items) || body.items.length > 100 ||
      (body.next_cursor !== null && (typeof body.next_cursor !== 'string' || !body.next_cursor)))
      throw new Error('composio_list_invalid');
    items.push(...body.items.map(account));
    cursor = body.next_cursor as string | null;
    if (cursor) {
      if (seen.has(cursor)) throw new Error('composio_cursor_cycle');
      seen.add(cursor);
    }
  } while (cursor);
  return { status: 200, items, complete: true, pages };
}
export function makeOperatorPorts(apiKey: string): RecoveryPorts {
  if (!apiKey) throw new Error('COMPOSIO_API_KEY missing; run under approved Infisical project');
  const headers = { 'x-api-key': apiKey, accept: 'application/json' };
  return {
    now: () => Date.now(),
    wait: (ms) => new Promise((done) => setTimeout(done, ms)),
    async readReviewedTarget(accountId) {
      if (accountId !== 'ca_lb1WbyU07_b-') throw new Error('unreviewed_target');
      const response = await d1('SELECT subject, provider, request_id, status, connected_account_id, reconnectable, redirect_url, expires_at, created_at FROM gigi_connection_attempts WHERE connected_account_id = ' + quote(accountId));
      if (response.results.length > 1) throw new Error('reviewed_target_not_unique');
      return response.results[0] ? exactRow(response.results[0]) : null;
    },
    async readAttempt(subject, provider, requestId) {
      const sql = 'SELECT subject, provider, request_id, status, connected_account_id, reconnectable, redirect_url, expires_at, created_at FROM gigi_connection_attempts WHERE subject = ' +
        quote(subject) + ' AND provider = ' + quote(provider) + ' AND request_id = ' + quote(requestId);
      const response = await d1(sql);
      if (response.results.length > 1) throw new Error('d1_duplicate_primary_key');
      return response.results[0] ? exactRow(response.results[0]) : null;
    },
    async getAccount(accountId) {
      const response = await fetch(endpoint + '/' + encodeURIComponent(accountId), {
        method: 'GET', headers, redirect: 'manual', signal: AbortSignal.timeout(8_000),
      });
      if (response.status !== 200) return { status: response.status };
      return { status: 200, account: account(await response.json()) };
    },
    async getAuthConfig(authConfigId) {
      const response = await fetch('https://backend.composio.dev/api/v3.1/auth_configs/' + encodeURIComponent(authConfigId), {
        method: 'GET', headers, redirect: 'manual', signal: AbortSignal.timeout(8_000),
      });
      if (response.status !== 200) return { status: response.status };
      const value = object(await response.json());
      const toolkit = object(value.toolkit);
      const credentials = object(value.credentials);
      const rawScopes = credentials.scopes;
      const scopes = Array.isArray(rawScopes) && rawScopes.every((scope) => typeof scope === 'string') ?
        rawScopes as string[] : typeof rawScopes === 'string' ? rawScopes.split(',').map((scope) => scope.trim()) : undefined;
      return { status: 200, id: String(value.id), toolkitSlug: String(toolkit.slug),
        authScheme: String(value.auth_scheme), isComposioManaged: value.is_composio_managed === true,
        state: String(value.status), scopes };
    },
    scanAccounts: (kind, owner, oldConfig) => scanAccounts(kind, owner, oldConfig, headers),
    readDeployment,
    async conditionalUpdate(sql, values) {
      let offset = 0;
      const rendered = sql.replaceAll('?', () => quote(values[offset++]!));
      if (offset !== values.length) throw new Error('sql_binding_mismatch');
      return { changes: (await d1(rendered)).changes };
    },
  };
}
function args(argv: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index++) {
    const name = argv[index]!;
    if (name === '--apply') { result.apply = true; continue; }
    if (name === '--reviewed-target') { result.reviewedTarget = true; continue; }
    if (!['--subject', '--provider', '--request-id', '--account-id', '--old-auth-config-id', '--operator', '--reason', '--evidence'].includes(name) ||
      !argv[index + 1] || argv[index + 1]!.startsWith('--')) throw new Error('invalid_arguments');
    result[name.slice(2)] = argv[++index]!;
  }
  const required = result.reviewedTarget === true ? ['operator', 'reason', 'evidence'] :
    ['subject', 'provider', 'request-id', 'account-id', 'old-auth-config-id', 'operator', 'reason', 'evidence'];
  if (result.reviewedTarget === true &&
    ['subject', 'provider', 'request-id', 'account-id', 'old-auth-config-id'].some((name) => name in result))
    throw new Error('reviewed_target_arguments_conflict');
  for (const name of required)
    if (typeof result[name] !== 'string') throw new Error('missing_' + name);
  return result;
}
export async function runOperatorCommand(argv: string[], injectedPorts?: RecoveryPorts) {
  const input = args(argv);
  const recoveryInput = {
    subject: input.reviewedTarget === true ? '' : input.subject as string,
    provider: (input.reviewedTarget === true ? 'gmail' : input.provider) as LinkedAttempt['provider'],
    requestId: input.reviewedTarget === true ? '' : input['request-id'] as string,
    accountId: input.reviewedTarget === true ? 'ca_lb1WbyU07_b-' : input['account-id'] as string,
    oldAuthConfigId: input.reviewedTarget === true ? 'ac_s2YEkh21bMT8' : input['old-auth-config-id'] as string,
    operator: input.operator as string,
    reason: input.reason as string, apply: input.apply === true,
  };
  const documentBase = { procedure: 'gigi-removed-gmail-config-recovery-v2',
    mode: input.apply === true ? 'apply' : 'preview',
    input: { subject: recoveryInput.subject, provider: recoveryInput.provider, requestId: recoveryInput.requestId,
      accountId: recoveryInput.accountId, oldAuthConfigId: recoveryInput.oldAuthConfigId,
      operator: recoveryInput.operator, reason: recoveryInput.reason } };
  class ReceiptResourceError extends Data.TaggedError('ReceiptResourceError')<{ cause: unknown }> {}
  const acquire = Effect.tryPromise({
    try: async () => {
      const receipt = await open(input.evidence as string, 'wx', 0o600);
      try { return { receipt, directory: await open(dirname(input.evidence as string), 'r') }; }
      catch (cause) { await receipt.close(); throw cause; }
    },
    catch: (cause) => new ReceiptResourceError({ cause }),
  });
  return Effect.runPromise(Effect.acquireUseRelease(acquire, ({ receipt, directory }) => Effect.tryPromise({
    try: async () => {
  async function writeAll(handle: typeof receipt, value: Record<string, unknown>) {
    const encoded = Buffer.from(JSON.stringify(value, null, 2) + '\n', 'utf8');
    await handle.truncate(0);
    let offset = 0;
    while (offset < encoded.length) {
      const { bytesWritten } = await handle.write(encoded, offset, encoded.length - offset, offset);
      if (bytesWritten < 1) throw new Error('receipt_short_write');
      offset += bytesWritten;
    }
    await handle.sync();
  }
  async function persist(value: Record<string, unknown>) {
    await writeAll(receipt, value);
  }
    await persist({ ...documentBase, state: 'started', recordedAt: new Date().toISOString() });
    await directory.sync();
    const sourcePorts = injectedPorts ?? makeOperatorPorts(process.env.COMPOSIO_API_KEY ?? '');
    if (input.reviewedTarget === true) {
      if (!sourcePorts.readReviewedTarget) throw new Error('reviewed_target_reader_missing');
      const target = await sourcePorts.readReviewedTarget(recoveryInput.accountId);
      if (!target) throw new Error('reviewed_target_missing');
      recoveryInput.subject = target.subject;
      recoveryInput.requestId = target.request_id;
      documentBase.input.subject = target.subject;
      documentBase.input.requestId = target.request_id;
      await persist({ ...documentBase, state: 'target_resolved', recordedAt: new Date().toISOString() });
    }
    const ports: RecoveryPorts = { ...sourcePorts, beforeWrite: async (evidence: RecoveryEvidence) => {
      const sidecar = await open((input.evidence as string) + '.prewrite.json', 'wx', 0o600);
      try {
        await writeAll(sidecar, { ...documentBase, state: 'prewrite_verified', evidence,
          recordedAt: new Date().toISOString() });
        await directory.sync();
      } finally { await sidecar.close(); }
      await persist({ ...documentBase, state: 'prewrite_verified', evidence, recordedAt: new Date().toISOString() });
    } };
    let result;
    try { result = await recoverStaleLinked(recoveryInput, ports); }
    catch { result = { outcome: 'blocked' as const, reason: 'observation_or_write_uncertain' }; }
    await persist({ ...documentBase, state: 'finished', result, recordedAt: new Date().toISOString() });
    process.stdout.write(result.outcome + (result.reason ? ': ' + result.reason : '') + '\n');
    if (result.outcome === 'blocked') process.exitCode = 2;
    return result;
    },
    catch: (cause) => new ReceiptResourceError({ cause }),
  }), ({ receipt, directory }) => Effect.promise(async () => {
    await receipt.close();
    await directory.close();
  })));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runOperatorCommand(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write('Recovery stopped: ' + (error instanceof Error ? error.name : 'unknown_error') + '\n');
    process.exitCode = 1;
  });
}
