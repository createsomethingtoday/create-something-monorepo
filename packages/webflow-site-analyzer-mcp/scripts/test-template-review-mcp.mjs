#!/usr/bin/env node

/**
 * MCP smoke/integration runner for unified template review.
 *
 * Usage:
 *   node scripts/test-template-review-mcp.mjs \
 *     --preview-url "https://preview.webflow.com/preview/..." \
 *     --published-url "https://example.webflow.io/" \
 *     [--mode sync|async]
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
  const mode = getArg('--mode') || 'sync';
  const timeoutMs = Number(getArg('--timeout-ms') || 300000);
  const maxTotalTimeoutMs = Number(getArg('--max-total-timeout-ms') || 1800000);
  const crawlMaxPages = Number(getArg('--crawl-max-pages') || 20);
  const crawlMaxDepth = Number(getArg('--crawl-max-depth') || 2);
  const includeManual = getArg('--include-manual') !== 'false';
  const pollIntervalMs = Number(getArg('--poll-interval-ms') || 3000);
  const output = getArg('--output') || 'summary';

  if (!publishedUrl) {
    throw new Error('Provide --published-url. Use --preview-url when Designer extraction is needed.');
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

    const toolArgs = {
      publishedUrl,
      timeout: timeoutMs,
      crawlMaxPages,
      crawlMaxDepth,
      includeManual
    };
    if (previewUrl) {
      toolArgs.previewUrl = previewUrl;
    }

    let parsed;
    let finalData;

    if (mode === 'async') {
      const enqueueResult = await client.callTool({
        name: 'enqueue_template_review',
        arguments: toolArgs
      });
      const enqueueParsed = parseToolResult(enqueueResult);
      const jobId = enqueueParsed?.data?.jobId;
      if (!enqueueParsed.ok || !jobId) {
        throw new Error(`Failed to enqueue review job: ${enqueueParsed.rawText || 'unknown error'}`);
      }

      const startedAt = Date.now();
      let job = null;
      while (Date.now() - startedAt < maxTotalTimeoutMs) {
        const jobResult = await client.callTool({
          name: 'get_template_review_job',
          arguments: { jobId }
        });
        const jobParsed = parseToolResult(jobResult);
        job = jobParsed.data;
        const progress = job?.progress;
        if (progress) {
          console.error(
            `[progress] ${progress.progress}/${progress.total} ${progress.phase} ${progress.message}`.trim()
          );
        }
        if (job?.status === 'succeeded' || job?.status === 'failed' || job?.status === 'canceled') {
          parsed = jobParsed;
          finalData = job;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }

      if (!finalData) {
        throw new Error(`Timed out waiting for async job completion after ${maxTotalTimeoutMs}ms`);
      }
    } else {
      const result = await client.callTool(
        {
          name: 'run_template_review',
          arguments: toolArgs
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
            console.error(
              `[progress] ${total != null ? `${progress}/${total}` : progress} ${message}`.trim()
            );
          }
        }
      );

      parsed = parseToolResult(result);
      finalData = parsed.data;
    }

    const report = finalData?.result || finalData || null;
    const summary = report?.summary || null;
    const published = report?.published || null;

    if (output === 'report') {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log(
      JSON.stringify(
        {
          testedAt: new Date().toISOString(),
          mode,
          previewUrl: previewUrl || null,
          publishedUrl,
          timeoutMs,
          maxTotalTimeoutMs,
          crawlMaxPages,
          crawlMaxDepth,
          includeManual,
          ok: parsed?.ok ?? true,
          jobId: finalData?.jobId || report?.jobId || null,
          status: finalData?.status || report?.status || null,
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
