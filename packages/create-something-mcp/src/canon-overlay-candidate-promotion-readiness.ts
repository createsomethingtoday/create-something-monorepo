import {
  CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS
} from './content/generated/canon-overlay-candidate-promotion-readiness-reports.js';
import type { CanonOverlayCandidatePromotionReadinessReport } from './content/types.js';

export function listCanonOverlayCandidatePromotionReadinessReportIds(): string[] {
  return CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS.entries.map(
    (report) => report.intakeId
  );
}

export function getCanonOverlayCandidatePromotionReadinessReport(
  intakeId: string
): CanonOverlayCandidatePromotionReadinessReport | undefined {
  return CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS.entries.find(
    (report) =>
      report.intakeId === intakeId ||
      report.id === intakeId ||
      report.candidateId === intakeId ||
      report.planId === intakeId
  );
}

export function renderCanonOverlayCandidatePromotionReadinessReport(
  report: CanonOverlayCandidatePromotionReadinessReport
): string {
  const lines: Array<string | undefined> = [
    `# ${report.title}`,
    '',
    '## Identity',
    `- Intake: \`${report.intakeId}\``,
    `- Readiness report: \`${report.id}\``,
    `- Promotion plan: \`${report.planId}\``,
    `- Candidate: \`${report.candidateId}\``,
    `- Status: \`${report.status}\``,
    '',
    '## Source URIs',
    `- Readiness report: \`${report.readinessUri}\``,
    `- Promotion plan: \`${report.planUri}\``,
    `- Review packet: \`${report.handoffUri}\``,
    `- Candidate detail: \`${report.candidateUri}\``,
    `- Overlay review: \`${report.reviewUri}\``,
    '',
    '## Summary',
    report.summary,
    '',
    '## Checks',
    ...report.checks.flatMap((check) => [
      `### ${check.label}`,
      `- Status: \`${check.status}\``,
      `- Required action: ${check.requiredAction}`,
      ...check.evidence.map((item) => `- Evidence: ${item}`),
      ''
    ]),
    '## Related Registry Items',
    ...(report.relatedRegistryItems.length
      ? report.relatedRegistryItems.map(
          (item) =>
            `- \`${item.id}\`: ${item.name} (\`${item.maturity}\`, score ${item.score}) - ${item.reason}`
        )
      : ['- None found from current Canon registry snapshot.']),
    '',
    '## Candidate Export Policies',
    ...(report.candidateExportPolicies.length
      ? report.candidateExportPolicies.map((rule) => {
          const label = rule.exportName ? `${rule.exportPath}#${rule.exportName}` : rule.exportPath;
          return `- \`${label}\`: \`${rule.registryPolicy}\` / \`${rule.classification}\` (score ${rule.score})`;
        })
      : ['- None found from current Canon public export policy snapshot.']),
    '',
    '## Stop Conditions',
    ...report.stopConditions.map((item) => `- ${item}`),
    '',
    '## Approval Boundary',
    ...report.approvalBoundary.map((item) => `- ${item}`),
    '',
    '## Agent Contract',
    ...report.agentContract.useFor.map((item) => `- Use for: ${item}`),
    ...report.agentContract.stopBefore.map((item) => `- Stop before: ${item}`)
  ].filter((line): line is string => line !== undefined);

  return lines.join('\n');
}
