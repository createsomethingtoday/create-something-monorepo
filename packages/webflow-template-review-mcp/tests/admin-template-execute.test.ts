import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';

import {
  buildAdminExecuteBundle,
  buildAdminTemplateCreateExecuteScript,
  buildAdminTemplateUpdateExecuteScript,
  buildAdminThumbnailUploadExecuteScript,
} from '../src/admin-template-execute.js';
import {
  buildThumbnailProxyUrl,
  handleThumbnailProxyRequest,
  signThumbnailProxyClaims,
  verifyThumbnailProxySignature,
  type ThumbnailProxyClaims,
} from '../src/thumbnail-proxy.js';
import type { TemplateReviewAssetThumbnails } from '../src/airtable.js';

const TEMPLATE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

interface RecordedFetch {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  formEntries?: Array<{ field: string; filename?: string; size?: number }>;
}

interface FakeFetchRoute {
  match: (url: string, method: string) => boolean;
  respond: (init: { url: string; body?: unknown }) => {
    ok: boolean;
    status?: number;
    json?: unknown;
    blob?: Blob;
    throwNetworkError?: boolean;
  };
}

function createSandbox(options: {
  routes: FakeFetchRoute[];
  confirmResponses?: boolean[];
  csrfToken?: string | null;
}) {
  const calls: RecordedFetch[] = [];
  const confirmMessages: string[] = [];
  const consoleLines: Array<{ level: string; args: unknown[] }> = [];
  const confirmQueue = [...(options.confirmResponses ?? [])];

  const fakeFetch = async (input: string, init?: { method?: string; headers?: Record<string, string>; body?: unknown }) => {
    const method = init?.method ?? 'GET';
    const call: RecordedFetch = { url: String(input), method, headers: init?.headers ?? {} };
    if (typeof init?.body === 'string') {
      call.body = JSON.parse(init.body);
    } else if (init?.body instanceof FormData) {
      call.formEntries = Array.from(init.body.entries()).map(([field, value]) => ({
        field,
        ...(value instanceof File ? { filename: value.name, size: value.size } : {}),
      }));
    }
    calls.push(call);

    const route = options.routes.find((candidate) => candidate.match(String(input), method));
    if (!route) return { ok: false, status: 404, json: async () => ({}), text: async () => 'not found', blob: async () => new Blob([]) };
    const result = route.respond({ url: String(input), body: call.body });
    if (result.throwNetworkError) throw new TypeError('Failed to fetch');
    return {
      ok: result.ok,
      status: result.status ?? (result.ok ? 200 : 500),
      json: async () => result.json ?? {},
      text: async () => JSON.stringify(result.json ?? {}),
      blob: async () => result.blob ?? new Blob([]),
    };
  };

  const csrfToken = options.csrfToken === undefined ? 'csrf-test-token' : options.csrfToken;
  const sandbox = {
    console: {
      log: (...args: unknown[]) => consoleLines.push({ level: 'log', args }),
      warn: (...args: unknown[]) => consoleLines.push({ level: 'warn', args }),
      error: (...args: unknown[]) => consoleLines.push({ level: 'error', args }),
      table: (...args: unknown[]) => consoleLines.push({ level: 'table', args }),
    },
    document: {
      querySelector: (selector: string) =>
        selector === 'meta[name="_csrf"]' && csrfToken
          ? { getAttribute: (name: string) => (name === 'content' ? csrfToken : null) }
          : null,
    },
    confirm: (message: string) => {
      confirmMessages.push(message);
      return confirmQueue.length > 0 ? confirmQueue.shift()! : true;
    },
    fetch: fakeFetch,
    FormData,
    File,
    Blob,
    Object,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Promise,
  };

  return { sandbox, calls, confirmMessages, consoleLines };
}

async function runScript(script: string, sandbox: Record<string, unknown>): Promise<void> {
  const context = vm.createContext(sandbox);
  await vm.runInContext(script, context);
}

function pngBlob(sizeBytes = 2048): Blob {
  return new Blob([new Uint8Array(sizeBytes)], { type: 'image/png' });
}

const currentTemplate = {
  _id: TEMPLATE_ID,
  name: 'Komanica',
  description: 'A bold editorial agency template.',
  extDetailPageUrl: '/templates/html/komanica-website-template',
  extCategory: 'Design',
  extMainTag: 'Agency',
  type: 'CMS',
  usedCount: 12,
  cost: 9900,
  featured: 0,
  starter: true,
  archived: false,
  tutorial: false,
  standard: true,
};

test('update execute script preserves untouched checkbox booleans and sends a complete payload', async () => {
  const script = buildAdminTemplateUpdateExecuteScript(TEMPLATE_ID, { archived: true, cost: 12900 });
  const { sandbox, calls } = createSandbox({
    routes: [
      {
        match: (url, method) => method === 'GET' && url === `/admin/api/templates/${TEMPLATE_ID}`,
        respond: () => ({ ok: true, json: { template: currentTemplate } }),
      },
      {
        match: (url, method) => method === 'PUT' && url === `/admin/api/templates/${TEMPLATE_ID}`,
        respond: () => ({ ok: true, json: { ...currentTemplate, archived: true, cost: 12900 } }),
      },
    ],
    confirmResponses: [true],
  });

  await runScript(script, sandbox);

  const putCall = calls.find((call) => call.method === 'PUT');
  assert.ok(putCall, 'expected a PUT call');
  assert.equal(putCall.headers['X-XSRF-Token'], 'csrf-test-token');
  const body = putCall.body as Record<string, unknown>;
  // Requested changes applied:
  assert.equal(body.archived, 'on');
  assert.equal(body.cost, 12900);
  // Untouched booleans preserved with checkbox semantics ('on' when true, absent when false):
  assert.equal(body.starter, 'on');
  assert.equal(body.standard, 'on');
  assert.ok(!('tutorial' in body), 'tutorial should stay absent (false)');
  // Passthrough fields survive so the full-form PUT does not wipe them:
  assert.equal(body.name, 'Komanica');
  assert.equal(body.extMainTag, 'Agency');
  assert.equal(body.usedCount, 12);
});

test('update execute script sends nothing when the reviewer cancels the confirmation', async () => {
  const script = buildAdminTemplateUpdateExecuteScript(TEMPLATE_ID, { archived: true });
  const { sandbox, calls } = createSandbox({
    routes: [
      {
        match: (url, method) => method === 'GET' && url === `/admin/api/templates/${TEMPLATE_ID}`,
        respond: () => ({ ok: true, json: { template: currentTemplate } }),
      },
    ],
    confirmResponses: [false],
  });

  await runScript(script, sandbox);
  assert.ok(!calls.some((call) => call.method === 'PUT'), 'no PUT should be sent after cancel');
});

test('update execute script skips the write when changes are a no-op', async () => {
  const script = buildAdminTemplateUpdateExecuteScript(TEMPLATE_ID, { starter: true, cost: 9900 });
  const { sandbox, calls, confirmMessages } = createSandbox({
    routes: [
      {
        match: (url, method) => method === 'GET' && url === `/admin/api/templates/${TEMPLATE_ID}`,
        respond: () => ({ ok: true, json: { template: currentTemplate } }),
      },
    ],
  });

  await runScript(script, sandbox);
  assert.equal(confirmMessages.length, 0, 'no confirmation should be shown for a no-op');
  assert.ok(!calls.some((call) => call.method === 'PUT'));
});

test('update execute script aborts without CSRF token', async () => {
  const script = buildAdminTemplateUpdateExecuteScript(TEMPLATE_ID, { archived: true });
  const { sandbox, calls, consoleLines } = createSandbox({ routes: [], csrfToken: null });

  await runScript(script, sandbox);
  assert.equal(calls.length, 0, 'no requests without a CSRF token');
  assert.ok(consoleLines.some((line) => line.level === 'error' && String(line.args[0]).includes('CSRF')));
});

test('thumbnail execute script falls back to the proxy URL and posts multipart with the CSRF header', async () => {
  const script = buildAdminThumbnailUploadExecuteScript(TEMPLATE_ID, {
    label: 'primary thumbnail',
    filename: 'komanica-tall.png',
    direct_url: 'https://airtable.example/expired.png',
    proxy_url: 'https://worker.example/thumbnail-proxy?asset=rec_a&sig=abc',
  });
  const { sandbox, calls } = createSandbox({
    routes: [
      {
        match: (url) => url.startsWith('https://airtable.example/'),
        respond: () => ({ ok: false, status: 410, throwNetworkError: true }),
      },
      {
        match: (url) => url.startsWith('https://worker.example/thumbnail-proxy'),
        respond: () => ({ ok: true, blob: pngBlob(4096) }),
      },
      {
        match: (url, method) => method === 'POST' && url === `/admin/api/templates/${TEMPLATE_ID}/tall-thumbnail`,
        respond: () => ({ ok: true, json: { _id: TEMPLATE_ID } }),
      },
    ],
    confirmResponses: [true],
  });

  await runScript(script, sandbox);

  const upload = calls.find((call) => call.method === 'POST');
  assert.ok(upload, 'expected the tall-thumbnail POST');
  assert.equal(upload.headers['X-XSRF-Token'], 'csrf-test-token');
  assert.deepEqual(upload.formEntries, [{ field: 'tallThumbnail', filename: 'komanica-tall.png', size: 4096 }]);
});

test('thumbnail execute script uploads nothing when cancelled', async () => {
  const script = buildAdminThumbnailUploadExecuteScript(TEMPLATE_ID, {
    label: 'primary thumbnail',
    filename: 'komanica-tall.png',
    direct_url: 'https://airtable.example/fresh.png',
  });
  const { sandbox, calls } = createSandbox({
    routes: [
      {
        match: (url) => url.startsWith('https://airtable.example/'),
        respond: () => ({ ok: true, blob: pngBlob() }),
      },
    ],
    confirmResponses: [false],
  });

  await runScript(script, sandbox);
  assert.ok(!calls.some((call) => call.method === 'POST'), 'no upload after cancel');
});

const createFormData = {
  template_name: 'Komanica',
  uid: 'komanica',
  admin_form: {
    name: 'Komanica',
    shortName: 'komanica',
    description: 'A bold editorial agency template.',
    extDetailPageUrl: '/templates/html/komanica-website-template',
    extCategory: 'Design',
    extMainTag: 'Agency',
    type: 'CMS',
    cost: '9900',
  },
};

test('create execute script chains POST create, PUT field sync, and thumbnail upload', async () => {
  const script = buildAdminTemplateCreateExecuteScript({
    formData: createFormData,
    thumbnail: {
      label: 'primary thumbnail',
      filename: 'komanica-tall.png',
      direct_url: 'https://airtable.example/fresh.png',
    },
  });
  const { sandbox, calls } = createSandbox({
    routes: [
      {
        match: (url, method) => method === 'POST' && url === '/admin/api/templates',
        respond: () => ({ ok: true, json: { _id: TEMPLATE_ID, usedCount: 0, featured: 0, starter: false } }),
      },
      {
        match: (url, method) => method === 'PUT' && url === `/admin/api/templates/${TEMPLATE_ID}`,
        respond: () => ({ ok: true, json: { _id: TEMPLATE_ID } }),
      },
      {
        match: (url) => url.startsWith('https://airtable.example/'),
        respond: () => ({ ok: true, blob: pngBlob(1024) }),
      },
      {
        match: (url, method) => method === 'POST' && url === `/admin/api/templates/${TEMPLATE_ID}/tall-thumbnail`,
        respond: () => ({ ok: true, json: { _id: TEMPLATE_ID } }),
      },
    ],
    confirmResponses: [true, true],
  });

  await runScript(script, sandbox);

  const methods = calls.map((call) => `${call.method} ${call.url}`);
  assert.deepEqual(methods, [
    'POST /admin/api/templates',
    `PUT /admin/api/templates/${TEMPLATE_ID}`,
    'GET https://airtable.example/fresh.png',
    `POST /admin/api/templates/${TEMPLATE_ID}/tall-thumbnail`,
  ]);

  const createBody = calls[0]!.body as Record<string, unknown>;
  assert.equal(createBody.shortName, 'komanica');
  assert.equal(createBody.cost, 9900, 'cost should be sent as a number in cents');
  const syncBody = calls[1]!.body as Record<string, unknown>;
  assert.equal(syncBody.extCategory, 'Design');
  assert.equal(syncBody.extMainTag, 'Agency');
  assert.ok(!('shortName' in syncBody), 'field sync PUT should not carry shortName');
  assert.ok(!('starter' in syncBody), 'false booleans stay absent in the field sync');
});

test('create execute script aborts before any request when required fields are missing', async () => {
  const script = buildAdminTemplateCreateExecuteScript({
    formData: {
      ...createFormData,
      admin_form: { ...createFormData.admin_form, extMainTag: undefined },
    },
  });
  const { sandbox, calls, consoleLines } = createSandbox({ routes: [], confirmResponses: [true] });

  await runScript(script, sandbox);
  assert.equal(calls.length, 0);
  assert.ok(consoleLines.some((line) => line.level === 'error' && String(line.args[0]).includes('missing required fields')));
});

test('create execute script stops when the create response has no _id', async () => {
  const script = buildAdminTemplateCreateExecuteScript({ formData: createFormData });
  const { sandbox, calls } = createSandbox({
    routes: [
      {
        match: (url, method) => method === 'POST' && url === '/admin/api/templates',
        respond: () => ({ ok: true, json: { message: 'unexpected' } }),
      },
    ],
    confirmResponses: [true],
  });

  await runScript(script, sandbox);
  assert.equal(calls.filter((call) => call.method === 'PUT').length, 0, 'no follow-up PUT without a template id');
});

test('execute bundle carries the shared safety boundary and optional bookmarklet', () => {
  const bundle = buildAdminExecuteBundle({
    action: 'update',
    consoleScript: '(async () => {})();',
    extraBoundary: ['extra'],
    includeBookmarklet: true,
  });
  assert.equal(bundle.schema_version, 'webflow_admin_template_execute.v0.1');
  assert.ok(bundle.execute_boundary.some((line) => line.includes('DOES submit')));
  assert.ok(bundle.execute_boundary.includes('extra'));
  assert.match(bundle.bookmarklet ?? '', /^javascript:/);
});

test('thumbnail proxy signatures roundtrip and reject tampering', async () => {
  const claims: ThumbnailProxyClaims = {
    assetId: 'rec_asset_komanica',
    kind: 'thumbnail',
    index: 0,
    expiresAtEpochSeconds: 2_000_000_000,
  };
  const signature = await signThumbnailProxyClaims('secret-1', claims);
  assert.equal(await verifyThumbnailProxySignature('secret-1', claims, signature), true);
  assert.equal(await verifyThumbnailProxySignature('secret-2', claims, signature), false);
  assert.equal(
    await verifyThumbnailProxySignature('secret-1', { ...claims, index: 1 }, signature),
    false,
  );
  assert.equal(await verifyThumbnailProxySignature('secret-1', claims, 'zz-not-hex'), false);
});

const thumbnails: TemplateReviewAssetThumbnails = {
  assetId: 'rec_asset_komanica',
  templateName: 'Komanica',
  thumbnail: { url: 'https://airtable.example/thumb.png', filename: 'thumb.png', type: 'image/png' },
  secondaryThumbnails: [],
  carouselImages: [],
};

test('thumbnail proxy serves fresh bytes for a valid signed URL', async () => {
  const url = new URL(
    await buildThumbnailProxyUrl({
      origin: 'https://worker.example',
      secret: 'secret-1',
      assetId: 'rec_asset_komanica',
      kind: 'thumbnail',
    }),
  );
  const upstreamCalls: string[] = [];
  const response = await handleThumbnailProxyRequest(url, {
    secret: 'secret-1',
    getThumbnails: async () => thumbnails,
    fetchImpl: (async (input: RequestInfo | URL) => {
      upstreamCalls.push(String(input));
      return new Response(new Blob([new Uint8Array(16)]), { status: 200, headers: { 'Content-Type': 'image/png' } });
    }) as typeof fetch,
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/png');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  assert.deepEqual(upstreamCalls, ['https://airtable.example/thumb.png']);
});

test('thumbnail proxy rejects expired links and bad signatures', async () => {
  const validUrl = new URL(
    await buildThumbnailProxyUrl({
      origin: 'https://worker.example',
      secret: 'secret-1',
      assetId: 'rec_asset_komanica',
      kind: 'thumbnail',
      ttlSeconds: 60,
      nowEpochMs: 1_000_000_000_000,
    }),
  );

  const expired = await handleThumbnailProxyRequest(validUrl, {
    secret: 'secret-1',
    getThumbnails: async () => thumbnails,
    nowEpochMs: 1_000_000_000_000 + 61_000,
  });
  assert.equal(expired.status, 403);

  const tampered = new URL(validUrl.toString());
  tampered.searchParams.set('asset', 'rec_other_asset');
  const badSignature = await handleThumbnailProxyRequest(tampered, {
    secret: 'secret-1',
    getThumbnails: async () => thumbnails,
    nowEpochMs: 1_000_000_000_000,
  });
  assert.equal(badSignature.status, 403);

  const unconfigured = await handleThumbnailProxyRequest(validUrl, {
    secret: undefined,
    getThumbnails: async () => thumbnails,
  });
  assert.equal(unconfigured.status, 503);
});
