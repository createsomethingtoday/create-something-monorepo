import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, extname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const retired = JSON.parse(readFileSync(resolve(root, 'test/fixtures/retired-canon-assets.json'), 'utf8'));
function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(resolve(path, entry.name)) : [resolve(path, entry.name)]);
}

test('legacy Canon files and renamed copies are absent from deployable static assets', () => {
  assert.equal(retired.length, 149, 'complete reviewed legacy inventory');
  const remaining = retired.filter(asset => existsSync(resolve(root, asset.path)));
  assert.deepEqual(remaining.map(asset => asset.path), [], 'old public paths must be retired');
  const sizes = new Set(retired.map(asset => asset.bytes));
  const hashes = new Set(retired.map(asset => asset.sha256));
  const copies = files(resolve(root, 'static')).filter(path => sizes.has(statSync(path).size)).filter(path => hashes.has(createHash('sha256').update(readFileSync(path)).digest('hex')));
  assert.deepEqual(copies, [], 'renaming an old depiction does not migrate it');
});

test('runtime source has no references that restore retired imagery, including dormant HTML and study queries', () => {
  const legacy = /\/images\/agency-stories\/|\/images\/agency-sales\/(?!OpenAI_Select_Partner_Badge\.png)|\/canon\/(?:idle|review|waving|jumping)\/|\/films\/agent-enablement\/|\/images\/labs\/connected-work-canon\.png|original-stories\//;
  const dangling = [...files(resolve(root, 'src')), ...files(resolve(root, 'static'))].filter(path => ['.svelte', '.ts', '.js', '.html', '.css'].includes(extname(path))).filter(path => legacy.test(readFileSync(path, 'utf8')));
  assert.deepEqual(dangling, [], 'public and dormant runtime consumers must use current owned artwork');
});

test('Agency delegates small character rendering to the shared approved asset API', () => {
  const adapter = readFileSync(resolve(root, 'src/lib/components/CanonCompanion.svelte'), 'utf8');
  assert.match(adapter, /@create-something\/canon\/character/);
  assert.match(adapter, /head-r42\.webp/);
  assert.doesNotMatch(adapter, /setTimeout|requestAnimationFrame|new Image\(|\/canon\/(?:idle|review|waving|jumping)\//);
});
