import type { 
  Finding, 
  Ruleset, 
  ScanConfig, 
  ScanReport, 
  Verdict,
  FindingGroup 
} from '../types';

/**
 * Generate a unique run ID
 */
function generateRunId(): string {
  return crypto.randomUUID();
}

/**
 * Determine the overall verdict based on findings
 */
function calculateVerdict(
  findings: Finding[],
  ruleset: Ruleset
): { verdict: Verdict; reasons: string[] } {
  const reasons: string[] = [];
  
  // Build rule lookup
  const ruleMap = new Map(ruleset.rules.map(r => [r.ruleId, r]));
  
  // Check for blockers
  let hasBlocker = false;
  let hasActionRequired = false;
  
  for (const finding of findings) {
    const rule = ruleMap.get(finding.ruleId);
    if (!rule) continue;
    
    // Use finding-level overrides if present, otherwise use rule defaults
    const severity = finding.severity ?? rule.severity;
    const reviewBucket = finding.reviewBucket ?? rule.reviewBucket;
    
    if (severity === 'BLOCKER' || reviewBucket === 'AUTO_REJECT') {
      hasBlocker = true;
      if (!reasons.includes(`BLOCKER: ${rule.name}`)) {
        reasons.push(`BLOCKER: ${rule.name}`);
      }
    } else if (severity === 'HIGH' || reviewBucket === 'ACTION_REQUIRED') {
      hasActionRequired = true;
      if (!reasons.includes(`ACTION_REQUIRED: ${rule.name}`)) {
        reasons.push(`ACTION_REQUIRED: ${rule.name}`);
      }
    }
  }
  
  if (hasBlocker) {
    return { verdict: 'REJECTED', reasons };
  }
  
  if (hasActionRequired) {
    return { verdict: 'ACTION_REQUIRED', reasons };
  }
  
  return { verdict: 'PASS', reasons: ['No blocking issues found'] };
}

/**
 * Group findings by rule
 */
function groupFindings(
  findings: Finding[],
  ruleset: Ruleset
): Record<string, FindingGroup> {
  const ruleMap = new Map(ruleset.rules.map(r => [r.ruleId, r]));
  const groups: Record<string, FindingGroup> = {};
  
  for (const finding of findings) {
    const rule = ruleMap.get(finding.ruleId);
    if (!rule) continue;
    
    if (!groups[finding.ruleId]) {
      groups[finding.ruleId] = {
        rule,
        count: 0,
        items: []
      };
    }
    
    groups[finding.ruleId].count++;
    groups[finding.ruleId].items.push(finding);
  }
  
  return groups;
}

/**
 * Input summary statistics
 */
export interface ReportSummaryInput {
  fileCount: number;
  totalBytes: number;
  textFilesScanned: number;
  skippedFileCount: number;
}

/**
 * Generate a complete scan report
 * 
 * @param findings - Array of findings from the scanner
 * @param ruleset - The ruleset used for scanning
 * @param config - Scanner configuration
 * @param summary - Bundle summary statistics
 * @returns Complete scan report
 */
export function generateReport(
  findings: Finding[],
  ruleset: Ruleset,
  config: ScanConfig,
  summary: ReportSummaryInput
): ScanReport {
  const { verdict, reasons } = calculateVerdict(findings, ruleset);
  const groupedFindings = groupFindings(findings, ruleset);
  
  return {
    scanReportVersion: '1.1.0',
    runId: generateRunId(),
    createdAt: new Date().toISOString(),
    
    policyMetadata: {
      rulesetVersion: ruleset.rulesetVersion,
      configVersion: config.configVersion
    },
    
    verdict,
    verdictReasons: reasons,
    
    bundleSummary: {
      fileCount: summary.fileCount,
      totalBytes: summary.totalBytes,
      scannedFileCount: summary.textFilesScanned,
      skippedFileCount: summary.skippedFileCount
    },
    
    findings: groupedFindings
  };
}
