/**
 * Threshold Dwelling render projection.
 *
 * The geometry comes from Canon's inch-precise design-intent candidate. This
 * prevents the render pipeline from silently diverging from the WorkWay
 * baseline while preserving the candidate's explicit non-construction status.
 */

import { THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN } from '@create-something/canon/experiments/threshold-dwelling/living-system-revision';

import type { FloorPlanData } from '../src/floor-plan-svg.js';

/**
 * Regeneration uses the explicit Rev 0.8 living-system proposal. The 0.7
 * candidate remains available independently for comparison and is not
 * overwritten by render work.
 */
export const THRESHOLD_DWELLING: FloorPlanData = THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN;
