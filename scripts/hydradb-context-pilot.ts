#!/usr/bin/env tsx

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { createInterface } from 'node:readline';

type Command = 'plan' | 'tools' | 'seed' | 'eval' | 'seed-eval';

type ParsedArgs = {
  command: Command;
  allPolicies: boolean;
  dryRun: boolean;
  files: string[];
  json: boolean;
  limit?: number;
  maxResults: number;
  mcpCreation: boolean;
  mcpPackage: string;
  queries: string[];
  waitMs: number;
};

type PilotDocument = {
  path: string;
  title: string;
  sourceId: string;
  bytes: number;
  sha256: string;
  text: string;
};

type JsonRpcResponse = {
  jsonrpc?: string;
  id?: number;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

type ToolListResult = {
  tools?: Array<{
    name: string;
    description?: string;
  }>;
};

type ToolCallResult = {
  content?: Array<{
    type: string;
    text?: string;
  }>;
};

const ROOT = process.cwd();
const DEFAULT_MCP_PACKAGE = '@hydra_db/mcp@0.1.1';
const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_WAIT_MS = 20_000;
const REQUIRED_ENV = ['HYDRA_DB_API_KEY', 'HYDRA_DB_TENANT_ID'] as const;

const CURATED_CORPUS = [
  'docs/policies/v1/policy.mcp-credential-delivery.v1.md',
  'docs/policies/v1/policy.user-bearer-token-governance.v1.md',
  'docs/policies/v1/policy.hub-route-authorization.v1.md',
  'docs/policies/v1/policy.tenant-tool-exposure.v1.md',
  'docs/policies/v1/policy.git-light-agent-delivery.v1.md',
  'docs/policies/v1/policy.integration-selection.v1.md',
  'docs/MCP_HUB_CONTROL_PLANE.md',
  'docs/HUB_EXECUTION_GOVERNANCE_PLAN.md',
  'docs/THREE_TIER_FRAMEWORK.md'
];

const MCP_CREATION_CORPUS = [
  'docs/MCP_FIRST_THESIS.md',
  'docs/MCP_SCAFFOLD.md',
  'docs/COMPOSIO_PATTERNS.md',
  'docs/AGENCY_CODEX_VECTOR_STRATEGY.md',
  'docs/MCP_HUB_CONTROL_PLANE.md',
  'docs/HUB_EXECUTION_GOVERNANCE_PLAN.md',
  'docs/THREE_TIER_FRAMEWORK.md',
  'docs/guides/MCP_DUI_ORGANIZATION.md',
  'docs/guides/MCP_APPS_INTEGRATION.md'
];

const DEFAULT_QUERIES = [
  'Which policy governs bearer token rotation?',
  'How should large MCP tool catalogs be exposed?',
  'What is the required downstream execution pipeline?',
  'How should tenant tool exposure be governed?',
  'Which framework maps work to Database Automation Judgment?'
];

const SECRET_PATTERNS = [
  { name: 'Hydra DB key assignment', pattern: /HYDRA_DB_API_KEY\s*=\s*["']?[^<\s"']+/i },
  { name: 'live secret key', pattern: /\bsk_live_[A-Za-z0-9_.-]{8,}\b/ },
  { name: 'Slack token', pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'bearer token literal', pattern: /\bBearer\s+[A-Za-z0-9._-]{24,}\b/i }
];

async function main(options: ParsedArgs): Promise<void> {
  const docs = buildCorpus(options);

  if (options.command === 'plan') {
    printPlan(options, docs);
    return;
  }

  if (options.command === 'tools') {
    requirePilotEnv();
    const client = new HydraMcpClient(options.mcpPackage);
    try {
      await client.connect();
      const tools = await client.listTools();
      printJsonOrText(options, {
        toolCount: tools.length,
        tools: tools.map((tool) => tool.name).sort()
      });
    } finally {
      client.close();
    }
    return;
  }

  if (options.command === 'seed') {
    if (!options.dryRun) requirePilotEnv();
    await seedDocuments(options, docs);
    return;
  }

  if (options.command === 'eval') {
    requirePilotEnv();
    await evaluateRecall(options);
    return;
  }

  if (options.command === 'seed-eval') {
    if (!options.dryRun) requirePilotEnv();
    await seedDocuments(options, docs);
    if (options.dryRun) return;
    if (!options.dryRun && options.waitMs > 0) {
      console.log(`Waiting ${options.waitMs}ms for async Hydra DB indexing...`);
      await sleep(options.waitMs);
    }
    await evaluateRecall(options);
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

  constructor(private readonly mcpPackage: string) {}

  async connect(): Promise<void> {
    this.child = spawn('npx', ['-y', this.mcpPackage], {
      env: { ...process.env, HYDRA_DB_LOG_LEVEL: 'ERROR' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const lines = createInterface({ input: this.child.stdout });
    lines.on('line', (line) => this.handleLine(line));

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
      clientInfo: { name: 'hydradb-context-pilot', version: '0.1.0' }
    });
    assertNoRpcError(initialized, 'initialize');
    this.notify('notifications/initialized', {});
  }

  async listTools(): Promise<NonNullable<ToolListResult['tools']>> {
    const response = await this.request('tools/list', {});
    assertNoRpcError(response, 'tools/list');
    const result = response.result as ToolListResult;
    return result.tools ?? [];
  }

  async callTool(name: string, toolArgs: Record<string, unknown>): Promise<ToolCallResult> {
    const response = await this.request('tools/call', {
      name,
      arguments: toolArgs
    });
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

async function seedDocuments(options: ParsedArgs, docs: PilotDocument[]): Promise<void> {
  if (docs.length === 0) throw new Error('No pilot documents selected.');
  for (const doc of docs) assertNoSecretPatterns(doc);

  if (options.dryRun) {
    printJsonOrText(options, {
      dryRun: true,
      wouldSeed: docs.map(summarizeDocument)
    });
    return;
  }

  const client = new HydraMcpClient(options.mcpPackage);
  try {
    await client.connect();
    const seeded: Array<Record<string, unknown>> = [];
    for (const doc of docs) {
      const result = await client.callTool('hydra_db_store', {
        text: buildHydraText(doc),
        title: `${doc.title} (${doc.path})`,
        source_id: doc.sourceId,
        infer: false,
        is_markdown: true
      });
      const summary = firstText(result);
      const record = {
        path: doc.path,
        sourceId: doc.sourceId,
        bytes: doc.bytes,
        sha256: doc.sha256,
        result: compactToolText(summary)
      };
      seeded.push(record);
      if (!options.json) {
        console.log(`seeded ${doc.path} -> ${doc.sourceId}: ${record.result}`);
      }
    }
    if (options.json) printJsonOrText(options, { seeded });
  } finally {
    client.close();
  }
}

async function evaluateRecall(options: ParsedArgs): Promise<void> {
  const client = new HydraMcpClient(options.mcpPackage);
  try {
    await client.connect();
    const results: Array<Record<string, unknown>> = [];
    for (const query of options.queries) {
      const result = await client.callTool('hydra_db_search', {
        query,
        max_results: options.maxResults,
        mode: 'thinking',
        graph_context: true
      });
      const text = firstText(result);
      const found = extractFoundCount(text);
      const record = {
        query,
        found,
        passed: found > 0,
        summary: compactToolText(text)
      };
      results.push(record);
      if (!options.json) {
        console.log(
          `${found > 0 ? 'PASS' : 'MISS'} ${query} (${found} result${found === 1 ? '' : 's'})`
        );
      }
    }

    const passed = results.filter((result) => result.passed).length;
    const report = {
      passed,
      total: results.length,
      maxResults: options.maxResults,
      results
    };
    if (options.json) printJsonOrText(options, report);
    if (passed < results.length) {
      throw new Error(
        `Hydra DB recall missed ${results.length - passed} of ${results.length} pilot queries.`
      );
    }
  } finally {
    client.close();
  }
}

function buildCorpus(options: ParsedArgs): PilotDocument[] {
  const paths =
    options.files.length > 0
      ? options.files
      : defaultCorpusPaths({
          allPolicies: options.allPolicies,
          mcpCreation: options.mcpCreation
        });
  const uniquePaths = Array.from(new Set(paths.map((path) => normalizeRelativePath(path))));
  const selected =
    typeof options.limit === 'number' ? uniquePaths.slice(0, options.limit) : uniquePaths;

  return selected.map((path) => {
    const absolute = resolve(ROOT, path);
    if (!existsSync(absolute)) throw new Error(`Pilot corpus file missing: ${path}`);
    const text = readFileSync(absolute, 'utf8');
    return {
      path,
      title: extractTitle(text, path),
      sourceId: sourceIdForPath(path),
      bytes: Buffer.byteLength(text, 'utf8'),
      sha256: createHash('sha256').update(text).digest('hex').slice(0, 16),
      text
    };
  });
}

function defaultCorpusPaths(options: { allPolicies: boolean; mcpCreation: boolean }): string[] {
  if (!options.allPolicies && !options.mcpCreation) return CURATED_CORPUS;
  const paths: string[] = [];
  if (options.mcpCreation) paths.push(...MCP_CREATION_CORPUS);
  if (!options.allPolicies) return paths;

  const policyDir = resolve(ROOT, 'docs/policies/v1');
  const policies = readdirSync(policyDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => `docs/policies/v1/${name}`);
  paths.push(
    ...policies,
    'docs/MCP_HUB_CONTROL_PLANE.md',
    'docs/HUB_EXECUTION_GOVERNANCE_PLAN.md',
    'docs/THREE_TIER_FRAMEWORK.md'
  );
  return paths;
}

function buildHydraText(doc: PilotDocument): string {
  return [
    `Artifact type: policy_or_architecture_doc`,
    `Trust zone: internal_non_customer`,
    `Source system: git`,
    `Project slug: create_something`,
    `Source path: ${doc.path}`,
    `Source sha256 prefix: ${doc.sha256}`,
    '',
    doc.text
  ].join('\n');
}

function requirePilotEnv(): void {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(', ')}. Run through Infisical: pnpm hydradb:pilot:infisical -- <command>`
    );
  }
}

function assertNoSecretPatterns(doc: PilotDocument): void {
  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(doc.text)) {
      throw new Error(`Refusing to seed ${doc.path}; matched secret guard: ${name}`);
    }
  }
}

function assertNoRpcError(response: JsonRpcResponse, label: string): void {
  if (!response.error) return;
  throw new Error(`${label} failed: ${response.error.message ?? JSON.stringify(response.error)}`);
}

function extractTitle(text: string, path: string): string {
  const heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || basename(path).replace(/\.md$/, '');
}

function sourceIdForPath(path: string): string {
  return `cs-docs-${path
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()}`;
}

function normalizeRelativePath(path: string): string {
  return path.replace(/^\.\//, '').replaceAll('\\', '/');
}

function summarizeDocument(doc: PilotDocument): Record<string, unknown> {
  return {
    path: doc.path,
    title: doc.title,
    sourceId: doc.sourceId,
    bytes: doc.bytes,
    sha256: doc.sha256
  };
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

function printPlan(options: ParsedArgs, docs: PilotDocument[]): void {
  const plan = {
    command: options.command,
    corpusProfile: {
      allPolicies: options.allPolicies,
      mcpCreation: options.mcpCreation
    },
    corpusCount: docs.length,
    corpusBytes: docs.reduce((total, doc) => total + doc.bytes, 0),
    corpus: docs.map(summarizeDocument),
    queries: options.queries,
    mcpPackage: options.mcpPackage,
    env: {
      HYDRA_DB_API_KEY: process.env.HYDRA_DB_API_KEY ? 'present' : 'not loaded',
      HYDRA_DB_TENANT_ID: process.env.HYDRA_DB_TENANT_ID ? 'present' : 'not loaded',
      HYDRA_DB_SUB_TENANT_ID: process.env.HYDRA_DB_SUB_TENANT_ID ? 'present' : 'not loaded'
    }
  };
  printJsonOrText(options, plan);
}

function printJsonOrText(options: ParsedArgs, value: unknown): void {
  if (options.json || typeof value !== 'object' || value === null) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  console.log(JSON.stringify(value, null, 2));
}

function parseArgs(argv: string[]): ParsedArgs {
  const cleanArgv = argv[0] === '--' ? argv.slice(1) : argv;
  const first = cleanArgv[0] as Command | undefined;
  const knownCommands: Command[] = ['plan', 'tools', 'seed', 'eval', 'seed-eval'];
  const command = first && knownCommands.includes(first) ? first : 'plan';
  const rest = command === first ? cleanArgv.slice(1) : cleanArgv;

  const options: ParsedArgs = {
    command,
    allPolicies: false,
    dryRun: false,
    files: [],
    json: false,
    maxResults: DEFAULT_MAX_RESULTS,
    mcpCreation: false,
    mcpPackage: DEFAULT_MCP_PACKAGE,
    queries: [...DEFAULT_QUERIES],
    waitMs: DEFAULT_WAIT_MS
  };
  let queryOverride = false;

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    const next = rest[i + 1];

    switch (arg) {
      case '--all-policies':
        options.allPolicies = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--file':
        if (!next) throw new Error('Missing value for --file.');
        options.files.push(next);
        i += 1;
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
      case '--mcp-creation':
        options.mcpCreation = true;
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
  pnpm hydradb:pilot -- [plan|tools|seed|eval|seed-eval] [options]
  pnpm hydradb:pilot:infisical -- [plan|tools|seed|eval|seed-eval] [options]

Commands:
  plan       Show selected corpus and recall queries without connecting to Hydra DB.
  tools      List available tools from the official Hydra DB MCP server.
  seed       Store the selected corpus in Hydra DB with infer=false.
  eval       Run read-only recall checks against the pilot sub-tenant.
  seed-eval  Seed, wait for async indexing, then run recall checks.

Options:
  --all-policies          Use every docs/policies/v1/*.md file plus core architecture docs.
  --dry-run               For seed/seed-eval, print what would be seeded without writing.
  --file <path>           Add an explicit markdown file. Repeatable.
  --json                  Print machine-readable JSON.
  --limit <n>             Limit selected corpus files.
  --max-results <n>       Recall max_results value. Default: ${DEFAULT_MAX_RESULTS}
  --mcp-creation          Include MCP creation, Composio, packaging, and DUI guidance docs.
  --mcp-package <pkg>     Hydra DB MCP package. Default: ${DEFAULT_MCP_PACKAGE}
  --query <text>          Override recall query. Repeatable.
  --wait-ms <n>           seed-eval indexing wait. Default: ${DEFAULT_WAIT_MS}
  --help                  Show this help.
`);
}

const args = parseArgs(process.argv.slice(2));

try {
  await main(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
