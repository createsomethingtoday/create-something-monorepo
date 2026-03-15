/**
 * Distraction Detection Types
 *
 * Detection is performed by Claude Code agents using vision capabilities.
 * This module provides types and utilities for working with detection results.
 */

/**
 * Detected distraction region
 */
export interface Distraction {
  /** Top-left X (0-1 normalized) */
  x: number;
  /** Top-left Y (0-1 normalized) */
  y: number;
  /** Width (0-1 normalized) */
  width: number;
  /** Height (0-1 normalized) */
  height: number;
  /** What type of distraction: "outlet", "railing", "pathway_light", etc. */
  label: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Detection result for a single image
 */
export interface DetectionResult {
  /** Path to analyzed image */
  imagePath: string;
  /** Detected distractions */
  distractions: Distraction[];
}

/**
 * Batch detection results from Claude Code agents
 */
export interface BatchDetectionResult {
  results: DetectionResult[];
}

/**
 * Validate a distraction object has required fields and valid values
 */
export function isValidDistraction(d: unknown): d is Distraction {
  if (typeof d !== 'object' || d === null) return false;

  const obj = d as Record<string, unknown>;

  return (
    typeof obj.x === 'number' &&
    typeof obj.y === 'number' &&
    typeof obj.width === 'number' &&
    typeof obj.height === 'number' &&
    typeof obj.label === 'string' &&
    obj.x >= 0 && obj.x <= 1 &&
    obj.y >= 0 && obj.y <= 1 &&
    obj.width > 0 && obj.width <= 1 &&
    obj.height > 0 && obj.height <= 1
  );
}

/**
 * Parse and validate detection results from agent JSON output
 */
export function parseDetectionResults(json: string): BatchDetectionResult {
  const parsed = JSON.parse(json);

  if (!parsed.results || !Array.isArray(parsed.results)) {
    throw new Error('Invalid detection results: missing results array');
  }

  const results: DetectionResult[] = [];

  for (const result of parsed.results) {
    if (typeof result.imagePath !== 'string') {
      console.warn('Skipping result with missing imagePath');
      continue;
    }

    const distractions: Distraction[] = [];

    if (Array.isArray(result.distractions)) {
      for (const d of result.distractions) {
        if (isValidDistraction(d)) {
          distractions.push({
            x: d.x,
            y: d.y,
            width: d.width,
            height: d.height,
            label: d.label,
            confidence: typeof d.confidence === 'number' ? d.confidence : 0.8
          });
        }
      }
    }

    results.push({
      imagePath: result.imagePath,
      distractions
    });
  }

  return { results };
}

/**
 * Prompt template for Claude Code agents analyzing images
 */
export const DETECTION_PROMPT = `Analyze these photos and identify background distractions that should be removed for cleaner portraits.

For each image, look for:
- Electrical outlets on walls
- Pathway lights or ground fixtures
- Metal railings, fences, or barriers
- Exposed cables or wires
- Signage or text (not intentional decor)
- Random distracting objects
- Bright spots that draw attention away from subjects

DO NOT flag:
- Intentional decor (Christmas decorations, poinsettias, furniture)
- People or their clothing
- Natural elements (trees, leaves) unless genuinely distracting
- Blurred background elements that don't distract

For each distraction, provide bounding box as normalized coordinates (0-1 range where 0,0 is top-left).

Return JSON format:
{
  "results": [
    {
      "imagePath": "/full/path/to/image.jpg",
      "distractions": [
        {
          "x": 0.75,
          "y": 0.3,
          "width": 0.05,
          "height": 0.08,
          "label": "outlet",
          "confidence": 0.9
        }
      ]
    }
  ]
}

If an image has no distractions, include it with an empty distractions array.
Return ONLY the JSON, no other text.`;
