import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePage, serializePage, extractRules, jsxDepthDelta, slugify } from './mdx.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const sourceDir = process.env.WFGR_SOURCE_DIR || join(here, '..', 'source');
const files = readdirSync(sourceDir).filter((f) => f.endsWith('.mdx')).sort();

test('source snapshot has the seven Marketplace pages', () => {
  assert.equal(files.length, 7, files.join(', '));
});

for (const file of files) {
  test(`round-trips ${file} byte for byte`, () => {
    const text = readFileSync(join(sourceDir, file), 'utf8');
    const page = parsePage(text, file.replace(/\.mdx$/, ''));
    assert.equal(serializePage(page), text);
    assert.ok(page.sections.length > 1, 'expected at least one heading section');
    const ids = page.sections.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, 'section ids must be unique');
  });
}

test('headings inside JSX blocks do not start sections', () => {
  const text = `---\ntitle: x\n---\nintro\n\n<Tabs>\n<Tab title="A">\n### Inside tab\nbody\n</Tab>\n</Tabs>\n\n## Real heading\ntext\n`;
  const page = parsePage(text, 'p');
  assert.deepEqual(page.sections.map((s) => s.heading), [null, 'Real heading']);
  assert.equal(serializePage(page), text);
});

test('headings inside code fences do not start sections', () => {
  const text = `---\n---\n## One\n\n\`\`\`md\n## not a heading\n\`\`\`\n## Two\n`;
  const page = parsePage(text, 'p');
  assert.deepEqual(page.sections.map((s) => s.heading), [null, 'One', 'Two']);
  assert.equal(serializePage(page), text);
});

test('listing page splits at the known headings and keeps the Accordion table intact', () => {
  const text = readFileSync(join(sourceDir, 'listing-your-app.mdx'), 'utf8');
  const page = parsePage(text, 'listing-your-app');
  const headings = page.sections.map((s) => s.heading);
  assert.ok(headings.includes('Categories'));
  const cats = page.sections.find((s) => s.heading === 'Categories');
  assert.match(cats.raw, /<Accordion title="View Available Categories">/);
  assert.match(cats.raw, /<\/Accordion>/);
});

test('guidelines page yields the rule groups with numbered rules', () => {
  const text = readFileSync(join(sourceDir, 'marketplace-guidelines.mdx'), 'utf8');
  const page = parsePage(text, 'marketplace-guidelines');
  const groups = page.sections.filter((s) => s.level === 4);
  assert.ok(groups.length >= 30, `expected >=30 #### groups, got ${groups.length}`);
  const scopes = page.sections.find((s) => s.id === 'marketplace-guidelines/scopes-and-least-privilege');
  assert.ok(scopes, 'scopes section id');
  const rules = extractRules(scopes.raw);
  assert.equal(rules.length, 6);
  assert.equal(rules[0].n, 1);
});

test('jsx depth counts block components only', () => {
  assert.equal(jsxDepthDelta('<Note title="x">'), 1);
  assert.equal(jsxDepthDelta('</Note>'), -1);
  assert.equal(jsxDepthDelta('<img src="a.png" />'), 0);
  assert.equal(jsxDepthDelta('<a href="x"><Button>Go</Button></a>'), 0);
  assert.equal(jsxDepthDelta('<Frame background="subtle">'), 1);
});

test('slugify matches github-style anchors', () => {
  assert.equal(slugify('App-delivered code and injected scripts'), 'app-delivered-code-and-injected-scripts');
  assert.equal(slugify('**Submission Prep**'), 'submission-prep');
  assert.equal(slugify('Technical (Designer Extensions)'), 'technical-designer-extensions');
});
