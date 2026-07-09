import { describe, expect, it } from 'vitest';

import { ReviewRouter, DEFAULT_REVIEWERS, type ReviewerProfile } from './routing';

describe('ReviewRouter', () => {
  it('routes app submissions to the app specialist', () => {
    const router = new ReviewRouter(DEFAULT_REVIEWERS);
    const decision = router.route({ id: 's1', assetType: 'app' });
    expect(decision.reviewerId).toBe('pablo');
    expect(decision.reasons).toContain('App specialist');
    expect(decision.confidence).toBeGreaterThan(0);
  });

  it('returns an empty decision when no reviewer can handle the type', () => {
    const templateOnly: ReviewerProfile = {
      id: 'solo',
      name: 'Solo',
      assetTypes: ['template'],
      categoryExpertise: {},
      seniorReviewer: false,
      currentWorkload: 0,
      targetWorkload: 8,
      accuracyRate: 0.9,
      avgReviewTime: 5,
      available: true
    };
    const router = new ReviewRouter([templateOnly]);
    const decision = router.route({ id: 's2', assetType: 'app' });
    expect(decision.reviewerId).toBe('');
    expect(decision.confidence).toBe(0);
  });

  it('excludes unavailable and overloaded reviewers', () => {
    const busy: ReviewerProfile = {
      id: 'busy',
      name: 'Busy',
      assetTypes: ['template'],
      categoryExpertise: { business: 0.9 },
      seniorReviewer: true,
      currentWorkload: 100,
      targetWorkload: 8,
      accuracyRate: 0.9,
      avgReviewTime: 4,
      available: true
    };
    const router = new ReviewRouter([busy]);
    expect(router.route({ id: 's3', assetType: 'template' }).reviewerId).toBe('');
  });

  it('assigns every submission in a batch', () => {
    const router = new ReviewRouter(DEFAULT_REVIEWERS);
    const results = router.routeBatch([
      { id: 'a', assetType: 'app' },
      { id: 'b', assetType: 'template', category: 'ecommerce' },
      { id: 'c', assetType: 'template', category: 'portfolio' }
    ]);
    expect(results.size).toBe(3);
    expect(results.get('a')?.reviewerId).toBe('pablo');
    expect(results.get('b')?.reviewerId).toBeTruthy();
  });
});
