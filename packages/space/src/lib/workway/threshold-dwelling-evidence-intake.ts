import evidenceIntakeArtifact from './threshold-dwelling-evidence-intake-packet.json';
import type { WorkWaySpatialPackage } from './threshold-dwelling-spatial-package';

export interface WorkWayEvidenceIntakeRequest {
  evidenceId: string;
  clientLabel: string;
  purpose: string;
  sourceClass: string;
  reviewStatus: 'missing' | 'submitted' | 'accepted';
  requiredReviewerRole: string;
  requiredFields: readonly string[];
  clientFileUploadAvailable: false;
}

/**
 * A Rust-generated handoff checklist. It is deliberately not a document
 * upload, parser, OCR queue, vault browser, or evidence-acceptance endpoint.
 */
export interface WorkWayEvidenceIntakePacket {
  schemaVersion: 'workway.evidence-intake-packet.v1';
  projectId: string;
  canonicalRevision: string;
  derivedRevision: string;
  requests: readonly WorkWayEvidenceIntakeRequest[];
  clientFileUploadAvailable: false;
  constructionReady: false;
}

const EVIDENCE_INTAKE_PACKET = evidenceIntakeArtifact as WorkWayEvidenceIntakePacket;
const prohibitedClientKeys = new Set([
  'vaultRecordId',
  'sourcePath',
  'documentContent',
  'fileContents',
  'uploadUrl'
]);

function containsProhibitedClientKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, nestedValue]) =>
      prohibitedClientKeys.has(key) ||
      (Array.isArray(nestedValue)
        ? nestedValue.some((item) => containsProhibitedClientKey(item))
        : containsProhibitedClientKey(nestedValue))
  );
}

/**
 * Returns the only browser-safe representation of a future private-evidence
 * handoff. It rejects a stale package or a contract that tries to add a file
 * transfer or construction claim.
 */
export function evidenceIntakePacketForPackage(
  packageValue: WorkWaySpatialPackage
): WorkWayEvidenceIntakePacket {
  const packet = EVIDENCE_INTAKE_PACKET;
  if (
    packet.schemaVersion !== 'workway.evidence-intake-packet.v1' ||
    packet.projectId !== packageValue.canonicalProject.projectId ||
    packet.canonicalRevision !== packageValue.canonicalProject.projectRevision ||
    packet.derivedRevision !== packageValue.spatialRevision
  ) {
    throw new Error('The evidence handoff packet does not match the active WorkWay package.');
  }
  if (
    packet.clientFileUploadAvailable ||
    packet.constructionReady ||
    !packet.requests.length ||
    packet.requests.some((request) => request.clientFileUploadAvailable) ||
    containsProhibitedClientKey(packet)
  ) {
    throw new Error('The evidence handoff packet exceeds the client-safe review boundary.');
  }
  return packet;
}
