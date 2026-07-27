import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { startRssSampler } from './process-metrics.ts';

export type GroundCheck = 'duplicates' | 'dead_exports' | 'orphans' | 'environment';

export interface GroundFindingSet {
  duplicates: Array<Record<string, unknown>>;
  dead_exports: Array<Record<string, unknown>>;
  orphans: Array<Record<string, unknown>>;
  environment_issues: Array<Record<string, unknown>>;
}

export interface GroundAnalysis {
  directory: string;
  checks_run: GroundCheck[];
  findings: GroundFindingSet;
  framework: {
    detected: string;
    confidence: number;
    evidence: unknown[];
  };
  summary: {
    total_issues: number;
    auto_fixable: number;
    needs_review: number;
  };
  message: string;
}

export interface GroundNativeAnalysisOptions {
  binaryPath: string;
  workspace: string;
  directory: string;
  checks: GroundCheck[];
  entryPoints?: string[];
  crossPackage?: boolean;
  timeoutMs?: number;
  databasePath?: string;
}

export interface GroundNativeAnalysisResult {
  server: {
    name: string;
    version: string;
  };
  toolDiscovered: true;
  analysis: GroundAnalysis;
  timings: {
    connectMs: number;
    discoveryMs: number;
    analysisMs: number;
    totalMs: number;
    peakRssBytes: number | null;
  };
  process: {
    pid: number | null;
    binaryBytes: number;
    stderr: string;
  };
}

export type GroundNativeClientErrorCode =
  | 'GROUND_BINARY_NOT_FOUND'
  | 'GROUND_BINARY_NOT_EXECUTABLE'
  | 'GROUND_CONNECT_FAILED'
  | 'GROUND_TOOL_NOT_DISCOVERED'
  | 'GROUND_TOOL_CALL_FAILED'
  | 'GROUND_MALFORMED_RESULT';

export class GroundNativeClientError extends Error {
  constructor(
    public readonly code: GroundNativeClientErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'GroundNativeClientError';
  }
}

function nowMs(): number {
  return performance.now();
}

function elapsedMs(start: number): number {
  return Number((nowMs() - start).toFixed(3));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasNumericSummary(value: unknown): value is GroundAnalysis['summary'] {
  if (!isRecord(value)) return false;
  return (
    typeof value.total_issues === 'number' &&
    typeof value.auto_fixable === 'number' &&
    typeof value.needs_review === 'number'
  );
}

function hasFindingArrays(value: unknown): value is GroundFindingSet {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.duplicates) &&
    Array.isArray(value.dead_exports) &&
    Array.isArray(value.orphans) &&
    Array.isArray(value.environment_issues)
  );
}

export function parseGroundAnalysisToolResult(result: unknown): GroundAnalysis {
  if (!isRecord(result)) {
    throw new GroundNativeClientError(
      'GROUND_MALFORMED_RESULT',
      'Ground returned a non-object MCP tool result.'
    );
  }

  if (result.isError === true) {
    const errorText = Array.isArray(result.content)
      ? result.content
          .filter(isRecord)
          .map((part) => (typeof part.text === 'string' ? part.text : ''))
          .filter(Boolean)
          .join('\n')
      : '';
    throw new GroundNativeClientError(
      'GROUND_TOOL_CALL_FAILED',
      `Ground analysis failed: ${errorText || 'unknown tool error'}`
    );
  }

  const text = Array.isArray(result.content)
    ? result.content
        .filter(isRecord)
        .find((part) => part.type === 'text' && typeof part.text === 'string')?.text
    : undefined;

  if (typeof text !== 'string') {
    throw new GroundNativeClientError(
      'GROUND_MALFORMED_RESULT',
      'Ground MCP result did not include text content.'
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new GroundNativeClientError(
      'GROUND_MALFORMED_RESULT',
      'Ground MCP text content was not valid JSON.',
      { cause: error }
    );
  }

  if (
    !isRecord(parsed) ||
    typeof parsed.directory !== 'string' ||
    !Array.isArray(parsed.checks_run) ||
    !hasFindingArrays(parsed.findings) ||
    !hasNumericSummary(parsed.summary) ||
    !isRecord(parsed.framework) ||
    typeof parsed.framework.detected !== 'string' ||
    typeof parsed.framework.confidence !== 'number' ||
    !Array.isArray(parsed.framework.evidence) ||
    typeof parsed.message !== 'string'
  ) {
    throw new GroundNativeClientError(
      'GROUND_MALFORMED_RESULT',
      'Ground MCP JSON did not match the expected analysis contract.'
    );
  }

  return parsed as unknown as GroundAnalysis;
}

async function inspectBinary(binaryPath: string): Promise<number> {
  try {
    await access(binaryPath, constants.F_OK);
  } catch (error) {
    throw new GroundNativeClientError(
      'GROUND_BINARY_NOT_FOUND',
      `Ground MCP binary not found: ${binaryPath}`,
      { cause: error }
    );
  }

  try {
    await access(binaryPath, constants.X_OK);
  } catch (error) {
    throw new GroundNativeClientError(
      'GROUND_BINARY_NOT_EXECUTABLE',
      `Ground MCP binary is not executable: ${binaryPath}`,
      { cause: error }
    );
  }

  return (await stat(binaryPath)).size;
}

function wrapError(error: unknown, stderr: string): GroundNativeClientError {
  if (error instanceof GroundNativeClientError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const diagnostic = stderr.trim() ? ` Ground stderr: ${stderr.trim()}` : '';
  return new GroundNativeClientError(
    'GROUND_CONNECT_FAILED',
    `Ground MCP session failed: ${message}.${diagnostic}`,
    error instanceof Error ? { cause: error } : undefined
  );
}

export async function runGroundAnalysis(
  options: GroundNativeAnalysisOptions
): Promise<GroundNativeAnalysisResult> {
  const totalStartedAt = nowMs();
  const timeoutMs = options.timeoutMs ?? 60_000;
  const binaryBytes = await inspectBinary(options.binaryPath);
  const args = ['--workspace', options.workspace];
  if (options.databasePath) {
    args.push('--db', options.databasePath);
  }

  const transport = new StdioClientTransport({
    command: options.binaryPath,
    args,
    cwd: options.workspace,
    stderr: 'pipe'
  });
  const client = new Client(
    { name: 'create-something-ground-native-pilot', version: '0.1.0' },
    { capabilities: {} }
  );
  const stderrChunks: string[] = [];
  transport.stderr?.on('data', (chunk) => stderrChunks.push(String(chunk)));

  let rssSampler = startRssSampler(null);
  let connectMs = 0;
  let discoveryMs = 0;
  let analysisMs = 0;
  let pid: number | null = null;
  let peakRssBytes: number | null = null;

  try {
    const connectStartedAt = nowMs();
    await client.connect(transport, { timeout: timeoutMs });
    connectMs = elapsedMs(connectStartedAt);
    pid = transport.pid;
    rssSampler = startRssSampler(pid);

    const discoveryStartedAt = nowMs();
    const toolList = await client.listTools(undefined, { timeout: timeoutMs });
    discoveryMs = elapsedMs(discoveryStartedAt);
    if (!toolList.tools.some((tool) => tool.name === 'ground_analyze')) {
      throw new GroundNativeClientError(
        'GROUND_TOOL_NOT_DISCOVERED',
        'Ground initialized but did not advertise ground_analyze.'
      );
    }

    const analysisStartedAt = nowMs();
    const toolResult = await client.callTool(
      {
        name: 'ground_analyze',
        arguments: {
          directory: options.directory,
          checks: options.checks,
          entry_points: options.entryPoints ?? [],
          cross_package: options.crossPackage ?? false
        }
      },
      undefined,
      { timeout: timeoutMs }
    );
    analysisMs = elapsedMs(analysisStartedAt);
    const analysis = parseGroundAnalysisToolResult(toolResult);
    peakRssBytes = await rssSampler.stop();

    const serverVersion = client.getServerVersion();
    if (!serverVersion) {
      throw new GroundNativeClientError(
        'GROUND_MALFORMED_RESULT',
        'Ground MCP initialization did not provide server metadata.'
      );
    }

    return {
      server: {
        name: serverVersion.name,
        version: serverVersion.version
      },
      toolDiscovered: true,
      analysis,
      timings: {
        connectMs,
        discoveryMs,
        analysisMs,
        totalMs: elapsedMs(totalStartedAt),
        peakRssBytes
      },
      process: {
        pid,
        binaryBytes,
        stderr: stderrChunks.join('')
      }
    };
  } catch (error) {
    peakRssBytes = await rssSampler.stop();
    void peakRssBytes;
    throw wrapError(error, stderrChunks.join(''));
  } finally {
    await client.close().catch(() => undefined);
  }
}
