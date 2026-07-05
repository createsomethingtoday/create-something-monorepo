import {
  findCanonOverlayCandidateReviewPacket,
  renderCanonOverlayCandidateReviewPacket
} from '@create-something/canon/overlays/intake';
import { CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS } from './content/generated/canon-overlay-candidate-review-packets.js';

export type CanonOverlayCandidateReviewPacket = Parameters<
  typeof renderCanonOverlayCandidateReviewPacket
>[0];

function reviewPackets(): CanonOverlayCandidateReviewPacket[] {
  return CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.entries as unknown as CanonOverlayCandidateReviewPacket[];
}

export function listCanonOverlayCandidateReviewPacketIds(): string[] {
  return reviewPackets().map((packet) => packet.intakeId);
}

export function getCanonOverlayCandidateReviewPacket(
  intakeId: string
): CanonOverlayCandidateReviewPacket | undefined {
  return findCanonOverlayCandidateReviewPacket(
    { ...CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS, entries: reviewPackets() },
    intakeId
  );
}

export function renderCanonOverlayCandidateReviewHandoff(
  packet: CanonOverlayCandidateReviewPacket
): string {
  return renderCanonOverlayCandidateReviewPacket(packet);
}
