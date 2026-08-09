import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  AnalyzeOptions,
  BrowserProvider,
  BrowserSessionHandle,
  BrowserSessionMetrics,
} from '../types.js';
import { createProviderManager, ProviderManager } from './index.js';

function createProvider(name: string, value: unknown) {
  const calls: string[] = [];
  const metrics: BrowserSessionMetrics = {
    sessionsCreated: 0,
    sessionsClosed: 0,
    sessionErrors: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    pageLoadsCompleted: 0,
    pageLoadErrors: 0,
  };

  const provider: BrowserProvider = {
    name,
    async analyze<T>(_url: string, _script: string, _options?: AnalyzeOptions): Promise<T> {
      calls.push('analyze');
      if (value instanceof Error) throw value;
      return value as T;
    },
    async screenshot(): Promise<Buffer> {
      calls.push('screenshot');
      return Buffer.from('screenshot');
    },
    async openSession(): Promise<BrowserSessionHandle> {
      calls.push('openSession');
      return {
        id: `${name}-session`,
        provider: name,
        async goto(): Promise<void> {},
        async evaluate<T>(): Promise<T> {
          return value as T;
        },
        getPageUrl(): string | null {
          return null;
        },
        async close(): Promise<void> {},
      };
    },
    async healthCheck(): Promise<boolean> {
      return true;
    },
    getSessionMetrics(): BrowserSessionMetrics {
      return metrics;
    },
  };

  return { calls, provider };
}

test('routes compatible stateless analysis to Kitesurf before Chromium', async () => {
  const kitesurf = createProvider('cloudflare-kitesurf', { engine: 'kitesurf' });
  const chromium = createProvider('cloudflare-chromium', { engine: 'chromium' });

  const manager = new ProviderManager({
    primary: 'cloudflare-kitesurf',
    providers: [kitesurf.provider, chromium.provider],
    routes: {
      analyze: ['cloudflare-kitesurf', 'cloudflare-chromium'],
    },
  });

  const result = await manager
    .getProvider()
    .analyze<{ engine: string }>('https://example.com', 'return document.title');

  assert.deepEqual(result, { engine: 'kitesurf' });
  assert.deepEqual(kitesurf.calls, ['analyze']);
  assert.deepEqual(chromium.calls, []);
});

test('returns routing evidence with the operation result without shared lookup state', async () => {
  const kitesurf = createProvider('cloudflare-kitesurf', { engine: 'kitesurf' });
  const manager = new ProviderManager({
    primary: 'cloudflare-kitesurf',
    providers: [kitesurf.provider],
    routes: { analyze: ['cloudflare-kitesurf'] },
  });

  const result = await manager.analyzeWithReceipt<{ engine: string }>(
    'https://example.com',
    'return document.title',
  );

  assert.deepEqual(result, {
    data: { engine: 'kitesurf' },
    receipt: {
      operation: 'analyze',
      capability: 'stateless-public',
      selectedProvider: 'cloudflare-kitesurf',
      attempts: [{
        provider: 'cloudflare-kitesurf',
        outcome: 'success',
        durationMs: result.receipt.attempts[0]?.durationMs,
      }],
      fallbackReason: undefined,
    },
  });
});

test('routes sessionful work directly to Chromium', async () => {
  const kitesurf = createProvider('cloudflare-kitesurf', { engine: 'kitesurf' });
  const chromium = createProvider('cloudflare-chromium', { engine: 'chromium' });

  const manager = new ProviderManager({
    primary: 'cloudflare-kitesurf',
    providers: [kitesurf.provider, chromium.provider],
    routes: {
      openSession: ['cloudflare-chromium'],
    },
  });

  const session = await manager.getProvider().openSession?.();

  assert.equal(session?.provider, 'cloudflare-chromium');
  assert.deepEqual(kitesurf.calls, []);
  assert.deepEqual(chromium.calls, ['openSession']);
});

test('classifies Webflow preview analysis as authenticated and skips Kitesurf', async () => {
  const kitesurf = createProvider('cloudflare-kitesurf', { engine: 'kitesurf' });
  const chromium = createProvider('cloudflare-chromium', { engine: 'chromium' });
  const manager = new ProviderManager({
    primary: 'cloudflare-kitesurf',
    providers: [kitesurf.provider, chromium.provider],
    routes: { analyze: ['cloudflare-kitesurf', 'cloudflare-chromium'] },
  });

  const result = await manager.analyzeWithReceipt<{ engine: string }>(
    'https://preview.webflow.com/preview/example',
    'document.title',
  );

  assert.equal(result.receipt.capability, 'designer-authenticated');
  assert.equal(result.receipt.selectedProvider, 'cloudflare-chromium');
  assert.deepEqual(kitesurf.calls, []);
  assert.deepEqual(chromium.calls, ['analyze']);
});

test('routes pixel-sensitive screenshots directly to Chromium', async () => {
  const kitesurf = createProvider('cloudflare-kitesurf', Buffer.from('kitesurf'));
  const chromium = createProvider('cloudflare-chromium', Buffer.from('chromium'));
  const manager = new ProviderManager({
    primary: 'cloudflare-kitesurf',
    providers: [kitesurf.provider, chromium.provider],
    routes: { screenshot: ['cloudflare-kitesurf', 'cloudflare-chromium'] },
  });

  const result = await manager.screenshotWithReceipt('https://example.com', {
    pixelSensitive: true,
  });

  assert.equal(result.receipt.capability, 'pixel-sensitive');
  assert.equal(result.receipt.selectedProvider, 'cloudflare-chromium');
  assert.deepEqual(kitesurf.calls, []);
  assert.deepEqual(chromium.calls, ['screenshot']);
});

test('records the failed Kitesurf attempt and selected Chromium fallback', async () => {
  const kitesurf = createProvider(
    'cloudflare-kitesurf',
    new Error('Kitesurf cannot render this page'),
  );
  const chromium = createProvider('cloudflare-chromium', { engine: 'chromium' });
  const receipts: unknown[] = [];

  const manager = new ProviderManager({
    primary: 'cloudflare-kitesurf',
    providers: [kitesurf.provider, chromium.provider],
    routes: {
      analyze: ['cloudflare-kitesurf', 'cloudflare-chromium'],
    },
    onRouteReceipt: (receipt: unknown) => {
      receipts.push(receipt);
    },
  });

  const result = await manager
    .getProvider()
    .analyze<{ engine: string }>('https://example.com', 'return document.title');

  assert.deepEqual(result, { engine: 'chromium' });
  assert.equal(receipts.length, 1);

  const receipt = receipts[0] as {
    operation: string;
    selectedProvider: string;
    fallbackReason?: string;
    attempts: Array<{ provider: string; outcome: string; error?: string }>;
  };
  assert.equal(receipt.operation, 'analyze');
  assert.equal(receipt.selectedProvider, 'cloudflare-chromium');
  assert.equal(receipt.fallbackReason, 'Kitesurf cannot render this page');
  assert.deepEqual(
    receipt.attempts.map(({ provider, outcome, error }) => ({ provider, outcome, error })),
    [
      {
        provider: 'cloudflare-kitesurf',
        outcome: 'failure',
        error: 'Kitesurf cannot render this page',
      },
      {
        provider: 'cloudflare-chromium',
        outcome: 'success',
        error: undefined,
      },
    ],
  );
});

test('does not retry a successful operation when receipt recording fails', async () => {
  const kitesurf = createProvider('cloudflare-kitesurf', { engine: 'kitesurf' });
  const chromium = createProvider('cloudflare-chromium', { engine: 'chromium' });

  const manager = new ProviderManager({
    primary: 'cloudflare-kitesurf',
    providers: [kitesurf.provider, chromium.provider],
    routes: {
      analyze: ['cloudflare-kitesurf', 'cloudflare-chromium'],
    },
    onRouteReceipt: () => {
      throw new Error('receipt store unavailable');
    },
  });

  await assert.rejects(
    manager.getProvider().analyze('https://example.com', 'return document.title'),
    /receipt store unavailable/,
  );
  assert.deepEqual(kitesurf.calls, ['analyze']);
  assert.deepEqual(chromium.calls, []);
});

test('keeps fallback selection local to one request while another request is running', async () => {
  const primary = createProvider('steel', { engine: 'steel' });
  const fallback = createProvider('browserless', { engine: 'browserless' });
  let signalFallbackStarted!: () => void;
  const fallbackStarted = new Promise<void>((resolve) => {
    signalFallbackStarted = resolve;
  });
  let releaseFallback!: () => void;
  const fallbackRelease = new Promise<void>((resolve) => {
    releaseFallback = resolve;
  });

  primary.provider.analyze = async () => {
    primary.calls.push('analyze');
    throw new Error('primary request failed');
  };
  fallback.provider.analyze = async <T>() => {
    fallback.calls.push('analyze');
    signalFallbackStarted();
    await fallbackRelease;
    return { engine: 'browserless' } as T;
  };

  const manager = new ProviderManager({
    primary: 'steel',
    providers: [primary.provider, fallback.provider],
  });

  const fallbackRequest = manager
    .getProvider()
    .analyze<{ engine: string }>('https://example.com/fallback', 'return document.title');
  await fallbackStarted;
  const concurrentScreenshot = await manager
    .getProvider()
    .screenshot('https://example.com/concurrent');
  releaseFallback();

  assert.equal(concurrentScreenshot.toString(), 'screenshot');
  assert.deepEqual(primary.calls, ['analyze', 'screenshot']);
  assert.deepEqual(fallback.calls, ['analyze']);
  assert.deepEqual(await fallbackRequest, { engine: 'browserless' });
});

test('builds the declared Cloudflare-first routes while retaining configured incumbents', () => {
  const manager = createProviderManager({
    cloudflareAccountId: 'account-123',
    cloudflareBrowserRunApiToken: 'secret-token',
    steelApiKey: 'steel-token',
    browserlessToken: 'browserless-token',
    connectBrowserRun: async () => {
      throw new Error('not called by configuration test');
    },
  });

  assert.equal(manager.getProviderName(), 'cloudflare-kitesurf');
  assert.deepEqual(
    manager.getHealthMetrics().map(({ provider }) => provider),
    ['cloudflare-kitesurf', 'cloudflare-chromium', 'steel', 'browserless'],
  );
});

test('rollback switch keeps Cloudflare credentials in place while selecting the incumbent', () => {
  const manager = createProviderManager({
    cloudflareBrowserRunEnabled: false,
    cloudflareAccountId: 'account-123',
    cloudflareBrowserRunApiToken: 'secret-token',
    steelApiKey: 'steel-token',
  });

  assert.equal(manager.getProviderName(), 'steel');
  assert.deepEqual(
    manager.getHealthMetrics().map(({ provider }) => provider),
    ['steel'],
  );
});

test('redacts provider credentials from failure receipts and terminal errors', async () => {
  const provider = createProvider(
    'browserless',
    new Error('connect wss://example.test?token=secret-token Authorization: Bearer secret-bearer'),
  );
  const receipts: unknown[] = [];
  const manager = new ProviderManager({
    primary: 'browserless',
    providers: [provider.provider],
    routes: { analyze: ['browserless'] },
    onRouteReceipt: (receipt) => {
      receipts.push(receipt);
    },
  });

  await assert.rejects(
    manager.analyzeWithReceipt('https://example.com', 'document.title'),
    (error: unknown) => {
      assert(error instanceof Error);
      assert.doesNotMatch(error.message, /secret-token|secret-bearer/);
      return true;
    },
  );
  assert.doesNotMatch(JSON.stringify(receipts), /secret-token|secret-bearer/);
});
