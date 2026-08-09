#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  createProviderManager,
  type BrowserOperationResult,
  type ProviderManager,
} from '../src/providers/index.js';
import {
  createBrowserExecutionReceipt,
  type BrowserExecutionReceipt,
} from '../src/providers/browser-execution-receipt.js';

type CorpusOperation = 'analyze' | 'screenshot' | 'webgl-analyze' | 'openSession';

interface CorpusCase {
  id: string;
  url: string;
  operation: CorpusOperation;
  expectedEngine: 'cloudflare-kitesurf' | 'cloudflare-chromium';
}

interface Corpus {
  version: string;
  frozenAt: string;
  cases: CorpusCase[];
}

const STANDARD_ANALYSIS_SCRIPT = `(() => ({
  title: document.title,
  lang: document.documentElement.lang || null,
  h1: Array.from(document.querySelectorAll('h1')).map((node) => node.textContent?.trim() || ''),
  links: document.querySelectorAll('a[href]').length,
  images: document.querySelectorAll('img').length,
  hasBody: Boolean(document.body)
}))()`;

const WEBGL_ANALYSIS_SCRIPT = `(() => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!context) throw new Error('Kitesurf limitation: WebGL unavailable');
  return { webgl: true, title: document.title };
})()`;

function parseArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireValue(value: string | undefined, label: string): string {
  if (!value?.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function execute(
  manager: ProviderManager,
  corpusCase: CorpusCase,
): Promise<{ result: unknown; receipt: BrowserExecutionReceipt }> {
  const startedAt = Date.now();
  let operation: BrowserOperationResult<unknown>;
  if (corpusCase.operation === 'screenshot') {
    operation = await manager.screenshotWithReceipt(corpusCase.url, {
      viewport: { width: 1280, height: 720 },
      fullPage: false,
      format: 'png',
    });
  } else if (corpusCase.operation === 'openSession') {
    const sessionOperation = await manager.openSessionWithReceipt({ url: corpusCase.url });
    const result = {
      provider: sessionOperation.data.provider,
      pageUrl: sessionOperation.data.getPageUrl(),
    };
    await sessionOperation.data.close();
    operation = { data: result, receipt: sessionOperation.receipt };
  } else {
    operation = await manager.analyzeWithReceipt(
      corpusCase.url,
      corpusCase.operation === 'webgl-analyze'
        ? WEBGL_ANALYSIS_SCRIPT
        : STANDARD_ANALYSIS_SCRIPT,
    );
  }

  const receipt = await createBrowserExecutionReceipt(operation.receipt, {
    url: corpusCase.url,
    durationMs: Date.now() - startedAt,
    result: operation.data,
  });
  return {
    result: operation.data instanceof Uint8Array
      ? { byteLength: operation.data.byteLength, format: 'png' }
      : operation.data,
    receipt,
  };
}

async function main(): Promise<void> {
  const corpusPath = path.resolve(
    parseArg('--corpus') ?? 'scripts/browser-run-corpus.json',
  );
  const corpusText = await readFile(corpusPath, 'utf8');
  const corpus = JSON.parse(corpusText) as Corpus;
  if (process.argv.includes('--validate')) {
    if (!corpus.version || corpus.cases.length < 5) {
      throw new Error('Browser Run corpus must have a version and at least five cases');
    }
    console.log(`valid browser corpus ${corpus.version}: ${corpus.cases.length} cases`);
    return;
  }

  const cloudflareAccountId = requireValue(
    process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.CF_ACCOUNT_ID,
    'CLOUDFLARE_ACCOUNT_ID',
  );
  const cloudflareBrowserRunApiToken = requireValue(
    process.env.CLOUDFLARE_BROWSER_RUN_API_TOKEN,
    'CLOUDFLARE_BROWSER_RUN_API_TOKEN',
  );
  const baselineConfigured = Boolean(
    process.env.STEEL_API_KEY
    || process.env.BROWSERLESS_TOKEN
    || process.env.BROWSERLESS_API_KEY,
  );
  if (!baselineConfigured) {
    throw new Error('An incumbent Steel or Browserless credential is required for parity comparison');
  }

  const routed = createProviderManager({
    cloudflareAccountId,
    cloudflareBrowserRunApiToken,
  });
  const baseline = createProviderManager({
    steelApiKey: process.env.STEEL_API_KEY,
    browserlessToken: process.env.BROWSERLESS_TOKEN ?? process.env.BROWSERLESS_API_KEY,
  });
  const cases = [];
  let passed = true;
  for (const corpusCase of corpus.cases) {
    const routedRun = await execute(routed, corpusCase);
    const baselineRun = await execute(baseline, corpusCase);
    const selectedAsExpected = routedRun.receipt.selectedProvider === corpusCase.expectedEngine;
    const semanticEquivalent = corpusCase.operation === 'screenshot'
      ? (routedRun.result as { byteLength: number }).byteLength > 0
        && (baselineRun.result as { byteLength: number }).byteLength > 0
      : corpusCase.operation === 'openSession'
        ? true
        : stableJson(routedRun.result) === stableJson(baselineRun.result);
    const fallbackProven = corpusCase.operation !== 'webgl-analyze'
      || routedRun.receipt.attempts.some((attempt) =>
        attempt.provider === 'cloudflare-kitesurf' && attempt.outcome === 'failure'
      );
    const casePassed = selectedAsExpected && semanticEquivalent && fallbackProven;
    passed &&= casePassed;
    cases.push({
      ...corpusCase,
      passed: casePassed,
      selectedAsExpected,
      semanticEquivalent,
      fallbackProven,
      routed: routedRun,
      baseline: baselineRun,
    });
  }

  const generatedAt = new Date().toISOString();
  const report = {
    schemaVersion: 1,
    generatedAt,
    corpusVersion: corpus.version,
    corpusHash: `sha256:${await sha256(corpusText)}`,
    passed,
    cases,
  };
  const outputPath = path.resolve(
    parseArg('--output')
      ?? `.artifacts/browser-run-comparison/${generatedAt.replace(/[:.]/g, '-')}.json`,
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`browser comparison ${passed ? 'passed' : 'failed'}: ${outputPath}`);
  if (!passed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
