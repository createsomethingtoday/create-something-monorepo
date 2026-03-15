/**
 * Tests for model organisms validation framework
 */

import { describe, it, expect } from 'vitest';
import {
  STANDARD_ORGANISMS,
  organismToBeadsIssue,
  isModelOrganism,
  validateRouting,
  calculateRoutingMetrics,
  createStandardSuite,
  createMinimalSuite,
  type OrganismValidation,
  type ModelOrganism,
} from '../model-organisms.js';

describe('Model Organisms', () => {
  describe('STANDARD_ORGANISMS', () => {
    it('includes organisms for all complexity levels', () => {
      const complexities = STANDARD_ORGANISMS.map((o) => o.knownComplexity);
      expect(complexities).toContain('trivial');
      expect(complexities).toContain('simple');
      expect(complexities).toContain('standard');
      expect(complexities).toContain('complex');
    });

    it('has correct expected models for each complexity', () => {
      const trivial = STANDARD_ORGANISMS.filter((o) => o.knownComplexity === 'trivial');
      const complex = STANDARD_ORGANISMS.filter((o) => o.knownComplexity === 'complex');

      // Trivial should expect Haiku
      for (const organism of trivial) {
        expect(organism.expectedModel).toBe('haiku');
      }

      // Complex should expect Opus
      for (const organism of complex) {
        expect(organism.expectedModel).toBe('opus');
      }
    });

    it('all organisms have required fields', () => {
      for (const organism of STANDARD_ORGANISMS) {
        expect(organism.id).toBeDefined();
        expect(organism.title).toBeDefined();
        expect(organism.description).toBeDefined();
        expect(organism.knownComplexity).toBeDefined();
        expect(organism.expectedModel).toBeDefined();
        expect(organism.labels).toBeInstanceOf(Array);
        expect(organism.successCriteria).toBeInstanceOf(Array);
        expect(organism.category).toBeDefined();
      }
    });

    it('has at least 8 organisms for comprehensive testing', () => {
      expect(STANDARD_ORGANISMS.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('organismToBeadsIssue', () => {
    it('converts organism to valid Beads issue', () => {
      const organism = STANDARD_ORGANISMS[0];
      const issue = organismToBeadsIssue(organism);

      expect(issue.title).toBe(organism.title);
      expect(issue.description).toBe(organism.description);
      expect(issue.priority).toBeDefined();
      expect(issue.labels).toContain('test:organism');
      expect(issue.labels).toContain(`organism:${organism.id}`);
      expect(issue.metadata?.organism).toBeDefined();
    });

    it('maps complexity to priority correctly', () => {
      const trivial = STANDARD_ORGANISMS.find((o) => o.knownComplexity === 'trivial')!;
      const complex = STANDARD_ORGANISMS.find((o) => o.knownComplexity === 'complex')!;

      const trivialIssue = organismToBeadsIssue(trivial);
      const complexIssue = organismToBeadsIssue(complex);

      // Trivial → P3, Complex → P0
      expect(trivialIssue.priority).toBe(3);
      expect(complexIssue.priority).toBe(0);
    });

    it('preserves organism metadata', () => {
      const organism = STANDARD_ORGANISMS[0];
      const issue = organismToBeadsIssue(organism);

      const organismMeta = issue.metadata?.organism as any;
      expect(organismMeta.id).toBe(organism.id);
      expect(organismMeta.knownComplexity).toBe(organism.knownComplexity);
      expect(organismMeta.expectedModel).toBe(organism.expectedModel);
    });
  });

  describe('isModelOrganism', () => {
    it('identifies organism issues', () => {
      const organism = STANDARD_ORGANISMS[0];
      const issue = organismToBeadsIssue(organism) as any;
      issue.labels = issue.labels || [];

      expect(isModelOrganism(issue as any)).toBe(true);
    });

    it('rejects non-organism issues', () => {
      const normalIssue = {
        id: 'test-1',
        title: 'Normal issue',
        labels: ['feature'],
      } as any;

      expect(isModelOrganism(normalIssue)).toBe(false);
    });
  });

  describe('validateRouting', () => {
    it('validates exact model match', () => {
      const organism: ModelOrganism = STANDARD_ORGANISMS[0];

      const isValid = validateRouting(organism, organism.expectedModel);
      expect(isValid).toBe(true);
    });

    it('accepts escalation to more powerful model', () => {
      const trivial = STANDARD_ORGANISMS.find((o) => o.knownComplexity === 'trivial')!;

      // Expected Haiku, used Sonnet (escalation)
      expect(validateRouting(trivial, 'sonnet')).toBe(true);
      expect(validateRouting(trivial, 'opus')).toBe(true);
    });

    it('rejects using weaker model than expected', () => {
      const complex = STANDARD_ORGANISMS.find((o) => o.knownComplexity === 'complex')!;

      // Expected Opus, used Haiku (too weak)
      expect(validateRouting(complex, 'haiku')).toBe(false);
      expect(validateRouting(complex, 'sonnet')).toBe(false);
    });

    it('validates standard → sonnet correctly', () => {
      const standard = STANDARD_ORGANISMS.find((o) => o.knownComplexity === 'standard')!;

      // Expected Sonnet
      expect(validateRouting(standard, 'sonnet')).toBe(true); // Exact
      expect(validateRouting(standard, 'opus')).toBe(true); // Escalation ok
      expect(validateRouting(standard, 'haiku')).toBe(false); // Too weak
    });
  });

  describe('calculateRoutingMetrics', () => {
    it('handles empty validations', () => {
      const metrics = calculateRoutingMetrics([]);

      expect(metrics.total).toBe(0);
      expect(metrics.routingAccuracy).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.avgCost).toBe(0);
    });

    it('calculates metrics correctly', () => {
      const validations: OrganismValidation[] = [
        {
          organism: STANDARD_ORGANISMS.find((o) => o.knownComplexity === 'trivial')!,
          actualModel: 'haiku',
          routingCorrect: true,
          taskSucceeded: true,
          costUsd: 0.001,
          durationMs: 1000,
          iterations: 1,
          escalated: false,
        },
        {
          organism: STANDARD_ORGANISMS.find((o) => o.knownComplexity === 'complex')!,
          actualModel: 'opus',
          routingCorrect: true,
          taskSucceeded: true,
          costUsd: 0.1,
          durationMs: 5000,
          iterations: 1,
          escalated: false,
        },
        {
          organism: STANDARD_ORGANISMS.find((o) => o.knownComplexity === 'simple')!,
          actualModel: 'haiku',
          routingCorrect: true,
          taskSucceeded: false,
          costUsd: 0.002,
          durationMs: 1500,
          iterations: 3,
          escalated: true,
          error: 'Failed',
        },
      ];

      const metrics = calculateRoutingMetrics(validations);

      expect(metrics.total).toBe(3);
      expect(metrics.routingAccuracy).toBe(1.0); // All routing correct
      expect(metrics.successRate).toBeCloseTo(2 / 3); // 2/3 succeeded
      expect(metrics.avgCost).toBeCloseTo(0.034, 3); // (0.001 + 0.1 + 0.002) / 3
      expect(metrics.escalationRate).toBeCloseTo(1 / 3); // 1/3 escalated
    });

    it('calculates success by model', () => {
      const validations: OrganismValidation[] = [
        {
          organism: STANDARD_ORGANISMS[0],
          actualModel: 'haiku',
          routingCorrect: true,
          taskSucceeded: true,
          costUsd: 0.001,
          durationMs: 1000,
          iterations: 1,
          escalated: false,
        },
        {
          organism: STANDARD_ORGANISMS[1],
          actualModel: 'haiku',
          routingCorrect: true,
          taskSucceeded: false,
          costUsd: 0.001,
          durationMs: 1000,
          iterations: 1,
          escalated: false,
        },
      ];

      const metrics = calculateRoutingMetrics(validations);

      // Haiku: 1 success, 1 failure = 50%
      expect(metrics.successByModel.haiku).toBe(0.5);
    });
  });

  describe('Suite creation', () => {
    it('creates standard suite with all organisms', () => {
      const suite = createStandardSuite();

      expect(suite.name).toBe('Standard Routing Validation');
      expect(suite.organisms).toEqual(STANDARD_ORGANISMS);
      expect(suite.validations).toEqual([]);
    });

    it('creates minimal suite with 4 organisms', () => {
      const suite = createMinimalSuite();

      expect(suite.name).toBe('Minimal Routing Validation');
      expect(suite.organisms).toHaveLength(4);
      expect(suite.validations).toEqual([]);

      // Should have one of each complexity
      const complexities = suite.organisms.map((o) => o.knownComplexity);
      expect(complexities).toContain('trivial');
      expect(complexities).toContain('simple');
      expect(complexities).toContain('standard');
      expect(complexities).toContain('complex');
    });
  });
});
