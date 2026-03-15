/**
 * @create-something/harness
 *
 * Tests for reviewer model escalation.
 */

import { describe, it, expect } from 'vitest';
import { getReviewerModel } from '../reviewer.js';
import { createFailureTracker, shouldEscalateModel, getEffectiveModel } from '../failure-handler.js';
import type { FailureTracker } from '../failure-handler.js';
import type { SessionOutcome } from '../types.js';

describe('Reviewer Model Escalation', () => {
  it('should start security reviews with haiku', () => {
    expect(getReviewerModel('security')).toBe('haiku');
  });

  it('should start architecture reviews with opus', () => {
    expect(getReviewerModel('architecture')).toBe('opus');
  });

  it('should start quality reviews with sonnet', () => {
    expect(getReviewerModel('quality')).toBe('sonnet');
  });

  it('should escalate security review from haiku to sonnet after 1 failure', () => {
    const tracker = createFailureTracker();

    // Record a haiku failure
    tracker.records.set('security', {
      issueId: 'security',
      attempts: [
        {
          attemptNumber: 1,
          timestamp: new Date().toISOString(),
          outcome: 'failure' as SessionOutcome,
          error: 'Review failed',
          durationMs: 1000,
          model: 'haiku',
        },
      ],
      lastOutcome: 'failure' as SessionOutcome,
      finalAction: 'retry',
    });

    const escalation = shouldEscalateModel(tracker, 'security', 'haiku');
    expect(escalation.escalate).toBe(true);
    expect(escalation.toModel).toBe('sonnet');
    expect(escalation.reason).toContain('Failed with haiku');
  });

  it('should escalate quality review from sonnet to opus after 2 failures', () => {
    const tracker = createFailureTracker();

    // Record 2 sonnet failures
    tracker.records.set('quality', {
      issueId: 'quality',
      attempts: [
        {
          attemptNumber: 1,
          timestamp: new Date().toISOString(),
          outcome: 'partial' as SessionOutcome,
          error: null,
          durationMs: 1000,
          model: 'sonnet',
        },
        {
          attemptNumber: 2,
          timestamp: new Date().toISOString(),
          outcome: 'failure' as SessionOutcome,
          error: 'Review failed again',
          durationMs: 1200,
          model: 'sonnet',
        },
      ],
      lastOutcome: 'failure' as SessionOutcome,
      finalAction: 'retry',
    });

    const escalation = shouldEscalateModel(tracker, 'quality', 'sonnet');
    expect(escalation.escalate).toBe(true);
    expect(escalation.toModel).toBe('opus');
    expect(escalation.reason).toContain('Failed with sonnet (2x)');
  });

  it('should not escalate architecture review (already opus)', () => {
    const tracker = createFailureTracker();

    tracker.records.set('architecture', {
      issueId: 'architecture',
      attempts: [
        {
          attemptNumber: 1,
          timestamp: new Date().toISOString(),
          outcome: 'failure' as SessionOutcome,
          error: 'Complex failure',
          durationMs: 5000,
          model: 'opus',
        },
      ],
      lastOutcome: 'failure' as SessionOutcome,
      finalAction: 'retry',
    });

    const escalation = shouldEscalateModel(tracker, 'architecture', 'opus');
    expect(escalation.escalate).toBe(false);
    expect(escalation.toModel).toBe('opus');
    expect(escalation.reason).toBe('Already using opus');
  });

  it('should not escalate before threshold is reached', () => {
    const tracker = createFailureTracker();

    // Only 1 sonnet failure (need 2 to escalate)
    tracker.records.set('quality', {
      issueId: 'quality',
      attempts: [
        {
          attemptNumber: 1,
          timestamp: new Date().toISOString(),
          outcome: 'failure' as SessionOutcome,
          error: 'First failure',
          durationMs: 1000,
          model: 'sonnet',
        },
      ],
      lastOutcome: 'failure' as SessionOutcome,
      finalAction: 'retry',
    });

    const escalation = shouldEscalateModel(tracker, 'quality', 'sonnet');
    expect(escalation.escalate).toBe(false);
    expect(escalation.toModel).toBe('sonnet');
    expect(escalation.reason).toBe('Not enough failures to escalate');
  });

  it('should use getEffectiveModel to wrap escalation logic', () => {
    const tracker = createFailureTracker();

    // Haiku failure
    tracker.records.set('security', {
      issueId: 'security',
      attempts: [
        {
          attemptNumber: 1,
          timestamp: new Date().toISOString(),
          outcome: 'failure' as SessionOutcome,
          error: 'Failed',
          durationMs: 1000,
          model: 'haiku',
        },
      ],
      lastOutcome: 'failure' as SessionOutcome,
      finalAction: 'retry',
    });

    const effective = getEffectiveModel(tracker, 'security', 'haiku');
    expect(effective.model).toBe('sonnet');
    expect(effective.escalated).toBe(true);
    expect(effective.reason).toContain('Failed with haiku');
  });

  it('should escalate haiku → sonnet → opus for security reviews', () => {
    const tracker = createFailureTracker();

    // Haiku and sonnet both failed
    tracker.records.set('security', {
      issueId: 'security',
      attempts: [
        {
          attemptNumber: 1,
          timestamp: new Date().toISOString(),
          outcome: 'failure' as SessionOutcome,
          error: 'Haiku failed',
          durationMs: 1000,
          model: 'haiku',
        },
        {
          attemptNumber: 2,
          timestamp: new Date().toISOString(),
          outcome: 'failure' as SessionOutcome,
          error: 'Sonnet failed',
          durationMs: 1500,
          model: 'sonnet',
        },
      ],
      lastOutcome: 'failure' as SessionOutcome,
      finalAction: 'retry',
    });

    // Now trying haiku again - should escalate to opus since sonnet was tried
    const escalation = shouldEscalateModel(tracker, 'security', 'haiku');
    expect(escalation.escalate).toBe(true);
    expect(escalation.toModel).toBe('opus');
    expect(escalation.reason).toContain('Failed with haiku');
    expect(escalation.reason).toContain('and sonnet');
  });

  it('should preserve model override from config', () => {
    // Explicit override to opus
    const model = getReviewerModel('security', 'opus');
    expect(model).toBe('opus');

    // Explicit override to haiku
    const model2 = getReviewerModel('architecture', 'haiku');
    expect(model2).toBe('haiku');
  });

  it('should handle empty failure history gracefully', () => {
    const tracker = createFailureTracker();

    const escalation = shouldEscalateModel(tracker, 'new-reviewer', 'haiku');
    expect(escalation.escalate).toBe(false);
    expect(escalation.toModel).toBe('haiku');
    expect(escalation.reason).toBe('No failure history');
  });
});

describe('Reviewer Escalation Cost Optimization', () => {
  it('should validate expected escalation paths for cost', () => {
    const paths = [
      { reviewer: 'security', start: 'haiku', failuresNeeded: 1, escalatesTo: 'sonnet' },
      { reviewer: 'quality', start: 'sonnet', failuresNeeded: 2, escalatesTo: 'opus' },
      { reviewer: 'architecture', start: 'opus', failuresNeeded: 999, escalatesTo: 'opus' }, // Already max
    ];

    for (const path of paths) {
      const tracker = createFailureTracker();

      // Check start - should not escalate with no failures
      let escalation = shouldEscalateModel(tracker, path.reviewer, path.start as any);
      expect(escalation.toModel).toBe(path.start);
      expect(escalation.escalate).toBe(false);

      // Add failures up to threshold
      const attempts = [];
      for (let i = 0; i < path.failuresNeeded; i++) {
        attempts.push({
          attemptNumber: i + 1,
          timestamp: new Date().toISOString(),
          outcome: 'failure' as SessionOutcome,
          error: `fail ${i + 1}`,
          durationMs: 1000,
          model: path.start as any,
        });
      }

      tracker.records.set(path.reviewer, {
        issueId: path.reviewer,
        attempts,
        lastOutcome: 'failure' as SessionOutcome,
        finalAction: 'retry',
      });

      // Check if escalation happens after threshold
      escalation = shouldEscalateModel(tracker, path.reviewer, path.start as any);

      if (path.escalatesTo !== path.start) {
        expect(escalation.escalate).toBe(true);
        expect(escalation.toModel).toBe(path.escalatesTo);
      } else {
        // Architecture already at opus - can't escalate
        expect(escalation.escalate).toBe(false);
        expect(escalation.toModel).toBe(path.start);
      }
    }
  });
});
