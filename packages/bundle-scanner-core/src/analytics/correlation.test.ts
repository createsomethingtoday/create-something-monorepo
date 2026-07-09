import { describe, expect, it } from 'vitest';

import { CorrelationAnalyzer, scoreSubmissionPriority } from './correlation';
import type { ScanReport, ScanRule, Verdict } from '../types';

function rule(ruleId: string): ScanRule {
  return {
    ruleId,
    name: `Rule ${ruleId}`,
    category: 'SECURITY',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'HIGH',
    disposition: 'ACTION_REQUIRED',
    description: 'test',
    matchers: []
  };
}

function report(runId: string, verdict: Verdict, ruleIds: string[]): ScanReport {
  const findings: ScanReport['findings'] = {};
  for (const id of ruleIds) {
    findings[id] = { rule: rule(id), count: 1, items: [] };
  }
  return {
    scanReportVersion: '1.1.0',
    runId,
    createdAt: new Date().toISOString(),
    policyMetadata: { rulesetVersion: '1.0.0', configVersion: '1.0.0' },
    verdict,
    verdictReasons: [],
    bundleSummary: { fileCount: 1, totalBytes: 1, scannedFileCount: 1, skippedFileCount: 0 },
    findings
  };
}

describe('CorrelationAnalyzer', () => {
  it('computes baseline rejection rate and rule lift', () => {
    const analyzer = new CorrelationAnalyzer();

    // 20 rejected submissions all triggered R1; 20 approved never triggered R1.
    for (let i = 0; i < 20; i++) {
      analyzer.record(`rej-${i}`, report(`run-rej-${i}`, 'REJECTED', ['R1']), 'rejected');
    }
    for (let i = 0; i < 20; i++) {
      analyzer.record(`app-${i}`, report(`run-app-${i}`, 'PASS', ['R2']), 'approved');
    }

    const result = analyzer.analyze();
    expect(result.submissionCount).toBe(40);
    expect(result.rejectionCount).toBe(20);
    expect(result.baselineRejectionRate).toBeCloseTo(0.5, 5);

    const r1 = result.topRejectionPredictors.find((c) => c.ruleId === 'R1');
    expect(r1).toBeDefined();
    expect(r1?.lift).toBeCloseTo(2, 5);
    expect(r1?.rejectionRate).toBeCloseTo(1, 5);
  });

  it('round-trips recorded submissions via export/import', () => {
    const analyzer = new CorrelationAnalyzer();
    analyzer.record('s1', report('run-1', 'REJECTED', ['R1']), 'rejected');

    const exported = analyzer.export();
    expect(exported).toHaveLength(1);

    const restored = new CorrelationAnalyzer();
    restored.import(exported);
    expect(restored.analyze().submissionCount).toBe(1);
  });
});

describe('scoreSubmissionPriority', () => {
  it('scores a high-lift submission as critical', () => {
    const correlationReport = {
      generatedAt: new Date().toISOString(),
      submissionCount: 40,
      rejectionCount: 20,
      baselineRejectionRate: 0.5,
      topRejectionPredictors: [
        {
          ruleId: 'R1',
          ruleName: 'Rule R1',
          category: 'SECURITY',
          timesTriggered: 20,
          rejectedWhenTriggered: 20,
          approvedWhenTriggered: 0,
          rejectionRate: 1,
          baselineRejectionRate: 0.5,
          lift: 2,
          sampleSize: 20,
          confidence: 'medium' as const
        }
      ],
      lowSignalRules: [],
      categoryInsights: [],
      recommendations: []
    };

    const scored = scoreSubmissionPriority(report('run-x', 'REJECTED', ['R1']), correlationReport);
    expect(scored.priorityScore).toBeGreaterThanOrEqual(80);
    expect(scored.riskLevel).toBe('critical');
    expect(scored.topRiskFactors).toContain('R1');
  });
});
