#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  HydraRecallClient,
  resolveHydraConfig
} from '../packages/hydradb-context-mcp/src/client.js';
import { compileRecallContext } from '../packages/hydradb-context-mcp/src/compiler.js';
import type { ContextRecallResult, RecallMode } from '../packages/hydradb-context-mcp/src/types.js';

type Options = {
  allowEmpty: boolean;
  json: boolean;
  maxExcerptChars: number;
  maxResults: number;
  minScore?: number;
  mode: RecallMode;
  query?: string;
  subTenantId: string;
  task: string;
};

const DEFAULT_TASK = 'select relevant CREATE SOMETHING MCP servers for the current task';
const DEFAULT_MAX_RESULTS = 6;
const DEFAULT_MAX_EXCERPT_CHARS = 700;
const DEFAULT_SUB_TENANT_ID = 'cs-mcp-catalog';
const REGISTRY_CORE_PATH = resolve(process.cwd(), 'config/mcp-hub/registry.core.json');

async function main(options: Options): Promise<void> {
  const config = resolveHydraConfig();
  const client = new HydraRecallClient(config);
  const candidateServerIds = options.query ? [] : candidateServerIdsForTask(options.task);
  const query = options.query ?? buildCatalogQuery(options.task, candidateServerIds);
  const recallMaxResults =
    candidateServerIds.length > 0
      ? Math.min(20, Math.max(options.maxResults, options.maxResults * 3))
      : options.maxResults;
  const recall = await client.recall({
    graphContext: true,
    maxResults: recallMaxResults,
    mode: options.mode,
    query,
    subTenantId: options.subTenantId
  });
  const rankedRecall = rankCandidateRecall(recall, candidateServerIds);
  const compiled = compileRecallContext(rankedRecall, {
    maxExcerptChars: options.maxExcerptChars,
    maxSources: options.maxResults,
    minScore: options.minScore
  });

  if (compiled.resultCount === 0 && !options.allowEmpty) {
    throw new Error(
      `Hydra DB MCP catalog preflight returned no usable context for task: ${options.task}`
    );
  }

  if (options.json) {
    console.log(JSON.stringify({ task: options.task, ...compiled }, null, 2));
    return;
  }

  console.log(`# Hydra DB MCP Catalog Preflight

Task: ${options.task}

${compiled.compiledContext}`);
}

function buildCatalogQuery(task: string, candidateServerIds: string[]): string {
  return [
    task,
    `Candidate server IDs from checked-in registry: ${candidateServerIds.join(', ') || 'none'}`,
    'Prioritize exact server IDs, tags, bundles, lifecycle, catalog exposure mode, and estimated tool count.',
    'Prefer brokered selection for broad catalogs and avoid dormant/local servers unless the task explicitly requires an internal operator lane.',
    'Return source-backed MCP server candidates that should shape tool exposure or routing.'
  ].join('\n');
}

function rankCandidateRecall(
  recall: ContextRecallResult,
  candidateServerIds: string[]
): ContextRecallResult {
  if (candidateServerIds.length === 0) return recall;
  const candidateRank = new Map(candidateServerIds.map((serverId, index) => [serverId, index]));
  const candidateChunks = recall.chunks
    .filter((chunk) => {
      const serverId = catalogServerIdFromSourceId(chunk.sourceId);
      return serverId ? candidateRank.has(serverId) : false;
    })
    .sort((a, b) => {
      const aRank = candidateRank.get(catalogServerIdFromSourceId(a.sourceId) ?? '') ?? 9999;
      const bRank = candidateRank.get(catalogServerIdFromSourceId(b.sourceId) ?? '') ?? 9999;
      if (aRank !== bRank) return aRank - bRank;
      return (b.score ?? 0) - (a.score ?? 0);
    });

  return candidateChunks.length > 0
    ? { ...recall, chunks: candidateChunks, resultCount: candidateChunks.length }
    : recall;
}

function catalogServerIdFromSourceId(sourceId: string | undefined): string | undefined {
  return sourceId?.startsWith('cs-mcp-catalog-')
    ? sourceId.slice('cs-mcp-catalog-'.length)
    : undefined;
}

function candidateServerIdsForTask(task: string): string[] {
  if (!existsSync(REGISTRY_CORE_PATH)) return [];
  const registry = JSON.parse(readFileSync(REGISTRY_CORE_PATH, 'utf8')) as {
    servers?: Record<string, { description?: string; tags?: string[] }>;
  };
  const tokens = taskTokens(task);
  return Object.entries(registry.servers ?? {})
    .map(([serverId, server]) => {
      const tags = server.tags ?? [];
      const haystack = [serverId, server.description ?? '', ...tags].join(' ').toLowerCase();
      const score = tokens.reduce((total, token) => {
        if (serverId.includes(token)) return total + 4;
        if (tags.some((tag) => tag.toLowerCase().includes(token))) return total + 3;
        if (haystack.includes(token)) return total + 1;
        return total;
      }, 0);
      return { serverId, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.serverId.localeCompare(b.serverId))
    .slice(0, 10)
    .map((entry) => entry.serverId);
}

function taskTokens(task: string): string[] {
  const stopwords = new Set([
    'and',
    'for',
    'the',
    'with',
    'that',
    'this',
    'choose',
    'select',
    'server',
    'servers',
    'mcp'
  ]);
  const base = task
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3)
    .filter((token) => !stopwords.has(token));
  const expanded = new Set(base);
  if (base.includes('quality') || base.includes('verification')) {
    expanded.add('code-quality');
    expanded.add('verification');
    expanded.add('ground');
  }
  if (base.includes('template') || base.includes('marketplace')) expanded.add('webflow');
  return [...expanded];
}

function parseArgs(argv: string[]): Options {
  const cleanArgv = argv[0] === '--' ? argv.slice(1) : argv;
  const options: Options = {
    allowEmpty: false,
    json: false,
    maxExcerptChars: DEFAULT_MAX_EXCERPT_CHARS,
    maxResults: DEFAULT_MAX_RESULTS,
    mode: 'thinking',
    subTenantId: DEFAULT_SUB_TENANT_ID,
    task: DEFAULT_TASK
  };

  for (let i = 0; i < cleanArgv.length; i += 1) {
    const arg = cleanArgv[i];
    const next = cleanArgv[i + 1];
    switch (arg) {
      case '--allow-empty':
        options.allowEmpty = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--max-excerpt-chars':
        options.maxExcerptChars = parsePositiveInteger(next, '--max-excerpt-chars');
        i += 1;
        break;
      case '--max-results':
        options.maxResults = parsePositiveInteger(next, '--max-results');
        i += 1;
        break;
      case '--min-score':
        if (!next) throw new Error('Missing value for --min-score.');
        options.minScore = Number.parseFloat(next);
        if (!Number.isFinite(options.minScore))
          throw new Error(`Invalid --min-score value: ${next}`);
        i += 1;
        break;
      case '--mode':
        if (next !== 'fast' && next !== 'thinking') {
          throw new Error('Missing or invalid value for --mode. Expected fast or thinking.');
        }
        options.mode = next;
        i += 1;
        break;
      case '--query':
        if (!next) throw new Error('Missing value for --query.');
        options.query = next;
        i += 1;
        break;
      case '--sub-tenant-id':
        if (!next) throw new Error('Missing value for --sub-tenant-id.');
        options.subTenantId = next;
        i += 1;
        break;
      case '--task':
        if (!next) throw new Error('Missing value for --task.');
        options.task = next;
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
  if (!value) throw new Error(`Missing value for ${flag}.`);
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0)
    throw new Error(`Invalid value for ${flag}: ${value}`);
  return parsed;
}

function printUsage(): void {
  console.log(`Usage:
  pnpm hydradb:mcp-catalog-preflight:infisical -- --task "..."

Options:
  --task <text>               Work description used to build the catalog recall query.
  --query <text>              Override the generated catalog recall query.
  --sub-tenant-id <id>        Hydra catalog sub-tenant. Default: ${DEFAULT_SUB_TENANT_ID}
  --max-results <n>           Recall result limit. Default: ${DEFAULT_MAX_RESULTS}
  --max-excerpt-chars <n>     Compiled excerpt length. Default: ${DEFAULT_MAX_EXCERPT_CHARS}
  --min-score <n>             Optional minimum relevancy score.
  --mode <fast|thinking>      Hydra DB recall mode. Default: thinking.
  --allow-empty               Do not fail when recall returns no usable context.
  --json                      Print machine-readable JSON.
  --help                      Show this help.
`);
}

const options = parseArgs(process.argv.slice(2));

try {
  await main(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
