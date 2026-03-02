#!/usr/bin/env node

/**
 * MCP smoke/integration runner for unified template review.
 *
 * Usage:
 *   node scripts/test-template-review-mcp.mjs \
 *     --preview-url "https://preview.webflow.com/preview/..." \
 *     --published-url "https://example.webflow.io/"
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function parseToolResult(result) {
  if (!result || !Array.isArray(result.content)) {
    return { ok: !result?.isError, data: null, rawText: '' };
  }

  const rawText = result.content
    .filter((part) => part?.type === 'text' && typeof part?.text === 'string')
    .map((part) => part.text)
    .join('\n');

  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  return {
    ok: !result.isError,
    data,
    rawText
  };
}

async function main() {
  const previewUrl = getArg('--preview-url');
  const publishedUrl = getArg('--published-url');
  const timeoutMs = Number(getArg('--timeout-ms') || 300000);
  const maxTotalTimeoutMs = Number(getArg('--max-total-timeout-ms') || 1800000);
  const crawlMaxPages = Number(getArg('--crawl-max-pages') || 20);
  const crawlMaxDepth = Number(getArg('--crawl-max-depth') || 2);
  const includeManual = getArg('--include-manual') !== 'false';

  if (!previewUrl || !publishedUrl) {
    throw new Error('Provide --preview-url and --published-url.');
  }

  const childEnv = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => typeof value === 'string')
  );

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['./dist/index.js'],
    env: childEnv
  });

  const client = new Client(
    { name: 'webflow-template-review-mcp-runner', version: '0.1.0' },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);

    const result = await client.callTool(
      {
        name: 'run_template_review',
        arguments: {
          previewUrl,
          publishedUrl,
          timeout: timeoutMs,
          crawlMaxPages,
          crawlMaxDepth,
          includeManual
        }
      },
      undefined,
      {
        timeout: timeoutMs,
        maxTotalTimeout: maxTotalTimeoutMs,
        resetTimeoutOnProgress: true,
        onprogress: (progressUpdate) => {
          const progress = typeof progressUpdate?.progress === 'number' ? progressUpdate.progress : 0;
          const total = typeof progressUpdate?.total === 'number' ? progressUpdate.total : null;
          const message = typeof progressUpdate?.message === 'string' ? progressUpdate.message : '';
          // stderr so JSON stdout remains parseable
          console.error(
            `[progress] ${total != null ? `${progress}/${total}` : progress} ${message}`.trim()
          );
        }
      }
    );

    const parsed = parseToolResult(result);
    const summary = parsed?.data?.summary || null;
    const published = parsed?.data?.published || null;

    console.log(
      JSON.stringify(
        {
          testedAt: new Date().toISOString(),
          previewUrl,
          publishedUrl,
          timeoutMs,
          maxTotalTimeoutMs,
          crawlMaxPages,
          crawlMaxDepth,
          includeManual,
          ok: parsed.ok,
          summary,
          published: published
            ? {
                visitedPages: published.visitedPages,
                auditedPages: published.auditedPages,
                pagesWithSnippet: published.pagesWithSnippet,
                failingPages: published.failingPages,
                sitemapStatus: published.sitemapStatus
              }
            : null
        },
        null,
        2
      )
    );
  } finally {
    try {
      await client.close();
    } catch {
      // ignore
    }
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      null,
      2
    )
  );
  process.exit(1);
});

