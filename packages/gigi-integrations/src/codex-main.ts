import { Effect } from 'effect';
import { isAbsolute } from 'node:path';
import { createCodexAdapter, JsonLineProcess } from './codex.ts';

const dataDir = process.env.GIGI_DATA_DIR;
const mcpBinary = process.env.GIGI_MCP_BINARY;
const skillPath = process.env.GIGI_SKILL_PATH;
const codexBinary = process.env.GIGI_CODEX_BINARY;
if (!dataDir || !mcpBinary || !skillPath || !codexBinary || !isAbsolute(codexBinary)) throw new Error('GiGi Codex companion is unconfigured');

const flags = [
  'app-server', '--stdio',
  '-c', 'model_provider="openai"',
  '-c', 'forced_login_method="chatgpt"',
  '-c', 'features.shell_tool=false',
  '-c', 'features.unified_exec=false',
  '-c', 'features.browser_use=false',
  '-c', 'features.computer_use=false',
  '-c', 'features.apps=false',
  '-c', 'features.remote_plugin=false',
  '-c', 'features.multi_agent=false',
  '-c', 'features.hooks=false',
  '-c', 'features.memories=false',
  '-c', 'features.chronicle=false',
  '-c', 'features.tool_suggest=false',
  '-c', 'features.standalone_web_search=false',
  '-c', 'web_search="disabled"',
];

async function initialize(server: JsonLineProcess): Promise<void> {
  await server.request('initialize', { clientInfo: { name: 'gigi-codex', title: 'GiGi Codex chat', version: '0.1.0' }, capabilities: { experimentalApi: true, requestAttestation: false } });
  server.notify('initialized');
}

async function isolatedFlags(environment: NodeJS.ProcessEnv): Promise<string[]> {
  const probe = new JsonLineProcess(codexBinary!, ['app-server', '--stdio'], environment);
  let names: string[];
  try {
    await initialize(probe);
    const config = (await probe.request('config/read', {}))?.config;
    if (!config || typeof config.mcp_servers !== 'object' || Array.isArray(config.mcp_servers)) throw new Error('codex_config_unverifiable');
    if (config.model_providers?.openai || config.openai_base_url || config.openai_api_base) throw new Error('codex_provider_override_denied');
    names = Object.keys(config.mcp_servers);
  } finally { await probe.close(); }
  const result = [...flags];
  for (const name of names) {
    if (!/^[A-Za-z0-9_-]+$/.test(name)) throw new Error('codex_config_unverifiable');
    result.push('-c', `mcp_servers.${name}.enabled=false`);
  }
  return result;
}

async function serve(server: JsonLineProcess, mcp: JsonLineProcess): Promise<void> {
  await initialize(server);
  const effective = (await server.request('config/read', {}))?.config;
  if (!effective || Object.values(effective.mcp_servers ?? {}).some((entry: any) => entry?.enabled !== false) || effective.features?.shell_tool !== false || effective.features?.unified_exec !== false || effective.features?.browser_use !== false || effective.features?.computer_use !== false || effective.features?.apps !== false || effective.model_provider !== 'openai' || effective.forced_login_method !== 'chatgpt') throw new Error('codex_profile_isolation_failed');
  await mcp.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'gigi-codex', version: '0.1.0' } });
  mcp.notify('notifications/initialized');
  const adapter = createCodexAdapter({ dataDir: dataDir!, mcpBinary: mcpBinary!, skillPath: skillPath!, server, mcp });
  let buffer = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    buffer += String(chunk);
    if (buffer.length > 65_536) { process.stdout.write(JSON.stringify({ id: null, ok: false, error: { reason: 'invalid_request' } }) + '\n'); buffer = ''; continue; }
    for (;;) {
      const end = buffer.indexOf('\n'); if (end < 0) break;
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 1); if (!line) continue;
      let id: unknown = null;
      try {
        const request = JSON.parse(line);
        id = request?.id ?? null;
        if (typeof request?.operation !== 'string' || !request?.input || typeof request.input !== 'object' || Array.isArray(request.input)) throw new Error('invalid_request');
        const op = request.operation.replace(/^agent\.chat\./, '');
        if (!['status', 'list', 'start', 'read', 'send', 'poll', 'cancel', 'approve'].includes(op)) throw new Error('unknown_operation');
        const value = await adapter[op as keyof typeof adapter](request.input);
        process.stdout.write(JSON.stringify({ id, ok: true, value }) + '\n');
      } catch (error) {
        const known = new Set(['invalid_request', 'unknown_operation', 'unconfigured', 'chatgpt_auth_required', 'codex_unavailable', 'gigi_tools_unavailable', 'workspace_not_found', 'record_not_found', 'session_not_found', 'session_limit', 'turn_in_progress', 'reconciliation_required', 'approval_not_found', 'interrupted', 'chat_ledger_invalid']);
        const reason = error instanceof Error && known.has(error.message) ? error.message : 'unavailable';
        process.stdout.write(JSON.stringify({ id, ok: false, error: { reason } }) + '\n');
      }
    }
  }
}

const environment: NodeJS.ProcessEnv = { ...process.env, GIGI_DATA_DIR: dataDir };
for (const key of Object.keys(environment)) if (/^(OPENAI|CODEX)_(API_KEY|BASE_URL|API_BASE|ENDPOINT|AUTH_TOKEN|ACCESS_TOKEN)$/i.test(key)) delete environment[key];
const safeFlags = await isolatedFlags(environment);
let childFailed!: (error: Error) => void;
const childFailure = new Promise<never>((_resolve, reject) => { childFailed = reject; });
// Attach before launching children; serve races this failure through owned cleanup.
void childFailure.catch(() => {});
const program = Effect.acquireRelease(
  Effect.sync(() => ({ server: new JsonLineProcess(codexBinary, safeFlags, environment, childFailed), mcp: new JsonLineProcess(mcpBinary, [], environment, childFailed) })),
  ({ server, mcp }) => Effect.promise(async () => { await Promise.all([server.close(), mcp.close()]); }),
).pipe(Effect.flatMap(({ server, mcp }) => Effect.promise(() => Promise.race([serve(server, mcp), childFailure]))));
await Effect.runPromise(Effect.scoped(program));
