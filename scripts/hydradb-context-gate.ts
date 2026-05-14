#!/usr/bin/env tsx

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

type JsonRpcResponse = {
  id?: number;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

type ToolListResult = {
  tools?: Array<{ name: string }>;
};

type ToolCallResult = {
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
};

type GateOptions = {
  disallowedSubTenantId: string;
  json: boolean;
  maxResults: number;
  query: string;
  wrapperCommand: string;
  wrapperArgs: string[];
};

const ROOT = process.cwd();
const REQUIRED_ENV = ['HYDRA_DB_API_KEY', 'HYDRA_DB_TENANT_ID', 'HYDRA_DB_SUB_TENANT_ID'] as const;
const DEFAULT_QUERY = 'Which policy governs bearer token rotation?';
const DEFAULT_WRAPPER = './packages/hydradb-context-mcp/dist/index.js';
const REGISTRY_CORE_PATH = resolve(ROOT, 'config/mcp-hub/registry.core.json');

async function main(gateOptions: GateOptions): Promise<void> {
  requireEnv();
  const registry = readRegistryGate();
  const client = new McpStdioClient(gateOptions.wrapperCommand, gateOptions.wrapperArgs);
  try {
    await client.connect();
    const tools = await client.listTools();
    const toolNames = tools.map((tool) => tool.name).sort();
    assertDeepEqual(toolNames, ['context_recall'], 'wrapper tool exposure');

    const valid = await client.callTool('context_recall', {
      query: gateOptions.query,
      max_results: gateOptions.maxResults
    });
    const validText = firstText(valid);
    const validResult = JSON.parse(validText) as { resultCount?: number; subTenantId?: string };
    if (!validResult.resultCount || validResult.resultCount < 1) {
      throw new Error(`context_recall returned no results for gate query: ${gateOptions.query}`);
    }

    const compiled = await client.callTool('context_recall', {
      query: gateOptions.query,
      max_results: Math.min(gateOptions.maxResults, 2),
      output_format: 'compiled'
    });
    const compiledText = firstText(compiled);
    if (!/Hydra DB Policy Context/.test(compiledText) || !/\[S1\]/.test(compiledText)) {
      throw new Error('context_recall compiled output is missing policy context or sources.');
    }

    const denied = await client.callTool('context_recall', {
      query: gateOptions.query,
      sub_tenant_id: gateOptions.disallowedSubTenantId,
      max_results: 1
    });
    const deniedText = firstText(denied);
    if (!denied.isError && !/not allowed/i.test(deniedText)) {
      throw new Error('context_recall did not reject a disallowed sub-tenant.');
    }

    const report = {
      status: 'pass',
      registry,
      wrapper: {
        tools: toolNames,
        query: gateOptions.query,
        resultCount: validResult.resultCount,
        subTenantId: validResult.subTenantId,
        compiledOutputValidated: true,
        disallowedSubTenantRejected: true
      }
    };
    printReport(gateOptions, report);
  } finally {
    client.close();
  }
}

class McpStdioClient {
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
    private readonly command: string,
    private readonly args: string[]
  ) {}

  async connect(): Promise<void> {
    this.child = spawn(this.command, this.args, {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    createInterface({ input: this.child.stdout }).on('line', (line) => this.handleLine(line));
    this.child.stderr.on('data', (chunk) => {
      this.stderr += chunk.toString('utf8');
    });
    this.child.on('exit', (code) => {
      const error = new Error(this.stderr || `wrapper exited with code ${code ?? 'unknown'}`);
      for (const [id, pending] of this.pending) {
        clearTimeout(pending.timeout);
        pending.reject(error);
        this.pending.delete(id);
      }
    });

    const initialized = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'hydradb-context-gate', version: '0.1.0' }
    });
    if (initialized.error) {
      throw new Error(`initialize failed: ${initialized.error.message ?? 'unknown error'}`);
    }
    this.notify('notifications/initialized', {});
  }

  async listTools(): Promise<NonNullable<ToolListResult['tools']>> {
    const response = await this.request('tools/list', {});
    if (response.error) throw new Error(`tools/list failed: ${response.error.message}`);
    return ((response.result as ToolListResult).tools ?? []) as NonNullable<
      ToolListResult['tools']
    >;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    const response = await this.request('tools/call', { name, arguments: args });
    if (response.error) throw new Error(`tools/call ${name} failed: ${response.error.message}`);
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
    if (!this.child) throw new Error('wrapper process is not connected.');
    return this.child;
  }
}

function readRegistryGate(): Record<string, unknown> {
  if (!existsSync(REGISTRY_CORE_PATH)) {
    throw new Error(`Registry core file missing: ${REGISTRY_CORE_PATH}`);
  }
  const registry = JSON.parse(readFileSync(REGISTRY_CORE_PATH, 'utf8')) as {
    servers?: Record<string, unknown>;
    bundles?: Record<string, string[]>;
  };
  const server = registry.servers?.['hydradb-context-mcp'] as
    | {
        catalog_exposure_mode?: string;
        estimated_tool_count?: number;
        lifecycle?: string;
        transport?: string;
      }
    | undefined;
  if (!server) throw new Error('registry missing hydradb-context-mcp');
  if (server.transport !== 'stdio') throw new Error('hydradb-context-mcp must remain stdio.');
  if (server.lifecycle !== 'dormant') throw new Error('hydradb-context-mcp must remain dormant.');
  if (server.catalog_exposure_mode !== 'dormant') {
    throw new Error('hydradb-context-mcp catalog exposure must remain dormant.');
  }
  if (server.estimated_tool_count !== 1) {
    throw new Error('hydradb-context-mcp estimated_tool_count must be 1.');
  }
  if (!registry.bundles?.dormant?.includes('hydradb-context-mcp')) {
    throw new Error('dormant bundle must include hydradb-context-mcp.');
  }
  return {
    server: 'hydradb-context-mcp',
    lifecycle: server.lifecycle,
    catalogExposureMode: server.catalog_exposure_mode,
    estimatedToolCount: server.estimated_tool_count,
    dormantBundle: true
  };
}

function requireEnv(): void {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(', ')}. Run through pnpm hydradb:context:gate:infisical.`
    );
  }
}

function firstText(result: ToolCallResult): string {
  return result.content?.find((item) => item.type === 'text')?.text ?? '';
}

function assertDeepEqual(actual: unknown, expected: unknown, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label} mismatch. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
}

function printReport(gateOptions: GateOptions, report: unknown): void {
  if (gateOptions.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(JSON.stringify(report, null, 2));
}

function parseArgs(argv: string[]): GateOptions {
  const cleanArgv = argv[0] === '--' ? argv.slice(1) : argv;
  const options: GateOptions = {
    disallowedSubTenantId: 'client-not-allowlisted-context',
    json: false,
    maxResults: 3,
    query: DEFAULT_QUERY,
    wrapperCommand: 'node',
    wrapperArgs: [DEFAULT_WRAPPER]
  };

  for (let i = 0; i < cleanArgv.length; i += 1) {
    const arg = cleanArgv[i];
    const next = cleanArgv[i + 1];
    switch (arg) {
      case '--disallowed-sub-tenant-id':
        if (!next) throw new Error('Missing value for --disallowed-sub-tenant-id.');
        options.disallowedSubTenantId = next;
        i += 1;
        break;
      case '--json':
        options.json = true;
        break;
      case '--max-results':
        if (!next) throw new Error('Missing value for --max-results.');
        options.maxResults = Number.parseInt(next, 10);
        if (!Number.isFinite(options.maxResults) || options.maxResults < 1) {
          throw new Error(`Invalid --max-results value: ${next}`);
        }
        i += 1;
        break;
      case '--query':
        if (!next) throw new Error('Missing value for --query.');
        options.query = next;
        i += 1;
        break;
      case '--wrapper':
        if (!next) throw new Error('Missing value for --wrapper.');
        options.wrapperArgs = [next];
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

function printUsage(): void {
  console.log(`Usage:
  pnpm hydradb:context:gate:infisical -- [options]

Checks:
  - hydradb-context-mcp stays dormant in the registry
  - wrapper exposes exactly one tool: context_recall
  - default recall returns at least one result
  - compiled output includes source-backed policy context
  - disallowed sub-tenant is rejected

Options:
  --json                                  Print machine-readable JSON.
  --query <text>                          Recall query. Default: ${DEFAULT_QUERY}
  --max-results <n>                       Recall result limit. Default: 3
  --disallowed-sub-tenant-id <id>         Negative authz test value.
  --wrapper <path>                        Wrapper dist path. Default: ${DEFAULT_WRAPPER}
  --help                                  Show this help.
`);
}

const options = parseArgs(process.argv.slice(2));

try {
  await main(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
