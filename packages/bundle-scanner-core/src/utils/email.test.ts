import { describe, expect, it } from 'vitest';

import { generatePassEmail, generateRejectionEmail } from './email';
import { generateReport } from '../scanner/report';
import { defaultConfig } from '../policy/default-config';
import type { Finding, Ruleset, ScanRule } from '../types';

const rules: ScanRule[] = [
  {
    ruleId: 'SEC-BLOCK',
    name: 'Dynamic Code Execution',
    category: 'SECURITY',
    reviewBucket: 'AUTO_REJECT',
    severity: 'BLOCKER',
    disposition: 'REJECTED',
    description: 'Uses eval or new Function',
    matchers: []
  },
  {
    ruleId: 'NET-EGRESS',
    name: 'External Network Egress',
    category: 'NETWORK',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'HIGH',
    disposition: 'ACTION_REQUIRED',
    description: 'Calls an external domain',
    matchers: []
  }
];

const ruleset: Ruleset = { schemaVersion: 's', rulesetVersion: '1.0.0', rules };

function finding(ruleId: string, filePath: string, line: number): Finding {
  return {
    ruleId,
    matcherId: 'm',
    filePath,
    line,
    col: 1,
    snippet: 's',
    triggerToken: 'eval(x)',
    locationType: 'CODE',
    confidence: 'HIGH'
  };
}

describe('generateRejectionEmail', () => {
  it('lists critical issues and clarification items with examples', () => {
    const report = generateReport(
      [finding('SEC-BLOCK', 'src/app.js', 12), finding('NET-EGRESS', 'src/api.js', 5)],
      ruleset,
      defaultConfig,
      { fileCount: 3, totalBytes: 100, textFilesScanned: 3, skippedFileCount: 0 }
    );

    const email = generateRejectionEmail(report);
    expect(email).toContain('Critical Issues (Must Fix)');
    expect(email).toContain('Dynamic Code Execution');
    expect(email).toContain('src/app.js:12');
    expect(email).toContain('Items Requiring Clarification');
    expect(email).toContain('External Network Egress');
    expect(email).toContain(`Report ID: ${report.runId}`);
  });
});

describe('generatePassEmail', () => {
  it('summarizes an approved bundle', () => {
    const report = generateReport([], ruleset, defaultConfig, {
      fileCount: 4,
      totalBytes: 4096,
      textFilesScanned: 4,
      skippedFileCount: 0
    });

    const email = generatePassEmail(report);
    expect(email).toContain('Approved');
    expect(email).toContain('Verdict:** PASS');
    expect(email).toContain('Files Scanned:** 4');
  });
});
