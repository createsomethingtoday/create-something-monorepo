import { describe, expect, it } from 'vitest';

import { generateReport, type ReportSummaryInput } from './report';
import { defaultConfig } from '../policy/default-config';
import type { Finding, Ruleset, ScanRule, Severity } from '../types';

function scanRule(ruleId: string, severity: Severity): ScanRule {
  return {
    ruleId,
    name: `Rule ${ruleId}`,
    category: 'SECURITY',
    reviewBucket: severity === 'BLOCKER' ? 'AUTO_REJECT' : severity === 'HIGH' ? 'ACTION_REQUIRED' : 'INFO',
    severity,
    disposition: severity === 'BLOCKER' ? 'REJECTED' : severity === 'HIGH' ? 'ACTION_REQUIRED' : 'INFO',
    description: 'test',
    matchers: []
  };
}

function finding(ruleId: string, overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId,
    matcherId: 'm',
    filePath: 'app.js',
    line: 1,
    col: 1,
    snippet: 'snippet',
    triggerToken: 'token',
    locationType: 'CODE',
    confidence: 'HIGH',
    ...overrides
  };
}

const summary: ReportSummaryInput = {
  fileCount: 10,
  totalBytes: 2048,
  textFilesScanned: 8,
  skippedFileCount: 2
};

function rs(rules: ScanRule[]): Ruleset {
  return { schemaVersion: 's', rulesetVersion: '1.0.0', rules };
}

describe('generateReport', () => {
  it('returns REJECTED when a blocker finding is present', () => {
    const ruleset = rs([scanRule('SEC-BLOCK', 'BLOCKER')]);
    const report = generateReport([finding('SEC-BLOCK')], ruleset, defaultConfig, summary);

    expect(report.verdict).toBe('REJECTED');
    expect(report.verdictReasons).toContain('BLOCKER: Rule SEC-BLOCK');
  });

  it('returns ACTION_REQUIRED for high severity findings', () => {
    const ruleset = rs([scanRule('SEC-HIGH', 'HIGH')]);
    const report = generateReport([finding('SEC-HIGH')], ruleset, defaultConfig, summary);
    expect(report.verdict).toBe('ACTION_REQUIRED');
  });

  it('returns PASS when only informational findings exist', () => {
    const ruleset = rs([scanRule('INFO-RULE', 'INFO')]);
    const report = generateReport([finding('INFO-RULE')], ruleset, defaultConfig, summary);
    expect(report.verdict).toBe('PASS');
    expect(report.verdictReasons).toEqual(['No blocking issues found']);
  });

  it('lets finding-level overrides escalate the verdict', () => {
    const ruleset = rs([scanRule('SEC-MED', 'MEDIUM')]);
    const report = generateReport(
      [finding('SEC-MED', { severity: 'BLOCKER', reviewBucket: 'AUTO_REJECT' })],
      ruleset,
      defaultConfig,
      summary
    );
    expect(report.verdict).toBe('REJECTED');
  });

  it('groups findings by rule and carries bundle summary + metadata', () => {
    const ruleset = rs([scanRule('SEC-HIGH', 'HIGH')]);
    const report = generateReport(
      [finding('SEC-HIGH'), finding('SEC-HIGH', { line: 2 })],
      ruleset,
      defaultConfig,
      summary
    );

    expect(report.findings['SEC-HIGH']?.count).toBe(2);
    expect(report.bundleSummary.scannedFileCount).toBe(8);
    expect(report.bundleSummary.skippedFileCount).toBe(2);
    expect(report.policyMetadata.rulesetVersion).toBe('1.0.0');
    expect(report.runId).toBeTruthy();
  });
});
