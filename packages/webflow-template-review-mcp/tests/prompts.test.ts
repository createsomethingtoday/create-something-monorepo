import assert from 'node:assert/strict';
import test from 'node:test';

import { REVIEW_WORKFLOW } from '../src/prompts.js';

test('review workflow references the live analyzer tool names', () => {
  assert.match(REVIEW_WORKFLOW, /`enqueue_template_review`/);
  assert.match(REVIEW_WORKFLOW, /`get_template_review_job`/);
  assert.match(REVIEW_WORKFLOW, /`run_template_review`/);
  assert.match(REVIEW_WORKFLOW, /webflow-site-analyzer-mcp/);
  assert.doesNotMatch(REVIEW_WORKFLOW, /template_review_enqueue_analyzer_review/);
  assert.doesNotMatch(REVIEW_WORKFLOW, /template_review_get_analyzer_review/);
  assert.doesNotMatch(REVIEW_WORKFLOW, /template_review_list_analyzer_reviews/);
});
