import assert from 'node:assert/strict';
import { test } from 'node:test';
import workerModule from './worker.ts';

const worker = workerModule.default ?? workerModule;

function fixture() {
  const objects = new Map();
  const env = {
    UPLOADS_WORKER_SECRET: 'test-upload-secret',
    UPLOADS: {
      async put(key, body, options) { objects.set(key, { body, options }); },
      async get(key) {
        const entry = objects.get(key);
        return entry && {
          body: entry.body,
          httpEtag: '"test-etag"',
          writeHttpMetadata(headers) { headers.set('content-type', entry.options.httpMetadata.contentType); }
        };
      }
    }
  };
  return { env, objects };
}

function upload(kind, secret = 'test-upload-secret', body = new Uint8Array([82, 73, 70, 70])) {
  return new Request('https://uploads.test/upload', {
    method: 'POST',
    headers: { 'x-uploads-secret': secret, 'x-upload-kind': kind, 'x-upload-filename': 'fixture.webp', 'content-type': 'image/webp' },
    body
  });
}

for (const kind of ['library-thumbnail', 'avatar', 'thumbnail', 'secondary-thumbnail', 'gallery']) {
  test(`${kind} uploads retain metadata and can be fetched`, async () => {
    const { env, objects } = fixture();
    const response = await worker.fetch(upload(kind), env);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(objects.size, 1);
    assert.equal(objects.get(result.key).options.customMetadata.uploadType, kind);
    const asset = await worker.fetch(new Request(result.url), env);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get('content-type'), 'image/webp');
    assert.deepEqual(new Uint8Array(await asset.arrayBuffer()), new Uint8Array([82, 73, 70, 70]));
  });
}

test('invalid credentials never write storage, including Library uploads', async () => {
  const { env, objects } = fixture();
  for (const secret of ['', 'incorrect']) {
    const response = await worker.fetch(upload('library-thumbnail', secret), env);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Unauthorized' });
  }
  assert.equal(objects.size, 0);
});

test('unknown kinds and empty files never write storage', async () => {
  const { env, objects } = fixture();
  assert.equal((await worker.fetch(upload('unknown'), env)).status, 400);
  const empty = await worker.fetch(upload('library-thumbnail', 'test-upload-secret', new Uint8Array()), env);
  assert.deepEqual(await empty.json(), { error: 'No file uploaded.' });
  assert.equal(objects.size, 0);
});

test('Library credential accepts its thumbnail and creator avatar only', async () => {
  const { env, objects } = fixture();
  env.LIBRARY_UPLOADS_WORKER_SECRET = 'test-library-secret';
  for (const kind of ['library-thumbnail', 'avatar']) {
    assert.equal((await worker.fetch(upload(kind, 'test-library-secret'), env)).status, 200);
  }
  const count = objects.size;
  for (const kind of ['thumbnail', 'secondary-thumbnail', 'gallery', 'unknown']) {
    assert.equal((await worker.fetch(upload(kind, 'test-library-secret'), env)).status, 401);
  }
  assert.equal(objects.size, count);
  assert.equal((await worker.fetch(upload('thumbnail'), env)).status, 200);
});

test('missing or empty configured credentials fail closed', async () => {
  const { env, objects } = fixture();
  for (const value of [undefined, '']) {
    env.UPLOADS_WORKER_SECRET = value;
    env.LIBRARY_UPLOADS_WORKER_SECRET = value;
    assert.equal((await worker.fetch(upload('library-thumbnail', ''), env)).status, 401);
  }
  assert.equal(objects.size, 0);
});
