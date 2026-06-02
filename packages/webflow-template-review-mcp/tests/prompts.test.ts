import assert from 'node:assert/strict';
import test from 'node:test';

import { REVIEW_WORKFLOW } from '../src/prompts.js';

test('review workflow allows nested utility pages while flagging broken or misdirected links', () => {
  assert.match(REVIEW_WORKFLOW, /Required utility pages do \*\*not\*\* need root-only slugs/);
  assert.match(REVIEW_WORKFLOW, /License, Instructions, Changelog, and Style Guide pages may be nested/);
  assert.match(REVIEW_WORKFLOW, /visible links point to the matching utility page/);
  assert.match(REVIEW_WORKFLOW, /utility links that point to unrelated pages/);
});

test('review workflow aligns placeholder and alt-text interpretation with validator policy', () => {
  assert.match(REVIEW_WORKFLOW, /Treat lorem\/placeholder findings as review evidence, not automatic blockers/);
  assert.match(REVIEW_WORKFLOW, /not Webflow search snippets or warning-only placeholder signals/);
  assert.match(REVIEW_WORKFLOW, /editable content images\/icons/);
  assert.match(REVIEW_WORKFLOW, /Webflow-generated video fallback\/poster assets/);
});
