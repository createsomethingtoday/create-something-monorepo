import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ENTRY_BYTES, readZip } from '../src/lib/zip.mjs';
import { imageDimensions } from '../src/lib/images.mjs';
import { loadRegistry, coverage } from '../src/lib/registry.mjs';
import { writeZip, writePng } from './helpers.mjs';

test('zip reader inventories and extracts stored entries', () => {
  const zip = readZip(writeZip([{ name: 'a.txt', data: 'hello' }, { name: 'dir/b.json', data: '{"x":1}' }]));
  assert.deepEqual(zip.files.map((f) => f.name), ['a.txt', 'dir/b.json']);
  assert.equal(zip.readText(zip.files[0]), 'hello');
  assert.equal(JSON.parse(zip.readText(zip.files[1])).x, 1);
});

test('zip reader inflates deflated entries but refuses ones that declare or expand past the cap', () => {
  const ok = readZip(writeZip([{ name: 'bundle.js', data: 'console.log(1)'.repeat(50), deflate: true }]));
  assert.equal(ok.readText(ok.files[0]).length, 14 * 50);
  const liar = readZip(writeZip([{ name: 'bomb.js', data: 'x', deflate: true, declaredSize: MAX_ENTRY_BYTES + 1 }]));
  assert.throws(() => liar.read(liar.files[0]), /refusing to inflate/);
  const bomb = readZip(writeZip([{ name: 'bomb.js', data: Buffer.alloc(MAX_ENTRY_BYTES + 1024), deflate: true, declaredSize: 1 }]));
  assert.throws(() => bomb.read(bomb.files[0]), /refusing to inflate/);
});

test('zip reader rejects non-archives', () => {
  assert.throws(() => readZip(Buffer.from('not a zip at all, nothing to see here')), /Not a zip/);
});

test('png dimensions are read from IHDR', () => {
  assert.deepEqual(imageDimensions(writePng(900, 900)), { format: 'png', width: 900, height: 900 });
  assert.deepEqual(imageDimensions(writePng(1280, 846)), { format: 'png', width: 1280, height: 846 });
});

test('jpeg dimensions are read from the SOF marker', () => {
  // Minimal JPEG: SOI, APP0 (empty), SOF0 with 2x3, EOI.
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x03, 0x00, 0x02, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01]);
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02]), sof, Buffer.from([0xff, 0xd9])]);
  assert.deepEqual(imageDimensions(jpeg), { format: 'jpeg', width: 2, height: 3 });
});

test('registry is well-formed and every automated check id has an owner', () => {
  const reg = loadRegistry();
  const ids = new Set();
  for (const r of reg.requirements) {
    assert.ok(!ids.has(r.id), `duplicate id ${r.id}`);
    ids.add(r.id);
    assert.ok(['published', 'control', 'reviewer-practice'].includes(r.provenance), `${r.id} provenance`);
    assert.ok(['blocker', 'required', 'suggested'].includes(r.severity), `${r.id} severity`);
    assert.ok(r.enforcedBy.length > 0, `${r.id} enforcedBy`);
    assert.ok(/^(doctor|listing|human):[a-z0-9-]+$/.test(r.check), `${r.id} check "${r.check}"`);
    if (r.check.startsWith('human:')) assert.ok(r.enforcedBy.includes('human'), `${r.id} human check must be human-enforced`);
    if (r.check.startsWith('doctor:')) assert.ok(r.enforcedBy.includes('doctor'), `${r.id} doctor check must list doctor`);
    if (r.check.startsWith('listing:')) assert.ok(r.enforcedBy.includes('listing-kit'), `${r.id} listing check must list listing-kit`);
    for (const s of r.source) assert.ok(reg.sources[s], `${r.id} unknown source ${s}`);
  }
  const cov = coverage(new Map());
  assert.equal(cov.length, reg.requirements.length);
  assert.ok(cov.some((c) => c.status === 'human'));
  assert.ok(cov.some((c) => c.status === 'not-run'));
});
