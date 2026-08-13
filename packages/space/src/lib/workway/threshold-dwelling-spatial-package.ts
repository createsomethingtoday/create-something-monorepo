import {
  THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN,
  THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION
} from '@create-something/canon/experiments/threshold-dwelling/living-system-revision';
import { THRESHOLD_DWELLING_INTERIOR_INFILL } from '@create-something/canon/experiments/threshold-dwelling/interior-infill';
import {
  THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE,
  resolveThresholdDwellingAssemblyBinding,
  splitThresholdDwellingExteriorWallForMaterialStudy
} from '@create-something/canon/experiments/threshold-dwelling/assembly-schedule';
import {
  THRESHOLD_DWELLING_PRIVATE_GEOMETRY_EVIDENCE_PACKET,
  applyThresholdDwellingPrivateGeometryEvidence,
  projectThresholdDwellingClientSafeGeometryIssuance
} from '@create-something/canon/experiments/threshold-dwelling/geometry-evidence-packet';
import {
  THRESHOLD_DWELLING_PHYSICAL_SCENE_ISSUANCE,
  type ThresholdDwellingPhysicalSceneFactId,
  type ThresholdDwellingPhysicalSceneIssuance,
  type ThresholdDwellingPhysicalSceneStatus
} from '@create-something/canon/experiments/threshold-dwelling/geometry-issuance';
import { THRESHOLD_DWELLING_PROFESSIONAL_REVIEW_REQUIREMENTS } from '@create-something/canon/experiments/threshold-dwelling/professional-review';

export const WORKWAY_SPATIAL_PACKAGE_SCHEMA_VERSION = 'workway.spatial-package.v1' as const;

type SceneFormat = 'svg' | 'png' | 'glb' | 'usd' | 'usdz';
type SceneRepresentationStatus = 'available' | 'unissued';
type SpatialScale = 'one-to-one';
type Locomotion = 'room-chapter-rebase';

export interface WorkWayClientAsset {
  id: string;
  clientPath: string;
  sha256: string;
}

export interface WorkWaySceneRepresentation {
  id: string;
  format: SceneFormat;
  status: SceneRepresentationStatus;
  canonicalRevision: string;
  spatialRevision: string;
  assetId: string | null;
}

export interface WorkWayEntityRenderBinding {
  entityId: string;
  renderEntityId: string;
}

export interface WorkWayRoomChapter {
  id: string;
  title: string;
  entityId: string;
  widthIn: number;
  depthIn: number;
  scale: SpatialScale;
  safeStage: {
    minimumWidthIn: number;
    minimumDepthIn: number;
    locomotion: Locomotion;
    statement: string;
  };
}

export interface WorkWaySpatialPortal {
  id: string;
  fromChapterId: string;
  toChapterId: string;
  traversal: 'explicit-transition';
}

export interface WorkWayValidationReceipt {
  id: string;
  assessment: string;
  sourceRevision: string;
}

/** A client-safe reference to the project graph's material schedule. */
export interface WorkWayMaterialContract {
  scheduleId: string;
  materialBindingStatus: 'role-codified-product-unselected';
  renderedMaterialIds: readonly string[];
  constructionReady: false;
}

/**
 * A client-safe projection of the physical 1:1 scene gate. It prevents a
 * horizontal-plan massing from being represented as issued vertical geometry.
 */
export interface WorkWayPhysicalSceneContract {
  issuanceId: string;
  status: ThresholdDwellingPhysicalSceneStatus;
  coordinateTruth: 'revised-plan-horizontal-only';
  clientSourceDocuments: 'excluded';
  unissuedFactIds: readonly ThresholdDwellingPhysicalSceneFactId[];
  evidenceFacts: readonly WorkWayPhysicalSceneEvidenceFact[];
  canGeneratePhysicalOneToOneScene: boolean;
  constructionReady: false;
}

/** Client-safe request metadata for one physical-scene geometry fact. */
export interface WorkWayPhysicalSceneEvidenceFact {
  id: ThresholdDwellingPhysicalSceneFactId;
  title: string;
  evidenceStatus: 'missing' | 'submitted' | 'accepted';
  requiredReviewerRoles: readonly string[];
}

export interface WorkWaySpatialPackage {
  schemaVersion: typeof WORKWAY_SPATIAL_PACKAGE_SCHEMA_VERSION;
  id: string;
  canonicalProject: {
    projectId: string;
    projectRevision: string;
  };
  spatialRevision: string;
  clientSourceDocuments: 'excluded';
  materialContract: WorkWayMaterialContract;
  physicalSceneContract: WorkWayPhysicalSceneContract;
  assets: readonly WorkWayClientAsset[];
  sceneRepresentations: readonly WorkWaySceneRepresentation[];
  entityRenderBindings: readonly WorkWayEntityRenderBinding[];
  roomChapters: readonly WorkWayRoomChapter[];
  portals: readonly WorkWaySpatialPortal[];
  validationReceipts: readonly WorkWayValidationReceipt[];
  constructionReady: false;
}

export interface WorkWaySpatialPackageValidation {
  packageId: string;
  issueIds: readonly string[];
  clientSafe: boolean;
  constructionReady: false;
}

export interface WorkWaySessionAnnotation {
  operationId: string;
  kind: 'create-annotation';
  packageId: string;
  spatialRevision: string;
  chapterId: string;
  text: string;
}

export interface WorkWayDesignProposal {
  id: string;
  packageId: string;
  projectId: string;
  canonicalRevision: string;
  spatialRevision: string;
  chapterId: string;
  intent: string;
  operation: {
    kind: 'move-entity';
    entityId: string;
    deltaXIn: number;
    deltaYIn: number;
  };
  measurements: readonly {
    id: string;
    currentIn: number;
    proposedIn: number;
    targetIn: number | null;
  }[];
  requiresProfessionalReview: true;
  constructionReady: false;
}

export interface WorkWaySessionProposalDecision {
  operationId: string;
  kind: 'record-proposal-decision';
  packageId: string;
  spatialRevision: string;
  proposalId: string;
  decision: 'accepted' | 'rejected';
}

export type WorkWaySessionOperation = WorkWaySessionAnnotation | WorkWaySessionProposalDecision;

const stageStatement =
  'Minimum physical-stage guidance for a rebased room chapter; not a physical safety certification or architectural clearance.';

const assets = [
  {
    id: 'tabletop-plan-svg',
    clientPath: 'experiments/threshold-dwelling/renders/floor-plan.svg',
    sha256: 'c83c9deb796c34f8a94497a2f4e77fdbbbfbc6d584480ea0cf3f9c08bc48e017'
  },
  {
    id: 'tabletop-plan-png',
    clientPath: 'experiments/threshold-dwelling/renders/floor-plan.png',
    sha256: '6bb7955a32628e0fd499b58e7ca57f9c9f3a93cfca46a84ecb1ffc84fdde2a5c'
  },
  {
    id: 'public-room-hero-png',
    clientPath: 'experiments/threshold-dwelling/renders/living-system-public-room-hero-v1.png',
    sha256: 'ff78a4af53c0c1117c1cf83db22e451728733dffaba9bd2356a046ebc9ad63ba'
  },
  {
    id: 'browser-massing-glb',
    clientPath: 'experiments/threshold-dwelling/renders/threshold-dwelling-r08-massing-guide.glb',
    sha256: '1b03a571ec788492b1994792c1349d2b151860f69d01eaef36d05c4584892091'
  }
] as const satisfies readonly WorkWayClientAsset[];

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function physicalSceneEvidenceFacts(
  issuance: ThresholdDwellingPhysicalSceneIssuance
): WorkWayPhysicalSceneEvidenceFact[] {
  const requirementById = new Map(
    THRESHOLD_DWELLING_PROFESSIONAL_REVIEW_REQUIREMENTS.map((requirement) => [
      requirement.id,
      requirement
    ])
  );

  return issuance.facts.map((fact) => ({
    id: fact.id,
    title: fact.title,
    evidenceStatus: fact.evidenceStatus,
    requiredReviewerRoles: unique(
      fact.requiredProfessionalReviewIds.map((id) => {
        const requirement = requirementById.get(id);
        if (!requirement) throw new Error(`Missing professional-review requirement for ${id}.`);
        return requirement.responsibleRole;
      })
    )
  }));
}

function massingMaterialIds(): string[] {
  const zoneMaterialIds = THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN.zones.map((zone) => {
    if (!zone.id) throw new Error('Threshold Dwelling spatial package requires stable plan-zone IDs.');
    const binding = resolveThresholdDwellingAssemblyBinding('plan-zone', zone.id);
    if (!binding?.renderInMassingGuide) {
      throw new Error(`Threshold Dwelling spatial package is missing a massing material binding for ${zone.id}.`);
    }
    return binding.renderMaterialId;
  });
  const wallMaterialIds = THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN.walls.flatMap((wall) => {
    if (wall.exterior) {
      return splitThresholdDwellingExteriorWallForMaterialStudy(wall).map(
        (segment) => segment.materialId
      );
    }
    const binding = resolveThresholdDwellingAssemblyBinding('wall-class', 'interior');
    if (!binding?.renderInMassingGuide) {
      throw new Error('Threshold Dwelling spatial package is missing an interior massing wall material binding.');
    }
    return binding.renderMaterialId;
  });
  return unique([...zoneMaterialIds, ...wallMaterialIds]);
}

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function roomChapter(
  id: string,
  title: string,
  entityId: string,
  widthIn: number,
  depthIn: number
): WorkWayRoomChapter {
  return {
    id,
    title,
    entityId,
    widthIn,
    depthIn,
    scale: 'one-to-one',
    safeStage: {
      minimumWidthIn: 96,
      minimumDepthIn: 96,
      locomotion: 'room-chapter-rebase',
      statement: stageStatement
    }
  };
}

/**
 * Creates the client-safe, derived spatial package. Canon remains the source
 * for plan dimensions; this module only projects scene/navigation metadata.
 */
export function createThresholdDwellingSpatialPackage(): WorkWaySpatialPackage {
  const livingRevision = THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION;
  const floorPlan = THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN;
  const interior = THRESHOLD_DWELLING_INTERIOR_INFILL;
  const assemblySchedule = THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE;
  const physicalSceneIssuance = applyThresholdDwellingPrivateGeometryEvidence(
    THRESHOLD_DWELLING_PHYSICAL_SCENE_ISSUANCE,
    THRESHOLD_DWELLING_PRIVATE_GEOMETRY_EVIDENCE_PACKET
  );
  const physicalSceneProjection = projectThresholdDwellingClientSafeGeometryIssuance(
    physicalSceneIssuance
  );
  const arrivalLoggia = requireValue(
    floorPlan.overhangs?.find((overhang) => overhang.label === 'Arrival\nLoggia'),
    'Threshold Dwelling Rev 0.8 requires an Arrival Loggia render projection.'
  );
  const privateRooms = interior.privateRoomUse;

  const publicRoomChapters = interior.publicRoom.functionalBays.map((bay) =>
    roomChapter(
      bay.id,
      bay.id.charAt(0).toUpperCase() + bay.id.slice(1),
      `public-room-${bay.id}`,
      bay.widthIn,
      bay.depthIn
    )
  );
  const privateRoomChapters = privateRooms.map((room) =>
    roomChapter(
      room.id,
      room.id
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase()),
      `private-room-${room.id}`,
      room.widthIn,
      room.depthIn
    )
  );

  return {
    schemaVersion: WORKWAY_SPATIAL_PACKAGE_SCHEMA_VERSION,
    id: 'threshold-dwelling-r08-spatial-package',
    canonicalProject: {
      projectId: livingRevision.base.projectId,
      projectRevision: livingRevision.base.revision
    },
    spatialRevision: livingRevision.proposedRevision,
    clientSourceDocuments: 'excluded',
    materialContract: {
      scheduleId: assemblySchedule.id,
      materialBindingStatus: 'role-codified-product-unselected',
      renderedMaterialIds: massingMaterialIds(),
      constructionReady: false
    },
    physicalSceneContract: {
      issuanceId: physicalSceneProjection.issuanceId,
      status: physicalSceneProjection.status,
      coordinateTruth: physicalSceneIssuance.coordinateTruth,
      clientSourceDocuments: physicalSceneProjection.clientSourceDocuments,
      unissuedFactIds: physicalSceneProjection.unissuedFactIds,
      evidenceFacts: physicalSceneEvidenceFacts(physicalSceneIssuance),
      canGeneratePhysicalOneToOneScene: physicalSceneProjection.canGeneratePhysicalOneToOneScene,
      constructionReady: false
    },
    assets,
    sceneRepresentations: [
      {
        id: 'tabletop-svg',
        format: 'svg',
        status: 'available',
        canonicalRevision: livingRevision.base.revision,
        spatialRevision: livingRevision.proposedRevision,
        assetId: 'tabletop-plan-svg'
      },
      {
        id: 'tabletop-png',
        format: 'png',
        status: 'available',
        canonicalRevision: livingRevision.base.revision,
        spatialRevision: livingRevision.proposedRevision,
        assetId: 'tabletop-plan-png'
      },
      {
        id: 'public-room-hero-png',
        format: 'png',
        status: 'available',
        canonicalRevision: livingRevision.base.revision,
        spatialRevision: livingRevision.proposedRevision,
        assetId: 'public-room-hero-png'
      },
      {
        id: 'browser-massing-glb',
        format: 'glb',
        status: 'available',
        canonicalRevision: livingRevision.base.revision,
        spatialRevision: livingRevision.proposedRevision,
        assetId: 'browser-massing-glb'
      },
      {
        id: 'native-usd',
        format: 'usd',
        status: 'unissued',
        canonicalRevision: livingRevision.base.revision,
        spatialRevision: livingRevision.proposedRevision,
        assetId: null
      },
      {
        id: 'native-usdz',
        format: 'usdz',
        status: 'unissued',
        canonicalRevision: livingRevision.base.revision,
        spatialRevision: livingRevision.proposedRevision,
        assetId: null
      }
    ],
    entityRenderBindings: [
      ...publicRoomChapters.map((chapter) => ({
        entityId: chapter.entityId,
        renderEntityId: `public-room/${chapter.id}`
      })),
      ...privateRoomChapters.map((chapter) => ({
        entityId: chapter.entityId,
        renderEntityId: `private-room/${chapter.id}`
      })),
      { entityId: 'arrival-loggia', renderEntityId: 'arrival/loggia' }
    ],
    roomChapters: [
      ...publicRoomChapters,
      roomChapter(
        'arrival',
        'Arrival loggia',
        'arrival-loggia',
        arrivalLoggia.width * 12,
        arrivalLoggia.height * 12
      ),
      ...privateRoomChapters
    ],
    portals: [
      {
        id: 'kitchen-to-dining',
        fromChapterId: 'kitchen',
        toChapterId: 'dining',
        traversal: 'explicit-transition'
      },
      {
        id: 'dining-to-living',
        fromChapterId: 'dining',
        toChapterId: 'living',
        traversal: 'explicit-transition'
      },
      {
        id: 'living-to-arrival',
        fromChapterId: 'living',
        toChapterId: 'arrival',
        traversal: 'explicit-transition'
      },
      {
        id: 'arrival-to-daughter-sleep',
        fromChapterId: 'arrival',
        toChapterId: 'daughter-sleep-zone',
        traversal: 'explicit-transition'
      },
      {
        id: 'daughter-sleep-to-primary-sleep',
        fromChapterId: 'daughter-sleep-zone',
        toChapterId: 'primary-sleep-zone',
        traversal: 'explicit-transition'
      },
      {
        id: 'primary-sleep-to-inlaw-sleep',
        fromChapterId: 'primary-sleep-zone',
        toChapterId: 'inlaw-sleep-zone',
        traversal: 'explicit-transition'
      },
      {
        id: 'inlaw-sleep-to-inlaw-sitting',
        fromChapterId: 'inlaw-sleep-zone',
        toChapterId: 'inlaw-sitting-zone',
        traversal: 'explicit-transition'
      }
    ],
    validationReceipts: [
      {
        id: 'dimensioned-project-review',
        assessment:
          'Design-intent geometry and revision lineage recorded; no survey or construction determination supplied.',
        sourceRevision: livingRevision.proposedRevision
      },
      {
        id: 'living-system-review',
        assessment:
          'Room chapters, circulation intent, material roles, and carport proposal remain proposed design intent.',
        sourceRevision: livingRevision.proposedRevision
      },
      {
        id: 'public-room-visual-receipt',
        assessment:
          'The local public-room visualization is content-addressed and explicitly non-construction evidence.',
        sourceRevision: livingRevision.proposedRevision
      }
    ],
    constructionReady: false
  };
}

function duplicateIds(ids: readonly string[]): boolean {
  return new Set(ids).size !== ids.length;
}

function safeClientPath(path: string): boolean {
  const normalized = path.trim();
  const lower = normalized.toLowerCase();

  return (
    normalized.length > 0 &&
    normalized === path &&
    !normalized.startsWith('/') &&
    !normalized.includes('\\') &&
    !normalized.includes('..') &&
    !normalized.includes('://') &&
    !lower.includes('private') &&
    !lower.includes('source') &&
    !lower.includes('upload') &&
    !lower.endsWith('.pdf')
  );
}

/** Mirrors the client-safety subset of the Rust validation contract. */
export function validateSpatialPackage(
  packageValue: WorkWaySpatialPackage
): WorkWaySpatialPackageValidation {
  const issueIds: string[] = [];
  const assetIds = packageValue.assets.map((asset) => asset.id);
  const chapterIds = packageValue.roomChapters.map((chapter) => chapter.id);
  const renderEntityIds = packageValue.entityRenderBindings.map((binding) => binding.renderEntityId);
  const semanticEntityIds = packageValue.entityRenderBindings.map((binding) => binding.entityId);
  const assetSet = new Set(assetIds);
  const chapterSet = new Set(chapterIds);
  const entitySet = new Set(semanticEntityIds);

  if (packageValue.schemaVersion !== WORKWAY_SPATIAL_PACKAGE_SCHEMA_VERSION) {
    issueIds.push('schema-version-mismatch');
  }
  if (
    !packageValue.id.trim() ||
    !packageValue.canonicalProject.projectId.trim() ||
    !packageValue.canonicalProject.projectRevision.trim() ||
    !packageValue.spatialRevision.trim()
  ) {
    issueIds.push('required-identity-missing');
  }
  if (packageValue.constructionReady) issueIds.push('construction-ready-must-be-false');
  if (packageValue.clientSourceDocuments !== 'excluded') issueIds.push('client-source-documents-must-be-excluded');
  if (
    !packageValue.materialContract.scheduleId.trim() ||
    packageValue.materialContract.materialBindingStatus !== 'role-codified-product-unselected' ||
    !packageValue.materialContract.renderedMaterialIds.length ||
    duplicateIds(packageValue.materialContract.renderedMaterialIds) ||
    packageValue.materialContract.constructionReady
  ) {
    issueIds.push('invalid-material-contract');
  }
  const physicalScene = packageValue.physicalSceneContract;
  const expectedPhysicalSceneStatus = physicalScene.canGeneratePhysicalOneToOneScene
    ? 'eligible-with-professional-review'
    : 'blocked-vertical-geometry-unissued';
  const evidenceFactIds = physicalScene.evidenceFacts.map((fact) => fact.id);
  const evidenceFactUnissuedIds = physicalScene.evidenceFacts
    .filter((fact) => fact.evidenceStatus !== 'accepted')
    .map((fact) => fact.id)
    .sort();
  const declaredUnissuedFactIds = [...physicalScene.unissuedFactIds].sort();
  if (
    !physicalScene.issuanceId.trim() ||
    physicalScene.coordinateTruth !== 'revised-plan-horizontal-only' ||
    physicalScene.clientSourceDocuments !== 'excluded' ||
    duplicateIds(physicalScene.unissuedFactIds) ||
    !physicalScene.evidenceFacts.length ||
    duplicateIds(evidenceFactIds) ||
    physicalScene.evidenceFacts.some(
      (fact) =>
        !fact.title.trim() ||
        !fact.requiredReviewerRoles.length ||
        fact.requiredReviewerRoles.some((role) => !role.trim()) ||
        !['missing', 'submitted', 'accepted'].includes(fact.evidenceStatus)
    ) ||
    evidenceFactUnissuedIds.join(',') !== declaredUnissuedFactIds.join(',') ||
    physicalScene.status !== expectedPhysicalSceneStatus ||
    (physicalScene.canGeneratePhysicalOneToOneScene && physicalScene.unissuedFactIds.length > 0) ||
    (!physicalScene.canGeneratePhysicalOneToOneScene && physicalScene.unissuedFactIds.length === 0) ||
    physicalScene.constructionReady
  ) {
    issueIds.push('invalid-physical-scene-contract');
  }
  if (duplicateIds(assetIds)) issueIds.push('duplicate-asset-id');
  for (const asset of packageValue.assets) {
    if (!safeClientPath(asset.clientPath)) issueIds.push('unsafe-client-asset-path');
    if (!/^[a-f0-9]{64}$/i.test(asset.sha256)) issueIds.push('invalid-client-asset-hash');
  }
  if (duplicateIds(packageValue.sceneRepresentations.map((representation) => representation.id))) {
    issueIds.push('duplicate-scene-representation-id');
  }
  const formats = new Set(packageValue.sceneRepresentations.map((representation) => representation.format));
  if (!formats.has('usd') || !formats.has('usdz')) {
    issueIds.push('spatial-asset-capability-not-declared');
  }
  if (!packageValue.sceneRepresentations.some((representation) => representation.status === 'available')) {
    issueIds.push('no-available-client-scene-representation');
  }
  for (const representation of packageValue.sceneRepresentations) {
    if (representation.canonicalRevision !== packageValue.canonicalProject.projectRevision) {
      issueIds.push('representation-canonical-revision-mismatch');
    }
    if (representation.spatialRevision !== packageValue.spatialRevision) {
      issueIds.push('representation-spatial-revision-mismatch');
    }
    if (representation.status === 'available' && !assetSet.has(representation.assetId ?? '')) {
      issueIds.push('available-representation-missing-client-asset');
    }
    if (representation.status === 'unissued' && representation.assetId !== null) {
      issueIds.push('unissued-representation-must-not-name-client-asset');
    }
  }
  if (duplicateIds(semanticEntityIds)) issueIds.push('duplicate-semantic-entity-id');
  if (duplicateIds(renderEntityIds)) issueIds.push('duplicate-render-entity-id');
  if (duplicateIds(chapterIds)) issueIds.push('duplicate-room-chapter-id');
  for (const chapter of packageValue.roomChapters) {
    if (!entitySet.has(chapter.entityId)) issueIds.push('room-chapter-entity-is-not-render-bound');
    if (chapter.widthIn <= 0 || chapter.depthIn <= 0) {
      issueIds.push('room-chapter-dimensions-must-be-positive');
    }
    if (chapter.safeStage.minimumWidthIn <= 0 || chapter.safeStage.minimumDepthIn <= 0) {
      issueIds.push('safe-stage-dimensions-must-be-positive');
    }
  }
  if (duplicateIds(packageValue.portals.map((portal) => portal.id))) issueIds.push('duplicate-portal-id');
  for (const portal of packageValue.portals) {
    if (portal.fromChapterId === portal.toChapterId) {
      issueIds.push('portal-must-connect-distinct-chapters');
    }
    if (!chapterSet.has(portal.fromChapterId) || !chapterSet.has(portal.toChapterId)) {
      issueIds.push('portal-target-chapter-missing');
    }
  }
  if (!packageValue.validationReceipts.length) issueIds.push('validation-receipt-required');
  if (duplicateIds(packageValue.validationReceipts.map((receipt) => receipt.id))) {
    issueIds.push('duplicate-validation-receipt-id');
  }
  if (
    packageValue.validationReceipts.some(
      (receipt) => receipt.sourceRevision !== packageValue.spatialRevision
    )
  ) {
    issueIds.push('validation-receipt-spatial-revision-mismatch');
  }

  const uniqueIssues = [...new Set(issueIds)].sort();
  return {
    packageId: packageValue.id,
    issueIds: uniqueIssues,
    clientSafe: uniqueIssues.length === 0,
    constructionReady: false
  };
}

export function assertValidSpatialPackage(packageValue: WorkWaySpatialPackage): WorkWaySpatialPackage {
  const validation = validateSpatialPackage(packageValue);
  if (!validation.clientSafe) {
    throw new Error(`Invalid WorkWay spatial package: ${validation.issueIds.join(', ')}`);
  }
  return packageValue;
}

export function assetBrowserUrl(packageValue: WorkWaySpatialPackage, assetId: string): string {
  const asset = packageValue.assets.find((candidate) => candidate.id === assetId);
  if (!asset) throw new Error(`Unknown WorkWay client asset: ${assetId}`);
  return `/${asset.clientPath}`;
}

export function chapterForId(
  packageValue: WorkWaySpatialPackage,
  chapterId: string
): WorkWayRoomChapter {
  const chapter = packageValue.roomChapters.find((candidate) => candidate.id === chapterId);
  if (!chapter) throw new Error(`Unknown WorkWay room chapter: ${chapterId}`);
  return chapter;
}

export function portalsFrom(
  packageValue: WorkWaySpatialPackage,
  chapterId: string
): readonly WorkWaySpatialPortal[] {
  return packageValue.portals.filter((portal) => portal.fromChapterId === chapterId);
}

export function createSessionAnnotation(
  packageValue: WorkWaySpatialPackage,
  chapterId: string,
  text: string,
  sequence: number
): WorkWaySessionAnnotation {
  chapterForId(packageValue, chapterId);
  const normalizedText = text.trim();
  if (!normalizedText) throw new Error('An annotation requires text.');
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('An annotation sequence must be a positive integer.');
  }

  return {
    operationId: `${packageValue.id}:${packageValue.spatialRevision}:annotation:${String(sequence).padStart(4, '0')}`,
    kind: 'create-annotation',
    packageId: packageValue.id,
    spatialRevision: packageValue.spatialRevision,
    chapterId,
    text: normalizedText
  };
}

/**
 * A deterministic, reviewable change set for the kitchen-island conversation
 * in the local preview. It does not modify Canon geometry or claim code
 * compliance; a future project-graph engine would validate and apply it.
 */
export function createKitchenIslandClearanceProposal(
  packageValue: WorkWaySpatialPackage
): WorkWayDesignProposal {
  chapterForId(packageValue, 'kitchen');

  return {
    id: 'threshold-dwelling-r08:proposal:kitchen-island-clearance-0001',
    packageId: packageValue.id,
    projectId: packageValue.canonicalProject.projectId,
    canonicalRevision: packageValue.canonicalProject.projectRevision,
    spatialRevision: packageValue.spatialRevision,
    chapterId: 'kitchen',
    intent: 'Move the kitchen island 4 inches south to improve refrigerator clearance.',
    operation: {
      kind: 'move-entity',
      entityId: 'kitchen-island',
      deltaXIn: 0,
      deltaYIn: 4
    },
    measurements: [
      {
        id: 'island-to-refrigerator-clearance',
        currentIn: 38,
        proposedIn: 42,
        targetIn: 42
      },
      {
        id: 'island-to-opposite-run-clearance',
        currentIn: 48,
        proposedIn: 44,
        targetIn: null
      }
    ],
    requiresProfessionalReview: true,
    constructionReady: false
  };
}

/** Records a local decision without mutating the canonical project revision. */
export function createSessionProposalDecision(
  packageValue: WorkWaySpatialPackage,
  proposal: WorkWayDesignProposal,
  decision: WorkWaySessionProposalDecision['decision']
): WorkWaySessionProposalDecision {
  if (
    proposal.packageId !== packageValue.id ||
    proposal.projectId !== packageValue.canonicalProject.projectId ||
    proposal.spatialRevision !== packageValue.spatialRevision
  ) {
    throw new Error('A proposal decision must target the active WorkWay package revision.');
  }
  chapterForId(packageValue, proposal.chapterId);

  return {
    operationId: `${packageValue.id}:${packageValue.spatialRevision}:proposal-decision:${decision}:0001`,
    kind: 'record-proposal-decision',
    packageId: packageValue.id,
    spatialRevision: packageValue.spatialRevision,
    proposalId: proposal.id,
    decision
  };
}

export const THRESHOLD_DWELLING_SPATIAL_PACKAGE = assertValidSpatialPackage(
  createThresholdDwellingSpatialPackage()
);
