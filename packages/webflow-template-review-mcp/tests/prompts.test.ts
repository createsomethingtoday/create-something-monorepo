import assert from 'node:assert/strict';
import test from 'node:test';

import { REVIEW_WORKFLOW } from '../src/prompts.js';

test('review workflow does not mention nonexistent template_review analyzer tool names', () => {
  assert.equal(REVIEW_WORKFLOW.includes('template_review_enqueue_analyzer_review'), false);
  assert.equal(REVIEW_WORKFLOW.includes('template_review_get_analyzer_review'), false);
  assert.equal(REVIEW_WORKFLOW.includes('template_review_list_analyzer_reviews'), false);
});

test('review workflow requires live analyzer visibility before analysis-led review', () => {
  assert.equal(REVIEW_WORKFLOW.includes('webflow-site-analyzer-mcp'), true);
  assert.equal(REVIEW_WORKFLOW.includes('webflow-local'), true);
  assert.equal(REVIEW_WORKFLOW.includes('visible downstream analyzer tool names as the source of truth'), true);
  assert.equal(REVIEW_WORKFLOW.includes('skip automated analysis and continue with a manual preliminary review'), true);
});
