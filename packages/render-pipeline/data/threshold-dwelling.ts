/**
 * Threshold Dwelling render projection.
 *
 * The geometry comes from Canon's inch-precise design-intent candidate. This
 * prevents the render pipeline from silently diverging from the WorkWay
 * baseline while preserving the candidate's explicit non-construction status.
 */

import { THRESHOLD_DWELLING_FLOOR_PLAN } from '@create-something/canon/experiments/threshold-dwelling/dimensioned-project';

import type { FloorPlanData } from '../src/floor-plan-svg.js';

export const THRESHOLD_DWELLING: FloorPlanData = THRESHOLD_DWELLING_FLOOR_PLAN;
