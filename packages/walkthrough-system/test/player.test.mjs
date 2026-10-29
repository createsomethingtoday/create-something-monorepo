import test from 'node:test';
import assert from 'node:assert/strict';
import { activeScene, validateManifest, formatTime } from '../player.js';
import { createWalkthroughServer, parseRange } from '../serve.mjs';
import { build, STATIC_FILES } from '../build.mjs';
import { mkdtemp, writeFile, readFile, readdir, rm, realpath, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function writeReceipt(root) {
  const output_sha256 = {};
  for (const name of ['screen.mp4', 'walkthrough.mp4', 'poster.jpg']) output_sha256[name] = sha256(await readFile(join(root, name)));
  await writeFile(join(root, 'render-receipt.json'), JSON.stringify({ manifest_sha256: sha256(await readFile(join(root, 'manifest.json'))), output_sha256 }));
}


const fixture = () => ({
  title: 'A bounded workflow',
  source: { file: 'screen.mp4', duration: 27 },
  scenes: [
    { id: 'ask', start: 0, end: 9, label: 'Ask', title: 'Ask', prompt: 'Read only.', evidence: 'A bounded request.' },
    { id: 'inspect', start: 9, end: 16, label: 'Inspect', title: 'Inspect', prompt: 'Observe.', evidence: 'Processing.' },
    { id: 'review', start: 16, end: 27, label: 'Review', title: 'Review', prompt: 'Check.', evidence: 'A recorded response.' }
  ]
});

test('timeline enters the next scene at its exact boundary and holds the ending', () => {
  const { scenes } = fixture();
  for (const [time, expected] of [[-1, 0], [0, 0], [8.999, 0], [9, 1], [15.999, 1], [16, 2], [27, 2], [30, 2]]) {
    assert.equal(activeScene(scenes, time), expected, `time ${time}`);
  }
  assert.equal(activeScene([], 0), -1);
});

test('a complete manifest imports without browser globals', () => {
  const manifest = fixture();
  assert.equal(validateManifest(manifest), manifest);
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65.4), '1:05');
});

test('rejects gaps, overlaps, nonfinite times, duplicate IDs, and incomplete copy', () => {
  const cases = [
    m => { m.scenes[1].start = 10; },
    m => { m.scenes[1].start = 8; },
    m => { m.scenes[1].end = NaN; },
    m => { m.scenes[1].id = 'ask'; },
    m => { m.scenes[0].prompt = ''; },
    m => { m.source.duration = 0; },
    m => { m.scenes[2].end = 25; },
    m => { m.scenes = []; }
  ];
  for (const change of cases) {
    const manifest = fixture();
    change(manifest);
    assert.throws(() => validateManifest(manifest));
  }
});

test('rejects external, traversal, encoded, and active-content media locations', () => {
  for (const file of ['https://example.com/track.mp4', '//example.com/track.mp4', '../secret.mp4', '%2e%2e/secret.mp4', 'javascript:alert(1)', 'file:///tmp/movie.mp4', 'nested/movie.mp4', 'movie.mp4?token=abc']) {
    const manifest = fixture();
    manifest.source.file = file;
    assert.throws(() => validateManifest(manifest), undefined, file);
  }
});

test('byte ranges support seeking and reject unsatisfiable or multiple ranges', () => {
  assert.deepEqual(parseRange('bytes=3-6', 10), { start: 3, end: 6 });
  assert.deepEqual(parseRange('bytes=7-', 10), { start: 7, end: 9 });
  assert.deepEqual(parseRange('bytes=-3', 10), { start: 7, end: 9 });
  assert.deepEqual(parseRange('bytes=8-100', 10), { start: 8, end: 9 });
  for (const value of ['bytes=10-', 'bytes=7-2', 'bytes=-0', 'bytes=0-1,4-5', 'bytes=-', 'items=0-3']) assert.equal(parseRange(value, 10), false);
});

test('preview serves real byte ranges while denying source files and symlinks', async t => {
  const root = await mkdtemp(join(await realpath(tmpdir()), 'walkthrough-server-'));
  await writeFile(join(root, 'screen.mp4'), '0123456789');
  await writeFile(join(root, 'reference.mp4'), 'private source');
  await symlink(join(root, 'reference.mp4'), join(root, 'walkthrough.mp4'));
  const server = createWalkthroughServer(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const partial = await fetch(`${url}/screen.mp4`, { headers: { Range: 'bytes=3-6' } });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('content-range'), 'bytes 3-6/10');
  assert.equal(await partial.text(), '3456');
  const suffix = await fetch(`${url}/screen.mp4`, { headers: { Range: 'bytes=-3' } });
  assert.equal(await suffix.text(), '789');
  const head = await fetch(`${url}/screen.mp4`, { method: 'HEAD' });
  assert.equal(head.headers.get('content-length'), '10');
  assert.equal(await head.text(), '');
  const invalid = await fetch(`${url}/screen.mp4`, { headers: { Range: 'bytes=10-' } });
  assert.equal(invalid.status, 416);
  for (const path of ['/reference.mp4', '/render.py', '/walkthrough.mp4', '/%2e%2e%2fpackage.json']) {
    const response = await fetch(`${url}${path}`);
    assert.equal(response.status, 404, path);
    await response.text();
  }
});

test('static build includes only public assets and leaves prior dist intact on invalid input', async t => {
  const root = await mkdtemp(join(await realpath(tmpdir()), 'walkthrough-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const manifest = fixture();
  manifest.source.original = '/private/source.mp4';
  manifest.source.sha256 = 'private-acquisition-metadata';
  for (const name of STATIC_FILES) {
    await writeFile(join(root, name), name.endsWith('.mp4') ? Buffer.from([0, 0, 0, 12, 102, 116, 121, 112, 105, 115, 111, 109]) : 'fixture');
  }
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
  await writeFile(join(root, 'reference.mp4'), 'not public');
  await writeFile(join(root, 'render.py'), 'not public');
  await writeReceipt(root);
  const result = await build(root);
  assert.equal(result.published, false);
  assert.deepEqual((await readdir(join(root, 'dist'))).sort(), [...STATIC_FILES, '_headers'].sort());
  const publishedManifest = JSON.parse(await readFile(join(root, 'dist/manifest.json'), 'utf8'));
  assert.equal(publishedManifest.source.original, undefined);
  assert.equal(publishedManifest.source.sha256, undefined);
  manifest.scenes[1].start = 10;
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
  await assert.rejects(build(root));
  assert.equal(await readFile(join(root, 'dist/index.html'), 'utf8'), 'fixture');
});

 test('build rejects stale manifest, modified output, and missing receipt without replacing dist', async t => {
  const root = await mkdtemp(join(await realpath(tmpdir()), 'walkthrough-stale-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const name of STATIC_FILES) await writeFile(join(root, name), name.endsWith('.mp4') ? Buffer.from([0, 0, 0, 12, 102, 116, 121, 112, 105, 115, 111, 109]) : 'fixture');
  const manifest = fixture();
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
  await writeReceipt(root);
  await build(root);
  const originalPublicManifest = await readFile(join(root, 'dist/manifest.json'), 'utf8');
  manifest.scenes[0].prompt = 'Changed prompt after rendering.';
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
  await assert.rejects(build(root), /manifest.*render|render.*manifest/i);
  assert.equal(await readFile(join(root, 'dist/manifest.json'), 'utf8'), originalPublicManifest);
  await writeReceipt(root);
  await writeFile(join(root, 'poster.jpg'), 'changed poster');
  await assert.rejects(build(root), /poster.jpg/);
  assert.equal(await readFile(join(root, 'dist/manifest.json'), 'utf8'), originalPublicManifest);
  await writeReceipt(root);
  await rm(join(root, 'render-receipt.json'));
  await assert.rejects(build(root), /receipt/i);
  assert.equal(await readFile(join(root, 'dist/manifest.json'), 'utf8'), originalPublicManifest);
});
