import assert from 'node:assert/strict';
import test from 'node:test';
import { workflowPages } from '../src/lib/data/workflowPages';
import { workflowWorkedExamples } from '../src/lib/data/workflowWorkedExamples';
import { agencyPageComposition, usesCampaignFigure } from '../src/lib/data/agencyPageComposition';

test('every published guide has a complete worked artifact and an explicit pause path', () => {
  assert.deepEqual(Object.keys(workflowWorkedExamples).sort(), workflowPages.map(page => page.slug).sort());
  for (const guide of workflowPages) {
    const example = workflowWorkedExamples[guide.slug];
    assert.ok(example.title && example.result && example.exception, guide.slug);
    assert.ok(example.rows.length >= 3, guide.slug);
    for (const row of example.rows) assert.equal(row.length, example.columns.length, guide.slug);
  }
});

test('a token is not treated as unrestricted authority in the scoped-access example', () => {
  const example = workflowWorkedExamples['mcp-security-oauth'];
  assert.match(example.exception, /workspace B is denied/);
  assert.match(example.rows[2].join(' '), /separate action approval/);
});

test('the evaluation artifact treats missing evidence and duplicate requests as release cases', () => {
  const example = workflowWorkedExamples['ai-agent-evaluation'];
  assert.ok(example.rows.some(row => row[0] === 'Source unavailable' && row[2] === 'No external action'));
  assert.ok(example.rows.some(row => row[0] === 'Duplicate request' && row[2] === 'No duplicate send'));
  assert.match(example.exception, /release check fails/);
});

test('task and operator pages do not receive illustrative campaign figures', () => {
  for (const route of ['/book', '/contact', '/privacy', '/terms', '/products/signal', '/products/decision', '/products/proof']) assert.equal(usesCampaignFigure(route), false, route);
  assert.equal(agencyPageComposition('/book', 'utility', 'wide'), 'task');
  assert.equal(agencyPageComposition('/products/decision', 'product', 'wide'), 'operator');
  assert.equal(agencyPageComposition('/workflows/mcp-server-development', 'editorial', 'medium'), 'study');
});
