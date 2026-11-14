import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deflateRawSync } from 'node:zlib';
import { inspectZip, crc32 } from '../lib/bundle-archive';
import {
  BundleError,
  reportSchema,
  readBoundedBody,
  requireSameOrigin
} from '../lib/bundle-contract';
import {
  ownedBundle,
  bundleSource,
  saveFindings,
  bundleDownload,
  uploadBundle
} from '../lib/bundle-store';

function zip(entries: Array<{ path: string; text: string }>, compressed = false) {
  const local: Buffer[] = [],
    central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.path),
      raw = Buffer.from(entry.text),
      data = compressed ? deflateRawSync(raw) : raw;
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(compressed ? 8 : 0, 8);
    h.writeUInt32LE(crc32(raw), 14);
    h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(raw.length, 22);
    h.writeUInt16LE(name.length, 26);
    local.push(h, name, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(compressed ? 8 : 0, 10);
    c.writeUInt32LE(crc32(raw), 16);
    c.writeUInt32LE(data.length, 20);
    c.writeUInt32LE(raw.length, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(offset, 42);
    central.push(c, name);
    offset += h.length + name.length + data.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

test('bounded ZIP reads stored and deflated code without execution', () => {
  for (const compressed of [false, true]) {
    const files = inspectZip(
      zip(
        [
          { path: 'src/index.js', text: "throw new Error('DO NOT EXECUTE');" },
          { path: 'package.json', text: '{}' }
        ],
        compressed
      )
    );
    assert.equal(files.length, 2);
    assert.equal(files[0].text, "throw new Error('DO NOT EXECUTE');");
  }
});
test('rejects traversal, duplicate paths, malformed ZIP, and corruption', () => {
  for (const path of [
    '../secret.js',
    '/secret.js',
    'C:/secret.js',
    'src/../secret.js',
    'src\\secret.js'
  ])
    assert.throws(() => inspectZip(zip([{ path, text: 'x' }])), BundleError);
  assert.throws(
    () =>
      inspectZip(
        zip([
          { path: 'x.js', text: '1' },
          { path: 'x.js', text: '2' }
        ])
      ),
    BundleError
  );
  assert.throws(() => inspectZip(Buffer.from('not a zip')), BundleError);
  const corrupt = zip([{ path: 'index.js', text: 'export const x = 1;' }]);
  corrupt[38] = 0;
  assert.throws(() => inspectZip(corrupt), /integrity/);
});
test('rejects decompression bombs and truncated archives; records extraction limits', () => {
  assert.throws(
    () => inspectZip(zip([{ path: 'huge.js', text: 'x'.repeat(2 * 1024 * 1024) }], true)),
    /expansion/
  );
  const full = zip([{ path: 'source.js', text: 'x'.repeat(300000) }]);
  assert.throws(() => inspectZip(full.subarray(0, full.length - 1)), BundleError);
  const result = inspectZip(full);
  assert.equal(result[0].text!.length, 262144);
  assert.equal(result[0].truncated, true);
});
test('rejects encrypted, symbolic-link, and ZIP64 entries', () => {
  for (const mode of ['encrypted', 'symlink', 'zip64']) {
    const archive = zip([{ path: 'index.js', text: 'test' }]);
    const central = archive.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    if (mode === 'encrypted') archive.writeUInt16LE(1, central + 8);
    if (mode === 'symlink') archive.writeUInt32LE(0xa0000000, central + 38);
    if (mode === 'zip64') archive.writeUInt32LE(0xffffffff, central + 24);
    assert.throws(() => inspectZip(archive), BundleError);
  }
});
test('streamed bodies cannot bypass byte limit using missing content-length', async () => {
  const request = new Request('https://review.test/api/bundles', {
    method: 'POST',
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(6));
        controller.enqueue(new Uint8Array(6));
        controller.close();
      }
    }),
    duplex: 'half'
  } as RequestInit);
  await assert.rejects(readBoundedBody(request, 10), /allowed size/);
});
test('browser writes reject missing and cross-site origins', () => {
  for (const origin of [undefined, 'https://evil.test'])
    assert.throws(
      () =>
        requireSameOrigin(
          new Request('https://review.test/api/bundles', {
            method: 'POST',
            headers: origin ? { origin } : {}
          })
        ),
      /Site/
    );
  assert.doesNotThrow(() =>
    requireSameOrigin(
      new Request('https://review.test/api/bundles', {
        method: 'POST',
        headers: { origin: 'https://review.test' }
      })
    )
  );
});

const id = '7fdc962c-dbc8-4f37-a452-088c4bd61db4';
const bundle = {
  id,
  filename: 'app.zip',
  appName: 'App',
  versionLabel: '1',
  sha256: 'a'.repeat(64),
  sizeBytes: 100,
  fileCount: 1,
  createdAt: '2026-11-14T00:00:00Z'
};
function store() {
  let objectReads = 0,
    writes = 0;
  const DB = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async first() {
              assert.match(sql, /id = \? AND owner_id = \?/);
              return args[0] === id && args[1] === 'alice' ? bundle : null;
            },
            async run() {
              writes++;
              return {};
            }
          };
        }
      };
    }
  } as unknown as D1Database;
  const BUCKET = {
    async get() {
      objectReads++;
      return {
        async json() {
          return [
            {
              path: 'index.js',
              text: 'export const x=1;',
              readable: true,
              truncated: false,
              sizeBytes: 17
            }
          ];
        }
      };
    }
  } as unknown as R2Bucket;
  return { bindings: { DB, BUCKET }, reads: () => objectReads, writes: () => writes };
}
test('cross-user ID guesses cannot read metadata, source, or archive', async () => {
  const s = store();
  await assert.rejects(ownedBundle(s.bindings, 'bob', id), /not found/);
  await assert.rejects(
    bundleSource(s.bindings, 'bob', { bundle_id: id, path: 'index.js' }),
    /not found/
  );
  await assert.rejects(bundleDownload(s.bindings, 'bob', id), /not found/);
  assert.equal(s.reads(), 0);
  assert.equal(
    (await bundleSource(s.bindings, 'alice', { bundle_id: id, path: 'index.js', limit: 4 }))
      .nextOffset,
    4
  );
});
const report = {
  bundle_id: id,
  bundle_sha256: bundle.sha256,
  model_reported: 'unknown',
  summary: 'Static analysis only.',
  checks: [
    {
      name: 'Runtime login',
      status: 'not_tested',
      method: 'not_tested',
      evidence: 'No runtime was launched.'
    }
  ],
  findings: []
};
test('reports require honest check semantics, matching artifact, and ownership', async () => {
  assert.equal(reportSchema.safeParse(report).success, true);
  assert.equal(
    reportSchema.safeParse({ ...report, checks: [{ ...report.checks[0], status: 'passed' }] })
      .success,
    false
  );
  const s = store();
  await assert.rejects(saveFindings(s.bindings, 'bob', report), /not found/);
  await assert.rejects(
    saveFindings(s.bindings, 'alice', { ...report, bundle_sha256: 'b'.repeat(64) }),
    /SHA-256/
  );
  assert.equal(s.writes(), 0);
  const result = await saveFindings(s.bindings, 'alice', report);
  assert.equal(result.officialReviewChanged, false);
  assert.equal(result.developerMessageSent, false);
  assert.equal(result.provenance, 'agent-reported');
});
test("upload stores the exact bytes and verified source under the owner's namespace", async () => {
  const objects = new Map<string, unknown>();
  const archive = zip([{ path: 'src/index.js', text: "console.log('static only');" }], true);
  let persisted: unknown[] = [];
  const DB = {
    prepare(sql: string) {
      assert.match(sql, /INSERT INTO review_bundles/);
      return {
        bind(...args: unknown[]) {
          persisted = args;
          return {
            async run() {
              return {};
            }
          };
        }
      };
    }
  } as unknown as D1Database;
  const BUCKET = {
    async put(key: string, body: unknown) {
      objects.set(key, body);
    },
    async delete() {}
  } as unknown as R2Bucket;
  const uploaded = await uploadBundle(
    { DB, BUCKET },
    'alice',
    new Headers({
      'x-bundle-name': 'bundle.zip',
      'x-app-name': 'Test app',
      'x-version-label': 'v1'
    }),
    archive
  );
  assert.equal(uploaded.appName, 'Test app');
  assert.equal(uploaded.fileCount, 1);
  assert.equal(persisted[1], 'alice');
  const expectedHash = Buffer.from(await crypto.subtle.digest('SHA-256', archive)).toString('hex');
  assert.equal(uploaded.sha256, expectedHash);
  const keys = [...objects.keys()];
  assert.equal(keys.length, 2);
  assert.ok(keys.every((key) => key.startsWith(`bundles/alice/${uploaded.id}`)));
  assert.deepEqual(
    new Uint8Array(objects.get(keys.find((key) => key.endsWith('.zip'))!) as ArrayBuffer),
    new Uint8Array(archive)
  );
  const extracted = JSON.parse(objects.get(keys.find((key) => key.endsWith('.json'))!) as string);
  assert.equal(extracted[0].text, "console.log('static only');");
});
