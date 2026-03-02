#!/usr/bin/env node

/**
 * MCP smoke test for Webflow Designer metadata extraction.
 *
 * Usage:
 *   node scripts/test-designer-mcp.mjs
 *   node scripts/test-designer-mcp.mjs --preview-url "https://preview.webflow.com/preview/..."
 *   node scripts/test-designer-mcp.mjs --timeout-ms 180000 --preview-url "..."
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
  const timeoutMs = Number(getArg('--timeout-ms') || 120000);

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['./dist/index.js']
  });

  const client = new Client(
    { name: 'webflow-designer-mcp-smoke', version: '0.1.0' },
    { capabilities: {} }
  );

  const summary = {
    testedAt: new Date().toISOString(),
    previewUrl: previewUrl || null,
    timeoutMs,
    tools: {
      total: 0,
      hasExtractDesignerMetadata: false,
      hasProviderStatus: false
    },
    providerStatus: null,
    designerExtraction: null,
    notes: []
  };

  try {
    await client.connect(transport);

    const toolList = await client.listTools();
    const toolNames = toolList.tools.map((tool) => tool.name);
    summary.tools.total = toolNames.length;
    summary.tools.hasExtractDesignerMetadata = toolNames.includes('extract_designer_metadata');
    summary.tools.hasProviderStatus = toolNames.includes('get_provider_status');

    if (!summary.tools.hasExtractDesignerMetadata) {
      summary.notes.push('extract_designer_metadata not found in tool list');
    }

    const providerStatus = await client.callTool({
      name: 'get_provider_status',
      arguments: {}
    });
    summary.providerStatus = parseToolResult(providerStatus);

    if (previewUrl) {
      const extractionResult = await client.callTool({
        name: 'extract_designer_metadata',
        arguments: {
          url: previewUrl,
          timeout: timeoutMs
        }
      });
      summary.designerExtraction = parseToolResult(extractionResult);
    } else {
      summary.notes.push('Skipped extract_designer_metadata (no --preview-url provided).');
    }

    const providerError = summary.providerStatus?.data?.error;
    if (typeof providerError === 'string' && providerError.includes('Steel API key required')) {
      summary.notes.push(
        'Set STEEL_API_KEY to run Steel-backed Designer extraction.'
      );
    }

    console.log(JSON.stringify(summary, null, 2));
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
