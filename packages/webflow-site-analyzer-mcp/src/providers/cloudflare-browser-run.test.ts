import assert from 'node:assert/strict';
import test from 'node:test';

import type { Browser, ConnectOptions, Page } from 'puppeteer-core';
import {
  CloudflareBrowserRunProvider,
  type BrowserRunConnect,
} from './cloudflare-browser-run.js';

interface BrowserFixture {
  browser: Browser;
  closeCalls: number;
  page: Page;
}

function createBrowserFixture(evaluateResult: unknown = { title: 'Example' }): BrowserFixture {
  let closeCalls = 0;
  const page = {
    async setViewport() {},
    async setUserAgent() {},
    async setCookie() {},
    async goto() {},
    async waitForSelector() {},
    async evaluate(script: string) {
      if (script.includes('setTimeout')) return undefined;
      if (evaluateResult instanceof Error) throw evaluateResult;
      return evaluateResult;
    },
    async screenshot() {
      return new Uint8Array([137, 80, 78, 71]);
    },
  } as unknown as Page;
  const browser = {
    async newPage() {
      return page;
    },
    async close() {
      closeCalls += 1;
    },
  } as unknown as Browser;

  return {
    browser,
    page,
    get closeCalls() {
      return closeCalls;
    },
  };
}

test('connects Kitesurf through the documented Browser Run CDP endpoint', async () => {
  const fixture = createBrowserFixture();
  const connections: ConnectOptions[] = [];
  const connect: BrowserRunConnect = async (options) => {
    connections.push(options);
    return fixture.browser;
  };
  const provider = new CloudflareBrowserRunProvider({
    accountId: 'account-123',
    apiToken: 'secret-token',
    engine: 'kitesurf',
    keepAliveMs: 60_000,
    connect,
  });

  await provider.analyze('https://example.com', 'document.title');

  assert.equal(provider.name, 'cloudflare-kitesurf');
  assert.equal(
    connections[0]?.browserWSEndpoint,
    'wss://api.cloudflare.com/client/v4/accounts/account-123/browser-run/devtools/browser?browser=kitesurf',
  );
  assert.deepEqual(connections[0]?.headers, {
    Authorization: 'Bearer secret-token',
  });
  assert.equal(fixture.closeCalls, 1);
});

test('connects Chromium through the documented Browser Run Chromium endpoint', async () => {
  const fixture = createBrowserFixture();
  const connections: ConnectOptions[] = [];
  const connect: BrowserRunConnect = async (options) => {
    connections.push(options);
    return fixture.browser;
  };
  const provider = new CloudflareBrowserRunProvider({
    accountId: 'account-123',
    apiToken: 'secret-token',
    engine: 'chromium',
    connect,
  });

  const session = await provider.openSession();
  await session.close();

  assert.equal(provider.name, 'cloudflare-chromium');
  assert.equal(
    connections[0]?.browserWSEndpoint,
    'wss://api.cloudflare.com/client/v4/accounts/account-123/browser-rendering/devtools/browser?keep_alive=600000',
  );
  assert.deepEqual(connections[0]?.headers, {
    Authorization: 'Bearer secret-token',
  });
  assert.equal(fixture.closeCalls, 1);
});

test('closes the Browser Run session when page evaluation fails', async () => {
  const fixture = createBrowserFixture(new Error('page script failed'));
  const provider = new CloudflareBrowserRunProvider({
    accountId: 'account-123',
    apiToken: 'secret-token',
    engine: 'kitesurf',
    connect: async () => fixture.browser,
  });

  await assert.rejects(
    provider.analyze('https://example.com', 'document.title'),
    /page script failed/,
  );
  assert.equal(fixture.closeCalls, 1);
  const metrics = provider.getSessionMetrics();
  assert.deepEqual({
    ...metrics,
    totalDurationMs: 0,
    averageDurationMs: 0,
  }, {
    sessionsCreated: 1,
    sessionsClosed: 1,
    sessionErrors: 1,
    totalDurationMs: 0,
    averageDurationMs: 0,
    pageLoadsCompleted: 1,
    pageLoadErrors: 1,
  });
  assert.equal(Number.isFinite(metrics.totalDurationMs), true);
  assert.equal(Number.isFinite(metrics.averageDurationMs), true);
});

test('redacts the API token when the external CDP connection fails', async () => {
  const provider = new CloudflareBrowserRunProvider({
    accountId: 'account-123',
    apiToken: 'secret-token',
    engine: 'chromium',
    connect: async (options) => {
      throw new Error(`connection rejected: ${JSON.stringify(options)}`);
    },
  });

  await assert.rejects(provider.openSession(), (error: unknown) => {
    assert(error instanceof Error);
    assert.match(error.message, /Cloudflare Browser Run chromium connection failed/);
    assert.doesNotMatch(error.message, /secret-token/);
    assert.doesNotMatch(error.message, /Authorization/);
    return true;
  });
});

test('uses Chromium for Designer extraction and closes the session', async () => {
  const fixture = createBrowserFixture();
  const extracted = {
    siteName: 'Example',
    sitePlan: 'CMS',
    pages: [],
    styleClasses: [],
    components: [],
    interactions: [],
    cmsCollections: [],
    assets: [],
    breakpoints: ['Desktop'],
  };
  const provider = new CloudflareBrowserRunProvider({
    accountId: 'account-123',
    apiToken: 'secret-token',
    engine: 'chromium',
    connect: async () => fixture.browser,
    extractDesignerMetadata: async () => extracted,
  });

  assert.deepEqual(
    await provider.extractDesignerMetadata('https://preview.webflow.com/preview/example'),
    extracted,
  );
  assert.equal(fixture.closeCalls, 1);
});

test('rejects Designer extraction on Kitesurf before opening a session', async () => {
  const fixture = createBrowserFixture();
  let connectCalls = 0;
  const provider = new CloudflareBrowserRunProvider({
    accountId: 'account-123',
    apiToken: 'secret-token',
    engine: 'kitesurf',
    connect: async () => {
      connectCalls += 1;
      return fixture.browser;
    },
  });

  await assert.rejects(
    provider.extractDesignerMetadata('https://preview.webflow.com/preview/example'),
    /Kitesurf does not support persistent authenticated Designer extraction/,
  );
  assert.equal(connectCalls, 0);
});
