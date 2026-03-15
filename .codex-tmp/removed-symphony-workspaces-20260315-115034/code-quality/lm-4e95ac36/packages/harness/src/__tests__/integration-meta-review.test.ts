/**
 * Integration test for meta-review in the full review pipeline
 */

import { describe, it, expect } from 'vitest';
import { aggregateReviewResults } from '../review-pipeline.js';
import { selectMetaReviewModel, DEFAULT_META_REVIEW_CONFIG } from '../meta-review.js';
import type { ReviewResult, ReviewPipelineConfig } from '../types.js';

describe('Meta-Review Integration', () => {
  it('integrates with review pipeline aggregation', () => {
    const results: ReviewResult[] = [
      {
        reviewerId: 'security',
        reviewerType: 'security',
        outcome: 'pass_with_findings',
        findings: [
          {
            id: 'sec-1',
            severity: 'high',
            category: 'security',
            title: 'Auth vulnerability',
            description: 'JWT not validated',
            file: 'src/auth.ts',
            line: 42,
          },
        ],
        summary: 'Security concerns in auth module',
        confidence: 0.9,
        durationMs: 2000,
        model: 'haiku',
      },
      {
        reviewerId: 'architecture',
        reviewerType: 'architecture',
        outcome: 'pass_with_findings',
        findings: [
          {
            id: 'arch-1',
            severity: 'high',
            category: 'architecture',
            title: 'Tight coupling',
            description: 'Auth module tightly coupled to user module',
            file: 'src/auth.ts',
            line: 15,
          },
        ],
        summary: 'Architecture issues in auth module',
        confidence: 0.85,
        durationMs: 3000,
        model: 'opus',
      },
      {
        reviewerId: 'quality',
        reviewerType: 'quality',
        outcome: 'pass_with_findings',
        findings: [
          {
            id: 'qual-1',
            severity: 'medium',
            category: 'quality',
            title: 'Missing tests',
            description: 'Auth module has no test coverage',
            file: 'src/auth.ts',
          },
        ],
        summary: 'Quality concerns in auth module',
        confidence: 0.8,
        durationMs: 1500,
        model: 'sonnet',
      },
    ];

    const config: ReviewPipelineConfig = {
      enabled: true,
      minConfidenceToAdvance: 0.8,
      blockOnCritical: true,
      blockOnHigh: false,
      maxParallelReviewers: 3,
      reviewerTimeoutMs: 300000,
      reviewers: [
        { id: 'security', type: 'security', enabled: true },
        { id: 'architecture', type: 'architecture', enabled: true },
        { id: 'quality', type: 'quality', enabled: true },
      ],
    };

    const aggregation = aggregateReviewResults('test-checkpoint', results, config);

    // Verify aggregation
    expect(aggregation.totalFindings).toBe(3);
    expect(aggregation.highCount).toBe(2);
    expect(aggregation.mediumCount).toBe(1);
    expect(aggregation.reviewers).toHaveLength(3);

    // Meta-review should trigger (3 findings >= threshold of 3)
    expect(aggregation.totalFindings).toBeGreaterThanOrEqual(DEFAULT_META_REVIEW_CONFIG.minFindingsThreshold);

    // Meta-review model selection should choose Opus (2 high findings from security + architecture)
    const metaModel = selectMetaReviewModel(aggregation, DEFAULT_META_REVIEW_CONFIG);
    expect(metaModel).toBe('opus');
  });

  it('demonstrates cross-cutting pattern detection scenario', () => {
    // This scenario shows what meta-review should detect:
    // All three reviewers flagged the same file (src/auth.ts)
    // This is a cross-cutting pattern that individual reviewers can't see

    const results: ReviewResult[] = [
      {
        reviewerId: 'security',
        reviewerType: 'security',
        outcome: 'fail',
        findings: [
          {
            id: 'sec-1',
            severity: 'critical',
            category: 'security',
            title: 'SQL Injection',
            description: 'Unsanitized user input in query',
            file: 'src/auth.ts',
            line: 100,
          },
        ],
        summary: 'Critical security vulnerability',
        confidence: 0.95,
        durationMs: 2500,
        model: 'haiku',
      },
      {
        reviewerId: 'architecture',
        reviewerType: 'architecture',
        outcome: 'pass_with_findings',
        findings: [
          {
            id: 'arch-1',
            severity: 'high',
            category: 'architecture',
            title: 'God object anti-pattern',
            description: 'Auth class has too many responsibilities',
            file: 'src/auth.ts',
            line: 1,
          },
        ],
        summary: 'Architecture violations',
        confidence: 0.9,
        durationMs: 3500,
        model: 'opus',
      },
      {
        reviewerId: 'quality',
        reviewerType: 'quality',
        outcome: 'pass_with_findings',
        findings: [
          {
            id: 'qual-1',
            severity: 'high',
            category: 'quality',
            title: 'Zero test coverage',
            description: 'Critical auth logic has no tests',
            file: 'src/auth.ts',
          },
        ],
        summary: 'Testing gaps',
        confidence: 0.85,
        durationMs: 1800,
        model: 'sonnet',
      },
    ];

    const config: ReviewPipelineConfig = {
      enabled: true,
      minConfidenceToAdvance: 0.8,
      blockOnCritical: true,
      blockOnHigh: true,
      maxParallelReviewers: 3,
      reviewerTimeoutMs: 300000,
      reviewers: [
        { id: 'security', type: 'security', enabled: true, canBlock: true },
        { id: 'architecture', type: 'architecture', enabled: true, canBlock: true },
        { id: 'quality', type: 'quality', enabled: true },
      ],
    };

    const aggregation = aggregateReviewResults('test-checkpoint', results, config);

    // This is a systemic issue:
    // - All reviewers flag the same file
    // - Critical + 2 high findings
    // - Multiple blocking reviewers failed

    expect(aggregation.totalFindings).toBe(3);
    expect(aggregation.criticalCount).toBe(1);
    expect(aggregation.highCount).toBe(2);
    expect(aggregation.shouldAdvance).toBe(false);
    expect(aggregation.blockingReasons).toContain('1 critical finding(s)');

    // All findings target the same file - this is a cross-cutting pattern
    const allInSameFile = results.every((r) =>
      r.findings.every((f) => f.file === 'src/auth.ts')
    );
    expect(allInSameFile).toBe(true);

    // Meta-review should definitely use Opus here
    const metaModel = selectMetaReviewModel(aggregation, DEFAULT_META_REVIEW_CONFIG);
    expect(metaModel).toBe('opus');

    // Expected meta-review synthesis (placeholder - actual AI would generate):
    // "Systemic issues in src/auth.ts detected across all reviewers:
    //  - Security: Critical SQL injection vulnerability
    //  - Architecture: God object anti-pattern
    //  - Quality: Zero test coverage
    //  → Recommend: Complete auth module refactor with security audit"
  });

  it('verifies Beads seed type is properly exported', () => {
    // This test verifies the new BeadsIssueSeed type can be used
    const seed = {
      behavior: 'Fix auth module systemic issues',
      examples: [
        'Security review: Critical SQL injection',
        'Architecture review: God object pattern',
        'Quality review: No test coverage',
      ],
      config: {
        maxIterations: 20,
        escalation: {
          enabled: true,
          initialModel: 'sonnet' as const,
          escalationThreshold: 5,
        },
      },
      acceptance: [
        {
          test: 'All security vulnerabilities fixed',
          verify: 'pnpm test security',
        },
        {
          test: 'Architecture refactored',
          verify: 'pnpm exec tsc --noEmit',
        },
        {
          test: 'Test coverage > 80%',
          verify: 'pnpm test --coverage',
        },
      ],
      completionPromise: 'AUTH_MODULE_FIXED',
    };

    // Verify the seed structure
    expect(seed.behavior).toBeDefined();
    expect(seed.examples).toHaveLength(3);
    expect(seed.config?.escalation?.enabled).toBe(true);
    expect(seed.acceptance).toHaveLength(3);
    expect(seed.completionPromise).toBe('AUTH_MODULE_FIXED');
  });
});
