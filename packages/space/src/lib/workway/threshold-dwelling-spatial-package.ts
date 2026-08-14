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
  THRESHOLD_DWELLING_OUTFITTING_SYSTEM,
  type ThresholdDwellingOutfittingItem
} from '@create-something/canon/experiments/threshold-dwelling/outfitting-system';
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
import composerContractArtifact from './threshold-dwelling-composer-contract.json';
import agentClientProjectionArtifact from './threshold-dwelling-agent-evaluation.json';

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

/** A source-free, reviewable occupancy and systems layer for spatial clients. */
export interface WorkWayOutfittingContract {
  schemaVersion: 'workway.outfitting-system.v1';
  id: 'threshold-dwelling-r08-design-intent-outfitting';
  projectId: string;
  canonicalRevision: string;
  spatialRevision: string;
  status: 'design-intent-experience-layer';
  statement: string;
  items: readonly ThresholdDwellingOutfittingItem[];
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
  outfitting: WorkWayOutfittingContract;
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
  operation: WorkWayDeterministicOperation;
  measurements: readonly {
    id: string;
    currentIn: number;
    proposedIn: number;
    targetIn: number | null;
  }[];
  requiresProfessionalReview: true;
  constructionReady: false;
}

/** A client projection of a Rust-owned typed operation; never raw mesh data. */
export type WorkWayDeterministicOperation =
  | {
      kind: 'move-entity';
      entityId: string;
      deltaXIn: number;
      deltaYIn: number;
    }
  | {
      kind: 'set-material-role';
      entityId: string;
      materialRoleId: string;
    };

/** A bounded local Composer projection that mirrors the Rust pilot contract. */
export type WorkWayComposerInterpretation =
  | {
      kind: 'proposed';
      proposal: WorkWayDesignProposal;
      validation: { deterministic: true; issueIds: readonly [] };
    }
  | {
      kind: 'blocked';
      reasonId:
        | 'unsupported-or-ambiguous-intent'
        | 'window-and-glass-opening-geometry-unissued'
        | 'invalid-active-package';
      explanation: string;
    };

export interface WorkWaySessionProposalDecision {
  operationId: string;
  kind: 'record-proposal-decision';
  packageId: string;
  spatialRevision: string;
  proposalId: string;
  decision: 'accepted' | 'rejected';
}

export type WorkWaySessionOperation = WorkWaySessionAnnotation | WorkWaySessionProposalDecision;

type ComposerContractOperation =
  | {
      moveEntity: {
        entityId: string;
        deltaXIn: number;
        deltaYIn: number;
      };
    }
  | {
      setMaterialRole: {
        entityId: string;
        materialRoleId: string;
      };
    };

interface ComposerContractProposal {
  schemaVersion: string;
  id: string;
  packageId: string;
  projectId: string;
  canonicalRevision: string;
  spatialRevision: string;
  chapterId: string;
  intent: string;
  operation: ComposerContractOperation;
  measurements: readonly {
    id: string;
    currentIn: number;
    proposedIn: number;
    targetIn: number | null;
  }[];
  requiresProfessionalReview: boolean;
  constructionReady: boolean;
}

type WorkWayAgentOutcome = 'proposed' | 'blocked' | 'escalated';

interface WorkWayAgentReceiptProposal {
  schemaVersion: 'workway.change-proposal.v1';
  id: string;
  packageId: string;
  projectId: string;
  canonicalRevision: string;
  spatialRevision: string;
  chapterId: string;
  operation: ComposerContractOperation;
  measurements: readonly {
    id: string;
    currentIn: number;
    proposedIn: number;
    targetIn: number | null;
  }[];
  requiresProfessionalReview: true;
  constructionReady: false;
}

export interface WorkWayAgentClientReceipt {
  schemaVersion: 'workway.agent-receipt.v1';
  requestId: string;
  role: 'composer' | 'ingestion' | 'trade-review' | 'spatial-session';
  projectId: string;
  canonicalRevision: string;
  spatialRevision: string;
  supportedScope: readonly string[];
  outcome: WorkWayAgentOutcome;
  assumptions: readonly string[];
  requiredReview: {
    required: true;
    roles: readonly string[];
    rationale: string;
  };
  proposal: WorkWayAgentReceiptProposal | null;
  validation: {
    proposalId: string;
    issueIds: readonly string[];
    deterministic: boolean;
    constructionReady: false;
  } | null;
  block: { reasonId: string; explanation: string } | null;
  constructionReady: false;
}

export interface WorkWayAgentClientScenario {
  id: string;
  label: string;
  expectedOutcome: WorkWayAgentOutcome;
  receipt: WorkWayAgentClientReceipt;
}

export interface WorkWayAgentClientProjection {
  schemaVersion: 'workway.agent-client-projection.v1';
  projectId: string;
  canonicalRevision: string;
  spatialRevision: string;
  evaluatorPassed: true;
  scenarios: readonly WorkWayAgentClientScenario[];
  constructionReady: false;
}

interface WorkWayComposerContract {
  schemaVersion: 'workway.composer-contract.v1';
  projectId: string;
  canonicalRevision: string;
  spatialRevision: string;
  supportedIntents: readonly {
    intent: string;
    proposal: ComposerContractProposal;
    validation: {
      proposalId: string;
      issueIds: readonly string[];
      deterministic: boolean;
      constructionReady: boolean;
    };
  }[];
  blockedIntentRules: readonly {
    ruleId: string;
    requiredTerms: readonly string[];
    anyTerms: readonly string[];
    reasonId: string;
    explanation: string;
  }[];
  fallbackReasonId: string;
  fallbackExplanation: string;
  constructionReady: boolean;
}

/**
 * Generated by `cargo run --bin emit_threshold_dwelling_composer_contract` in
 * workway-core. Rust tests require equivalent JSON semantics, so Space
 * consumes a projection rather than maintaining proposal constants.
 */
const THRESHOLD_DWELLING_COMPOSER_CONTRACT =
  composerContractArtifact as WorkWayComposerContract;

/**
 * Generated by `cargo run --bin emit_threshold_dwelling_agent_evaluation` in
 * workway-core. This is a fixed, source-free evaluator projection; it is not
 * a browser agent endpoint and cannot mutate canonical state.
 */
const THRESHOLD_DWELLING_AGENT_CLIENT_PROJECTION =
  agentClientProjectionArtifact as WorkWayAgentClientProjection;

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
  },
  {
    id: 'native-massing-usdz',
    clientPath: 'experiments/threshold-dwelling/renders/threshold-dwelling-r08-massing-guide.usdz',
    sha256: '5f2b2ac1f8447ea4b4cbce90ede32de280f0b9833735e3e330fb6a2a2f83aba6'
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
    outfitting: THRESHOLD_DWELLING_OUTFITTING_SYSTEM,
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
        status: 'available',
        canonicalRevision: livingRevision.base.revision,
        spatialRevision: livingRevision.proposedRevision,
        assetId: 'native-massing-usdz'
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
  const outfitting = packageValue.outfitting;
  if (
    outfitting.schemaVersion !== 'workway.outfitting-system.v1' ||
    outfitting.id !== 'threshold-dwelling-r08-design-intent-outfitting' ||
    outfitting.projectId !== packageValue.canonicalProject.projectId ||
    outfitting.canonicalRevision !== packageValue.canonicalProject.projectRevision ||
    outfitting.spatialRevision !== packageValue.spatialRevision ||
    outfitting.status !== 'design-intent-experience-layer' ||
    outfitting.constructionReady ||
    !outfitting.items.length ||
    duplicateIds(outfitting.items.map((item) => item.id)) ||
    outfitting.items.some(
      (item) =>
        item.constructionReady ||
        !item.id.trim() ||
        item.placement.widthIn <= 0 ||
        item.placement.depthIn <= 0 ||
        item.placement.renderHeightIn <= 0
    ) ||
    !outfitting.items.some(
      (item) =>
        item.id === 'opening-window-daughter-suite' &&
        item.sourceOpeningId === 'window-daughter-suite'
    )
  ) {
    issueIds.push('invalid-outfitting-contract');
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

function normalizeComposerIntent(intent: string): string {
  return intent.trim().replace(/\s+/g, ' ').toLowerCase();
}

function composerContractMatchesPackage(packageValue: WorkWaySpatialPackage): boolean {
  const contract = THRESHOLD_DWELLING_COMPOSER_CONTRACT;
  return (
    contract.schemaVersion === 'workway.composer-contract.v1' &&
    !contract.constructionReady &&
    contract.projectId === packageValue.canonicalProject.projectId &&
    contract.canonicalRevision === packageValue.canonicalProject.projectRevision &&
    contract.spatialRevision === packageValue.spatialRevision
  );
}

function agentProjectionMatchesPackage(packageValue: WorkWaySpatialPackage): boolean {
  const projection = THRESHOLD_DWELLING_AGENT_CLIENT_PROJECTION;
  const serialized = JSON.stringify(projection);
  if (
    projection.schemaVersion !== 'workway.agent-client-projection.v1' ||
    !projection.evaluatorPassed ||
    projection.constructionReady ||
    projection.projectId !== packageValue.canonicalProject.projectId ||
    projection.canonicalRevision !== packageValue.canonicalProject.projectRevision ||
    projection.spatialRevision !== packageValue.spatialRevision ||
    projection.scenarios.length === 0 ||
    serialized.includes('"intent":') ||
    serialized.includes('customer-plan.pdf') ||
    serialized.includes('vault_') ||
    serialized.includes('privateDocument')
  ) {
    return false;
  }

  return projection.scenarios.every((scenario) => {
    const receipt = scenario.receipt;
    const proposal = receipt.proposal;
    const proposalIsValid = proposal
      ? proposal.schemaVersion === 'workway.change-proposal.v1' &&
        proposal.packageId === packageValue.id &&
        proposal.projectId === packageValue.canonicalProject.projectId &&
        proposal.canonicalRevision === packageValue.canonicalProject.projectRevision &&
        proposal.spatialRevision === packageValue.spatialRevision &&
        !proposal.constructionReady &&
        proposal.requiresProfessionalReview
      : receipt.outcome !== 'proposed';
    const validationIsValid = receipt.validation
      ? proposal !== null &&
        receipt.validation.proposalId === proposal.id &&
        !receipt.validation.constructionReady
      : receipt.outcome !== 'proposed';
    const blockIsValid = receipt.block ? receipt.outcome !== 'proposed' : receipt.outcome === 'proposed';

    return (
      scenario.id.trim().length > 0 &&
      scenario.label.trim().length > 0 &&
      scenario.expectedOutcome === receipt.outcome &&
      receipt.schemaVersion === 'workway.agent-receipt.v1' &&
      /^req_[a-f0-9]{32}$/.test(receipt.requestId) &&
      receipt.projectId === packageValue.canonicalProject.projectId &&
      receipt.canonicalRevision === packageValue.canonicalProject.projectRevision &&
      receipt.spatialRevision === packageValue.spatialRevision &&
      !receipt.constructionReady &&
      receipt.requiredReview.required &&
      receipt.requiredReview.roles.length > 0 &&
      receipt.assumptions.length > 0 &&
      proposalIsValid &&
      validationIsValid &&
      blockIsValid
    );
  });
}

/** Returns the Rust-derived evaluator projection only when it matches the active package. */
export function agentClientProjectionForPackage(
  packageValue: WorkWaySpatialPackage
): WorkWayAgentClientProjection {
  if (!agentProjectionMatchesPackage(packageValue)) {
    throw new Error('The Rust-derived agent client projection does not match the active WorkWay package.');
  }
  return THRESHOLD_DWELLING_AGENT_CLIENT_PROJECTION;
}

/** Finds one fixed agent evaluation receipt without accepting browser input. */
export function agentScenarioForId(
  packageValue: WorkWaySpatialPackage,
  scenarioId: string
): WorkWayAgentClientScenario {
  const scenario = agentClientProjectionForPackage(packageValue).scenarios.find(
    (candidate) => candidate.id === scenarioId
  );
  if (!scenario) throw new Error(`Unknown WorkWay agent evaluation scenario: ${scenarioId}`);
  return scenario;
}

function projectComposerOperation(operation: ComposerContractOperation): WorkWayDeterministicOperation {
  if ('moveEntity' in operation) {
    return { kind: 'move-entity', ...operation.moveEntity };
  }
  if ('setMaterialRole' in operation) {
    return { kind: 'set-material-role', ...operation.setMaterialRole };
  }
  throw new Error('The Rust-derived Composer contract contained an unsupported operation.');
}

function projectComposerProposal(
  packageValue: WorkWaySpatialPackage,
  proposal: ComposerContractProposal
): WorkWayDesignProposal {
  if (
    proposal.schemaVersion !== 'workway.change-proposal.v1' ||
    proposal.packageId !== packageValue.id ||
    proposal.projectId !== packageValue.canonicalProject.projectId ||
    proposal.canonicalRevision !== packageValue.canonicalProject.projectRevision ||
    proposal.spatialRevision !== packageValue.spatialRevision ||
    proposal.constructionReady ||
    !proposal.requiresProfessionalReview
  ) {
    throw new Error('The Rust-derived Composer proposal does not match the active review package.');
  }
  chapterForId(packageValue, proposal.chapterId);

  return {
    ...proposal,
    operation: projectComposerOperation(proposal.operation),
    requiresProfessionalReview: true,
    constructionReady: false
  };
}

/** The first Rust-codified proposal gives the review UI a harmless default. */
export const DEFAULT_THRESHOLD_DWELLING_COMPOSER_INTENT =
  THRESHOLD_DWELLING_COMPOSER_CONTRACT.supportedIntents[0]?.intent ?? '';

/** Returns a client projection of one Rust-codified deterministic proposal. */
export function composerProposalForIntent(
  packageValue: WorkWaySpatialPackage,
  intent: string
): WorkWayDesignProposal | undefined {
  if (!composerContractMatchesPackage(packageValue)) return undefined;
  const supportedIntent = THRESHOLD_DWELLING_COMPOSER_CONTRACT.supportedIntents.find(
    (candidate) => normalizeComposerIntent(candidate.intent) === normalizeComposerIntent(intent)
  );
  if (!supportedIntent || !supportedIntent.validation.deterministic) return undefined;
  if (
    supportedIntent.validation.proposalId !== supportedIntent.proposal.id ||
    supportedIntent.validation.issueIds.length > 0 ||
    supportedIntent.validation.constructionReady
  ) {
    return undefined;
  }
  return projectComposerProposal(packageValue, supportedIntent.proposal);
}

/**
 * The browser receives only a deliberately narrow Composer projection. Its
 * accepted vocabulary maps to a serializable typed proposal; unknown intent
 * never changes the plan or visualized geometry.
 */
export function interpretThresholdDwellingComposerIntent(
  packageValue: WorkWaySpatialPackage,
  intent: string
): WorkWayComposerInterpretation {
  if (!validateSpatialPackage(packageValue).clientSafe) {
    return {
      kind: 'blocked',
      reasonId: 'invalid-active-package',
      explanation: 'The active package failed validation, so WorkWay cannot create a proposal.'
    };
  }
  if (!composerContractMatchesPackage(packageValue)) {
    return {
      kind: 'blocked',
      reasonId: 'invalid-active-package',
      explanation: 'The Rust-derived Composer contract does not match the active review package.'
    };
  }
  const normalizedIntent = normalizeComposerIntent(intent);
  const proposal = composerProposalForIntent(packageValue, normalizedIntent);
  if (proposal) {
    return { kind: 'proposed', proposal, validation: { deterministic: true, issueIds: [] } };
  }
  const blockedRule = THRESHOLD_DWELLING_COMPOSER_CONTRACT.blockedIntentRules.find(
    (rule) =>
      rule.requiredTerms.every((term) => normalizedIntent.includes(term)) &&
      rule.anyTerms.some((term) => normalizedIntent.includes(term))
  );
  if (blockedRule) {
    return {
      kind: 'blocked',
      reasonId: blockedRule.reasonId as Extract<
        WorkWayComposerInterpretation,
        { kind: 'blocked' }
      >['reasonId'],
      explanation: blockedRule.explanation
    };
  }
  return {
    kind: 'blocked',
    reasonId: THRESHOLD_DWELLING_COMPOSER_CONTRACT.fallbackReasonId as Extract<
      WorkWayComposerInterpretation,
      { kind: 'blocked' }
    >['reasonId'],
    explanation: THRESHOLD_DWELLING_COMPOSER_CONTRACT.fallbackExplanation
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

/** The native bundle omits presentational chapter titles, but keeps all scene truth. */
export function nativeThresholdDwellingSpatialPackageProjection(
  packageValue: WorkWaySpatialPackage = THRESHOLD_DWELLING_SPATIAL_PACKAGE
) {
  return {
    ...packageValue,
    outfitting: {
      ...packageValue.outfitting,
      // JSON does not preserve optional properties with `undefined` values.
      // Omit them deliberately so the generated Swift fixture is a true
      // serialization-equivalent projection of the TypeScript contract.
      items: packageValue.outfitting.items.map(({ chapterId, sourceOpeningId, ...item }) => ({
        ...item,
        ...(chapterId ? { chapterId } : {}),
        ...(sourceOpeningId ? { sourceOpeningId } : {})
      }))
    },
    roomChapters: packageValue.roomChapters.map(({ title: _title, ...chapter }) => chapter)
  };
}
