/**
 * Report Generation Module
 * Matches original IC implementation
 */

import type { Finding, ScanReport, Verdict, FileEntry, Ruleset, ScanConfig, ScanRule } from '../types';

/**
 * Generate a scan report from findings
 */
export function generateReport(
  findings: Finding[],
  inventory: FileEntry[],
  ruleset: Ruleset,
  config: ScanConfig
): ScanReport {
  const runId = `scan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const createdAt = new Date().toISOString();
  
  // Group findings by rule
  const findingsByRule: ScanReport['findings'] = {};
  
  for (const finding of findings) {
    if (!findingsByRule[finding.ruleId]) {
      const rule = ruleset.rules.find(r => r.ruleId === finding.ruleId);
      if (rule) {
        findingsByRule[finding.ruleId] = {
          rule,
          count: 0,
          items: []
        };
      }
    }
    
    if (findingsByRule[finding.ruleId]) {
      findingsByRule[finding.ruleId].count++;
      findingsByRule[finding.ruleId].items.push(finding);
    }
  }
  
  // Calculate verdict
  const { verdict, reasons } = determineVerdict(findingsByRule, ruleset);
  
  // Calculate bundle summary
  const totalBytes = inventory.reduce((sum, f) => sum + f.sizeBytes, 0);
  const scannedFiles = inventory.filter(f => !f.isIgnored && f.isTextCandidate);
  const skippedFiles = inventory.filter(f => f.isIgnored || !f.isTextCandidate);
  
  return {
    scanReportVersion: '1.0.0',
    runId,
    createdAt,
    policyMetadata: {
      rulesetVersion: ruleset.rulesetVersion,
      configVersion: config.configVersion
    },
    verdict,
    verdictReasons: reasons,
    bundleSummary: {
      fileCount: inventory.length,
      totalBytes,
      scannedFileCount: scannedFiles.length,
      skippedFileCount: skippedFiles.length
    },
    findings: findingsByRule
  };
}

function determineVerdict(
  findingsByRule: ScanReport['findings'],
  ruleset: Ruleset
): { verdict: Verdict; reasons: string[] } {
  const reasons: string[] = [];
  let hasBlocker = false;
  let hasActionRequired = false;
  
  for (const [ruleId, data] of Object.entries(findingsByRule)) {
    const rule = data.rule;
    
    if (rule.disposition === 'REJECTED' || rule.severity === 'BLOCKER') {
      hasBlocker = true;
      reasons.push(`${rule.name}: ${data.count} blocker finding(s)`);
    } else if (rule.disposition === 'ACTION_REQUIRED' || rule.severity === 'HIGH') {
      hasActionRequired = true;
      reasons.push(`${rule.name}: ${data.count} finding(s) requiring action`);
    }
  }
  
  if (hasBlocker) {
    return { verdict: 'REJECTED', reasons };
  }
  
  if (hasActionRequired) {
    return { verdict: 'ACTION_REQUIRED', reasons };
  }
  
  if (Object.keys(findingsByRule).length === 0) {
    return { verdict: 'PASS', reasons: ['No issues found'] };
  }
  
  return { verdict: 'PASS', reasons: ['Only informational findings'] };
}
