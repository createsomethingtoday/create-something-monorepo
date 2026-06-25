import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const TRACKER_TEMPLATE = path.join(
  REPO_ROOT,
  'docs/examples/agency-buyer-intent-article-tracker.template.csv',
);

function readRows() {
  return readFileSync(TRACKER_TEMPLATE, 'utf8')
    .trim()
    .split('\n')
    .map((line) => line.split(','));
}

test('buyer-intent article tracker keeps canvas-first planning fields', () => {
  const [header, ...rows] = readRows();
  assert.ok(header);
  assert.ok(rows.length > 0);

  assert.deepEqual(header.slice(-4), [
    'canvas_plan_status',
    'canvas_source',
    'canvas_renderer',
    'canvas_required_elements',
  ]);

  for (const row of rows) {
    assert.equal(row.length, header.length, `row has ${row.length} cells: ${row[0]}`);
    assert.equal(row.at(-4), 'planned');
    assert.equal(row.at(-3), 'starter-or-new-graph');
    assert.equal(row.at(-2), 'static-story');
    assert.equal(row.at(-1), 'owner-workflow-automation-judgment-stop-receipt');
  }
});
