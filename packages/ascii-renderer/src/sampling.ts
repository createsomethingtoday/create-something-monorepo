/**
 * Image Sampling for ASCII Rendering
 *
 * Samples images using 6 sampling circles to generate shape vectors
 * that can be matched against pre-computed character shapes.
 */

import type {
  ShapeVector,
  ExternalVector,
  ImageSource,
  SamplingCircle,
} from './types.js';
import {
  SAMPLING_CIRCLES,
  EXTERNAL_SAMPLING_CIRCLES,
} from './shape-vectors.js';

/**
 * Generate sample points within a circle using a spiral pattern.
 * More efficient than random sampling, provides good coverage.
 */
function generateSamplePoints(
  cx: number,
  cy: number,
  radius: number,
  count: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  // Golden angle for spiral distribution
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    // Sunflower spiral pattern
    const r = radius * Math.sqrt((i + 0.5) / count);
    const theta = i * goldenAngle;

    points.push({
      x: cx + r * Math.cos(theta),
      y: cy + r * Math.sin(theta),
    });
  }

  return points;
}

/**
 * Sample a single circle from an image source.
 * Returns average lightness within the circle.
 */
function sampleCircle(
  source: ImageSource,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number,
  circle: SamplingCircle,
  samplesPerCircle: number
): number {
  // Convert relative circle position to absolute coordinates
  const cx = cellX + circle.cx * cellWidth;
  const cy = cellY + circle.cy * cellHeight;
  const radius = circle.radius * Math.min(cellWidth, cellHeight);

  // Generate sample points
  const points = generateSamplePoints(cx, cy, radius, samplesPerCircle);

  // Sample and average
  let sum = 0;
  let validSamples = 0;

  for (const { x, y } of points) {
    // Clamp to image bounds
    const px = Math.max(0, Math.min(source.width - 1, Math.round(x)));
    const py = Math.max(0, Math.min(source.height - 1, Math.round(y)));

    sum += source.getLightness(px, py);
    validSamples++;
  }

  return validSamples > 0 ? sum / validSamples : 0;
}

/**
 * Sample a cell to generate its 6D shape vector.
 */
export function sampleCellShapeVector(
  source: ImageSource,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number,
  samplesPerCircle: number = 12
): ShapeVector {
  const vector: ShapeVector = [0, 0, 0, 0, 0, 0];

  for (let i = 0; i < 6; i++) {
    vector[i] = sampleCircle(
      source,
      cellX,
      cellY,
      cellWidth,
      cellHeight,
      SAMPLING_CIRCLES[i],
      samplesPerCircle
    );
  }

  return vector;
}

/**
 * Sample external circles around a cell for directional contrast enhancement.
 */
export function sampleExternalVector(
  source: ImageSource,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number,
  samplesPerCircle: number = 8
): ExternalVector {
  const vector: ExternalVector = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  for (let i = 0; i < 10; i++) {
    vector[i] = sampleCircle(
      source,
      cellX,
      cellY,
      cellWidth,
      cellHeight,
      EXTERNAL_SAMPLING_CIRCLES[i],
      samplesPerCircle
    );
  }

  return vector;
}

/**
 * Create an ImageSource from ImageData (browser canvas)
 */
export function imageDataSource(imageData: ImageData): ImageSource {
  const { data, width, height } = imageData;

  return {
    width,
    height,
    getLightness(x: number, y: number): number {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Relative luminance formula
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    },
  };
}

/**
 * Create an ImageSource from a raw pixel buffer (Node.js)
 */
export function bufferSource(
  buffer: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  channels: 1 | 3 | 4 = 4
): ImageSource {
  return {
    width,
    height,
    getLightness(x: number, y: number): number {
      const idx = (y * width + x) * channels;

      if (channels === 1) {
        // Grayscale
        return buffer[idx] / 255;
      }

      const r = buffer[idx];
      const g = buffer[idx + 1];
      const b = buffer[idx + 2];
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    },
  };
}

/**
 * Create an ImageSource from a grayscale function.
 * Useful for procedural/generated content.
 */
export function functionSource(
  width: number,
  height: number,
  fn: (x: number, y: number) => number
): ImageSource {
  return {
    width,
    height,
    getLightness: fn,
  };
}

/**
 * Sample an entire image grid and return all shape vectors.
 */
export function sampleImageGrid(
  source: ImageSource,
  cols: number,
  rows: number,
  samplesPerCircle: number = 12
): ShapeVector[][] {
  const cellWidth = source.width / cols;
  const cellHeight = source.height / rows;

  const result: ShapeVector[][] = [];

  for (let row = 0; row < rows; row++) {
    const rowVectors: ShapeVector[] = [];

    for (let col = 0; col < cols; col++) {
      const cellX = col * cellWidth;
      const cellY = row * cellHeight;

      rowVectors.push(
        sampleCellShapeVector(
          source,
          cellX,
          cellY,
          cellWidth,
          cellHeight,
          samplesPerCircle
        )
      );
    }

    result.push(rowVectors);
  }

  return result;
}

/**
 * Sample external vectors for all cells (for contrast enhancement).
 */
export function sampleExternalGrid(
  source: ImageSource,
  cols: number,
  rows: number,
  samplesPerCircle: number = 8
): ExternalVector[][] {
  const cellWidth = source.width / cols;
  const cellHeight = source.height / rows;

  const result: ExternalVector[][] = [];

  for (let row = 0; row < rows; row++) {
    const rowVectors: ExternalVector[] = [];

    for (let col = 0; col < cols; col++) {
      const cellX = col * cellWidth;
      const cellY = row * cellHeight;

      rowVectors.push(
        sampleExternalVector(
          source,
          cellX,
          cellY,
          cellWidth,
          cellHeight,
          samplesPerCircle
        )
      );
    }

    result.push(rowVectors);
  }

  return result;
}
