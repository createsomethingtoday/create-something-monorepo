import type { ScanReport } from '../types';

/**
 * Generate a rejection email draft based on scan findings
 * 
 * @param report - The scan report
 * @returns Formatted email text
 */
export function generateRejectionEmail(report: ScanReport): string {
  const blockers = Object.values(report.findings)
    .filter(g => g.count > 0 && (g.rule.severity === 'BLOCKER' || g.rule.reviewBucket === 'AUTO_REJECT'));
  
  const reviewItems = Object.values(report.findings)
    .filter(g => g.count > 0 && (g.rule.severity === 'HIGH' || g.rule.reviewBucket === 'ACTION_REQUIRED'));

  const lines: string[] = [
    'Subject: App Bundle Review - Action Required',
    '',
    'Hi there,',
    '',
    'Thank you for submitting your app to the Webflow Marketplace. After reviewing your bundle, we\'ve identified some issues that need to be addressed before we can proceed.',
    ''
  ];

  if (blockers.length > 0) {
    lines.push('## Critical Issues (Must Fix)');
    lines.push('');
    
    for (const group of blockers) {
      lines.push(`### ${group.rule.name}`);
      lines.push(`- **Category:** ${group.rule.category}`);
      lines.push(`- **Description:** ${group.rule.description}`);
      lines.push(`- **Occurrences:** ${group.count}`);
      
      // Show first 3 examples
      const examples = group.items.slice(0, 3);
      if (examples.length > 0) {
        lines.push('- **Examples:**');
        for (const item of examples) {
          lines.push(`  - \`${item.filePath}:${item.line}\` - ${item.triggerToken}`);
        }
      }
      lines.push('');
    }
  }

  if (reviewItems.length > 0) {
    lines.push('## Items Requiring Clarification');
    lines.push('');
    
    for (const group of reviewItems) {
      lines.push(`### ${group.rule.name}`);
      lines.push(`- **Description:** ${group.rule.description}`);
      lines.push(`- **Occurrences:** ${group.count}`);
      lines.push('');
    }
  }

  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Address the critical issues listed above');
  lines.push('2. Provide explanations for any items requiring clarification');
  lines.push('3. Re-submit your bundle for review');
  lines.push('');
  lines.push('If you have questions about any of these findings, please reply to this email and we\'ll be happy to clarify.');
  lines.push('');
  lines.push('Best regards,');
  lines.push('Webflow Marketplace Review Team');
  lines.push('');
  lines.push(`---`);
  lines.push(`Report ID: ${report.runId}`);
  lines.push(`Generated: ${report.createdAt}`);

  return lines.join('\n');
}

/**
 * Generate a pass email draft
 * 
 * @param report - The scan report
 * @returns Formatted email text
 */
export function generatePassEmail(report: ScanReport): string {
  const lines: string[] = [
    'Subject: App Bundle Review - Approved',
    '',
    'Hi there,',
    '',
    'Great news! Your app bundle has passed our automated security and policy review.',
    '',
    '## Summary',
    '',
    `- **Files Scanned:** ${report.bundleSummary.scannedFileCount}`,
    `- **Total Size:** ${(report.bundleSummary.totalBytes / 1024).toFixed(1)} KB`,
    `- **Verdict:** ${report.verdict}`,
    '',
    'Your submission will now proceed to the next stage of the review process.',
    '',
    'Best regards,',
    'Webflow Marketplace Review Team',
    '',
    `---`,
    `Report ID: ${report.runId}`,
    `Generated: ${report.createdAt}`
  ];

  return lines.join('\n');
}
