import {
  resolveThresholdDwellingCodifiedMaterial,
  type ThresholdDwellingMaterialSelectionStatus
} from '@create-something/canon/experiments/threshold-dwelling/assembly-schedule';

export type WorkWayMaterialStudyRecipe =
  | 'polished-concrete-mottle'
  | 'large-format-porcelain-grid'
  | 'low-e-glass-intent'
  | 'architectural-concrete-mottle'
  | 'gypsum-mineral-finish';

export interface WorkWayMaterialStudy {
  materialId: string;
  materialName: string;
  recipe: WorkWayMaterialStudyRecipe;
  surfaceKind: 'floor' | 'wall';
  visualSource: 'workway-procedural-threejs-role-study';
  productStatus: ThresholdDwellingMaterialSelectionStatus;
  constructionReady: false;
}

export interface WorkWayDeferredMaterialStudyRole {
  materialId: string;
  materialName: string;
  reason: string;
  productStatus: ThresholdDwellingMaterialSelectionStatus;
  geometryStatus: 'not-rendered-no-issued-geometry';
  constructionReady: false;
}

function materialStudy(
  materialId: string,
  recipe: WorkWayMaterialStudyRecipe,
  surfaceKind: WorkWayMaterialStudy['surfaceKind']
): WorkWayMaterialStudy {
  const material = resolveThresholdDwellingCodifiedMaterial(materialId);
  if (!material) throw new Error(`Missing codified material for ${materialId}.`);

  return {
    materialId: material.id,
    materialName: material.name,
    recipe,
    surfaceKind,
    visualSource: 'workway-procedural-threejs-role-study',
    productStatus: material.selectionStatus,
    constructionReady: false
  };
}

function deferredMaterialRole(
  materialId: string,
  reason: string
): WorkWayDeferredMaterialStudyRole {
  const material = resolveThresholdDwellingCodifiedMaterial(materialId);
  if (!material) throw new Error(`Missing codified material for ${materialId}.`);

  return {
    materialId: material.id,
    materialName: material.name,
    reason,
    productStatus: material.selectionStatus,
    geometryStatus: 'not-rendered-no-issued-geometry',
    constructionReady: false
  };
}

/**
 * Browser-ready, source-free visual recipes for the material roles that are
 * already bound to current plan-derived floors and walls. They are generated
 * procedurally in Three.js; no manufacturer image or product claim is used.
 */
export const THRESHOLD_DWELLING_MATERIAL_STUDIES = [
  materialStudy('M-INT-001', 'polished-concrete-mottle', 'floor'),
  materialStudy('M-INT-002', 'large-format-porcelain-grid', 'floor'),
  materialStudy('M-ENV-001', 'low-e-glass-intent', 'wall'),
  materialStudy('M-ENV-002', 'architectural-concrete-mottle', 'wall')
] as const satisfies readonly WorkWayMaterialStudy[];

/**
 * These remain legible in the material study without drawing geometry that
 * has not been issued by the responsible discipline.
 */
export const THRESHOLD_DWELLING_DEFERRED_MATERIAL_STUDY_ROLES = [
  deferredMaterialRole('M-STR-001', 'Foundation and slab-substrate geometry is unissued.'),
  deferredMaterialRole('M-STR-002', 'Structural support geometry is unissued.'),
  deferredMaterialRole('M-ENV-003', 'Roof and trim geometry is unissued.'),
  deferredMaterialRole('M-ENV-004', 'No protected-cedar accent geometry is currently issued.'),
  deferredMaterialRole('M-INT-003', 'Concrete is the current interior-wall study; gypsum/mineral finish geometry is unissued.'),
  deferredMaterialRole('M-INT-004', 'No cedar ceiling or millwork geometry is currently issued.'),
  deferredMaterialRole('M-INT-005', 'No casework geometry is currently issued.'),
  deferredMaterialRole('M-EXT-001', 'Exterior terrace geometry is unissued.'),
  deferredMaterialRole('M-EXT-002', 'Exterior grade and path geometry is unissued.')
] as const satisfies readonly WorkWayDeferredMaterialStudyRole[];

export function resolveThresholdDwellingMaterialStudy(
  materialId: string
): WorkWayMaterialStudy | undefined {
  return THRESHOLD_DWELLING_MATERIAL_STUDIES.find((study) => study.materialId === materialId);
}
