import { CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS } from './content/generated/canon-overlay-candidate-review-packets.js';
import type { CanonOverlayCandidateReviewPacket } from './content/types.js';

export function listCanonOverlayCandidateReviewPacketIds(): string[] {
  return CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.entries.map((packet) => packet.intakeId);
}

export function getCanonOverlayCandidateReviewPacket(
  intakeId: string
): CanonOverlayCandidateReviewPacket | undefined {
  return CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.entries.find(
    (packet) => packet.intakeId === intakeId || packet.id === intakeId || packet.candidateId === intakeId
  );
}

export function renderCanonOverlayCandidateReviewHandoff(
  packet: CanonOverlayCandidateReviewPacket
): string {
  const lines: Array<string | undefined> = [
    `# ${packet.title}`,
    '',
    '## Identity',
    `- Intake: \`${packet.intakeId}\``,
    `- Candidate: \`${packet.candidateId}\``,
    `- Overlay: \`${packet.overlayName}\` (\`${packet.overlayId}\`)`,
    `- Manifest: \`${packet.manifestPath}\``,
    `- Owner: ${packet.owner}`,
    `- Source package: \`${packet.sourcePackage}\``,
    packet.sourcePath ? `- Source path: \`${packet.sourcePath}\`` : undefined,
    `- Requested kind: \`${packet.requestedKind}\``,
    `- Modalities: ${packet.requestedModalities.map((modality) => `\`${modality}\``).join(', ')}`,
    '',
    '## Source URIs',
    `- Candidate detail: \`${packet.candidateUri}\``,
    `- Review packet: \`${packet.handoffUri}\``,
    `- Overlay review: \`${packet.reviewUri}\``,
    '',
    '## Summary',
    packet.summary,
    '',
    '## Surfaces',
    ...packet.surfaces.map((surface) => {
      const details = [
        `\`${surface.surfaceId}\``,
        surface.modality,
        surface.sourcePath ? `source: \`${surface.sourcePath}\`` : undefined,
        surface.proof ? `proof: ${surface.proof}` : undefined
      ].filter(Boolean);
      return `- ${surface.name}: ${details.join(' | ')}`;
    }),
    '',
    '## Dependencies',
    ...(packet.dependencies.length
      ? packet.dependencies.map((dependency) => `- \`${dependency}\``)
      : ['- None declared.']),
    '',
    '## Required Evidence',
    ...packet.requiredEvidence.map((item) => `- ${item}`),
    '',
    '## Stop Before Stable',
    ...packet.stopBeforeStable.map((item) => `- ${item}`),
    '',
    '## Promotion Checklist',
    ...packet.promotionChecklist.map((item) => `- ${item}`),
    '',
    '## Approval Boundary',
    ...packet.approvalBoundary.map((item) => `- ${item}`),
    '',
    '## Agent Contract',
    ...packet.agentContract.useFor.map((item) => `- Use for: ${item}`),
    ...packet.agentContract.stopBefore.map((item) => `- Stop before: ${item}`)
  ].filter((line): line is string => line !== undefined);

  return lines.join('\n');
}
