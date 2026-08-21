#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  createProviderManager,
  type BrowserOperationResult,
  type BrowserRoutingReceipt,
  type ProviderManager,
} from '../src/providers/index.js';
import type { BrowserRequirement } from '../src/types.js';
import {
  createBrowserExecutionReceipt,
  type BrowserExecutionReceipt,
} from '../src/providers/browser-execution-receipt.js';

type CorpusOperation = 'analyze' | 'screenshot' | 'openSession';
type CorpusScript = 'standard' | 'webgl';

export interface CorpusCase {
  id: string;
  url: string;
  operation: CorpusOperation;
  script?: CorpusScript;
  browserRequirement?: BrowserRequirement;
  expectKitesurfFailure?: boolean;
  expectedEngine: 'cloudflare-kitesurf' | 'cloudflare-chromium';
}

interface Corpus {
  version: string;
  frozenAt: string;
  cases: CorpusCase[];
}

interface ComparisonExecution {
  result: unknown;
  receipt: BrowserExecutionReceipt;
}

interface ComparisonFailure {
  stage: 'routed' | 'baseline';
  error: string;
  durationMs: number;
}

interface FailedExecutionReceipt extends BrowserRoutingReceipt {
  url: string;
  durationMs: number;
  resultHash: null;
  usage: {
    browserMsUsed: null;
    source: 'unavailable';
  };
}

interface FailedComparisonExecution {
  result: null;
  receipt: FailedExecutionReceipt | null;
}

interface ComparisonCaseResult extends CorpusCase {
  passed: boolean;
  selectedAsExpected: boolean;
  classifiedAsExpected: boolean;
  semanticEquivalent: boolean;
  fallbackProven: boolean;
  failures: ComparisonFailure[];
  routed: ComparisonExecution | FailedComparisonExecution;
  baseline: ComparisonExecution | FailedComparisonExecution;
}

export interface CorpusComparisonResult {
  passed: boolean;
  cases: ComparisonCaseResult[];
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

function sanitizeComparisonError(error: unknown, redactions: string[]): string {
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of redactions) {
    if (secret) message = message.split(secret).join('[REDACTED]');
  }
  return message
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:api[_-]?key|token)=)[^&\s"']+/gi, '$1[REDACTED]')
    .replace(/("Authorization"\s*:\s*")[^"]+/gi, '$1[REDACTED]');
}

function createFailedExecution(
  routing: BrowserRoutingReceipt | null,
  corpusCase: CorpusCase,
  durationMs: number,
): FailedComparisonExecution {
  return {
    result: null,
    receipt: routing
      ? {
        ...routing,
        url: corpusCase.url,
        durationMs,
        resultHash: null,
        usage: { browserMsUsed: null, source: 'unavailable' },
      }
      : null,
  };
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
      corpusCase.script === 'webgl'
        ? WEBGL_ANALYSIS_SCRIPT
        : STANDARD_ANALYSIS_SCRIPT,
      corpusCase.browserRequirement
        ? { browserRequirement: corpusCase.browserRequirement }
        : undefined,
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

export async function compareCorpusCases(input: {
  cases: CorpusCase[];
  executeRouted: (corpusCase: CorpusCase) => Promise<ComparisonExecution>;
  executeBaseline: (corpusCase: CorpusCase) => Promise<ComparisonExecution>;
  getRoutedFailureReceipt?: () => BrowserRoutingReceipt | undefined;
  getBaselineFailureReceipt?: () => BrowserRoutingReceipt | undefined;
  redactions?: string[];
}): Promise<CorpusComparisonResult> {
  const cases: ComparisonCaseResult[] = [];
  let passed = true;
  for (const corpusCase of input.cases) {
    let routedRun: ComparisonExecution | undefined;
    let baselineRun: ComparisonExecution | undefined;
    const failures: ComparisonFailure[] = [];
    const routedStartedAt = Date.now();

    try {
      routedRun = await input.executeRouted(corpusCase);
    } catch (error) {
      failures.push({
        stage: 'routed',
        error: sanitizeComparisonError(error, input.redactions ?? []),
        durationMs: Date.now() - routedStartedAt,
      });
    }

    const baselineStartedAt = Date.now();
    try {
      baselineRun = await input.executeBaseline(corpusCase);
    } catch (error) {
      failures.push({
        stage: 'baseline',
        error: sanitizeComparisonError(error, input.redactions ?? []),
        durationMs: Date.now() - baselineStartedAt,
      });
    }

    const routedReceipt = routedRun?.receipt ?? input.getRoutedFailureReceipt?.() ?? null;
    const baselineReceipt = baselineRun?.receipt ?? input.getBaselineFailureReceipt?.() ?? null;
    const selectedAsExpected = routedReceipt?.selectedProvider === corpusCase.expectedEngine;
    const classifiedAsExpected = Boolean(
      routedReceipt
      && (
        !corpusCase.browserRequirement
        || (
          routedReceipt.capability === corpusCase.browserRequirement
          && !routedReceipt.attempts.some((attempt) =>
            attempt.provider === 'cloudflare-kitesurf'
          )
        )
      ),
    );
    const semanticEquivalent = Boolean(
      routedRun
      && baselineRun
      && (
        corpusCase.operation === 'screenshot'
          ? (routedRun.result as { byteLength: number }).byteLength > 0
            && (baselineRun.result as { byteLength: number }).byteLength > 0
          : corpusCase.operation === 'openSession'
            ? true
            : stableJson(routedRun.result) === stableJson(baselineRun.result)
      ),
    );
    const fallbackProven = !corpusCase.expectKitesurfFailure
      || Boolean(routedReceipt?.attempts.some((attempt) =>
        attempt.provider === 'cloudflare-kitesurf' && attempt.outcome === 'failure'
      ));
    const casePassed = failures.length === 0
      && selectedAsExpected
      && classifiedAsExpected
      && semanticEquivalent
      && fallbackProven;
    passed &&= casePassed;
    cases.push({
      ...corpusCase,
      passed: casePassed,
      selectedAsExpected,
      classifiedAsExpected,
      semanticEquivalent,
      fallbackProven,
      failures,
      routed: routedRun ?? createFailedExecution(
        routedReceipt,
        corpusCase,
        failures.find((failure) => failure.stage === 'routed')?.durationMs ?? 0,
      ),
      baseline: baselineRun ?? createFailedExecution(
        baselineReceipt,
        corpusCase,
        failures.find((failure) => failure.stage === 'baseline')?.durationMs ?? 0,
      ),
    });
  }

  return { passed, cases };
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
    const caseIds = new Set<string>();
    for (const corpusCase of corpus.cases) {
      if (caseIds.has(corpusCase.id)) {
        throw new Error(`Browser Run corpus contains duplicate case ID: ${corpusCase.id}`);
      }
      caseIds.add(corpusCase.id);
      if (corpusCase.browserRequirement && corpusCase.expectedEngine !== 'cloudflare-chromium') {
        throw new Error(`${corpusCase.id}: declared browser requirements must select Chromium`);
      }
      if (corpusCase.browserRequirement && corpusCase.expectKitesurfFailure) {
        throw new Error(`${corpusCase.id}: direct Chromium classification and fallback proof must be separate cases`);
      }
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
  if (process.env.BROWSER_RUN_ENABLED !== 'true') {
    throw new Error('BROWSER_RUN_ENABLED=true is required to authorize the Browser Run shadow route');
  }
  const baselineConfigured = Boolean(
    process.env.STEEL_API_KEY
    || process.env.BROWSERLESS_TOKEN
    || process.env.BROWSERLESS_API_KEY,
  );
  if (!baselineConfigured) {
    throw new Error('An incumbent Steel or Browserless credential is required for parity comparison');
  }

  let latestRoutedReceipt: BrowserRoutingReceipt | undefined;
  let latestBaselineReceipt: BrowserRoutingReceipt | undefined;
  const routed = createProviderManager({
    cloudflareBrowserRunEnabled: true,
    cloudflareAccountId,
    cloudflareBrowserRunApiToken,
    onRouteReceipt: (receipt) => {
      latestRoutedReceipt = receipt;
    },
  });
  const baseline = createProviderManager({
    steelApiKey: process.env.STEEL_API_KEY,
    browserlessToken: process.env.BROWSERLESS_TOKEN ?? process.env.BROWSERLESS_API_KEY,
    onRouteReceipt: (receipt) => {
      latestBaselineReceipt = receipt;
    },
  });
  const comparison = await compareCorpusCases({
    cases: corpus.cases,
    executeRouted: async (corpusCase) => {
      latestRoutedReceipt = undefined;
      return await execute(routed, corpusCase);
    },
    executeBaseline: async (corpusCase) => {
      latestBaselineReceipt = undefined;
      return await execute(baseline, corpusCase);
    },
    getRoutedFailureReceipt: () => latestRoutedReceipt,
    getBaselineFailureReceipt: () => latestBaselineReceipt,
    redactions: [
      cloudflareBrowserRunApiToken,
      process.env.STEEL_API_KEY ?? '',
      process.env.BROWSERLESS_TOKEN ?? '',
      process.env.BROWSERLESS_API_KEY ?? '',
    ],
  });

  const generatedAt = new Date().toISOString();
  const report = {
    schemaVersion: 2,
    generatedAt,
    corpusVersion: corpus.version,
    corpusHash: `sha256:${await sha256(corpusText)}`,
    ...comparison,
  };
  const outputPath = path.resolve(
    parseArg('--output')
      ?? `.artifacts/browser-run-comparison/${generatedAt.replace(/[:.]/g, '-')}.json`,
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`browser comparison ${comparison.passed ? 'passed' : 'failed'}: ${outputPath}`);
  if (!comparison.passed) process.exitCode = 1;
}

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (isMainModule) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
