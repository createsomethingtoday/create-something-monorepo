import { describe, expect, it } from 'vitest';

import {
  calculatePriorityScore,
  filterForReviewer,
  sortQueueByPriority,
  type SubmissionContext
} from './priority';

function submission(overrides: Partial<SubmissionContext> & { submissionId: string }): SubmissionContext {
  return {
    assetType: 'template',
    creatorTier: 'returning',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    daysInQueue: 1,
    previousRejections: 0,
    ...overrides
  };
}

describe('calculatePriorityScore', () => {
  it('routes app submissions to a specialist', () => {
    const result = calculatePriorityScore(submission({ submissionId: 'a', assetType: 'app' }));
    expect(result.suggestedReviewer).toBe('specialist');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('marks long-waiting submissions as critical', () => {
    const result = calculatePriorityScore(submission({ submissionId: 'b', daysInQueue: 12 }));
    expect(result.urgency).toBe('critical');
    expect(result.reasoning.some((r) => r.includes('Critical'))).toBe(true);
  });

  it('suggests a senior reviewer for new creators', () => {
    const result = calculatePriorityScore(submission({ submissionId: 'c', creatorTier: 'new' }));
    expect(result.suggestedReviewer).toBe('senior');
  });
});

describe('sortQueueByPriority', () => {
  it('orders submissions by descending score', () => {
    const sorted = sortQueueByPriority([
      submission({ submissionId: 'fresh', daysInQueue: 0 }),
      submission({ submissionId: 'stale', daysInQueue: 12 })
    ]);
    expect(sorted[0]?.submissionId).toBe('stale');
    expect(sorted[0]!.priority.score).toBeGreaterThanOrEqual(sorted[1]!.priority.score);
  });
});

describe('filterForReviewer', () => {
  it('keeps specialist and any-eligible submissions for a specialist', () => {
    const queue = sortQueueByPriority([
      submission({ submissionId: 'app', assetType: 'app' }),
      submission({ submissionId: 'tmpl', assetType: 'template', creatorTier: 'established' })
    ]);
    const forSpecialist = filterForReviewer(queue, 'specialist');
    expect(forSpecialist.some((s) => s.submissionId === 'app')).toBe(true);
  });

  it('returns the whole queue for "any"', () => {
    const queue = sortQueueByPriority([submission({ submissionId: 'x' })]);
    expect(filterForReviewer(queue, 'any')).toHaveLength(1);
  });
});
