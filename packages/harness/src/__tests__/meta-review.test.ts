/**
 * Tests for meta-review functionality (Bloom-inspired pattern)
 */

import { describe, it, expect } from 'vitest';
import {
  selectMetaReviewModel,
  DEFAULT_META_REVIEW_CONFIG,
  type MetaReviewConfig,
} from '../meta-review.js';
import type { ReviewAggregation, ReviewResult } from '../types.js';

describe('Meta-Review', () => {
  describe('selectMetaReviewModel', () => {
    it('uses Sonnet by default when no critical findings', () => {
      const aggregation: ReviewAggregation = {
        checkpointId: 'test-checkpoint',
        reviewers: [
          {
            reviewerId: 'quality',
            reviewerType: 'quality',
            outcome: 'pass',
            findings: [],
            summary: 'No issues',
            confidence: 0.9,
            durationMs: 1000,
          },
        ],
        overallOutcome: 'pass',
        overallConfidence: 0.9,
        totalFindings: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        infoCount: 0,
        shouldAdvance: true,
        blockingReasons: [],
        timestamp: new Date().toISOString(),
      };

      const model = selectMetaReviewModel(aggregation, DEFAULT_META_REVIEW_CONFIG);
      expect(model).toBe('sonnet');
    });

    it('uses Opus when security reviewer finds critical issues', () => {
      const aggregation: ReviewAggregation = {
        checkpointId: 'test-checkpoint',
        reviewers: [
          {
            reviewerId: 'security',
            reviewerType: 'security',
            outcome: 'fail',
            findings: [
              {
                id: 'sec-1',
                severity: 'critical',
                category: 'security',
                title: 'SQL Injection vulnerability',
                description: 'User input not sanitized',
                file: 'src/auth.ts',
                line: 42,
                suggestion: 'Use parameterized queries',
              },
            ],
            summary: 'Critical security issue',
            confidence: 0.95,
            durationMs: 2000,
          },
        ],
        overallOutcome: 'fail',
        overallConfidence: 0.95,
        totalFindings: 1,
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        infoCount: 0,
        shouldAdvance: false,
        blockingReasons: ['1 critical finding(s)'],
        timestamp: new Date().toISOString(),
      };

      const model = selectMetaReviewModel(aggregation, DEFAULT_META_REVIEW_CONFIG);
      expect(model).toBe('opus');
    });

    it('uses Opus when architecture finds high severity with multiple high findings', () => {
      const aggregation: ReviewAggregation = {
        checkpointId: 'test-checkpoint',
        reviewers: [
          {
            reviewerId: 'architecture',
            reviewerType: 'architecture',
            outcome: 'pass_with_findings',
            findings: [
              {
                id: 'arch-1',
                severity: 'high',
                category: 'architecture',
                title: 'Tight coupling detected',
                description: 'Components are tightly coupled',
                file: 'src/app.ts',
              },
            ],
            summary: 'Architecture concerns',
            confidence: 0.8,
            durationMs: 3000,
          },
          {
            reviewerId: 'security',
            reviewerType: 'security',
            outcome: 'pass_with_findings',
            findings: [
              {
                id: 'sec-1',
                severity: 'high',
                category: 'security',
                title: 'Auth issue',
                description: 'Weak authentication',
                file: 'src/auth.ts',
              },
            ],
            summary: 'Security findings',
            confidence: 0.85,
            durationMs: 2000,
          },
        ],
        overallOutcome: 'pass_with_findings',
        overallConfidence: 0.825,
        totalFindings: 2,
        criticalCount: 0,
        highCount: 2,
        mediumCount: 0,
        lowCount: 0,
        infoCount: 0,
        shouldAdvance: true,
        blockingReasons: [],
        timestamp: new Date().toISOString(),
      };

      const model = selectMetaReviewModel(aggregation, DEFAULT_META_REVIEW_CONFIG);
      expect(model).toBe('opus');
    });

    it('respects config flag to disable Opus', () => {
      const config: MetaReviewConfig = {
        ...DEFAULT_META_REVIEW_CONFIG,
        useOpusForSecurityCritical: false,
      };

      const aggregation: ReviewAggregation = {
        checkpointId: 'test-checkpoint',
        reviewers: [
          {
            reviewerId: 'security',
            reviewerType: 'security',
            outcome: 'fail',
            findings: [
              {
                id: 'sec-1',
                severity: 'critical',
                category: 'security',
                title: 'Critical issue',
                description: 'Bad',
              },
            ],
            summary: 'Critical',
            confidence: 0.9,
            durationMs: 1000,
          },
        ],
        overallOutcome: 'fail',
        overallConfidence: 0.9,
        totalFindings: 1,
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        infoCount: 0,
        shouldAdvance: false,
        blockingReasons: [],
        timestamp: new Date().toISOString(),
      };

      const model = selectMetaReviewModel(aggregation, config);
      expect(model).toBe('sonnet');
    });
  });

  describe('DEFAULT_META_REVIEW_CONFIG', () => {
    it('has sensible defaults', () => {
      expect(DEFAULT_META_REVIEW_CONFIG.enabled).toBe(true);
      expect(DEFAULT_META_REVIEW_CONFIG.useOpusForSecurityCritical).toBe(true);
      expect(DEFAULT_META_REVIEW_CONFIG.minFindingsThreshold).toBe(3);
      expect(DEFAULT_META_REVIEW_CONFIG.createBeadsIssues).toBe(true);
    });
  });
});
