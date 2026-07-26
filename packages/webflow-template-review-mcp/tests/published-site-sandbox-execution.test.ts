import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PublishedSiteSandboxExecutionError,
  runPublishedSiteSandbox,
  type PublishedSiteSandboxRuntime,
  type PublishedSiteSandboxRuntimeOptions,
} from '../src/published-site-sandbox-execution.js';

const OUTPUT_PATH = '/tmp/webflow-template-review-sandbox/published-site-sandbox-output.json';
const SCREENSHOT_DIR = '/tmp/webflow-template-review-sandbox/screenshots';

function outputFixture() {
  return JSON.stringify({
    schema_version: 'published_site_sandbox_output.v0.1',
    run_id: 'run-fixture',
    lane_id: 'published_site_validation',
    source_url: 'https://example-template.webflow.io/',
    policy_snapshot_id: 'policy.fixture',
    status: 'ok',
    evidence_quality: 'Evidence only.',
    discovered_pages: [
      'https://example-template.webflow.io/',
      'https://example-template.webflow.io/about',
    ],
    static_pages: [
      {
        url: 'https://example-template.webflow.io/',
        status: 200,
        title: 'Example template',
        same_origin_links: ['https://example-template.webflow.io/about'],
        image_count: 4,
        missing_alt_count: 1,
        heading_counts: { h1: 1, h2: 2 },
      },
    ],
    rendered: {
      status: 'ok',
      pages: [
        {
          url: 'https://example-template.webflow.io/',
          viewports: [
            {
              name: 'desktop',
              width: 1024,
              height: 768,
              status: 'ok',
              screenshot_path: `${SCREENSHOT_DIR}/home-desktop.png`,
              metrics: { horizontal_overflow: false, h1_count: 1 },
            },
          ],
        },
      ],
    },
    network_summary: { request_count: 12 },
    errors: [],
    caveats: ['No review decision is performed.'],
  });
}

class FakeSandbox implements PublishedSiteSandboxRuntime {
  readonly sandboxId = 'sandbox-fixture';
  killed = false;
  killError: Error | undefined;
  runError: Error | undefined;
  runCodeInput = '';
  output = outputFixture();
  outputExists = true;
  screenshot = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);

  async getInfo() {
    return {
      startedAt: new Date('2026-07-17T19:00:00.000Z'),
      cpuCount: 2,
      memoryMB: 1024,
    };
  }

  async runCode(code: string) {
    this.runCodeInput = code;
    if (this.runError) throw this.runError;
    return { error: undefined };
  }

  files = {
    exists: async (path: string) => (path === OUTPUT_PATH && this.outputExists) || path === SCREENSHOT_DIR,
    read: async (path: string, options?: { format?: 'bytes' }) => {
      if (path === OUTPUT_PATH) return this.output;
      if (options?.format === 'bytes') return this.screenshot;
      throw new Error(`Unexpected read: ${path}`);
    },
    list: async (path: string) =>
      path === SCREENSHOT_DIR
        ? [{ type: 'file' as const, name: 'home-desktop.png', path: `${SCREENSHOT_DIR}/home-desktop.png` }]
        : [],
  };

  async kill() {
    if (this.killError) throw this.killError;
    this.killed = true;
  }
}

function executionConfig(sandbox: FakeSandbox, observe?: (options: PublishedSiteSandboxRuntimeOptions) => void) {
  return {
    apiKey: 'test-only-e2b-key',
    template: 'template-review-browser',
    sandboxFactory: async (options: PublishedSiteSandboxRuntimeOptions) => {
      observe?.(options);
      return sandbox;
    },
  };
}

test('runs the fixed evidence runner, returns compact evidence, and always kills the sandbox', async () => {
  const sandbox = new FakeSandbox();
  let runtimeOptions: PublishedSiteSandboxRuntimeOptions | undefined;

  const result = await runPublishedSiteSandbox(
    {
      published_url: 'https://example-template.webflow.io/',
      run_id: 'run-fixture',
      policy_snapshot_id: 'policy.fixture',
      max_pages: 3,
      max_network_requests: 50,
      timeout_ms: 15_000,
      viewports: [{ name: 'desktop', width: 1024, height: 768 }],
      include_screenshots: true,
    },
    executionConfig(sandbox, (options) => {
      runtimeOptions = options;
    }),
  );

  assert.equal(sandbox.killed, true);
  assert.equal(result.ok, true);
  assert.equal(result.run_id, 'run-fixture');
  assert.equal(result.source_url, 'https://example-template.webflow.io/');
  assert.deepEqual(result.fetched_urls, [
    'https://example-template.webflow.io/',
    'https://example-template.webflow.io/about',
  ]);
  assert.equal(result.evidence.static_pages.length, 1);
  assert.equal(result.evidence.rendered.pages.length, 1);
  assert.equal(result.cleanup.killed, true);
  assert.equal(result.screenshots.length, 1);
  assert.equal(result.screenshots[0]?.included, true);
  assert.equal(result.screenshots[0]?.mime_type, 'image/png');
  assert.equal(result.screenshots[0]?.data, Buffer.from(sandbox.screenshot).toString('base64'));

  assert.ok(runtimeOptions);
  assert.equal(runtimeOptions?.apiKey, 'test-only-e2b-key');
  assert.equal(runtimeOptions?.template, 'template-review-browser');
  assert.deepEqual(runtimeOptions?.envs, {});
  assert.equal(runtimeOptions?.lifecycle.onTimeout, 'kill');
  assert.equal(runtimeOptions?.network, undefined);
  assert.match(sandbox.runCodeInput, /if not address\.is_global:/);
  assert.match(sandbox.runCodeInput, /assert_allowed_url\(new_url\)/);
  assert.match(sandbox.runCodeInput, /await page\.route\('\*\*\/\*', route_handler\)/);
  assert.doesNotMatch(JSON.stringify(result), /test-only-e2b-key/);
});

test('rejects private and credential-bearing URLs before creating a sandbox', async () => {
  for (const published_url of [
    'https://127.0.0.1/',
    'https://169.254.169.254/latest/meta-data/',
    'https://[::1]/',
    'https://user:password@example.com/',
  ]) {
    let factoryCalls = 0;
    await assert.rejects(
      runPublishedSiteSandbox(
        { published_url },
        {
          ...executionConfig(new FakeSandbox()),
          sandboxFactory: async () => {
            factoryCalls += 1;
            return new FakeSandbox();
          },
        },
      ),
      (error: unknown) =>
        error instanceof PublishedSiteSandboxExecutionError
        && error.code === 'PUBLISHED_SITE_SANDBOX_INPUT_INVALID',
    );
    assert.equal(factoryCalls, 0, published_url);
  }
});

test('reports missing coordinator configuration without creating a sandbox', async () => {
  let factoryCalls = 0;
  await assert.rejects(
    runPublishedSiteSandbox(
      { published_url: 'https://example-template.webflow.io/' },
      {
        sandboxFactory: async () => {
          factoryCalls += 1;
          return new FakeSandbox();
        },
      },
    ),
    (error: unknown) =>
      error instanceof PublishedSiteSandboxExecutionError
      && error.code === 'PUBLISHED_SITE_SANDBOX_NOT_CONFIGURED'
      && !JSON.stringify(error.details).includes('test-only-e2b-key'),
  );
  assert.equal(factoryCalls, 0);
});

test('kills the sandbox after runner failure and returns an actionable error', async () => {
  const sandbox = new FakeSandbox();
  sandbox.runError = new Error('kernel unavailable');

  await assert.rejects(
    runPublishedSiteSandbox(
      { published_url: 'https://example-template.webflow.io/' },
      executionConfig(sandbox),
    ),
    (error: unknown) =>
      error instanceof PublishedSiteSandboxExecutionError
      && error.code === 'PUBLISHED_SITE_SANDBOX_EXECUTION_FAILED'
      && error.details?.cleanup?.killed === true,
  );
  assert.equal(sandbox.killed, true);
});

test('kills the sandbox when the runner times out', async () => {
  const sandbox = new FakeSandbox();
  sandbox.runError = new Error('execution timed out after 30000ms');

  await assert.rejects(
    runPublishedSiteSandbox(
      { published_url: 'https://example-template.webflow.io/' },
      executionConfig(sandbox),
    ),
    (error: unknown) =>
      error instanceof PublishedSiteSandboxExecutionError
      && error.code === 'PUBLISHED_SITE_SANDBOX_EXECUTION_FAILED'
      && error.details?.cleanup?.killed === true,
  );
  assert.equal(sandbox.killed, true);
});

test('kills the sandbox when the required evidence artifact is missing', async () => {
  const sandbox = new FakeSandbox();
  sandbox.outputExists = false;

  await assert.rejects(
    runPublishedSiteSandbox(
      { published_url: 'https://example-template.webflow.io/' },
      executionConfig(sandbox),
    ),
    (error: unknown) =>
      error instanceof PublishedSiteSandboxExecutionError
      && error.code === 'PUBLISHED_SITE_SANDBOX_OUTPUT_INVALID'
      && error.details?.cleanup?.killed === true,
  );
  assert.equal(sandbox.killed, true);
});

test('surfaces cleanup failure instead of reporting a successful run', async () => {
  const sandbox = new FakeSandbox();
  sandbox.killError = new Error('kill failed');

  await assert.rejects(
    runPublishedSiteSandbox(
      { published_url: 'https://example-template.webflow.io/' },
      executionConfig(sandbox),
    ),
    (error: unknown) =>
      error instanceof PublishedSiteSandboxExecutionError
      && error.code === 'PUBLISHED_SITE_SANDBOX_CLEANUP_FAILED'
      && error.details?.cleanup?.killed === false,
  );
});

test('omits screenshot bytes that exceed the per-image response cap', async () => {
  const sandbox = new FakeSandbox();
  sandbox.screenshot = new Uint8Array(32);

  const result = await runPublishedSiteSandbox(
    {
      published_url: 'https://example-template.webflow.io/',
      include_screenshots: true,
    },
    {
      ...executionConfig(sandbox),
      maxScreenshotBytes: 8,
      maxTotalScreenshotBytes: 16,
    },
  );

  assert.equal(result.screenshots[0]?.included, false);
  assert.equal(result.screenshots[0]?.omitted_reason, 'per_image_limit');
  assert.equal(result.screenshots[0]?.data, undefined);
});
