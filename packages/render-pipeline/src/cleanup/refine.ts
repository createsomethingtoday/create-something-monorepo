/**
 * Isaac-01 Refinement Module
 * Uses Perceptron's Isaac model to get precise bounding boxes for detected distractions
 *
 * Pipeline: Claude (editorial judgment) → Isaac (precise grounding) → Flux (inpainting)
 */

import sharp from 'sharp';
import * as fs from 'fs/promises';
import type { Distraction, DetectionResult } from './detect.js';
import { getClient, bufferToDataUri } from '../utils/replicate.js';

// Isaac model on Replicate
const ISAAC_MODEL = 'perceptron-ai-inc/isaac-0.1';

// Max dimension for Isaac API (smaller than Flux to avoid payload errors)
const MAX_DIMENSION = 1024;

// Isaac uses 0-1000 coordinate space
const ISAAC_COORD_MAX = 1000;

/**
 * Isaac bounding box format (0-1000 coordinate space)
 */
interface IsaacBox {
  mention: string;
  top_left: [number, number];
  bottom_right: [number, number];
  confidence?: number;
}

/**
 * Isaac response with grounded regions
 */
interface IsaacResponse {
  text: string;
  boxes?: IsaacBox[];
}

/**
 * Resize image if needed to fit within max dimensions
 */
async function resizeIfNeeded(buffer: Buffer, maxDim: number): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;

  const maxSize = Math.max(width, height);

  if (maxSize <= maxDim) {
    return buffer;
  }

  const scale = maxDim / maxSize;
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  return sharp(buffer)
    .resize(newWidth, newHeight, { fit: 'inside' })
    .jpeg({ quality: 85 })  // Use JPEG for smaller payload
    .toBuffer();
}

/**
 * Convert Isaac box (0-1000) to normalized coordinates (0-1)
 */
function isaacBoxToNormalized(box: IsaacBox): Distraction {
  const x = box.top_left[0] / ISAAC_COORD_MAX;
  const y = box.top_left[1] / ISAAC_COORD_MAX;
  const width = (box.bottom_right[0] - box.top_left[0]) / ISAAC_COORD_MAX;
  const height = (box.bottom_right[1] - box.top_left[1]) / ISAAC_COORD_MAX;

  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
    width: Math.max(0, Math.min(1 - x, width)),
    height: Math.max(0, Math.min(1 - y, height)),
    label: box.mention,
    confidence: box.confidence ?? 0.9
  };
}

/**
 * Build a prompt for Isaac to find and precisely locate distractions
 */
function buildRefinementPrompt(distractions: Distraction[]): string {
  const items = distractions.map(d => d.label).join(', ');
  return `Find and return precise bounding boxes for these objects in the image: ${items}.
Return coordinates for each object you can locate. Be precise about the boundaries.`;
}

/**
 * Refine detection bounding boxes using Isaac-01
 *
 * Takes Claude's editorial detections and uses Isaac to get precise coordinates.
 *
 * @param imagePath - Path to the image
 * @param distractions - Initial detections from Claude (approximate)
 * @returns Refined detections with precise bounding boxes
 */
export async function refineWithIsaac(
  imagePath: string,
  distractions: Distraction[]
): Promise<Distraction[]> {
  if (distractions.length === 0) {
    return [];
  }

  const client = getClient();

  // Read and resize image for Isaac API
  const imageBuffer = await fs.readFile(imagePath);
  const resizedBuffer = await resizeIfNeeded(imageBuffer, MAX_DIMENSION);
  const imageUri = bufferToDataUri(resizedBuffer, 'image/jpeg');

  const prompt = buildRefinementPrompt(distractions);

  console.log(`  Refining ${distractions.length} detection(s) with Isaac-01...`);

  try {
    const output = await client.run(ISAAC_MODEL, {
      input: {
        image: imageUri,
        prompt,
        response_style: 'box'  // Request bounding box output
      }
    });


    // Parse Isaac response
    const response = parseIsaacResponse(output);

    if (response.boxes && response.boxes.length > 0) {
      const refined = response.boxes.map(isaacBoxToNormalized);
      console.log(`  Isaac refined to ${refined.length} precise region(s)`);
      return refined;
    }

    // If Isaac couldn't find the objects, fall back to original detections
    console.log(`  Isaac couldn't locate objects, using original detections`);
    return distractions;

  } catch (error) {
    console.warn(`  Isaac refinement failed, using original detections:`, error);
    return distractions;
  }
}

/**
 * Parse Isaac's output into structured response
 */
function parseIsaacResponse(output: unknown): IsaacResponse {
  // Handle string output (may contain JSON or natural language with coordinates)
  if (typeof output === 'string') {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(output);
      return normalizeIsaacResponse(parsed);
    } catch {
      // Try to extract coordinates from natural language response
      return extractBoxesFromText(output);
    }
  }

  // Handle object output
  if (typeof output === 'object' && output !== null) {
    return normalizeIsaacResponse(output);
  }

  return { text: String(output) };
}

/**
 * Normalize various Isaac response formats
 */
function normalizeIsaacResponse(obj: unknown): IsaacResponse {
  const response: IsaacResponse = { text: '' };

  if (typeof obj !== 'object' || obj === null) {
    return response;
  }

  const record = obj as Record<string, unknown>;

  // Extract text
  if (typeof record.text === 'string') {
    response.text = record.text;
  } else if (typeof record.output === 'string') {
    response.text = record.output;
  }

  // Isaac returns structured_output as a JSON string
  if (typeof record.structured_output === 'string') {
    try {
      const parsed = JSON.parse(record.structured_output);
      if (Array.isArray(parsed)) {
        response.boxes = parsed.map(normalizeBox).filter(Boolean) as IsaacBox[];
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Extract boxes from various possible formats
  if (!response.boxes && Array.isArray(record.boxes)) {
    response.boxes = record.boxes.map(normalizeBox).filter(Boolean) as IsaacBox[];
  } else if (!response.boxes && Array.isArray(record.points)) {
    response.boxes = record.points.map(normalizeBox).filter(Boolean) as IsaacBox[];
  } else if (!response.boxes && Array.isArray(record.regions)) {
    response.boxes = record.regions.map(normalizeBox).filter(Boolean) as IsaacBox[];
  }

  return response;
}

/**
 * Normalize a single box from various formats
 */
function normalizeBox(box: unknown): IsaacBox | null {
  if (typeof box !== 'object' || box === null) {
    return null;
  }

  const record = box as Record<string, unknown>;

  // Try various coordinate formats
  let topLeft: [number, number] | null = null;
  let bottomRight: [number, number] | null = null;

  // Format 1a: top_left, bottom_right as objects {x, y}
  const tl = record.top_left as Record<string, unknown> | undefined;
  const br = record.bottom_right as Record<string, unknown> | undefined;
  if (tl && br && typeof tl.x === 'number' && typeof tl.y === 'number' &&
      typeof br.x === 'number' && typeof br.y === 'number') {
    topLeft = [tl.x, tl.y];
    bottomRight = [br.x, br.y];
  }
  // Format 1b: top_left, bottom_right as arrays
  else if (Array.isArray(record.top_left) && Array.isArray(record.bottom_right)) {
    topLeft = record.top_left as [number, number];
    bottomRight = record.bottom_right as [number, number];
  }
  // Format 2: x, y, width, height
  else if (
    typeof record.x === 'number' &&
    typeof record.y === 'number' &&
    typeof record.width === 'number' &&
    typeof record.height === 'number'
  ) {
    topLeft = [record.x, record.y];
    bottomRight = [record.x + record.width, record.y + record.height];
  }
  // Format 3: bbox array [x1, y1, x2, y2]
  else if (Array.isArray(record.bbox) && record.bbox.length === 4) {
    topLeft = [record.bbox[0], record.bbox[1]];
    bottomRight = [record.bbox[2], record.bbox[3]];
  }
  // Format 4: coordinates array [[x1, y1], [x2, y2]]
  else if (Array.isArray(record.coordinates) && record.coordinates.length === 2) {
    topLeft = record.coordinates[0] as [number, number];
    bottomRight = record.coordinates[1] as [number, number];
  }

  if (!topLeft || !bottomRight) {
    return null;
  }

  return {
    mention: String(record.mention || record.label || record.class || 'object'),
    top_left: topLeft,
    bottom_right: bottomRight,
    confidence: typeof record.confidence === 'number' ? record.confidence : undefined
  };
}

/**
 * Extract bounding boxes from natural language text
 * Isaac sometimes returns coordinates inline in text
 */
function extractBoxesFromText(text: string): IsaacResponse {
  const boxes: IsaacBox[] = [];

  // Pattern: "object at (x1, y1) to (x2, y2)" or similar
  const coordPattern = /(\w+(?:\s+\w+)?)\s+(?:at|from|located)?\s*\(?(\d+)\s*,\s*(\d+)\)?\s*(?:to|→|-)\s*\(?(\d+)\s*,\s*(\d+)\)?/gi;

  let match;
  while ((match = coordPattern.exec(text)) !== null) {
    boxes.push({
      mention: match[1],
      top_left: [parseInt(match[2]), parseInt(match[3])],
      bottom_right: [parseInt(match[4]), parseInt(match[5])]
    });
  }

  return { text, boxes: boxes.length > 0 ? boxes : undefined };
}

/**
 * Refine a full detection result
 */
export async function refineDetectionResult(
  detection: DetectionResult
): Promise<DetectionResult> {
  if (detection.distractions.length === 0) {
    return detection;
  }

  const refined = await refineWithIsaac(detection.imagePath, detection.distractions);

  return {
    ...detection,
    distractions: refined
  };
}

/**
 * Check if Isaac refinement is available
 */
export function isIsaacConfigured(): boolean {
  return !!process.env.REPLICATE_API_TOKEN;
}
