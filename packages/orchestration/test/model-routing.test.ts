/**
 * @create-something/orchestration
 *
 * Tests for model routing logic
 */

import { describe, it, expect } from 'vitest';
import {
  selectModel,
  selectModelForReviewer,
  shouldEscalateModel,
  type BeadsIssue,
} from '../src/integration/model-routing.js';
import { estimateReviewCost } from '../src/checkpoint/review.js';

describe('Model Routing', () => {
  describe('selectModel', () => {
    it('respects explicit model:haiku label', () => {
      const issue: BeadsIssue = {
        id: 'cs-test',
        title: 'Fix bug',
        labels: ['model:haiku'],
        status: 'open',
      };

      const decision = selectModel(issue);
      expect(decision.model).toBe('haiku');
      expect(decision.strategy).toBe('explicit-label');
      expect(decision.confidence).toBe(1.0);
    });

    it('respects explicit model:sonnet label', () => {
      const issue: BeadsIssue = {
        id: 'cs-test',
        title: 'Fix bug',
        labels: ['model:sonnet'],
        status: 'open',
      };

      const decision = selectModel(issue);
      expect(decision.model).toBe('sonnet');
      expect(decision.strategy).toBe('explicit-label');
    });

    it('respects explicit model:opus label', () => {
      const issue: BeadsIssue = {
        id: 'cs-test',
        title: 'Fix bug',
        labels: ['model:opus'],
        status: 'open',
      };

      const decision = selectModel(issue);
      expect(decision.model).toBe('opus');
      expect(decision.strategy).toBe('explicit-label');
    });

    it('maps complexity:trivial to haiku', () => {
      const issue: BeadsIssue = {
        id: 'cs-test',
        title: 'Fix typo',
        labels: ['complexity:trivial'],
        status: 'open',
      };

      const decision = selectModel(issue);
      expect(decision.model).toBe('haiku');
      expect(decision.strategy).toBe('complexity-label');
    });

    it('maps complexity:simple to haiku', () => {
      const issue: BeadsIssue = {
        id: 'cs-test',
        title: 'Add button',
        labels: ['complexity:simple'],
        status: 'open',
      };

      const decision = selectModel(issue);
      expect(decision.model).toBe('haiku');
    });

    it('maps complexity:standard to sonnet', () => {
      const issue: BeadsIssue = {
        id: 'cs-test',
        title: 'Implement feature',
        labels: ['complexity:standard'],
        status: 'open',
      };

      const decision = selectModel(issue);
      expect(decision.model).toBe('sonnet');
    });

    it('maps complexity:complex to opus', () => {
      const issue: BeadsIssue = {
        id: 'cs-test',
        title: 'Architect system',
        labels: ['complexity:complex'],
        status: 'open',
      };

      const decision = selectModel(issue);
      expect(decision.model).toBe('opus');
    });

    it('detects simple patterns and uses haiku', () => {
      const patterns = [
        'rename getUserData to fetchUserData',
        'fix typo in README',
        'format code with prettier',
        'lint errors in auth.ts',
        'scaffold CRUD endpoints',
      ];

      for (const title of patterns) {
        const issue: BeadsIssue = {
          id: 'cs-test',
          title,
          labels: [],
          status: 'open',
        };

        const decision = selectModel(issue);
        expect(decision.model).toBe('haiku');
        expect(decision.strategy).toBe('pattern-match');
      }
    });

    it('detects complex patterns and uses opus', () => {
      const patterns = [
        'architect payment system',
        'security audit of auth flow',
        'design new API architecture',
        'review system design',
      ];

      for (const title of patterns) {
        const issue: BeadsIssue = {
          id: 'cs-test',
          title,
          labels: [],
          status: 'open',
        };

        const decision = selectModel(issue);
        expect(decision.model).toBe('opus');
        expect(decision.strategy).toBe('pattern-match');
      }
    });

    it('defaults to sonnet when no indicators', () => {
      const issue: BeadsIssue = {
        id: 'cs-test',
        title: 'Implement feature X',
        labels: [],
        status: 'open',
      };

      const decision = selectModel(issue);
      expect(decision.model).toBe('sonnet');
      expect(decision.strategy).toBe('default');
    });

    it('prioritizes explicit label over complexity', () => {
      const issue: BeadsIssue = {
        id: 'cs-test',
        title: 'Fix bug',
        labels: ['model:haiku', 'complexity:complex'],
        status: 'open',
      };

      const decision = selectModel(issue);
      expect(decision.model).toBe('haiku');
      expect(decision.strategy).toBe('explicit-label');
    });

    it('prioritizes complexity label over pattern', () => {
      const issue: BeadsIssue = {
        id: 'cs-test',
        title: 'architect new system',
        labels: ['complexity:simple'],
        status: 'open',
      };

      const decision = selectModel(issue);
      expect(decision.model).toBe('haiku');
      expect(decision.strategy).toBe('complexity-label');
    });
  });

  describe('selectModelForReviewer', () => {
    it('uses haiku for security reviewer', () => {
      const model = selectModelForReviewer('security');
      expect(model).toBe('haiku');
    });

    it('uses opus for architecture reviewer', () => {
      const model = selectModelForReviewer('architecture');
      expect(model).toBe('opus');
    });

    it('uses sonnet for quality reviewer', () => {
      const model = selectModelForReviewer('quality');
      expect(model).toBe('sonnet');
    });

    it('uses sonnet for custom reviewer', () => {
      const model = selectModelForReviewer('custom');
      expect(model).toBe('sonnet');
    });

    it('respects override for any reviewer', () => {
      expect(selectModelForReviewer('security', 'opus')).toBe('opus');
      expect(selectModelForReviewer('architecture', 'haiku')).toBe('haiku');
      expect(selectModelForReviewer('quality', 'opus')).toBe('opus');
    });
  });

  describe('shouldEscalateModel', () => {
    it('does not escalate with 0 failures', () => {
      const result = shouldEscalateModel('haiku', 0);
      expect(result.escalate).toBe(false);
      expect(result.toModel).toBe('haiku');
    });

    it('does not escalate with 1 failure', () => {
      const result = shouldEscalateModel('haiku', 1);
      expect(result.escalate).toBe(false);
    });

    it('escalates haiku to sonnet after 2 failures', () => {
      const result = shouldEscalateModel('haiku', 2);
      expect(result.escalate).toBe(true);
      expect(result.toModel).toBe('sonnet');
    });

    it('escalates sonnet to opus after 2 failures', () => {
      const result = shouldEscalateModel('sonnet', 2);
      expect(result.escalate).toBe(true);
      expect(result.toModel).toBe('opus');
    });

    it('does not escalate opus (already at max)', () => {
      const result = shouldEscalateModel('opus', 2);
      expect(result.escalate).toBe(false);
      expect(result.toModel).toBe('opus');
    });

    it('escalates haiku to sonnet after 3 failures', () => {
      const result = shouldEscalateModel('haiku', 3);
      expect(result.escalate).toBe(true);
      expect(result.toModel).toBe('sonnet');
    });
  });

  describe('estimateReviewCost', () => {
    it('calculates correct per-worker cost', () => {
      const estimate = estimateReviewCost(3);

      // 3 workers × (0.001 + 0.1 + 0.01) = 3 × 0.111 = 0.333
      expect(estimate.perWorkerCost).toBeCloseTo(0.333, 3);
    });

    it('calculates correct convoy-wide cost', () => {
      const estimate = estimateReviewCost(3);

      // 1 review × (0.001 + 0.1 + 0.01) = 0.111
      expect(estimate.convoyWideCost).toBeCloseTo(0.111, 3);
    });

    it('calculates correct savings', () => {
      const estimate = estimateReviewCost(3);

      // 0.333 - 0.111 = 0.222
      expect(estimate.savings).toBeCloseTo(0.222, 3);
    });

    it('calculates correct savings percentage', () => {
      const estimate = estimateReviewCost(3);

      // (0.222 / 0.333) × 100 = 66.67%
      expect(estimate.savingsPercent).toBeCloseTo(66.67, 1);
    });

    it('scales correctly with worker count', () => {
      const estimate1 = estimateReviewCost(1);
      const estimate5 = estimateReviewCost(5);
      const estimate10 = estimateReviewCost(10);

      // Per-worker cost scales linearly
      expect(estimate5.perWorkerCost).toBeCloseTo(estimate1.perWorkerCost * 5, 3);
      expect(estimate10.perWorkerCost).toBeCloseTo(estimate1.perWorkerCost * 10, 3);

      // Convoy-wide cost stays constant
      expect(estimate1.convoyWideCost).toBeCloseTo(0.111, 3);
      expect(estimate5.convoyWideCost).toBeCloseTo(0.111, 3);
      expect(estimate10.convoyWideCost).toBeCloseTo(0.111, 3);
    });

    it('shows increasing savings percentage with more workers', () => {
      const estimate1 = estimateReviewCost(1);
      const estimate5 = estimateReviewCost(5);
      const estimate10 = estimateReviewCost(10);

      // 1 worker: (0 / 0.111) × 100 = 0%
      expect(estimate1.savingsPercent).toBeCloseTo(0, 1);

      // 5 workers: (0.444 / 0.555) × 100 = 80%
      expect(estimate5.savingsPercent).toBeCloseTo(80, 1);

      // 10 workers: (1.0 / 1.11) × 100 = 90%
      expect(estimate10.savingsPercent).toBeCloseTo(90, 1);
    });
  });
});
