import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type JsonRpcResult = {
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
  };
};

type SmokeSummary = {
  testedAt: string;
  workerUrl: string;
  healthUrl: string;
  sessionId: string;
  workerVersion?: string;
  elapsedMs: {
    total: number;
    health: number;
    initialize: number;
    notifyInitialized: number;
    toolHealth: number;
    promptFetch: number;
  };
  health: Record<string, unknown>;
  toolHealth: Record<string, unknown>;
  promptChecks: {
    titleMatches: boolean;
    mentionsPublishedFirst: boolean;
    mentionsGatedPublishing: boolean;
  };
  promptExcerpt: string[];
};

const DEFAULT_WORKER_URL = 'https://webflow-template-review-mcp.createsomething.workers.dev/mcp';
const DEFAULT_TOKEN_ENV = 'WEBFLOW_TEMPLATE_REVIEW_MCP_API_KEY';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '..');
const workspaceRoot = path.resolve(packageRoot, '..', '..');
const DEFAULT_OUTPUT_DIR = path.join(packageRoot, 'reports', 'remote-smoke-runs');

function parseArgs(argv: string[]) {
  let workerUrl = process.env.WEBFLOW_TEMPLATE_REVIEW_MCP_URL?.trim() || DEFAULT_WORKER_URL;
  let tokenEnv = process.env.WEBFLOW_TEMPLATE_REVIEW_MCP_TOKEN_ENV?.trim() || DEFAULT_TOKEN_ENV;
  let output: string | undefined;
  let outputDir: string | undefined;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--url' && argv[index + 1]) {
      workerUrl = argv[index + 1] ?? workerUrl;
      index += 1;
      continue;
    }
    if (arg === '--token-env' && argv[index + 1]) {
      tokenEnv = argv[index + 1] ?? tokenEnv;
      index += 1;
      continue;
    }
    if (arg === '--output' && argv[index + 1]) {
      output = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--output-dir' && argv[index + 1]) {
      outputDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--json') {
      json = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { workerUrl, tokenEnv, output, outputDir, json };
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

async function readJson(response: Response): Promise<JsonRpcResult | Record<string, unknown>> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (contentType.includes('text/event-stream')) {
    const dataLine = text
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('data: '));
    if (!dataLine) {
      throw new Error(`Missing event-stream data payload.\n${text}`);
    }
    return JSON.parse(dataLine.slice(6)) as JsonRpcResult;
  }

  return JSON.parse(text) as JsonRpcResult;
}

async function initializeSession(workerUrl: string, token: string): Promise<string> {
  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'smoke-init',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'template-review-remote-smoke',
          version: '1.0.0',
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Initialize failed (${response.status}): ${await response.text()}`);
  }

  const sessionId = response.headers.get('mcp-session-id')?.trim();
  if (!sessionId) {
    throw new Error('Initialize response did not include Mcp-Session-Id.');
  }

  return sessionId;
}

async function notifyInitialized(workerUrl: string, token: string, sessionId: string): Promise<void> {
  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Mcp-Session-Id': sessionId,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    }),
  });

  if (!response.ok) {
    throw new Error(`Initialized notification failed (${response.status}): ${await response.text()}`);
  }
}

async function callRpc(
  workerUrl: string,
  token: string,
  sessionId: string,
  method: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Mcp-Session-Id': sessionId,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${method}-${Date.now()}`,
      method,
      params,
    }),
  });

  const payload = (await readJson(response)) as JsonRpcResult;
  if (!response.ok) {
    const message = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`${method} failed (${response.status}): ${message}`);
  }

  if (payload.error) {
    throw new Error(`${method} RPC error ${payload.error.code ?? 'unknown'}: ${payload.error.message ?? 'unknown'}`);
  }

  return payload.result;
}

function getToolContent(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  const structured = asRecord(record.structuredContent);
  if (Object.keys(structured).length > 0) {
    return structured;
  }

  const content = Array.isArray(record.content) ? record.content : [];
  const first = asRecord(content[0]);
  const text = typeof first.text === 'string' ? first.text.trim() : '';
  if (!text) {
    return record;
  }

  try {
    return asRecord(JSON.parse(text));
  } catch {
    return {
      content: content,
    };
  }
}

function getPromptText(value: unknown): string {
  const record = asRecord(value);
  const messages = Array.isArray(record.messages) ? record.messages : [];
  const first = asRecord(messages[0]);
  const content = asRecord(first.content);
  return typeof content.text === 'string' ? content.text : '';
}

function ensureAbsolutePath(targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(workspaceRoot, targetPath);
}

function createTimestampSlug(isoString: string): string {
  return isoString.replaceAll(':', '').replaceAll('.', '').replace('T', '-').replace('Z', 'Z');
}

function writeArtifact(summary: SmokeSummary, output?: string, outputDir?: string): string | null {
  const explicitOutput = output?.trim();
  const targetDir = outputDir?.trim()
    ? ensureAbsolutePath(outputDir)
    : null;
  const targetPath = explicitOutput
    ? ensureAbsolutePath(explicitOutput)
    : targetDir
      ? path.join(targetDir, `remote-smoke-${createTimestampSlug(summary.testedAt)}.json`)
      : null;

  if (!targetPath) {
    return null;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  return targetPath;
}

function printHuman(summary: SmokeSummary, artifactPath: string | null): void {
  console.log('[template-review smoke]');
  console.log(`  tested at: ${summary.testedAt}`);
  console.log(`  worker: ${summary.workerUrl}`);
  console.log(`  total elapsed: ${summary.elapsedMs.total}ms`);
  console.log(`  health elapsed: ${summary.elapsedMs.health}ms`);
  console.log(`  initialize elapsed: ${summary.elapsedMs.initialize}ms`);
  console.log(`  tool health elapsed: ${summary.elapsedMs.toolHealth}ms`);
  console.log(`  prompt elapsed: ${summary.elapsedMs.promptFetch}ms`);
  console.log(`  prompt title matches: ${summary.promptChecks.titleMatches}`);
  console.log(`  published-first wording: ${summary.promptChecks.mentionsPublishedFirst}`);
  console.log(`  gated publishing wording: ${summary.promptChecks.mentionsGatedPublishing}`);
  if (artifactPath) {
    console.log(`  artifact: ${artifactPath}`);
  }
}

async function main() {
  const startedAt = Date.now();
  const testedAt = new Date().toISOString();
  const { workerUrl, tokenEnv, output, outputDir, json } = parseArgs(process.argv.slice(2));
  const token = requireEnv(tokenEnv);
  const healthUrl = new URL('/health', workerUrl).toString();

  const healthStartedAt = Date.now();
  const healthResponse = await fetch(healthUrl, {
    headers: { Accept: 'application/json' },
  });
  if (!healthResponse.ok) {
    throw new Error(`Health endpoint failed (${healthResponse.status}): ${await healthResponse.text()}`);
  }
  const health = (await healthResponse.json()) as Record<string, unknown>;
  const healthElapsedMs = Date.now() - healthStartedAt;

  const initializeStartedAt = Date.now();
  const sessionId = await initializeSession(workerUrl, token);
  const initializeElapsedMs = Date.now() - initializeStartedAt;

  const notifyStartedAt = Date.now();
  await notifyInitialized(workerUrl, token, sessionId);
  const notifyElapsedMs = Date.now() - notifyStartedAt;

  const toolHealthStartedAt = Date.now();
  const toolHealth = getToolContent(
    await callRpc(workerUrl, token, sessionId, 'tools/call', {
      name: 'template_review_health',
      arguments: {},
    }),
  );
  const toolHealthElapsedMs = Date.now() - toolHealthStartedAt;

  const promptStartedAt = Date.now();
  const promptText = getPromptText(
    await callRpc(workerUrl, token, sessionId, 'prompts/get', {
      name: 'template_review_workflow',
      arguments: {},
    }),
  );
  const promptElapsedMs = Date.now() - promptStartedAt;

  const summary: SmokeSummary = {
    testedAt,
    workerUrl,
    healthUrl,
    sessionId,
    workerVersion: typeof health.version === 'string' ? health.version : undefined,
    elapsedMs: {
      total: Date.now() - startedAt,
      health: healthElapsedMs,
      initialize: initializeElapsedMs,
      notifyInitialized: notifyElapsedMs,
      toolHealth: toolHealthElapsedMs,
      promptFetch: promptElapsedMs,
    },
    health,
    toolHealth,
    promptChecks: {
      titleMatches: promptText.startsWith('# Webflow Template Review — Reviewer Workflow Guide'),
      mentionsPublishedFirst: promptText.includes('The analyzer is **published-first**.'),
      mentionsGatedPublishing: promptText.includes(
        'Publishing and asset-finishing actions exist on some lanes, but they are gated follow-on actions rather than the default reviewer workflow.',
      ),
    },
    promptExcerpt: promptText.split('\n').slice(0, 12),
  };

  if (!summary.promptChecks.titleMatches) {
    throw new Error('Prompt title did not match the expected Reviewer Workflow Guide wording.');
  }
  if (!summary.promptChecks.mentionsPublishedFirst) {
    throw new Error('Prompt did not include the published-first analyzer guidance.');
  }
  if (!summary.promptChecks.mentionsGatedPublishing) {
    throw new Error('Prompt did not include the gated publishing guidance.');
  }

  const artifactPath = writeArtifact(summary, output, outputDir);

  if (json) {
    const payload = artifactPath ? { ...summary, artifactPath } : summary;
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  printHuman(summary, artifactPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

export { DEFAULT_OUTPUT_DIR };
