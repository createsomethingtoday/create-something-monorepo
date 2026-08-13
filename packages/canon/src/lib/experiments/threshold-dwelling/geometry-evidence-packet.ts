import {
  assessThresholdDwellingPhysicalSceneIssuance,
  type ThresholdDwellingPhysicalSceneFact,
  type ThresholdDwellingPhysicalSceneFactId,
  type ThresholdDwellingPhysicalSceneIssuance,
  type ThresholdDwellingPhysicalSceneStatus
} from './geometry-issuance.js';

/**
 * Private evidence metadata for the project graph. It identifies an uploaded
 * artifact without including a filename, path, URL, byte content, or document
 * extraction in a client-delivery artifact.
 */
export interface ThresholdDwellingPrivateDocumentReference {
  documentId: string;
  accessScope: 'private-project-graph';
  clientTransfer: 'excluded';
}

export interface ThresholdDwellingPrivateGeometryEvidenceRecord {
  id: string;
  factId: ThresholdDwellingPhysicalSceneFactId;
  status: 'submitted' | 'accepted';
  document: ThresholdDwellingPrivateDocumentReference;
  /** Revision-specific geometry selected by a responsible reviewer. */
  proposedValue: string | number;
  /** Required before the selected value can enter the geometry issuance. */
  reviewedBy?: string;
}

export interface ThresholdDwellingPrivateGeometryEvidencePacket {
  schemaVersion: 'workway.private-geometry-evidence-packet.v1';
  id: 'threshold-dwelling-rev-0.8-private-geometry-evidence';
  projectId: ThresholdDwellingPhysicalSceneIssuance['projectId'];
  baselineRevision: ThresholdDwellingPhysicalSceneIssuance['baselineRevision'];
  spatialRevision: ThresholdDwellingPhysicalSceneIssuance['spatialRevision'];
  records: readonly ThresholdDwellingPrivateGeometryEvidenceRecord[];
  constructionReady: false;
}

/** A source-document-free shape suitable for the spatial delivery package. */
export interface ThresholdDwellingClientSafeGeometryIssuanceProjection {
  issuanceId: string;
  status: ThresholdDwellingPhysicalSceneStatus;
  coordinateTruth: ThresholdDwellingPhysicalSceneIssuance['coordinateTruth'];
  unissuedFactIds: readonly ThresholdDwellingPhysicalSceneFactId[];
  canGeneratePhysicalOneToOneScene: boolean;
  clientSourceDocuments: 'excluded';
  constructionReady: false;
}

/**
 * The current packet deliberately contains no project documents. A future
 * private ingest service may append opaque references and review records here;
 * browser, iPad, and Vision Pro delivery must receive only the projection.
 */
export const THRESHOLD_DWELLING_PRIVATE_GEOMETRY_EVIDENCE_PACKET: ThresholdDwellingPrivateGeometryEvidencePacket = {
  schemaVersion: 'workway.private-geometry-evidence-packet.v1',
  id: 'threshold-dwelling-rev-0.8-private-geometry-evidence',
  projectId: 'threshold-dwelling',
  baselineRevision: '0.7',
  spatialRevision: '0.8',
  records: [],
  constructionReady: false
};

function opaqueDocumentId(documentId: string): boolean {
  return (
    /^[a-z0-9][a-z0-9:_-]*$/i.test(documentId) &&
    !documentId.includes('..') &&
    !documentId.includes('/') &&
    !documentId.includes('\\')
  );
}

function recordIsAcceptedAndTraceable(record: ThresholdDwellingPrivateGeometryEvidenceRecord): boolean {
  if (record.status !== 'accepted') return false;
  if (typeof record.proposedValue === 'number') {
    return Number.isFinite(record.proposedValue) && Boolean(record.reviewedBy?.trim());
  }
  return Boolean(record.proposedValue.trim()) && Boolean(record.reviewedBy?.trim());
}

function assertPacketMatchesIssuance(
  issuance: ThresholdDwellingPhysicalSceneIssuance,
  packet: ThresholdDwellingPrivateGeometryEvidencePacket
): void {
  if (
    issuance.projectId !== packet.projectId ||
    issuance.baselineRevision !== packet.baselineRevision ||
    issuance.spatialRevision !== packet.spatialRevision
  ) {
    throw new Error('Private geometry evidence must match the active Threshold Dwelling revision.');
  }

  const duplicateRecordIds = packet.records.some(
    (record, index) => packet.records.findIndex((candidate) => candidate.id === record.id) !== index
  );
  if (duplicateRecordIds) throw new Error('Private geometry evidence record IDs must be unique.');

  for (const record of packet.records) {
    if (!record.id.trim() || !opaqueDocumentId(record.document.documentId)) {
      throw new Error('Private geometry evidence requires an opaque document ID, never a file path.');
    }
    if (
      record.document.accessScope !== 'private-project-graph' ||
      record.document.clientTransfer !== 'excluded'
    ) {
      throw new Error('Private geometry evidence must remain excluded from client delivery.');
    }
    if (record.status === 'accepted' && !recordIsAcceptedAndTraceable(record)) {
      throw new Error('Accepted geometry evidence requires a selected value and named reviewer.');
    }
  }
}

function factWithEvidence(
  fact: ThresholdDwellingPhysicalSceneFact,
  records: readonly ThresholdDwellingPrivateGeometryEvidenceRecord[]
): ThresholdDwellingPhysicalSceneFact {
  const matching = records.filter((record) => record.factId === fact.id);
  const accepted = matching.filter((record) => record.status === 'accepted');
  if (accepted.length > 1) {
    throw new Error(`Only one accepted evidence record may issue geometry for ${fact.id}.`);
  }
  const acceptedRecord = accepted[0];
  if (acceptedRecord) {
    return {
      ...fact,
      evidenceStatus: 'accepted',
      value: acceptedRecord.proposedValue,
      sourceDocumentId: acceptedRecord.document.documentId,
      verifiedBy: acceptedRecord.reviewedBy!.trim()
    };
  }
  if (matching.some((record) => record.status === 'submitted')) {
    return { ...fact, evidenceStatus: 'submitted', value: null, sourceDocumentId: null, verifiedBy: null };
  }
  return fact;
}

/**
 * Applies private review evidence to the authoritative geometry issuance.
 * Submitted evidence never becomes geometry; only one accepted, reviewer-named
 * record can issue its matching fact.
 */
export function applyThresholdDwellingPrivateGeometryEvidence(
  issuance: ThresholdDwellingPhysicalSceneIssuance,
  packet: ThresholdDwellingPrivateGeometryEvidencePacket
): ThresholdDwellingPhysicalSceneIssuance {
  assertPacketMatchesIssuance(issuance, packet);

  return {
    ...issuance,
    facts: issuance.facts.map((fact) => factWithEvidence(fact, packet.records))
  };
}

/**
 * The sole geometry-evidence projection a rendering client may receive. It
 * intentionally contains gate state only—never records or document identity.
 */
export function projectThresholdDwellingClientSafeGeometryIssuance(
  issuance: ThresholdDwellingPhysicalSceneIssuance
): ThresholdDwellingClientSafeGeometryIssuanceProjection {
  const assessment = assessThresholdDwellingPhysicalSceneIssuance(issuance);

  return {
    issuanceId: assessment.issuanceId,
    status: assessment.physicalSceneStatus,
    coordinateTruth: issuance.coordinateTruth,
    unissuedFactIds: assessment.unissuedFactIds,
    canGeneratePhysicalOneToOneScene: assessment.canGeneratePhysicalOneToOneScene,
    clientSourceDocuments: 'excluded',
    constructionReady: false
  };
}
