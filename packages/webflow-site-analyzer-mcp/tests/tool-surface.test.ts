import assert from 'node:assert/strict';
import test from 'node:test';

import { getAnalyzerHealth, shouldExposeRunTemplateReviewTool } from '../src/index.ts';

function withEnv<T>(name: string, value: string | undefined, fn: () => T): T {
  const previous = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }

  try {
    return fn();
  } finally {
    if (previous === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previous;
    }
  }
}

test('remote HTTP runtime hides synchronous template review support', () => {
  withEnv('WEBFLOW_SITE_ANALYZER_REMOTE_HTTP', '1', () => {
    assert.equal(shouldExposeRunTemplateReviewTool(), false);

    const health = getAnalyzerHealth();
    const templateReview = health.templateReview as Record<string, unknown>;
    assert.equal(templateReview.syncTemplateReviewSupported, false);
  });
});

test('local runtime keeps synchronous template review support', () => {
  withEnv('WEBFLOW_SITE_ANALYZER_REMOTE_HTTP', undefined, () => {
    assert.equal(shouldExposeRunTemplateReviewTool(), true);

    const health = getAnalyzerHealth();
    const templateReview = health.templateReview as Record<string, unknown>;
    assert.equal(templateReview.syncTemplateReviewSupported, true);
  });
});
