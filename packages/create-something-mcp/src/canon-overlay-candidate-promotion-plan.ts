import {
  CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS
} from './content/generated/canon-overlay-candidate-promotion-plans.js';
import type { CanonOverlayCandidatePromotionPlan } from './content/types.js';

export function listCanonOverlayCandidatePromotionPlanIds(): string[] {
  return CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.entries.map((plan) => plan.intakeId);
}

export function getCanonOverlayCandidatePromotionPlan(
  intakeId: string
): CanonOverlayCandidatePromotionPlan | undefined {
  return CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.entries.find(
    (plan) =>
      plan.intakeId === intakeId ||
      plan.id === intakeId ||
      plan.candidateId === intakeId ||
      plan.packetId === intakeId
  );
}

export function renderCanonOverlayCandidatePromotionPlan(
  plan: CanonOverlayCandidatePromotionPlan
): string {
  const lines: Array<string | undefined> = [
    `# ${plan.title}`,
    '',
    '## Identity',
    `- Intake: \`${plan.intakeId}\``,
    `- Plan: \`${plan.id}\``,
    `- Review packet: \`${plan.packetId}\``,
    `- Candidate: \`${plan.candidateId}\``,
    `- Overlay: \`${plan.overlayName}\` (\`${plan.overlayId}\`)`,
    `- Manifest: \`${plan.manifestPath}\``,
    `- Owner: ${plan.owner}`,
    `- Source package: \`${plan.sourcePackage}\``,
    plan.sourcePath ? `- Source path: \`${plan.sourcePath}\`` : undefined,
    `- Requested kind: \`${plan.requestedKind}\``,
    `- Modalities: ${plan.requestedModalities.map((modality) => `\`${modality}\``).join(', ')}`,
    '',
    '## Source URIs',
    `- Promotion plan: \`${plan.planUri}\``,
    `- Review packet: \`${plan.handoffUri}\``,
    `- Candidate detail: \`${plan.candidateUri}\``,
    `- Overlay review: \`${plan.reviewUri}\``,
    '',
    '## Summary',
    plan.summary,
    '',
    '## Preconditions',
    ...plan.preconditions.map((item) => `- ${item}`),
    '',
    '## Implementation Scope',
    ...plan.implementationScope.map((item) => `- ${item}`),
    '',
    '## Required Changes',
    ...plan.requiredChanges.map((item) => `- ${item}`),
    '',
    '## Validation Plan',
    ...plan.validationPlan.map((item) => `- ${item}`),
    '',
    '## Documentation Plan',
    ...plan.documentationPlan.map((item) => `- ${item}`),
    '',
    '## Compatibility Plan',
    ...plan.compatibilityPlan.map((item) => `- ${item}`),
    '',
    '## Stop Conditions',
    ...plan.stopConditions.map((item) => `- ${item}`),
    '',
    '## Approval Boundary',
    ...plan.approvalBoundary.map((item) => `- ${item}`),
    '',
    '## Agent Contract',
    ...plan.agentContract.useFor.map((item) => `- Use for: ${item}`),
    ...plan.agentContract.stopBefore.map((item) => `- Stop before: ${item}`)
  ].filter((line): line is string => line !== undefined);

  return lines.join('\n');
}
