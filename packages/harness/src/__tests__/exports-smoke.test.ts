/**
 * Smoke test to verify all new Bloom-inspired exports are accessible
 */

import { describe, it, expect } from 'vitest';

describe('Bloom-inspired exports', () => {
  it('exports meta-review types', async () => {
    const exports = await import('../index.js');

    // Meta-review config
    expect(exports.DEFAULT_META_REVIEW_CONFIG).toBeDefined();
    expect(exports.runMetaReview).toBeDefined();
    expect(exports.selectMetaReviewModel).toBeDefined();
    expect(exports.formatMetaReviewDisplay).toBeDefined();
  });

  it('exports Beads seed types and helpers', async () => {
    const exports = await import('../index.js');

    // Beads seed helpers
    expect(exports.hasExecutableSeed).toBeDefined();
    expect(exports.getIssueSeed).toBeDefined();
  });

  it('meta-review config has correct defaults', async () => {
    const { DEFAULT_META_REVIEW_CONFIG } = await import('../index.js');

    expect(DEFAULT_META_REVIEW_CONFIG.enabled).toBe(true);
    expect(DEFAULT_META_REVIEW_CONFIG.useOpusForSecurityCritical).toBe(true);
    expect(DEFAULT_META_REVIEW_CONFIG.minFindingsThreshold).toBe(3);
    expect(DEFAULT_META_REVIEW_CONFIG.createBeadsIssues).toBe(true);
  });

  it('Beads seed helpers work correctly', async () => {
    const { hasExecutableSeed, getIssueSeed } = await import('../index.js');
    const type_BeadsIssue = await import('../types.js');

    // Issue without seed
    const issueWithoutSeed = {
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

    expect(hasExecutableSeed(issueWithoutSeed)).toBe(false);
    expect(getIssueSeed(issueWithoutSeed)).toBeUndefined();

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

    expect(hasExecutableSeed(issueWithSeed)).toBe(true);
    const seed = getIssueSeed(issueWithSeed);
    expect(seed).toBeDefined();
    expect(seed?.behavior).toBe('Fix tests');
    expect(seed?.config?.maxIterations).toBe(10);
  });
});
