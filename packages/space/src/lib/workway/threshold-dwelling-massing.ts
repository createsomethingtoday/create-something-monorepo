import {
  THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN,
  THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION
} from '@create-something/canon/experiments/threshold-dwelling/living-system-revision';
import {
  THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE,
  resolveThresholdDwellingAssemblyBinding,
  resolveThresholdDwellingCodifiedMaterial,
  type ThresholdDwellingMaterialSelectionStatus
} from '@create-something/canon/experiments/threshold-dwelling/assembly-schedule';

export interface WorkWayMassingGuide {
  id: 'threshold-dwelling-r08-browser-massing-guide';
  canonicalProject: {
    projectId: string;
    projectRevision: string;
  };
  spatialRevision: string;
  materialContract: {
    scheduleId: string;
    materialBindingStatus: 'role-codified-product-unselected';
  };
  dimensions: {
    widthIn: number;
    depthIn: number;
    horizontalSource: 'canon-rev-0.8-floor-plan';
    verticalMassingHeightIn: number;
    verticalStatus: 'illustrative-visualization-parameter';
  };
  constructionReady: false;
}

export interface WorkWayMassingVertex {
  xIn: number;
  yIn: number;
  zIn: number;
}

/**
 * A meter-space point for browser renderers. The plan center becomes the
 * render origin; every value remains derived from issued plan inches.
 */
export interface WorkWayThreeMassingVector {
  xM: number;
  yM: number;
  zM: number;
  coordinateTruth: 'revised-plan-horizontal-only';
  verticalStatus: 'illustrative-visualization-parameter';
}

export interface WorkWayMassingFloor {
  id: string;
  type: string;
  materialId: string;
  materialColor: string;
  materialSelectionStatus: ThresholdDwellingMaterialSelectionStatus;
  vertices: readonly WorkWayMassingVertex[];
}

export interface WorkWayMassingWall {
  id: string;
  exterior: boolean;
  materialId: string;
  materialColor: string;
  materialSelectionStatus: ThresholdDwellingMaterialSelectionStatus;
  vertices: readonly WorkWayMassingVertex[];
}

export interface WorkWayMassingGeometry {
  floors: readonly WorkWayMassingFloor[];
  walls: readonly WorkWayMassingWall[];
}

export interface WorkWayMassingGuideValidation {
  issueIds: readonly string[];
  isSafeForReview: boolean;
  constructionReady: false;
}

const feetToInches = (value: number): number => value * 12;
const INCH_TO_METER = 0.0254;

/**
 * This guide intentionally preserves only the issued horizontal design-intent
 * dimensions. Its 9 ft vertical mass is a clear visual parameter, not an
 * architectural elevation, structural depth, glazing height, or code claim.
 */
export const THRESHOLD_DWELLING_MASSING_GUIDE = {
  id: 'threshold-dwelling-r08-browser-massing-guide',
  canonicalProject: {
    projectId: THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION.base.projectId,
    projectRevision: THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION.base.revision
  },
  spatialRevision: THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION.proposedRevision,
  materialContract: {
    scheduleId: THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE.id,
    materialBindingStatus: 'role-codified-product-unselected'
  },
  dimensions: {
    widthIn: feetToInches(THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN.width),
    depthIn: feetToInches(THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN.depth),
    horizontalSource: 'canon-rev-0.8-floor-plan',
    verticalMassingHeightIn: 108,
    verticalStatus: 'illustrative-visualization-parameter'
  },
  constructionReady: false
} as const satisfies WorkWayMassingGuide;

/**
 * Converts one issued inch coordinate into Three.js's meter-based render
 * space. Centering is a camera/rendering convenience only: it does not alter
 * a plan coordinate or confer vertical-geometry authority.
 */
export function toThreeMassingVector(
  vertex: WorkWayMassingVertex,
  guide: WorkWayMassingGuide = THRESHOLD_DWELLING_MASSING_GUIDE
): WorkWayThreeMassingVector {
  return {
    xM: (vertex.xIn - guide.dimensions.widthIn / 2) * INCH_TO_METER,
    yM: vertex.yIn * INCH_TO_METER,
    zM: (vertex.zIn - guide.dimensions.depthIn / 2) * INCH_TO_METER,
    coordinateTruth: 'revised-plan-horizontal-only',
    verticalStatus: guide.dimensions.verticalStatus
  };
}

function floorVertices(x: number, y: number, width: number, height: number): readonly WorkWayMassingVertex[] {
  const x1 = feetToInches(x);
  const x2 = feetToInches(x + width);
  const z1 = feetToInches(y);
  const z2 = feetToInches(y + height);

  return [
    { xIn: x1, yIn: 0, zIn: z1 },
    { xIn: x2, yIn: 0, zIn: z1 },
    { xIn: x2, yIn: 0, zIn: z2 },
    { xIn: x1, yIn: 0, zIn: z2 }
  ];
}

function wallVertices(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  heightIn: number
): readonly WorkWayMassingVertex[] {
  return [
    { xIn: feetToInches(x1), yIn: 0, zIn: feetToInches(y1) },
    { xIn: feetToInches(x2), yIn: 0, zIn: feetToInches(y2) },
    { xIn: feetToInches(x2), yIn: heightIn, zIn: feetToInches(y2) },
    { xIn: feetToInches(x1), yIn: heightIn, zIn: feetToInches(y1) }
  ];
}

function renderMaterial(kind: 'plan-zone' | 'wall-class', id: string) {
  const binding = resolveThresholdDwellingAssemblyBinding(kind, id);
  if (!binding?.renderInMassingGuide) {
    throw new Error(`Threshold Dwelling massing requires a renderable material binding for ${kind}:${id}.`);
  }
  const material = resolveThresholdDwellingCodifiedMaterial(binding.renderMaterialId);
  if (!material) {
    throw new Error(`Threshold Dwelling massing binding references missing material ${binding.renderMaterialId}.`);
  }
  return material;
}

/**
 * Produces the small, client-safe geometry used by the local browser renderer.
 * It is derived anew from Canon whenever the module loads; no visual asset is
 * permitted to become an alternate source of dimensions.
 */
export function createThresholdDwellingMassingGeometry(
  guide: WorkWayMassingGuide = THRESHOLD_DWELLING_MASSING_GUIDE
): WorkWayMassingGeometry {
  const floorPlan = THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN;

  return {
    floors: floorPlan.zones.map((zone) => {
      if (!zone.id) throw new Error('Threshold Dwelling massing requires stable plan-zone IDs.');
      const material = renderMaterial('plan-zone', zone.id);
      return {
        id: zone.id,
        type: zone.type,
        materialId: material.id,
        materialColor: material.visualColor,
        materialSelectionStatus: material.selectionStatus,
        vertices: floorVertices(zone.x, zone.y, zone.width, zone.height)
      };
    }),
    walls: floorPlan.walls.map((wall, index) => {
      const exterior = Boolean(wall.exterior);
      const material = renderMaterial('wall-class', exterior ? 'exterior' : 'interior');
      return {
        id: `wall-${index + 1}`,
        exterior,
        materialId: material.id,
        materialColor: material.visualColor,
        materialSelectionStatus: material.selectionStatus,
        vertices: wallVertices(
          wall.x1,
          wall.y1,
          wall.x2,
          wall.y2,
          guide.dimensions.verticalMassingHeightIn
        )
      };
    })
  };
}

export function validateThresholdDwellingMassingGuide(
  guide: WorkWayMassingGuide
): WorkWayMassingGuideValidation {
  const issueIds: string[] = [];
  const floorPlan = THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN;

  if (guide.constructionReady) issueIds.push('construction-ready-must-be-false');
  if (guide.canonicalProject.projectId !== THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION.base.projectId) {
    issueIds.push('canonical-project-mismatch');
  }
  if (guide.canonicalProject.projectRevision !== THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION.base.revision) {
    issueIds.push('canonical-revision-mismatch');
  }
  if (guide.spatialRevision !== THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION.proposedRevision) {
    issueIds.push('spatial-revision-mismatch');
  }
  if (
    guide.materialContract.scheduleId !== THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE.id ||
    guide.materialContract.materialBindingStatus !== 'role-codified-product-unselected'
  ) {
    issueIds.push('material-contract-mismatch');
  }
  if (
    guide.dimensions.widthIn !== feetToInches(floorPlan.width) ||
    guide.dimensions.depthIn !== feetToInches(floorPlan.depth)
  ) {
    issueIds.push('horizontal-dimensions-mismatch');
  }
  if (guide.dimensions.horizontalSource !== 'canon-rev-0.8-floor-plan') {
    issueIds.push('horizontal-source-mismatch');
  }
  if (guide.dimensions.verticalMassingHeightIn <= 0) {
    issueIds.push('vertical-massing-height-must-be-positive');
  }
  if (guide.dimensions.verticalStatus !== 'illustrative-visualization-parameter') {
    issueIds.push('vertical-massing-status-mismatch');
  }

  return {
    issueIds,
    isSafeForReview: issueIds.length === 0,
    constructionReady: false
  };
}
