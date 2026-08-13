/**
 * Threshold Dwelling - Complete System
 * 
 * Architectural visualization experiment exploring dwelling spaces.
 * Status: 1 of 1 (experiment-specific)
 * 
 * Graduation: If used in another architecture experiment,
 * generalize to `@create-something/canon/components/architecture`
 */

export { default as ArchitecturalPatterns } from './ArchitecturalPatterns.svelte';
export { default as Circulation } from './Circulation.svelte';
export { default as DailyRhythm } from './DailyRhythm.svelte';
export { default as Elevation } from './Elevation.svelte';
export { default as FloorPlan } from './FloorPlan.svelte';
export { default as LightStudy } from './LightStudy.svelte';
export { default as MaterialPalette } from './MaterialPalette.svelte';
export { default as RoofPlan } from './RoofPlan.svelte';
export { default as Section } from './Section.svelte';
export { default as SitePlan } from './SitePlan.svelte';
export { default as Systems } from './Systems.svelte';
export {
  THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  THRESHOLD_DWELLING_FLOOR_PLAN,
  validateThresholdDwellingDimensions,
  type ThresholdDwellingDimensionBlocker,
  type ThresholdDwellingDimensionCandidate,
  type ThresholdDwellingDimensionStatus,
  type ThresholdDwellingDimensionValidation,
  type ThresholdDwellingPlanOpening,
  type ThresholdDwellingPlanZone,
  type ThresholdDwellingWallRun
} from './dimensioned-project.js';
export {
  THRESHOLD_DWELLING_DESIGN,
  type ThresholdDwellingBuildMetrics,
  type ThresholdDwellingConstructionAllowance,
  type ThresholdDwellingCostCategory,
  type ThresholdDwellingCostLineItem,
  type ThresholdDwellingCostUnit,
  type ThresholdDwellingMaterial,
  type ThresholdDwellingMaterialGroup,
  type ThresholdDwellingMaterialStrategy
} from './model.js';
