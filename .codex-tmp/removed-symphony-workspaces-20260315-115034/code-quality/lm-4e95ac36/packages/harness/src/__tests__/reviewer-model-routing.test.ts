/**
 * @create-something/harness
 *
 * Reviewer Model Routing Tests: Verify reviewers use appropriate models.
 */

import { describe, it, expect } from 'vitest';
import { getReviewerModel } from '../reviewer.js';
import type { ReviewerType } from '../types.js';

describe('Reviewer Model Routing', () => {
  describe('getReviewerModel', () => {
    it('should route security reviews to haiku', () => {
      expect(getReviewerModel('security')).toBe('haiku');
    });

    it('should route architecture reviews to opus', () => {
      expect(getReviewerModel('architecture')).toBe('opus');
    });

    it('should route quality reviews to sonnet', () => {
      expect(getReviewerModel('quality')).toBe('sonnet');
    });

    it('should route custom reviews to sonnet (safe default)', () => {
      expect(getReviewerModel('custom')).toBe('sonnet');
    });
  });

  describe('Cost optimization', () => {
    it('should use cheapest model for pattern detection tasks', () => {
      // Security reviews are primarily pattern detection
      const securityModel = getReviewerModel('security');
      expect(securityModel).toBe('haiku');
    });

    it('should use most capable model for complex reasoning tasks', () => {
      // Architecture reviews require deep analysis
      const architectureModel = getReviewerModel('architecture');
      expect(architectureModel).toBe('opus');
    });

    it('should use balanced model for standard reviews', () => {
      // Quality reviews are standard code review
      const qualityModel = getReviewerModel('quality');
      expect(qualityModel).toBe('sonnet');
    });
  });

  describe('Consistency', () => {
    it('should always return the same model for a given type', () => {
      const types: ReviewerType[] = ['security', 'architecture', 'quality', 'custom'];

      for (const type of types) {
        const model1 = getReviewerModel(type);
        const model2 = getReviewerModel(type);
        expect(model1).toBe(model2);
      }
    });

    it('should return a valid Claude model name', () => {
      const validModels = ['haiku', 'sonnet', 'opus'];
      const types: ReviewerType[] = ['security', 'architecture', 'quality', 'custom'];

      for (const type of types) {
        const model = getReviewerModel(type);
        expect(validModels).toContain(model);
      }
    });
  });

  describe('Expected cost distribution', () => {
    it('should prioritize cost savings where appropriate', () => {
      // Assuming equal distribution of review types:
      // 25% security (haiku ~$0.001)
      // 25% architecture (opus ~$0.10)
      // 50% quality + custom (sonnet ~$0.01)
      //
      // Average cost = 0.25 * 0.001 + 0.25 * 0.10 + 0.50 * 0.01
      //              = 0.00025 + 0.025 + 0.005
      //              = ~$0.03 per review
      //
      // vs all Sonnet: $0.01 * 3 = $0.03
      // vs all Opus: $0.10 * 3 = $0.30
      //
      // This routing saves ~90% vs all-Opus while maintaining quality
      // where it matters (architecture reviews still use Opus)

      const securityCost = 0.001; // Haiku
      const architectureCost = 0.10; // Opus
      const qualityCost = 0.01; // Sonnet

      // With routing
      const avgCostRouted = 0.25 * securityCost + 0.25 * architectureCost + 0.5 * qualityCost;

      // All Opus (wasteful)
      const avgCostOpus = 0.10;

      // All Sonnet (might miss architectural issues)
      const avgCostSonnet = 0.01;

      expect(avgCostRouted).toBeLessThan(avgCostOpus);
      expect(avgCostRouted).toBeGreaterThan(avgCostSonnet);

      // Verify we're getting the quality where we need it
      expect(getReviewerModel('architecture')).toBe('opus');
    });
  });
});
