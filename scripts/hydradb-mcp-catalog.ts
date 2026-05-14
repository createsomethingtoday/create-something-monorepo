#!/usr/bin/env tsx

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

type Command = 'plan' | 'export' | 'seed' | 'eval' | 'seed-eval';
type RegistrySource = 'core' | 'merged';

type Options = {
  command: Command;
  dryRun: boolean;
  includeDormant: boolean;
  includeLocal: boolean;
  json: boolean;
  limit?: number;
  maxResults: number;
  mcpPackage: string;
  queries: string[];
  registrySource: RegistrySource;
  serverIds: string[];
  subTenantId: string;
  tags: string[];
  waitMs: number;
};

type RegistryServer = {
  bearer_token_env_var?: string;
  catalog?: {
    authType?: string;
    category?: string;
    include?: boolean;
    name?: string;
    requiresAuth?: boolean;
    slug?: string;
    transports?: string[];
  };
  catalog_exposure_mode?: string;
  command?: string;
  description?: string;
  estimated_tool_count?: number;
  exposure_exception_reason?: string;
  exposure_review_owner?: string;
  lifecycle?: 'active' | 'dormant' | 'local';
  package_path?: string;
  tags?: string[];
  transport: 'http' | 'stdio';
  url?: string;
};

type Registry = {
  version: number;
  servers: Record<string, RegistryServer>;
  bundles?: Record<string, string[]>;
};

type CatalogDocument = {
  bytes: number;
  serverId: string;
  sourceId: string;
  sha256: string;
  text: string;
  title: string;
};

type JsonRpcResponse = {
  id?: number;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

type ToolCallResult = {
  content?: Array<{ type: string; text?: string }>;
};

const ROOT = process.cwd();
const REGISTRY_CORE_PATH = resolve(ROOT, 'config/mcp-hub/registry.core.json');
const REGISTRY_MERGED_PATH = resolve(ROOT, 'config/mcp-hub/registry.json');
const DEFAULT_MCP_PACKAGE = '@hydra_db/mcp@0.1.1';
const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_SUB_TENANT_ID = 'cs-mcp-catalog';
const DEFAULT_WAIT_MS = 20_000;

const DEFAULT_QUERIES = [
  'Which MCP server should support code quality verification and duplicate analysis?',
  'Which MCP servers provide Hydra DB context memory or recall?',
  'Which MCP servers should be considered for Webflow marketplace template review?',
  'Which broad connector MCP servers require brokered exposure instead of direct tool exposure?'
];

async function main(options: Options): Promise<void> {
  const registry = loadRegistry(options.registrySource);
  const documents = buildCatalogDocuments(options, registry);

  if (options.command === 'plan' || options.command === 'export') {
    printJson(
      options.command === 'export'
        ? { subTenantId: options.subTenantId, documents }
        : {
            subTenantId: options.subTenantId,
            registrySource: options.registrySource,
            selected: documents.map(({ bytes, serverId, sourceId, sha256, title }) => ({
              bytes,
              serverId,
              sourceId,
              sha256,
              title
            }))
          }
    );
    return;
  }

  if (options.command === 'seed') {
    if (options.dryRun) {
      printJson({ dryRun: true, wouldSeed: documents.map((doc) => doc.sourceId) });
      return;
    }
    requireHydraEnv();
    await seedDocuments(options, documents);
    return;
  }

  if (options.command === 'eval') {
    requireHydraEnv();
    await evaluateCatalogRecall(options);
    return;
  }

  if (options.command === 'seed-eval') {
    if (options.dryRun) {
      printJson({ dryRun: true, wouldSeed: documents.map((doc) => doc.sourceId) });
      return;
    }
    requireHydraEnv();
    await seedDocuments(options, documents);
    if (options.waitMs > 0) {
      console.log(`Waiting ${options.waitMs}ms for async Hydra DB indexing...`);
      await sleep(options.waitMs);
    }
    await evaluateCatalogRecall(options);
  }
}

class HydraMcpClient {
  private child?: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private stderr = '';
  private pending = new Map<
    number,
    {
      resolve: (response: JsonRpcResponse) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();

  constructor(
    private readonly mcpPackage: string,
    private readonly subTenantId: string
  ) {}

  async connect(): Promise<void> {
    this.child = spawn('npx', ['-y', this.mcpPackage], {
      env: {
        ...process.env,
        HYDRA_DB_LOG_LEVEL: 'ERROR',
        HYDRA_DB_SUB_TENANT_ID: this.subTenantId
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    createInterface({ input: this.child.stdout }).on('line', (line) => this.handleLine(line));
    this.child.stderr.on('data', (chunk) => {
      this.stderr += chunk.toString('utf8');
    });
    this.child.on('exit', (code) => {
      const error = new Error(this.stderr || `Hydra DB MCP exited with code ${code ?? 'unknown'}`);
      for (const [id, pending] of this.pending) {
        clearTimeout(pending.timeout);
        pending.reject(error);
        this.pending.delete(id);
      }
    });

    const initialized = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'hydradb-mcp-catalog', version: '0.1.0' }
    });
    assertNoRpcError(initialized, 'initialize');
    this.notify('notifications/initialized', {});
  }

  async callTool(name: string, toolArgs: Record<string, unknown>): Promise<ToolCallResult> {
    const response = await this.request('tools/call', { name, arguments: toolArgs });
    assertNoRpcError(response, `tools/call ${name}`);
    return response.result as ToolCallResult;
  }

  close(): void {
    this.child?.kill();
  }

  private request(method: string, params: unknown): Promise<JsonRpcResponse> {
    const child = this.requireChild();
    const id = this.nextId;
    this.nextId += 1;

    const promise = new Promise<JsonRpcResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(`Timed out waiting for ${method}${this.stderr ? `: ${this.stderr}` : ''}`)
        );
      }, 45_000);
      this.pending.set(id, { resolve, reject, timeout });
    });

    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    return promise;
  }

  private notify(method: string, params: unknown): void {
    this.requireChild().stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }

  private handleLine(line: string): void {
    if (!line.trim().startsWith('{')) return;
    const message = JSON.parse(line) as JsonRpcResponse;
    if (typeof message.id !== 'number') return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    clearTimeout(pending.timeout);
    this.pending.delete(message.id);
    pending.resolve(message);
  }

  private requireChild(): ChildProcessWithoutNullStreams {
    if (!this.child) throw new Error('Hydra DB MCP process is not connected.');
    return this.child;
  }
}

function loadRegistry(source: RegistrySource): Registry {
  const path = source === 'core' ? REGISTRY_CORE_PATH : REGISTRY_MERGED_PATH;
  if (!existsSync(path)) throw new Error(`Registry file missing: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8')) as Registry;
}

function buildCatalogDocuments(options: Options, registry: Registry): CatalogDocument[] {
  const serverToBundles = invertBundles(registry.bundles ?? {});
  const entries = Object.entries(registry.servers)
    .filter(([serverId, server]) => selectServer(options, serverId, server))
    .sort(([a], [b]) => a.localeCompare(b));
  const limited = typeof options.limit === 'number' ? entries.slice(0, options.limit) : entries;

  return limited.map(([serverId, server]) => {
    const text = buildCatalogText(serverId, server, serverToBundles.get(serverId) ?? []);
    const sha256 = createHash('sha256').update(text).digest('hex').slice(0, 16);
    return {
      bytes: Buffer.byteLength(text, 'utf8'),
      serverId,
      sourceId: sourceIdForServer(serverId),
      sha256,
      text,
      title: `MCP catalog ${serverId}`
    };
  });
}

function selectServer(options: Options, serverId: string, server: RegistryServer): boolean {
  if (options.serverIds.length > 0 && !options.serverIds.includes(serverId)) return false;
  const lifecycle = server.lifecycle ?? 'active';
  if (lifecycle === 'dormant' && !options.includeDormant) return false;
  if (lifecycle === 'local' && !options.includeLocal) return false;
  if (options.tags.length > 0) {
    const tags = new Set(server.tags ?? []);
    if (!options.tags.every((tag) => tags.has(tag))) return false;
  }
  return true;
}

function buildCatalogText(serverId: string, server: RegistryServer, bundles: string[]): string {
  const lifecycle = server.lifecycle ?? 'active';
  const exposure = server.catalog_exposure_mode ?? 'unknown';
  const estimatedToolCount =
    typeof server.estimated_tool_count === 'number' ? server.estimated_tool_count : 'unknown';
  const requiresAuth = Boolean(server.bearer_token_env_var || server.catalog?.requiresAuth);
  const endpoint = server.transport === 'http' && server.url ? new URL(server.url).host : 'stdio';

  return [
    `Artifact type: mcp_catalog_entry`,
    `Trust zone: internal_non_customer`,
    `Source system: git`,
    `Project slug: create_something`,
    `Registry source: mcp-hub`,
    `MCP server: ${serverId}`,
    `Lifecycle: ${lifecycle}`,
    `Transport: ${server.transport}`,
    `Endpoint host: ${endpoint}`,
    `Catalog exposure: ${exposure}`,
    `Estimated tool count: ${estimatedToolCount}`,
    `Requires auth: ${requiresAuth}`,
    `Auth type: ${server.catalog?.authType ?? (requiresAuth ? 'bearer' : 'none')}`,
    `Package path: ${server.package_path ?? 'none'}`,
    `Bundles: ${bundles.join(', ') || 'none'}`,
    `Tags: ${(server.tags ?? []).join(', ') || 'none'}`,
    '',
    `# MCP Catalog: ${serverId}`,
    '',
    '## Description',
    '',
    server.description ?? 'No description recorded.',
    '',
    '## Selection Guidance',
    '',
    selectionGuidance(serverId, server),
    '',
    '## Exposure Notes',
    '',
    exposureGuidance(server),
    '',
    '## Catalog Metadata',
    '',
    `Catalog include: ${server.catalog?.include ?? false}`,
    `Catalog name: ${server.catalog?.name ?? 'none'}`,
    `Catalog slug: ${server.catalog?.slug ?? 'none'}`,
    `Catalog category: ${server.catalog?.category ?? 'none'}`
  ].join('\n');
}

function selectionGuidance(serverId: string, server: RegistryServer): string {
  const tags = new Set(server.tags ?? []);
  const lines = [];
  if (tags.has('webflow'))
    lines.push('Use for Webflow, marketplace, template, app review, or site analysis work.');
  if (tags.has('notion'))
    lines.push('Use for Notion-backed workspace, CMS, knowledge base, or sync work.');
  if (tags.has('composio'))
    lines.push(
      'Use as a Composio-backed broad connector surface; prefer brokered discovery for large tool sets.'
    );
  if (tags.has('telemetry') || tags.has('observability'))
    lines.push('Use for fleet telemetry, health, and operational visibility.');
  if (tags.has('verification') || tags.has('code-quality'))
    lines.push('Use for code verification, duplicate analysis, and quality gates.');
  if (tags.has('hydradb') || tags.has('memory'))
    lines.push('Use for internal context memory, recall, and Hydra DB pilot operations.');
  if (serverId.includes('youtube'))
    lines.push('Use for YouTube transcript extraction or transcript-to-Notion enrichment.');
  if (serverId.includes('slack')) lines.push('Use for Slack workspace or communication workflows.');
  if (serverId.includes('quickbooks'))
    lines.push('Use for QuickBooks finance data into Notion workflows.');
  if (lines.length === 0)
    lines.push(
      'Use when the server description, bundle membership, and tags match the requested workflow.'
    );
  return lines.map((line) => `- ${line}`).join('\n');
}

function exposureGuidance(server: RegistryServer): string {
  const exposure = server.catalog_exposure_mode ?? 'unknown';
  const count = server.estimated_tool_count ?? 0;
  const lines = [`- Current catalog exposure mode: ${exposure}.`];
  if (exposure === 'brokered' || count >= 75) {
    lines.push(
      '- Treat as a broad catalog. Prefer retrieval/brokered selection before direct tool exposure.'
    );
  } else if (exposure === 'dormant' || server.lifecycle === 'dormant') {
    lines.push('- Dormant. Do not expose by default; use only after explicit gate/approval.');
  } else {
    lines.push(
      '- Direct exposure is acceptable only within the normal Hub policy and tenant authorization gates.'
    );
  }
  if (server.exposure_exception_reason)
    lines.push(`- Exception reason: ${server.exposure_exception_reason}`);
  if (server.exposure_review_owner) lines.push(`- Review owner: ${server.exposure_review_owner}`);
  return lines.join('\n');
}

async function seedDocuments(options: Options, documents: CatalogDocument[]): Promise<void> {
  if (documents.length === 0) throw new Error('No MCP catalog documents selected.');

  const client = new HydraMcpClient(options.mcpPackage, options.subTenantId);
  try {
    await client.connect();
    const seeded: Array<Record<string, unknown>> = [];
    for (const doc of documents) {
      const result = await client.callTool('hydra_db_store', {
        text: doc.text,
        title: doc.title,
        source_id: doc.sourceId,
        infer: false,
        is_markdown: true
      });
      const record = {
        serverId: doc.serverId,
        sourceId: doc.sourceId,
        bytes: doc.bytes,
        sha256: doc.sha256,
        result: compactToolText(firstText(result))
      };
      seeded.push(record);
      if (!options.json) {
        console.log(`seeded ${doc.serverId} -> ${doc.sourceId}: ${record.result}`);
      }
    }
    if (options.json) printJson({ subTenantId: options.subTenantId, seeded });
  } finally {
    client.close();
  }
}

async function evaluateCatalogRecall(options: Options): Promise<void> {
  const client = new HydraMcpClient(options.mcpPackage, options.subTenantId);
  try {
    await client.connect();
    const results = [];
    for (const query of options.queries) {
      const result = await client.callTool('hydra_db_search', {
        query,
        max_results: options.maxResults,
        mode: 'thinking',
        graph_context: true
      });
      const text = firstText(result);
      const found = extractFoundCount(text);
      results.push({ query, found, passed: found > 0, summary: compactToolText(text) });
      if (!options.json) {
        console.log(
          `${found > 0 ? 'PASS' : 'MISS'} ${query} (${found} result${found === 1 ? '' : 's'})`
        );
      }
    }
    const passed = results.filter((result) => result.passed).length;
    const report = { subTenantId: options.subTenantId, passed, total: results.length, results };
    if (options.json) printJson(report);
    if (passed < results.length) {
      throw new Error(`Hydra DB MCP catalog recall missed ${results.length - passed} queries.`);
    }
  } finally {
    client.close();
  }
}

function invertBundles(bundles: Record<string, string[]>): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const [bundle, servers] of Object.entries(bundles)) {
    for (const server of servers) {
      const list = result.get(server) ?? [];
      list.push(bundle);
      result.set(server, list);
    }
  }
  return result;
}

function sourceIdForServer(serverId: string): string {
  return `cs-mcp-catalog-${serverId}`;
}

function requireHydraEnv(): void {
  const missing = ['HYDRA_DB_API_KEY', 'HYDRA_DB_TENANT_ID'].filter(
    (name) => !process.env[name]?.trim()
  );
  if (missing.length > 0) throw new Error(`Missing ${missing.join(', ')}.`);
}

function assertNoRpcError(response: JsonRpcResponse, label: string): void {
  if (!response.error) return;
  throw new Error(`${label} failed: ${response.error.message ?? JSON.stringify(response.error)}`);
}

function firstText(result: ToolCallResult): string {
  return result.content?.find((item) => item.type === 'text')?.text ?? '';
}

function compactToolText(text: string): string {
  const firstLine =
    text
      .split('\n')
      .find((line) => line.trim().length > 0)
      ?.trim() ?? '';
  return firstLine.length > 180 ? `${firstLine.slice(0, 177)}...` : firstLine;
}

function extractFoundCount(text: string): number {
  if (/No relevant memories found/i.test(text)) return 0;
  const match = text.match(/Found\s+(\d+)\s+memories/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function parseArgs(argv: string[]): Options {
  const cleanArgv = argv[0] === '--' ? argv.slice(1) : argv;
  const first = cleanArgv[0] as Command | undefined;
  const knownCommands: Command[] = ['plan', 'export', 'seed', 'eval', 'seed-eval'];
  const command = first && knownCommands.includes(first) ? first : 'plan';
  const rest = command === first ? cleanArgv.slice(1) : cleanArgv;
  const options: Options = {
    command,
    dryRun: false,
    includeDormant: false,
    includeLocal: false,
    json: false,
    maxResults: DEFAULT_MAX_RESULTS,
    mcpPackage: DEFAULT_MCP_PACKAGE,
    queries: [...DEFAULT_QUERIES],
    registrySource: 'core',
    serverIds: [],
    subTenantId: DEFAULT_SUB_TENANT_ID,
    tags: [],
    waitMs: DEFAULT_WAIT_MS
  };
  let queryOverride = false;

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    const next = rest[i + 1];
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--include-dormant':
        options.includeDormant = true;
        break;
      case '--include-local':
        options.includeLocal = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--limit':
        options.limit = parsePositiveInteger(next, '--limit');
        i += 1;
        break;
      case '--max-results':
        options.maxResults = parsePositiveInteger(next, '--max-results');
        i += 1;
        break;
      case '--mcp-package':
        if (!next) throw new Error('Missing value for --mcp-package.');
        options.mcpPackage = next;
        i += 1;
        break;
      case '--query':
        if (!next) throw new Error('Missing value for --query.');
        if (!queryOverride) {
          options.queries = [];
          queryOverride = true;
        }
        options.queries.push(next);
        i += 1;
        break;
      case '--registry-source':
        if (next !== 'core' && next !== 'merged') {
          throw new Error(
            'Missing or invalid value for --registry-source. Expected core or merged.'
          );
        }
        options.registrySource = next;
        i += 1;
        break;
      case '--server':
        if (!next) throw new Error('Missing value for --server.');
        options.serverIds.push(next);
        i += 1;
        break;
      case '--sub-tenant-id':
        if (!next) throw new Error('Missing value for --sub-tenant-id.');
        options.subTenantId = next;
        i += 1;
        break;
      case '--tag':
        if (!next) throw new Error('Missing value for --tag.');
        options.tags.push(next);
        i += 1;
        break;
      case '--wait-ms':
        options.waitMs = parseNonNegativeInteger(next, '--wait-ms');
        i += 1;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }

  return options;
}

function parsePositiveInteger(value: string | undefined, flag: string): number {
  const parsed = parseNonNegativeInteger(value, flag);
  if (parsed <= 0) throw new Error(`${flag} must be greater than 0.`);
  return parsed;
}

function parseNonNegativeInteger(value: string | undefined, flag: string): number {
  if (!value) throw new Error(`Missing value for ${flag}.`);
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0)
    throw new Error(`Invalid value for ${flag}: ${value}`);
  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printUsage(): void {
  console.log(`Usage:
  pnpm hydradb:mcp-catalog -- [plan|export|seed|eval|seed-eval] [options]
  pnpm hydradb:mcp-catalog:infisical -- [seed|eval|seed-eval] [options]

Commands:
  plan       Show sanitized MCP catalog entries selected for Hydra.
  export     Print sanitized MCP catalog documents.
  seed       Store selected catalog entries in Hydra DB with infer=false.
  eval       Run recall checks against the catalog sub-tenant.
  seed-eval  Seed, wait for async indexing, then run recall checks.

Options:
  --registry-source <core|merged>   Registry source. Default: core.
  --server <id>                     Select explicit server. Repeatable.
  --tag <tag>                       Require tag. Repeatable.
  --include-dormant                 Include dormant servers.
  --include-local                   Include local lifecycle servers.
  --limit <n>                       Limit selected entries.
  --sub-tenant-id <id>              Hydra sub-tenant. Default: ${DEFAULT_SUB_TENANT_ID}
  --dry-run                         For seed/seed-eval, print selected source IDs without writing.
  --json                            Print machine-readable JSON where applicable.
  --max-results <n>                 Recall max_results value. Default: ${DEFAULT_MAX_RESULTS}
  --mcp-package <pkg>               Hydra DB MCP package. Default: ${DEFAULT_MCP_PACKAGE}
  --query <text>                    Override recall query. Repeatable.
  --wait-ms <n>                     seed-eval indexing wait. Default: ${DEFAULT_WAIT_MS}
  --help                            Show this help.
`);
}

const options = parseArgs(process.argv.slice(2));

try {
  await main(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
