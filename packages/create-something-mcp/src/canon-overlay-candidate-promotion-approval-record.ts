import {
  CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS
} from './content/generated/canon-overlay-candidate-promotion-approval-records.js';
import type {
  CanonOverlayCandidatePromotionApprovalRecord,
  CanonOverlayCandidatePromotionApprovalTarget,
  CanonOverlayCandidatePromotionApprovalTargetTemplate,
  CanonOverlayCandidatePromotionApprovalValidationIssue,
  CanonOverlayCandidatePromotionApprovalValidationReport,
  CanonOverlayCandidatePromotionApprovalValidationStatus
} from './content/types.js';

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

export function buildCanonOverlayCandidatePromotionApprovalTargetTemplate(
  record: CanonOverlayCandidatePromotionApprovalRecord
): CanonOverlayCandidatePromotionApprovalTargetTemplate {
  return {
    id: `canon-overlay-candidate-promotion-approval-target-template:${record.intakeId}`,
    approvalRecordId: record.id,
    readinessReportId: record.readinessReportId,
    planId: record.planId,
    candidateId: record.candidateId,
    intakeId: record.intakeId,
    title: `${record.title.replace(/ approval record$/, '')} approval target template`,
    targetTemplateUri: `${record.approvalUri}/target-template`,
    approvalUri: record.approvalUri,
    validationUri: `${record.approvalUri}/validation`,
    target: createEmptyApprovalTarget(),
    fields: record.requiredFields.map((field) => ({
      ...field,
      value: null
    })),
    allowedValues: {
      registryActions: ['reuse-existing', 'update-existing', 'create-new'],
      maturityTargets: ['experimental', 'candidate', 'stable']
    },
    targetHints: record.targetHints,
    instructions: [
      'Fill the target object only after a maintainer selects approval owner, evidence, registry action, registry item, export path, docs path, maturity target, and implementation owner.',
      'Use target hints as review context, not automatic choices.',
      'Validate the filled target with the approval validation tool before opening implementation work.'
    ],
    approvalBoundary: [
      'This target template is read-only and does not approve implementation.',
      'The template does not fill fields, create Linear issues, mutate Canon, mutate project overlays, or mark candidates stable.',
      'Only a maintainer-filled target that passes validation can support opening a bounded implementation slice.'
    ],
    agentContract: {
      purpose: 'canon-overlay-candidate-promotion-approval-target-template',
      primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
      useFor: [
        'giving maintainers a compact JSON payload to fill from an approval record',
        'preserving target hints and allowed values next to the fillable target',
        'handing a filled target into approval validation before implementation starts'
      ],
      stopBefore: [
        'automatically filling target fields',
        'automatically treating target hints as selected targets',
        'automatically creating Linear work',
        'automatically editing Canon source, registry, exports, docs, or project overlays'
      ]
    }
  };
}

export function renderCanonOverlayCandidatePromotionApprovalTargetTemplate(
  template: CanonOverlayCandidatePromotionApprovalTargetTemplate
): string {
  const lines: Array<string | undefined> = [
    `# ${template.title}`,
    '',
    `Approval target template: ${template.targetTemplateUri}`,
    `Approval record: ${template.approvalUri}`,
    `Validation report: ${template.validationUri}`,
    '',
    '## Instructions',
    ...template.instructions.map((item) => `- ${item}`),
    '',
    '## Target JSON',
    '```json',
    JSON.stringify({ target: template.target }, null, 2),
    '```',
    '',
    '## Required Fields',
    ...template.fields.flatMap((field) => [
      `### ${field.label}`,
      `- Required: ${field.required ? 'yes' : 'no'}`,
      `- Current value: ${field.value ?? 'UNSET'}`,
      `- Instructions: ${field.instructions}`,
      ...(field.hints.length ? field.hints.map((hint) => `- Hint: ${hint}`) : ['- Hint: none']),
      ''
    ]),
    '## Allowed Values',
    `- Registry actions: ${template.allowedValues.registryActions.join(', ')}`,
    `- Maturity targets: ${template.allowedValues.maturityTargets.join(', ')}`,
    '',
    '## Approval Boundary',
    ...template.approvalBoundary.map((item) => `- ${item}`),
    '',
    '## Agent Contract',
    ...template.agentContract.useFor.map((item) => `- Use for: ${item}`),
    ...template.agentContract.stopBefore.map((item) => `- Stop before: ${item}`)
  ].filter((line): line is string => line !== undefined);

  return lines.join('\n');
}

export function applyCanonOverlayCandidatePromotionApprovalTarget(
  record: CanonOverlayCandidatePromotionApprovalRecord,
  target: Partial<Record<keyof CanonOverlayCandidatePromotionApprovalTarget, string | null>>
): CanonOverlayCandidatePromotionApprovalRecord {
  const nextTarget = {
    ...record.target,
    ...target
  } as CanonOverlayCandidatePromotionApprovalTarget;

  return {
    ...record,
    target: nextTarget,
    requiredFields: record.requiredFields.map((field) => ({
      ...field,
      value: nextTarget[field.id]
    }))
  };
}

export function validateCanonOverlayCandidatePromotionApprovalRecord(
  record: CanonOverlayCandidatePromotionApprovalRecord
): CanonOverlayCandidatePromotionApprovalValidationReport {
  const issues = createApprovalValidationIssues(record);
  const errorCount = countValidationIssues(issues, 'error');
  const warningCount = countValidationIssues(issues, 'warning');
  const missingRequiredFields = issues.filter(
    (issue) => issue.code === 'missing-required-field'
  ).length;
  const invalidTargetFields = issues.filter(
    (issue) => issue.code !== 'missing-required-field' && issue.severity === 'error'
  ).length;
  const status = determineApprovalValidationStatus({
    errorCount,
    missingRequiredFields
  });

  return {
    id: `canon-overlay-candidate-promotion-approval-validation:${record.intakeId}`,
    approvalRecordId: record.id,
    readinessReportId: record.readinessReportId,
    planId: record.planId,
    candidateId: record.candidateId,
    intakeId: record.intakeId,
    title: `${record.title.replace(/ approval record$/, '')} approval validation`,
    status,
    approvalUri: record.approvalUri,
    validationUri: `${record.approvalUri}/validation`,
    summary: {
      totalIssues: issues.length,
      errorCount,
      warningCount,
      missingRequiredFields,
      invalidTargetFields,
      readyForImplementation: status === 'ready-for-implementation'
    },
    issues,
    approvalBoundary: [
      'Validation checks whether a maintainer-filled approval record is complete enough to support opening implementation work.',
      'Validation does not itself approve implementation, create Linear issues, mutate Canon, mutate project overlays, or mark candidates stable.',
      'Warnings require maintainer review even when no blocking validation errors remain.'
    ],
    agentContract: {
      purpose: 'canon-overlay-candidate-promotion-approval-validation',
      primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
      useFor: [
        'checking that approval owner, evidence, targets, docs path, maturity, and implementation owner are filled before implementation starts',
        'catching invalid approval target values before Canon source edits begin',
        'preserving the boundary between validation evidence and implementation approval'
      ],
      stopBefore: [
        'automatically filling approval-record fields',
        'automatically creating Linear work',
        'automatically editing Canon source, registry, exports, docs, or project overlays',
        'treating validation success as approval or stable promotion'
      ]
    }
  };
}

export function renderCanonOverlayCandidatePromotionApprovalValidationReport(
  report: CanonOverlayCandidatePromotionApprovalValidationReport
): string {
  const lines: Array<string | undefined> = [
    `# ${report.title}`,
    '',
    `Status: ${report.status}`,
    `Ready for implementation: ${report.summary.readyForImplementation ? 'yes' : 'no'}`,
    `Approval record: ${report.approvalUri}`,
    `Validation report: ${report.validationUri}`,
    '',
    '## Summary',
    `- Total issues: ${report.summary.totalIssues}`,
    `- Errors: ${report.summary.errorCount}`,
    `- Warnings: ${report.summary.warningCount}`,
    `- Missing required fields: ${report.summary.missingRequiredFields}`,
    `- Invalid target fields: ${report.summary.invalidTargetFields}`,
    '',
    '## Issues',
    ...(report.issues.length
      ? report.issues.flatMap((issue) => [
          `### ${issue.code}`,
          `- Severity: ${issue.severity}`,
          issue.fieldId ? `- Field: ${issue.fieldId}` : undefined,
          `- Message: ${issue.message}`,
          ...(issue.evidence.length
            ? issue.evidence.map((item) => `- Evidence: ${item}`)
            : ['- Evidence: none']),
          ''
        ])
      : ['No validation issues found.']),
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

function countValidationIssues(
  issues: CanonOverlayCandidatePromotionApprovalValidationIssue[],
  severity: CanonOverlayCandidatePromotionApprovalValidationIssue['severity']
) {
  return issues.filter((issue) => issue.severity === severity).length;
}

function determineApprovalValidationStatus({
  errorCount,
  missingRequiredFields
}: {
  errorCount: number;
  missingRequiredFields: number;
}): CanonOverlayCandidatePromotionApprovalValidationStatus {
  if (missingRequiredFields > 0) return 'missing-required-fields';
  if (errorCount > 0) return 'invalid-targets';
  return 'ready-for-implementation';
}

function createApprovalValidationIssues(
  record: CanonOverlayCandidatePromotionApprovalRecord
): CanonOverlayCandidatePromotionApprovalValidationIssue[] {
  const issues: CanonOverlayCandidatePromotionApprovalValidationIssue[] = [];
  const target = record.target;

  for (const field of record.requiredFields) {
    if (!field.required) continue;
    if (!hasApprovalValue(target[field.id])) {
      issues.push({
        code: 'missing-required-field',
        severity: 'error',
        fieldId: field.id,
        message: `${field.label} must be set by a maintainer before implementation starts.`,
        evidence: [field.instructions, ...field.hints]
      });
    }
  }

  if (hasApprovalValue(target.approvedAt) && Number.isNaN(Date.parse(target.approvedAt))) {
    issues.push({
      code: 'invalid-approved-at',
      severity: 'error',
      fieldId: 'approvedAt',
      message: 'Approved At must be an ISO 8601 timestamp or exact calendar date.',
      evidence: [`Received: ${target.approvedAt}`]
    });
  }

  if (
    hasApprovalValue(target.registryAction) &&
    !isCanonOverlayCandidatePromotionRegistryAction(target.registryAction)
  ) {
    issues.push({
      code: 'invalid-registry-action',
      severity: 'error',
      fieldId: 'registryAction',
      message: 'Registry Action must be reuse-existing, update-existing, or create-new.',
      evidence: [`Received: ${target.registryAction}`]
    });
  }

  if (hasApprovalValue(target.maturityTarget) && !isCanonRegistryMaturity(target.maturityTarget)) {
    issues.push({
      code: 'invalid-maturity-target',
      severity: 'error',
      fieldId: 'maturityTarget',
      message: 'Maturity Target must be experimental, candidate, or stable.',
      evidence: [`Received: ${target.maturityTarget}`]
    });
  }

  if (
    (target.registryAction === 'reuse-existing' || target.registryAction === 'update-existing') &&
    hasApprovalValue(target.registryItemId) &&
    !record.targetHints.registryItems.some((item) => item.id === target.registryItemId)
  ) {
    issues.push({
      code: 'registry-target-not-found',
      severity: 'error',
      fieldId: 'registryItemId',
      message:
        'Registry Item Id must match a current related registry item when reusing or updating an existing Canon target.',
      evidence: [
        `Received: ${target.registryItemId}`,
        `Known related ids: ${record.targetHints.registryItems.map((item) => item.id).join(', ')}`
      ]
    });
  }

  if (
    target.registryAction === 'create-new' &&
    hasApprovalValue(target.registryItemId) &&
    record.targetHints.registryItems.some((item) => item.id === target.registryItemId)
  ) {
    issues.push({
      code: 'registry-target-already-exists',
      severity: 'warning',
      fieldId: 'registryItemId',
      message:
        'Registry Item Id already appears in related registry hints even though Registry Action is create-new.',
      evidence: [`Received: ${target.registryItemId}`]
    });
  }

  if (
    hasApprovalValue(target.exportPath) &&
    !record.targetHints.exportPolicies.some((rule) => {
      if (rule.exportPath !== target.exportPath) return false;
      return !hasApprovalValue(target.exportName) || rule.exportName === target.exportName;
    })
  ) {
    issues.push({
      code: 'export-target-not-found',
      severity: 'warning',
      fieldId: 'exportPath',
      message:
        'Export Path is not present in current target hints; maintainer should verify it before implementation starts.',
      evidence: [
        `Received: ${target.exportName ? `${target.exportPath}#${target.exportName}` : target.exportPath}`,
        `Known export hints: ${record.targetHints.exportPolicies
          .map((rule) => (rule.exportName ? `${rule.exportPath}#${rule.exportName}` : rule.exportPath))
          .join(', ')}`
      ]
    });
  }

  if (hasApprovalValue(target.docsPath) && !record.targetHints.docsPaths.includes(target.docsPath)) {
    issues.push({
      code: 'docs-target-not-found',
      severity: 'warning',
      fieldId: 'docsPath',
      message:
        'Docs Path is not present in current target hints; maintainer should verify it before implementation starts.',
      evidence: [`Received: ${target.docsPath}`, `Known docs hints: ${record.targetHints.docsPaths.join(', ')}`]
    });
  }

  return issues;
}

function hasApprovalValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function createEmptyApprovalTarget(): CanonOverlayCandidatePromotionApprovalTarget {
  return {
    approvalOwner: null,
    approvalEvidence: null,
    approvedAt: null,
    registryAction: null,
    registryItemId: null,
    exportPath: null,
    exportName: null,
    docsPath: null,
    maturityTarget: null,
    implementationOwner: null
  };
}

function isCanonOverlayCandidatePromotionRegistryAction(value: string) {
  return value === 'reuse-existing' || value === 'update-existing' || value === 'create-new';
}

function isCanonRegistryMaturity(value: string) {
  return value === 'experimental' || value === 'candidate' || value === 'stable';
}
