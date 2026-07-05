import {
  CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS
} from './content/generated/canon-overlay-candidate-promotion-approval-records.js';
import type { CanonOverlayCandidatePromotionApprovalRecord } from './content/types.js';

export function listCanonOverlayCandidatePromotionApprovalRecordIds(): string[] {
  return CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS.entries.map(
    (record) => record.intakeId
  );
}

export function getCanonOverlayCandidatePromotionApprovalRecord(
  intakeId: string
): CanonOverlayCandidatePromotionApprovalRecord | undefined {
  return CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS.entries.find(
    (record) =>
      record.intakeId === intakeId ||
      record.id === intakeId ||
      record.candidateId === intakeId ||
      record.planId === intakeId ||
      record.readinessReportId === intakeId
  );
}

export function renderCanonOverlayCandidatePromotionApprovalRecord(
  record: CanonOverlayCandidatePromotionApprovalRecord
): string {
  const lines: Array<string | undefined> = [
    `# ${record.title}`,
    '',
    '## Identity',
    `- Intake: \`${record.intakeId}\``,
    `- Approval record: \`${record.id}\``,
    `- Readiness report: \`${record.readinessReportId}\``,
    `- Promotion plan: \`${record.planId}\``,
    `- Candidate: \`${record.candidateId}\``,
    `- State: \`${record.state}\``,
    '',
    '## Source URIs',
    `- Approval record: \`${record.approvalUri}\``,
    `- Readiness report: \`${record.readinessUri}\``,
    `- Promotion plan: \`${record.planUri}\``,
    `- Review packet: \`${record.handoffUri}\``,
    `- Candidate detail: \`${record.candidateUri}\``,
    `- Overlay review: \`${record.reviewUri}\``,
    '',
    '## Summary',
    record.summary,
    '',
    '## Required Approval Fields',
    ...record.requiredFields.flatMap((field) => [
      `### ${field.label}`,
      `- Required: ${field.required ? 'yes' : 'no'}`,
      `- Current value: ${field.value ?? 'UNSET'}`,
      `- Instructions: ${field.instructions}`,
      ...(field.hints.length ? field.hints.map((hint) => `- Hint: ${hint}`) : ['- Hint: none']),
      ''
    ]),
    '## Target Hints',
    '### Registry Items',
    ...(record.targetHints.registryItems.length
      ? record.targetHints.registryItems.map(
          (item) =>
            `- \`${item.id}\`: ${item.name} (\`${item.maturity}\`, score ${item.score}) - ${item.reason}`
        )
      : ['- None found from current Canon registry snapshot.']),
    '',
    '### Export Policies',
    ...(record.targetHints.exportPolicies.length
      ? record.targetHints.exportPolicies.map((rule) => {
          const label = rule.exportName ? `${rule.exportPath}#${rule.exportName}` : rule.exportPath;
          return `- \`${label}\`: \`${rule.registryPolicy}\` / \`${rule.classification}\` (score ${rule.score})`;
        })
      : ['- None found from current Canon public export policy snapshot.']),
    '',
    '### Docs Paths',
    ...(record.targetHints.docsPaths.length
      ? record.targetHints.docsPaths.map((docsPath) => `- \`${docsPath}\``)
      : ['- None found from related registry items.']),
    '',
    '## Checklist',
    ...record.checklist.map((item) => `- ${item}`),
    '',
    '## Stop Conditions',
    ...record.stopConditions.map((item) => `- ${item}`),
    '',
    '## Approval Boundary',
    ...record.approvalBoundary.map((item) => `- ${item}`),
    '',
    '## Agent Contract',
    ...record.agentContract.useFor.map((item) => `- Use for: ${item}`),
    ...record.agentContract.stopBefore.map((item) => `- Stop before: ${item}`)
  ].filter((line): line is string => line !== undefined);

  return lines.join('\n');
}
