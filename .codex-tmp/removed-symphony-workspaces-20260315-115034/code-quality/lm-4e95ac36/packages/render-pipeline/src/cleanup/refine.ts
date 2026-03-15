/**
 * Isaac-01 Refinement Module - DISABLED
 *
 * Replicate integration has been disabled due to runaway costs ($700+).
 * Disabled: 2026-01-25
 */

import type { Distraction, DetectionResult } from './detect.js';

const DISABLED_ERROR = new Error(
  'REPLICATE REFINEMENT DISABLED: ' +
    'Replicate API has been disabled due to runaway costs ($700+). ' +
    'Contact engineering before re-enabling.'
);

/**
 * Refine detection results using Isaac - DISABLED
 * @throws Error always - Replicate integration is disabled
 */
export async function refineDetections(
  _imagePath: string,
  _detections: DetectionResult
): Promise<DetectionResult> {
  throw DISABLED_ERROR;
}

/**
 * Get precise bounding box for a single distraction - DISABLED
 * @throws Error always - Replicate integration is disabled
 */
export async function refineDistraction(
  _imagePath: string,
  _distraction: Distraction
): Promise<Distraction | null> {
  throw DISABLED_ERROR;
}

/**
 * Check if Isaac refinement is available - ALWAYS returns false
 */
export function isIsaacConfigured(): boolean {
  return false;
}
