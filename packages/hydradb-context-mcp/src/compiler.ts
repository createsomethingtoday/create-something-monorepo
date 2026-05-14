import type { CompiledRecallContext, CompiledRecallSource, ContextRecallResult } from './types.js';
import { redactSecrets } from './redaction.js';

export type CompileRecallOptions = {
  maxExcerptChars?: number;
  maxSources?: number;
  minScore?: number;
};

const DEFAULT_MAX_EXCERPT_CHARS = 700;
const DEFAULT_MAX_SOURCES = 8;

export function compileRecallContext(
  result: ContextRecallResult,
  options: CompileRecallOptions = {}
): CompiledRecallContext {
  const maxExcerptChars = options.maxExcerptChars ?? DEFAULT_MAX_EXCERPT_CHARS;
  const maxSources = options.maxSources ?? DEFAULT_MAX_SOURCES;
  const minScore = options.minScore;
  const chunks = dedupeChunks(
    result.chunks.filter(
      (chunk) => minScore === undefined || chunk.score === undefined || chunk.score >= minScore
    )
  ).slice(0, maxSources);

  const sources: CompiledRecallSource[] = chunks.map((chunk, index) => ({
    index: index + 1,
    label: sourceLabel(chunk, index),
    score: chunk.score,
    sourceId: chunk.sourceId,
    sourceTitle: chunk.sourceTitle,
    sourceUrl: chunk.sourceUrl
  }));

  const lines = [
    '# Hydra DB Policy Context',
    '',
    `Query: ${redactSecrets(result.query)}`,
    `Scope: tenant=${result.tenantId}; sub_tenant=${result.subTenantId}`,
    `Results used: ${chunks.length} of ${result.resultCount}`,
    '',
    'Use this as advisory recall. Repo files, Linear, Infisical, and current policy artifacts remain the source of truth.',
    '',
    '## Recalled Context',
    ''
  ];

  if (chunks.length === 0) {
    lines.push('No Hydra DB context met the recall threshold.', '');
  } else {
    chunks.forEach((chunk, index) => {
      const source = sources[index];
      const excerpt = clampWhitespace(chunk.excerpt).slice(0, maxExcerptChars);
      lines.push(`### [S${source.index}] ${source.label}`);
      if (chunk.score !== undefined) lines.push(`Score: ${chunk.score.toFixed(4)}`);
      lines.push('');
      lines.push(redactSecrets(excerpt));
      lines.push('');
    });
  }

  lines.push('## Sources');
  if (sources.length === 0) {
    lines.push('- None returned.');
  } else {
    for (const source of sources) {
      const parts = [`[S${source.index}] ${source.label}`];
      if (source.sourceId) parts.push(`source_id=${source.sourceId}`);
      if (source.sourceUrl) parts.push(`url=${source.sourceUrl}`);
      if (source.score !== undefined) parts.push(`score=${source.score.toFixed(4)}`);
      lines.push(`- ${redactSecrets(parts.join('; '))}`);
    }
  }

  return {
    compiledContext: lines.join('\n').trimEnd(),
    query: result.query,
    resultCount: chunks.length,
    server: result.server,
    sources,
    subTenantId: result.subTenantId,
    tenantId: result.tenantId
  };
}

function sourceLabel(chunk: ContextRecallResult['chunks'][number], index: number): string {
  return (
    chunk.sourceTitle ||
    stringMetadata(chunk.metadata, 'source_path') ||
    stringMetadata(chunk.metadata, 'path') ||
    sourcePathFromExcerpt(chunk.excerpt) ||
    linearIssueFromSourceId(chunk.sourceId) ||
    mcpCatalogServerFromSourceId(chunk.sourceId) ||
    sourcePathFromSourceId(chunk.sourceId) ||
    chunk.sourceId ||
    `Hydra DB result ${index + 1}`
  );
}

function dedupeChunks(chunks: ContextRecallResult['chunks']): ContextRecallResult['chunks'] {
  const seen = new Set<string>();
  return chunks.filter((chunk) => {
    const key =
      chunk.sourceId ||
      chunk.sourceTitle ||
      stringMetadata(chunk.metadata, 'source_path') ||
      sourcePathFromExcerpt(chunk.excerpt) ||
      chunk.excerpt.slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stringMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function sourcePathFromExcerpt(excerpt: string): string | undefined {
  const match = excerpt.match(/Source path:\s*([^\n\r]+?)(?:\s+Source sha256|\s+#|$)/i);
  return match?.[1]?.trim();
}

function sourcePathFromSourceId(sourceId: string | undefined): string | undefined {
  if (!sourceId?.startsWith('cs-docs-docs-') || !sourceId.endsWith('-md')) return undefined;
  const slug = sourceId.slice('cs-docs-docs-'.length, -'-md'.length);

  if (slug.startsWith('policies-v1-policy-')) {
    const policySlug = slug.slice('policies-v1-policy-'.length);
    const versionMatch = policySlug.match(/^(.*)-v(\d+)$/);
    if (versionMatch) {
      return `docs/policies/v1/policy.${versionMatch[1]}.v${versionMatch[2]}.md`;
    }
    return `docs/policies/v1/policy.${policySlug}.md`;
  }

  if (slug.startsWith('guides-')) {
    return `docs/guides/${slug.slice('guides-'.length)}.md`;
  }

  return `docs/${slug}.md`;
}

function linearIssueFromSourceId(sourceId: string | undefined): string | undefined {
  const match = sourceId?.match(/^cs-linear-evidence-(cre-\d+)$/i);
  return match ? `Linear ${match[1].toUpperCase()}` : undefined;
}

function mcpCatalogServerFromSourceId(sourceId: string | undefined): string | undefined {
  const match = sourceId?.match(/^cs-mcp-catalog-(.+)$/i);
  return match ? `MCP ${match[1]}` : undefined;
}

function clampWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
