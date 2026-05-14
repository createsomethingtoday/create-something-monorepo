#!/usr/bin/env tsx

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';

import { redactSecrets } from '../packages/hydradb-context-mcp/src/redaction.js';

type Command = 'plan' | 'export' | 'seed' | 'eval' | 'seed-eval';

type Options = {
  command: Command;
  dryRun: boolean;
  includeAllComments: boolean;
  includeIssuesWithoutEvidence: boolean;
  issueIds: string[];
  json: boolean;
  labels: string[];
  limit: number;
  maxResults: number;
  mcpPackage: string;
  queries: string[];
  subTenantId: string;
  team: string;
  waitMs: number;
};

type LinearIssue = {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  url: string;
  updatedAt: string;
  state?: { name?: string; type?: string } | null;
  assignee?: { name?: string | null } | null;
  project?: { name?: string | null } | null;
  team?: { key?: string | null } | null;
  labels?: { nodes?: Array<{ name: string }> };
  comments?: {
    nodes?: Array<{
      body: string;
      createdAt: string;
      user?: { name?: string | null } | null;
    }>;
  };
};

type EvidenceDocument = {
  bytes: number;
  issueId: string;
  sourceId: string;
  sha256: string;
  text: string;
  title: string;
  url: string;
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

const LINEAR_API = process.env.LINEAR_API_URL || 'https://api.linear.app/graphql';
const DEFAULT_TEAM = process.env.LINEAR_TEAM_KEY || 'CRE';
const DEFAULT_MCP_PACKAGE = '@hydra_db/mcp@0.1.1';
const DEFAULT_LIMIT = 10;
const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_SUB_TENANT_ID = 'cs-linear-evidence';
const DEFAULT_WAIT_MS = 20_000;

const DEFAULT_QUERIES = [
  'What evidence exists for the Hydra DB wrapper promotion gate?',
  'What evidence exists for the Hydra DB compiled policy preflight?',
  'Has CREATE SOMETHING already validated Hydra DB recall against policy context?'
];

const SECRET_PATTERNS = [
  { name: 'Hydra DB key assignment', pattern: /HYDRA_DB_API_KEY\s*=\s*["']?[^<\s"']+/i },
  { name: 'Linear key assignment', pattern: /LINEAR_API_KEY\s*=\s*["']?[^<\s"']+/i },
  { name: 'OpenAI key assignment', pattern: /OPENAI_API_KEY\s*=\s*["']?[^<\s"']+/i },
  { name: 'live secret key', pattern: /\bsk_live_[A-Za-z0-9_.-]{8,}\b/ },
  { name: 'Slack token', pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'bearer token literal', pattern: /\bBearer\s+[A-Za-z0-9._-]{24,}\b/i }
];

async function main(options: Options): Promise<void> {
  const issues = await fetchIssues(options);
  const documents = buildDocuments(options, issues);

  if (options.command === 'plan' || options.command === 'export') {
    const payload =
      options.command === 'export'
        ? { subTenantId: options.subTenantId, documents }
        : {
            subTenantId: options.subTenantId,
            selected: documents.map(({ bytes, issueId, sourceId, sha256, title, url }) => ({
              bytes,
              issueId,
              sourceId,
              sha256,
              title,
              url
            }))
          };
    printJson(payload);
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
    await evaluateEvidenceRecall(options);
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
    await evaluateEvidenceRecall(options);
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
      clientInfo: { name: 'hydradb-linear-evidence', version: '0.1.0' }
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

async function fetchIssues(options: Options): Promise<LinearIssue[]> {
  requireLinearEnv();

  if (options.issueIds.length > 0) {
    const issues = [];
    for (const issueId of options.issueIds) {
      issues.push(await fetchIssue(issueId));
    }
    return issues;
  }

  const data = await linearGraphql(
    `query Issues($first: Int!) {
      issues(first: $first, orderBy: updatedAt) {
        nodes {
          id identifier title description url updatedAt
          state { name type }
          assignee { name }
          project { name }
          team { key }
          labels { nodes { name } }
          comments(first: 50) { nodes { body createdAt user { name } } }
        }
      }
    }`,
    { first: Math.min(Math.max(options.limit * 3, 25), 250) }
  );

  return (data.issues.nodes as LinearIssue[])
    .filter((issue) => issue.team?.key === options.team)
    .filter((issue) => issue.state?.type === 'completed')
    .filter((issue) => options.labels.every((label) => hasLabel(issue, label)))
    .slice(0, options.limit);
}

async function fetchIssue(issueId: string): Promise<LinearIssue> {
  const data = await linearGraphql(
    `query IssueById($id: String!) {
      issue(id: $id) {
          id identifier title description url updatedAt
          state { name type }
          assignee { name }
          project { name }
          team { key }
          labels { nodes { name } }
          comments(first: 50) { nodes { body createdAt user { name } } }
      }
    }`,
    { id: issueId }
  );
  const issue = data.issue as LinearIssue | null;
  if (!issue) throw new Error(`Linear issue not found: ${issueId}`);
  return issue;
}

async function linearGraphql(query: string, variables: Record<string, unknown>): Promise<any> {
  const response = await fetch(LINEAR_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: requireLinearEnv()
    },
    body: JSON.stringify({ query, variables })
  });
  const body = await response.json();
  if (!response.ok || body.errors) {
    throw new Error(JSON.stringify({ status: response.status, errors: body.errors ?? body }));
  }
  return body.data;
}

function buildDocuments(options: Options, issues: LinearIssue[]): EvidenceDocument[] {
  return issues
    .filter(
      (issue) => options.includeIssuesWithoutEvidence || evidenceComments(options, issue).length > 0
    )
    .map((issue) => {
      const text = buildEvidenceText(options, issue);
      assertNoSecretPatterns(issue.identifier, text);
      const sha256 = createHash('sha256').update(text).digest('hex').slice(0, 16);
      return {
        bytes: Buffer.byteLength(text, 'utf8'),
        issueId: issue.identifier,
        sourceId: sourceIdForIssue(issue),
        sha256,
        text,
        title: `Linear evidence ${issue.identifier}: ${issue.title}`,
        url: issue.url
      };
    });
}

function buildEvidenceText(options: Options, issue: LinearIssue): string {
  const labels = issue.labels?.nodes?.map((label) => label.name).sort() ?? [];
  const comments = evidenceComments(options, issue);
  const summary = sanitize(issue.description ?? 'No description recorded.', 4000);

  return [
    `Artifact type: linear_evidence`,
    `Trust zone: internal_non_customer`,
    `Source system: Linear`,
    `Project slug: create_something`,
    `Linear issue: ${issue.identifier}`,
    `Linear URL: ${issue.url}`,
    `Linear state: ${issue.state?.name ?? 'unknown'} (${issue.state?.type ?? 'unknown'})`,
    `Linear updated at: ${issue.updatedAt}`,
    `Assignee: ${issue.assignee?.name ?? 'unassigned'}`,
    `Project: ${issue.project?.name ?? 'none'}`,
    `Labels: ${labels.join(', ') || 'none'}`,
    '',
    `# ${issue.identifier}: ${sanitize(issue.title, 240)}`,
    '',
    '## Summary',
    '',
    summary,
    '',
    '## Evidence Comments',
    '',
    comments.length === 0
      ? 'No evidence comments selected.'
      : comments
          .map((comment, index) =>
            [
              `### Evidence ${index + 1}`,
              '',
              `Author: ${comment.user?.name ?? 'unknown'}`,
              `Created: ${comment.createdAt}`,
              '',
              sanitize(comment.body, 6000)
            ].join('\n')
          )
          .join('\n\n')
  ].join('\n');
}

async function seedDocuments(options: Options, documents: EvidenceDocument[]): Promise<void> {
  if (documents.length === 0) throw new Error('No Linear evidence documents selected.');

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
        issueId: doc.issueId,
        sourceId: doc.sourceId,
        bytes: doc.bytes,
        sha256: doc.sha256,
        result: compactToolText(firstText(result))
      };
      seeded.push(record);
      if (!options.json) {
        console.log(`seeded ${doc.issueId} -> ${doc.sourceId}: ${record.result}`);
      }
    }
    if (options.json) printJson({ subTenantId: options.subTenantId, seeded });
  } finally {
    client.close();
  }
}

async function evaluateEvidenceRecall(options: Options): Promise<void> {
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
      throw new Error(`Hydra DB Linear evidence recall missed ${results.length - passed} queries.`);
    }
  } finally {
    client.close();
  }
}

function evidenceComments(
  options: Pick<Options, 'includeAllComments'>,
  issue: LinearIssue
): NonNullable<NonNullable<LinearIssue['comments']>['nodes']> {
  const comments = issue.comments?.nodes ?? [];
  if (options.includeAllComments) return comments;
  return comments.filter((comment) => /Evidence:/i.test(comment.body));
}

function hasLabel(issue: LinearIssue, name: string): boolean {
  return issue.labels?.nodes?.some((label) => label.name === name) ?? false;
}

function sourceIdForIssue(issue: LinearIssue): string {
  return `cs-linear-evidence-${issue.identifier.toLowerCase()}`;
}

function sanitize(value: string, maxChars: number): string {
  return redactSecrets(value)
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .slice(0, maxChars)
    .trim();
}

function assertNoSecretPatterns(issueId: string, text: string): void {
  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`Refusing to seed ${issueId}; matched secret guard: ${name}`);
    }
  }
}

function requireLinearEnv(): string {
  const token = process.env.LINEAR_API_KEY?.trim();
  if (!token) throw new Error('LINEAR_API_KEY is required.');
  return token;
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
    includeAllComments: false,
    includeIssuesWithoutEvidence: false,
    issueIds: [],
    json: false,
    labels: ['code-quality'],
    limit: DEFAULT_LIMIT,
    maxResults: DEFAULT_MAX_RESULTS,
    mcpPackage: DEFAULT_MCP_PACKAGE,
    queries: [...DEFAULT_QUERIES],
    subTenantId: DEFAULT_SUB_TENANT_ID,
    team: DEFAULT_TEAM,
    waitMs: DEFAULT_WAIT_MS
  };
  let queryOverride = false;
  let labelOverride = false;

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    const next = rest[i + 1];
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--include-all-comments':
        options.includeAllComments = true;
        break;
      case '--include-issues-without-evidence':
        options.includeIssuesWithoutEvidence = true;
        break;
      case '--issue':
        if (!next) throw new Error('Missing value for --issue.');
        options.issueIds.push(next);
        i += 1;
        break;
      case '--json':
        options.json = true;
        break;
      case '--label':
        if (!next) throw new Error('Missing value for --label.');
        if (!labelOverride) {
          options.labels = [];
          labelOverride = true;
        }
        options.labels.push(next);
        i += 1;
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
      case '--sub-tenant-id':
        if (!next) throw new Error('Missing value for --sub-tenant-id.');
        options.subTenantId = next;
        i += 1;
        break;
      case '--team':
        if (!next) throw new Error('Missing value for --team.');
        options.team = next;
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
  pnpm hydradb:linear-evidence -- [plan|export|seed|eval|seed-eval] [options]
  pnpm hydradb:linear-evidence:infisical -- [seed|eval|seed-eval] [options]

Commands:
  plan       Show sanitized completed Linear evidence selected for Hydra.
  export     Print sanitized evidence documents.
  seed       Store selected evidence in Hydra DB with infer=false.
  eval       Run recall checks against the evidence sub-tenant.
  seed-eval  Seed, wait for async indexing, then run recall checks.

Options:
  --issue <CRE-123>                       Select explicit Linear issue. Repeatable.
  --label <label>                         Filter completed issues by label. Default: code-quality.
  --limit <n>                             Latest completed issue limit. Default: ${DEFAULT_LIMIT}
  --sub-tenant-id <id>                    Hydra sub-tenant. Default: ${DEFAULT_SUB_TENANT_ID}
  --include-all-comments                  Include all comments, not just comments containing Evidence:.
  --include-issues-without-evidence       Include issues even without evidence comments.
  --dry-run                               For seed/seed-eval, print selected source IDs without writing.
  --json                                  Print machine-readable JSON where applicable.
  --max-results <n>                       Recall max_results value. Default: ${DEFAULT_MAX_RESULTS}
  --mcp-package <pkg>                     Hydra DB MCP package. Default: ${DEFAULT_MCP_PACKAGE}
  --query <text>                          Override recall query. Repeatable.
  --team <key>                            Linear team key. Default: ${DEFAULT_TEAM}
  --wait-ms <n>                           seed-eval indexing wait. Default: ${DEFAULT_WAIT_MS}
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
