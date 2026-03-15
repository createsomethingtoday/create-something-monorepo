/**
 * Rejection Email Generation Utility
 * Matches original IC implementation
 */

import type { ScanReport, RemediationInfo } from '../types';

export function generateRejectionEmail(
  report: ScanReport,
  remediationRegistry: Record<string, RemediationInfo>
): string {
  const criticalFindings = Object.entries(report.findings)
    .filter(([_, data]) => data.rule.severity === 'BLOCKER' || data.rule.severity === 'HIGH')
    .map(([ruleId, data]) => ({
      ruleId,
      rule: data.rule,
      count: data.count,
      items: data.items.slice(0, 3), // First 3 examples
      remediation: remediationRegistry[ruleId]
    }));

  if (criticalFindings.length === 0) {
    return 'No critical findings to generate rejection email for.';
  }

  let email = `Subject: App Review - Action Required: Security Issues Found

Hi,

Thank you for your submission to the Webflow Marketplace. During our automated security review, we identified ${criticalFindings.length} issue(s) that require your attention before we can proceed with the review.

## Issues Found

`;

  criticalFindings.forEach((finding, index) => {
    email += `### ${index + 1}. ${finding.rule.name} (${finding.rule.severity})

**What we found:** ${finding.rule.description}

**Occurrences:** ${finding.count} instance(s)

**Example locations:**
`;
    finding.items.forEach(item => {
      email += `- \`${item.filePath}\` (line ${item.line}): \`${item.snippet.substring(0, 60)}${item.snippet.length > 60 ? '...' : ''}\`
`;
    });

    if (finding.remediation) {
      email += `
**Why this matters:** ${finding.remediation.whyItMatters}

**How to fix:** ${finding.remediation.howToFix}
`;
      if (finding.remediation.badExample && finding.remediation.goodExample) {
        email += `
**Instead of:**
\`\`\`javascript
${finding.remediation.badExample}
\`\`\`

**Use:**
\`\`\`javascript
${finding.remediation.goodExample}
\`\`\`
`;
      }
    }

    email += '\n---\n\n';
  });

  email += `## Next Steps

1. Review each issue listed above
2. Apply the suggested fixes to your codebase
3. Resubmit your app for review

If you believe any of these findings are false positives, please reply to this email with an explanation and we'll review manually.

## Resources

- [Webflow Marketplace Security Guidelines](https://developers.webflow.com/marketplace/guidelines)
- [App Bundle Best Practices](https://developers.webflow.com/code-components/best-practices)

Best regards,
Webflow Marketplace Review Team
`;

  return email;
}
