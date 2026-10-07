import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scaffold, slugify, validateAppName } from '../src/scaffold.mjs';
import { buildPacket, renderChecklist, writePacket } from '../src/packet.mjs';
import { tmp, writeGoodListing, writeGoodProject } from './helpers.mjs';

test('app name validation', () => {
  assert.deepEqual(validateAppName('Section Namer'), []);
  assert.ok(validateAppName('').length);
  assert.ok(validateAppName('Webflow Section Namer').some((p) => /mark/.test(p)));
  assert.ok(validateAppName('My App').some((p) => /placeholder/.test(p)));
  assert.ok(validateAppName('A name that is far longer than thirty chars').some((p) => /30/.test(p)));
});

test('slugify', () => {
  assert.equal(slugify('Section Namer'), 'section-namer');
  assert.equal(slugify('  Alt-Text.ai  '), 'alt-text-ai');
});

test('scaffold copies the template and fills every placeholder', () => {
  const target = join(tmp(), 'app');
  const result = scaffold({ targetDir: target, appName: 'Section Namer' });
  assert.equal(result.slug, 'section-namer');
  const manifest = JSON.parse(readFileSync(join(target, 'webflow.json'), 'utf8'));
  assert.equal(manifest.name, 'Section Namer');
  assert.equal(manifest.apiVersion, '2');
  assert.equal(manifest.publicDir, 'public');
  const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'section-namer');
  assert.ok(!('style-loader' in pkg.devDependencies), 'template must not inject styles at runtime');
  const html = readFileSync(join(target, 'public', 'index.html'), 'utf8');
  assert.match(html, /<title>Section Namer<\/title>/);
  for (const file of ['src/index.tsx', 'src/consent.ts', 'src/designer.ts', 'webpack.config.mjs', 'eslint.config.mjs', 'README.md', '.gitignore']) {
    assert.ok(existsSync(join(target, file)), file);
    assert.ok(!readFileSync(join(target, file), 'utf8').includes('__APP_'), `${file} still has a placeholder`);
  }
  assert.throws(() => scaffold({ targetDir: target, appName: 'Section Namer' }), /not empty/);
  assert.throws(() => scaffold({ targetDir: join(tmp(), 'x'), appName: 'Webflow Thing' }), /mark/);
});

test('template source never uses alert, eval, or element.type === Section', () => {
  const target = join(tmp(), 'app');
  scaffold({ targetDir: target, appName: 'Section Namer' });
  const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const src = ['src/index.tsx', 'src/consent.ts', 'src/designer.ts'].map((f) => stripComments(readFileSync(join(target, f), 'utf8'))).join('\n');
  assert.ok(!/(^|[^.\w])alert\(/.test(src));
  assert.ok(!/\beval\(/.test(src));
  assert.ok(!/type\s*===?\s*["']Section["']/.test(src));
  assert.match(src, /getTag\(\)/);
  assert.match(src, /webflow\.notify/);
});

test('packet maps every requirement and lists human gates; it never submits', () => {
  const dir = writeGoodProject(tmp());
  const listing = writeGoodListing(tmp());
  const packet = buildPacket({ projectDir: dir, listingPath: listing });
  assert.equal(packet.summary.overall.ready, true);
  assert.equal(packet.formFields.appCapabilities, 'Designer Extension');
  assert.equal(packet.formFields.appName, 'Section Namer');
  assert.equal(packet.formFields.preflightReceipt, '', 'receipt is pasted by a human after Preflight');
  assert.ok(packet.humanGates.some((g) => g.id === 'TWO-FACTOR'));
  assert.ok(packet.humanGates.some((g) => g.id === 'PRIVACY-COVERS-COLLECTION'));
  const statuses = new Set(packet.coverage.map((c) => c.status));
  assert.ok(!statuses.has('not-run'), `uncovered automated requirements: ${packet.coverage.filter((c) => c.status === 'not-run').map((c) => c.id).join(', ')}`);
  const md = renderChecklist(packet);
  assert.match(md, /## Human gates/);
  assert.match(md, /does not submit/);
  assert.ok(!/submit_form|webhook/i.test(JSON.stringify(packet)));
  const out = writePacket(packet, join(tmp(), 'packet'));
  assert.ok(existsSync(join(out.out, 'packet.json')));
  assert.ok(existsSync(join(out.out, 'CHECKLIST.md')));
});
