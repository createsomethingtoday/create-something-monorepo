import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RuntimeObservationJobContract } from '@create-something/webflow-app-review-preflight';
import { describe, expect, test } from 'vitest';
import {
  redactText,
  runRuntimeObservation,
  sanitizeUrl,
  validateObservationContract
} from '../src/index.js';

function contract(): RuntimeObservationJobContract {
  return {
    schemaVersion: 'runtime_observation_job.v1',
    purpose: 'webflow_observation',
    testPackageId: 'package-1',
    reviewId: 'review-1',
    reviewVersionId: 'version-1',
    bundleSha256: 'b'.repeat(64),
    nonce: 'nonce-1',
    target: { url: 'http://127.0.0.1:4173/runtime-fixture', host: '127.0.0.1' },
    sandboxInstallationId: 'sandbox-1',
    runtimeArtifacts: [
      {
        url: 'http://127.0.0.1:4173/runtime-v1.js',
        sha256: 'a'.repeat(64),
        integrity: 'sha256-fixture'
      }
    ],
    negativeProxyProbe: {
      method: 'GET',
      url: 'http://127.0.0.1:4173/proxy?url=http%3A%2F%2F127.0.0.1%3A4174%2Fcanary'
    },
    lifecycle: {
      readySelector: '[data-runtime-ready]'
    },
    controls: {
      allowedHosts: ['127.0.0.1'],
      maxRequests: 100,
      requestTimeoutMs: 10_000,
      totalTimeoutMs: 90_000,
      networkMode: 'exact_host_allowlist',
      evidenceTrust: 'webflow_observed',
      executionEvidence: 'chromium_cdp_v1',
      negativeProxyCanaryUrl: 'http://127.0.0.1:4174/canary'
    },
    boundaries: {
      partnerCanSubmitEvidence: false,
      officialDecision: null,
      canWriteGovernance: false,
      acceptsAccountCredentials: false
    },
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  };
}

interface AdversarialFixtureOptions {
  markup(integrity: string): string;
  proxyStatus: number;
  runtimeSource?: string;
}

async function runAdversarialFixture({
  markup,
  proxyStatus,
  runtimeSource = 'document.body.setAttribute("data-runtime-ready", "");'
}: AdversarialFixtureOptions): Promise<{
  result: Awaited<ReturnType<typeof runRuntimeObservation>>;
  manifest: Record<string, unknown>;
  networkLog: unknown;
  consoleLog: unknown;
}> {
  const digest = createHash('sha256').update(runtimeSource).digest();
  const integrity = `sha256-${digest.toString('base64')}`;
  const outputDir = await mkdtemp(join(tmpdir(), 'runtime-runner-adversarial-'));
  let jobContract!: RuntimeObservationJobContract;
  const server = createServer((request, response) => {
    const address = server.address() as AddressInfo;
    const origin = `http://127.0.0.1:${address.port}`;
    const url = new URL(request.url ?? '/', origin);
    if (url.pathname === '/v1/runtime-observation-jobs/job-1') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ observationJob: { contract: jobContract } }));
      return;
    }
    if (url.pathname === '/v1/runtime-observation-jobs/job-1/evidence') {
      request.resume();
      request.on('end', () => {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ status: 'complete' }));
      });
      return;
    }
    if (url.pathname === '/runtime-fixture') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html><body>${markup(integrity)}</body>`);
      return;
    }
    if (url.pathname === '/runtime-v1.js') {
      response.writeHead(200, {
        'content-type': 'application/javascript; charset=utf-8',
        'access-control-allow-origin': '*'
      });
      response.end(runtimeSource);
      return;
    }
    if (url.pathname === '/extra-module.js' || url.pathname === '/worker.js') {
      response.writeHead(200, {
        'content-type': 'application/javascript; charset=utf-8',
        'access-control-allow-origin': '*'
      });
      response.end('globalThis.__unreviewedRuntimeCode = true;');
      return;
    }
    if (url.pathname === '/proxy') {
      response.writeHead(proxyStatus, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'fixture_proxy_result' }));
      return;
    }
    response.writeHead(404);
    response.end('not found');
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${address.port}`;
  jobContract = {
    ...contract(),
    target: { url: `${origin}/runtime-fixture`, host: '127.0.0.1' },
    runtimeArtifacts: [
      {
        url: `${origin}/runtime-v1.js`,
        sha256: digest.toString('hex'),
        integrity
      }
    ],
    negativeProxyProbe: { method: 'GET', url: `${origin}/proxy` },
    controls: {
      ...contract().controls,
      allowedHosts: ['127.0.0.1', 'localhost'],
      negativeProxyCanaryUrl: `${origin}/canary`
    }
  };

  try {
    const result = await runRuntimeObservation({
      apiBaseUrl: origin,
      observationJobId: 'job-1',
      capability: 'c'.repeat(64),
      outputDir
    });
    const manifest = JSON.parse(await readFile(join(outputDir, 'manifest.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    const networkLog = JSON.parse(
      await readFile(join(outputDir, 'network-log.json'), 'utf8')
    ) as unknown;
    const consoleLog = JSON.parse(
      await readFile(join(outputDir, 'console-log.json'), 'utf8')
    ) as unknown;
    return { result, manifest, networkLog, consoleLog };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(outputDir, { recursive: true, force: true });
  }
}

describe('runtime observation runner boundaries', () => {
  test('redacts secrets and query values from evidence text', () => {
    expect(redactText('Bearer abcdefghijkl user@example.com')).toBe(
      '[redacted-secret] [redacted-email]'
    );
    expect(sanitizeUrl('https://example.com/path?token=secret&email=user@example.com')).toBe(
      'https://example.com/path?token=%5Bredacted%5D&email=%5Bredacted%5D'
    );
  });

  test('rejects a contract that broadens the server host allowlist', () => {
    const safe = contract();
    expect(() => validateObservationContract('job-1', safe)).not.toThrow();
    expect(() =>
      validateObservationContract('job-1', {
        ...safe,
        target: { url: 'https://attacker.example', host: 'attacker.example' }
      })
    ).toThrow('attempts to broaden its host boundary');
  });

  test('does not let reviewed page code forge a blocked proxy canary', async () => {
    const { result, manifest } = await runAdversarialFixture({
      proxyStatus: 503,
      markup: (integrity) => `
        <script>window.fetch = async () => ({ status: 403 });</script>
        <script src="/runtime-v1.js" integrity="${integrity}" crossorigin="anonymous"></script>`
    });
    expect(result.negativeProxyOutcome).toBe('error');
    expect(manifest.negativeProxyCanary).toMatchObject({ outcome: 'error', statusCode: 503 });
  }, 30_000);

  test('does not treat a fetched but unexecuted pinned script as loaded', async () => {
    const { manifest, networkLog } = await runAdversarialFixture({
      proxyStatus: 403,
      runtimeSource: 'globalThis.__reviewedRuntimeExecuted = true;',
      markup: (integrity) => `
        <link rel="preload" as="script" href="/runtime-v1.js" crossorigin="anonymous">
        <script type="application/json" src="/runtime-v1.js" integrity="${integrity}" crossorigin="anonymous"></script>
        <div data-runtime-ready></div>`
    });
    const observations = manifest.runtimeArtifacts as Array<{ loadedByPage: boolean }>;
    expect(observations[0]?.loadedByPage).toBe(false);
  }, 30_000);

  test('reports anonymous code execution initiated by the pinned runtime', async () => {
    const { manifest } = await runAdversarialFixture({
      proxyStatus: 403,
      runtimeSource: `
        eval('globalThis.__runtimeEvalExecuted = true');
        document.body.setAttribute('data-runtime-ready', '');`,
      markup: (integrity) =>
        `<script src="/runtime-v1.js" integrity="${integrity}" crossorigin="anonymous"></script>`
    });
    expect(manifest.runtimeCreatedScripts).toEqual([
      expect.stringMatching(/^\[inline-or-eval:[a-f0-9]{12}\]$/)
    ]);
  }, 30_000);

  test('does not let the page forge the pinned script integrity attribute', async () => {
    const { manifest } = await runAdversarialFixture({
      proxyStatus: 403,
      markup: (integrity) => `
        <script src="/runtime-v1.js" crossorigin="anonymous"></script>
        <script>
          Object.defineProperty(document, 'scripts', {
            configurable: true,
            value: [{
              src: new URL('/runtime-v1.js', location.href).toString(),
              getAttribute(name) {
                return name === 'integrity' ? '${integrity}' : name === 'crossorigin' ? 'anonymous' : null;
              }
            }]
          });
        </script>`
    });
    const observations = manifest.runtimeArtifacts as Array<{ domIntegrity: string | null }>;
    expect(observations[0]?.domIntegrity).toBeNull();
  }, 30_000);

  test('does not accept an integrity attribute added after the script loaded', async () => {
    const { manifest } = await runAdversarialFixture({
      proxyStatus: 403,
      markup: (integrity) => `
        <script
          src="/runtime-v1.js"
          crossorigin="anonymous"
          onload="this.integrity='${integrity}'"
        ></script>`
    });
    const observations = manifest.runtimeArtifacts as Array<{ domIntegrity: string | null }>;
    expect(observations[0]?.domIntegrity).toBeNull();
  }, 30_000);

  test('reports module and Worker code initiated by the pinned runtime', async () => {
    const { manifest, networkLog } = await runAdversarialFixture({
      proxyStatus: 403,
      runtimeSource: `
        void import('/extra-module.js');
        new Worker('/worker.js');
        document.body.setAttribute('data-runtime-ready', '');`,
      markup: (integrity) =>
        `<script src="/runtime-v1.js" integrity="${integrity}" crossorigin="anonymous"></script>`
    });
    expect(manifest.runtimeCreatedScripts, JSON.stringify(networkLog)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/extra-module.js'),
        expect.stringContaining('/worker.js')
      ])
    );
  }, 30_000);

  test('reports a cross-host module request initiated by the pinned runtime', async () => {
    const { manifest } = await runAdversarialFixture({
      proxyStatus: 403,
      runtimeSource: `
        void import('http://localhost:' + location.port + '/extra-module.js');
        document.body.setAttribute('data-runtime-ready', '');`,
      markup: (integrity) =>
        `<script src="/runtime-v1.js" integrity="${integrity}" crossorigin="anonymous"></script>`
    });
    expect(manifest.runtimeCreatedScripts).toEqual(
      expect.arrayContaining([
        expect.stringContaining('localhost:'),
        expect.stringContaining('/extra-module.js')
      ])
    );
  }, 30_000);

  test('bounds hostile console output at the evidence source', async () => {
    const { consoleLog } = await runAdversarialFixture({
      proxyStatus: 403,
      markup: (integrity) => `
        <script>for (let index = 0; index < 250; index += 1) console.log('flood-' + index);</script>
        <script src="/runtime-v1.js" integrity="${integrity}" crossorigin="anonymous"></script>`
    });
    expect(consoleLog).toMatchObject({
      messages: expect.any(Array),
      droppedMessages: 150
    });
    expect((consoleLog as { messages: unknown[] }).messages).toHaveLength(100);
  }, 30_000);

  test('reports a Blob Worker created by the pinned runtime', async () => {
    const { manifest } = await runAdversarialFixture({
      proxyStatus: 403,
      runtimeSource: `
        const workerUrl = URL.createObjectURL(new Blob([
          'globalThis.__blobWorkerExecuted = true;'
        ], { type: 'application/javascript' }));
        new Worker(workerUrl);
        document.body.setAttribute('data-runtime-ready', '');`,
      markup: (integrity) =>
        `<script src="/runtime-v1.js" integrity="${integrity}" crossorigin="anonymous"></script>`
    });
    expect(manifest.runtimeCreatedScripts).toEqual(
      expect.arrayContaining([expect.stringMatching(/^blob:/)])
    );
  }, 30_000);

  test('reports iframe code execution initiated by the pinned runtime', async () => {
    const { manifest } = await runAdversarialFixture({
      proxyStatus: 403,
      runtimeSource: `
        const frame = document.createElement('iframe');
        frame.srcdoc = '<script>globalThis.__iframeRuntimeExecuted = true<\\/script>';
        document.body.append(frame);
        document.body.setAttribute('data-runtime-ready', '');`,
      markup: (integrity) =>
        `<script src="/runtime-v1.js" integrity="${integrity}" crossorigin="anonymous"></script>`
    });
    expect(manifest.runtimeCreatedScripts).toEqual(
      expect.arrayContaining([expect.stringMatching(/^\[inline-or-eval:[a-f0-9]{12}\]$/)])
    );
  }, 30_000);
});
