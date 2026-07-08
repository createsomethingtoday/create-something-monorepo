import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = findRepoRoot(packageRoot);
const outputPath = path.join(packageRoot, 'data', 'create-something-agent-config-coverage.json');
const generatedAt = new Date().toISOString();
const topologyId = 'substrate:create-something:topology:internal';
const atlasCanvasId = 'create-something-internal-operating-topology';

function findRepoRoot(start) {
  let current = start;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    current = path.dirname(current);
  }
  throw new Error(`Could not find repo root from ${start}`);
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stableId(kind, key) {
  return `substrate:create-something:${kind}:${slug(key)}`;
}

function atlasNodeId(nodeId) {
  return nodeId.replace(/^substrate:/, 'atlas:').replace(/:/g, '_');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function walkJson(startDir) {
  if (!fs.existsSync(startDir)) return [];
  return fs
    .readdirSync(startDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(startDir, entry.name))
    .sort((a, b) => relative(a).localeCompare(relative(b)));
}

function collectSecretRefs(value, refs = []) {
  if (!value || typeof value !== 'object') return refs;
  if (!Array.isArray(value) && typeof value.secret_key === 'string') {
    refs.push({
      environment: typeof value.environment === 'string' ? value.environment : undefined,
      path: typeof value.path === 'string' ? value.path : undefined,
      secretKey: value.secret_key
    });
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    collectSecretRefs(child, refs);
  }
  return refs;
}

function serverRefFrom(value) {
  if (!value || typeof value !== 'object') return undefined;
  const serverId = value.server_id ?? value.id;
  const displayName = value.display_name ?? value.displayName ?? value.name;
  const transport = value.transport;
  const url = value.url;
  const authType = value.auth?.type;
  if (!serverId && !displayName && !transport && !url && !authType) return undefined;
  return {
    serverId: typeof serverId === 'string' ? serverId : undefined,
    displayName: typeof displayName === 'string' ? displayName : undefined,
    transport: typeof transport === 'string' ? transport : undefined,
    url: typeof url === 'string' ? url : undefined,
    authType: typeof authType === 'string' ? authType : undefined
  };
}

function uniqueServerRefs(refs) {
  return [
    ...new Map(
      refs
        .filter(Boolean)
        .map((ref) => [`${ref.serverId ?? ''}:${ref.displayName ?? ''}:${ref.url ?? ''}`, ref])
    ).values()
  ].sort((a, b) => (a.serverId ?? a.displayName ?? '').localeCompare(b.serverId ?? b.displayName ?? ''));
}

function collectAgentServerRefs(config) {
  const refs = [];
  if (Array.isArray(config.mcp_servers)) refs.push(...config.mcp_servers.map(serverRefFrom));
  if (config.mcp_server) refs.push(serverRefFrom(config.mcp_server));
  for (const tool of Array.isArray(config.tools) ? config.tools : []) {
    if (tool?.server_id) refs.push(serverRefFrom({ server_id: tool.server_id }));
  }
  return uniqueServerRefs(refs);
}

function collectMcpIntakeServerRefs(config) {
  return uniqueServerRefs([
    serverRefFrom(config.registry_server),
    serverRefFrom(config.dify_mcp_server),
    ...Object.values(config.inventory_fragment_after_tool_discovery ?? {}).map(serverRefFrom)
  ]);
}

function countWriteTools(tools) {
  if (!Array.isArray(tools)) return 0;
  return tools.filter((tool) => tool?.write_capability === true || tool?.requires_user_confirmation === true).length;
}

function sourceRecordFor(input) {
  return {
    id: input.recordId,
    source: 'CREATE SOMETHING Dify/MCP config coverage',
    sourceType: input.kind === 'dify_agent' ? 'agent' : 'config',
    title: input.title,
    owner: input.owner ?? 'CREATE SOMETHING',
    status: 'ready',
    bindingHealth: 'bound',
    atlasCanvasId,
    atlasNodeId: input.atlasNodeId,
    relationCount: input.serverRefs.length + input.toolCount + input.secretRefCount + 1,
    receiptId: `receipt:${input.recordId}`,
    updatedAt: generatedAt,
    summary: `${input.configPath} is bound as ${input.kind === 'dify_agent' ? 'a Dify agent' : 'a Dify MCP intake'} config with ${input.serverRefs.length} server refs and ${input.toolCount} tools.`
  };
}

function receiptFor(input) {
  return {
    id: `receipt:${input.recordId}`,
    recordId: input.recordId,
    type: 'proof',
    summary: `${input.title} has first-class Dify/MCP config coverage.`,
    evidence: `${input.configPath} was parsed into Dify/MCP config coverage at ${generatedAt}.`,
    createdAt: generatedAt
  };
}

function actionFor(input) {
  return {
    id: `action:agent-config-review:${input.recordId}`,
    recordId: input.recordId,
    state: 'wait',
    title: `Review Dify/MCP config coverage for ${input.title}`,
    owner: input.owner ?? 'CREATE SOMETHING',
    policy: 'Dify/MCP config review before external writes',
    detail: `${input.configPath} is mapped as Substrate config state. Review server refs, tool risk, auth references, smoke evidence, and eval status before mutating Dify Studio or MCP hub configuration.`
  };
}

function buildAgentRecord(filePath) {
  const configPath = relative(filePath);
  const config = readJson(filePath);
  const recordId = stableId('agent-config', configPath);
  const serverRefs = collectAgentServerRefs(config);
  const secretRefCount = collectSecretRefs(config).length;
  const title = config.dify_app?.name ?? path.basename(configPath, '.json');
  const input = {
    recordId,
    atlasNodeId: atlasNodeId(recordId),
    configPath,
    kind: 'dify_agent',
    status: config.status,
    owner: config.owner ?? 'CREATE SOMETHING',
    title,
    mode: config.dify_app?.mode,
    model: config.dify_app?.recommended_model,
    sourceDslPath: config.source_dsl?.repo_path,
    serverRefs,
    toolCount: Array.isArray(config.tools) ? config.tools.length : 0,
    writeToolCount: countWriteTools(config.tools),
    secretRefCount,
    smokeStatus: config.service_api_smoke?.result ?? config.mcp_direct_probe?.result,
    evalStatus: config.evals?.published_result ?? config.evals?.local_result
  };
  return {
    ...input,
    sourceRecord: sourceRecordFor(input),
    receipt: receiptFor(input),
    reviewAction: actionFor(input)
  };
}

function buildMcpIntakeRecord(filePath) {
  const configPath = relative(filePath);
  const config = readJson(filePath);
  const recordId = stableId('mcp-config', configPath);
  const serverRefs = collectMcpIntakeServerRefs(config);
  const secretRefCount = collectSecretRefs(config).length;
  const title =
    config.dify_mcp_server?.display_name ??
    config.registry_server?.description ??
    path.basename(configPath, '.json');
  const input = {
    recordId,
    atlasNodeId: atlasNodeId(recordId),
    configPath,
    kind: 'dify_mcp_intake',
    status: config.status,
    owner: config.owner ?? 'CREATE SOMETHING',
    title,
    serverRefs,
    toolCount: config.registry_server?.estimated_tool_count ?? 0,
    writeToolCount: 0,
    secretRefCount,
    smokeStatus: config.smoke?.result,
    evalStatus: config.evals?.result
  };
  return {
    ...input,
    sourceRecord: sourceRecordFor(input),
    receipt: receiptFor(input),
    reviewAction: actionFor(input)
  };
}

const agentFiles = walkJson(path.join(repoRoot, 'config', 'dify-agents'));
const mcpIntakeFiles = walkJson(path.join(repoRoot, 'config', 'dify-mcp-intake'));
const records = [
  ...agentFiles.map(buildAgentRecord),
  ...mcpIntakeFiles.map(buildMcpIntakeRecord)
];
const coverage = {
  id: 'substrate:create-something:agent-config-coverage:dify-mcp',
  generatedAt,
  topologyId,
  atlasCanvasId,
  records
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(coverage, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);

console.log(
  JSON.stringify(
    {
      coverageId: coverage.id,
      outputPath: relative(outputPath),
      records: coverage.records.length,
      difyAgents: coverage.records.filter((record) => record.kind === 'dify_agent').length,
      mcpIntake: coverage.records.filter((record) => record.kind === 'dify_mcp_intake').length,
      serverRefs: coverage.records.reduce((count, record) => count + record.serverRefs.length, 0),
      toolCount: coverage.records.reduce((count, record) => count + record.toolCount, 0),
      secretRefCount: coverage.records.reduce((count, record) => count + record.secretRefCount, 0)
    },
    null,
    2
  )
);
