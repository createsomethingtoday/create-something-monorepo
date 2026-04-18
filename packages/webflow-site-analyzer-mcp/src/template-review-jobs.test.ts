import assert from 'node:assert/strict';
import test from 'node:test';

import type { UnifiedTemplateReviewReport } from './types.js';
import { TemplateReviewJobManager } from './template-review-jobs.js';

test('TemplateReviewJobManager.list filters jobs by templateVersionId', async () => {
  const resolvers: Array<() => void> = [];
  const manager = new TemplateReviewJobManager(
    () =>
      new Promise<UnifiedTemplateReviewReport>((resolve) => {
        resolvers.push(() => resolve({} as UnifiedTemplateReviewReport));
      }),
    {
      concurrency: 1,
      maxQueueSize: 10,
    },
  );

  manager.enqueue({
    previewUrl: 'https://preview.example.com/alpha',
    publishedUrl: 'https://alpha.example.com',
    templateVersionId: 'rec_version_1',
  });
  manager.enqueue({
    previewUrl: 'https://preview.example.com/beta',
    publishedUrl: 'https://beta.example.com',
    templateVersionId: 'rec_version_2',
  });

  const versionOneJobs = manager.list({ templateVersionId: 'rec_version_1', limit: 10 });
  const versionTwoJobs = manager.list({ templateVersionId: 'rec_version_2', limit: 10 });

  assert.equal(versionOneJobs.length, 1);
  assert.equal(versionOneJobs[0]?.input.templateVersionId, 'rec_version_1');
  assert.equal(versionTwoJobs.length, 1);
  assert.equal(versionTwoJobs[0]?.input.templateVersionId, 'rec_version_2');

  for (const resolve of resolvers) {
    resolve();
  }

  await Promise.resolve();
});
