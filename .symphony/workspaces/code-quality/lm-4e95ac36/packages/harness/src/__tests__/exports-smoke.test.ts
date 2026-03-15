/**
 * Smoke test to verify all new Bloom-inspired exports are accessible
 */

import { describe, it, expect } from 'vitest';

const harnessExportsPromise = import('../index.js');

describe('Bloom-inspired exports', () => {
  it(
    'exports meta-review types',
    async () => {
      const harnessExports = await harnessExportsPromise;

    // Meta-review config
      expect(harnessExports.DEFAULT_META_REVIEW_CONFIG).toBeDefined();
      expect(harnessExports.runMetaReview).toBeDefined();
      expect(harnessExports.selectMetaReviewModel).toBeDefined();
      expect(harnessExports.formatMetaReviewDisplay).toBeDefined();
    },
    30000,
  );

  it(
    'exports Beads seed types and helpers',
    async () => {
      const harnessExports = await harnessExportsPromise;

    // Beads seed helpers
      expect(harnessExports.hasExecutableSeed).toBeDefined();
      expect(harnessExports.getIssueSeed).toBeDefined();
    },
    30000,
  );

  it('meta-review config has correct defaults', async () => {
    const harnessExports = await harnessExportsPromise;

    expect(harnessExports.DEFAULT_META_REVIEW_CONFIG.enabled).toBe(true);
    expect(harnessExports.DEFAULT_META_REVIEW_CONFIG.useOpusForSecurityCritical).toBe(true);
    expect(harnessExports.DEFAULT_META_REVIEW_CONFIG.minFindingsThreshold).toBe(3);
    expect(harnessExports.DEFAULT_META_REVIEW_CONFIG.createBeadsIssues).toBe(true);
  });

  it('Beads seed helpers work correctly', async () => {
    const harnessExports = await harnessExportsPromise;

    // Issue without seed
    const issueWithoutSeed: import('../types.js').BeadsIssue = {
      id: 'test-1',
      title: 'Test issue',
      description: 'Test',
      status: 'open' as const,
      priority: 2,
      issue_type: 'feature',
      labels: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      closed_at: null,
    };

    expect(harnessExports.hasExecutableSeed(issueWithoutSeed)).toBe(false);
    expect(harnessExports.getIssueSeed(issueWithoutSeed)).toBeUndefined();

    // Issue with seed
    const issueWithSeed = {
      ...issueWithoutSeed,
      metadata: {
        seed: {
          behavior: 'Fix tests',
          examples: ['Test output'],
          config: { maxIterations: 10 },
          acceptance: [{ test: 'All pass', verify: 'pnpm test' }],
          completionPromise: 'DONE',
        },
      },
    };

    expect(harnessExports.hasExecutableSeed(issueWithSeed)).toBe(true);
    const seed = harnessExports.getIssueSeed(issueWithSeed);
    expect(seed).toBeDefined();
    expect(seed?.behavior).toBe('Fix tests');
    expect(seed?.config?.maxIterations).toBe(10);
  });
});
