/**
 * Photo Cleanup Pipeline
 * Orchestrates detection, mask generation, and inpainting
 *
 * Detection is performed by Claude Code agents using vision capabilities.
 * This module handles mask generation and Replicate inpainting.
 */

import * as path from 'path';
import { generateMask, createDebugVisualization } from './mask.js';
import { inpaint, isConfigured as isReplicateConfigured } from './inpaint.js';
import { parseDetectionResults, DETECTION_PROMPT } from './detect.js';
import type { Distraction, DetectionResult, BatchDetectionResult } from './detect.js';
import type { InpaintModel, InpaintResult } from './inpaint.js';

// Re-export types and utilities
export type { Distraction, DetectionResult, BatchDetectionResult } from './detect.js';
export type { InpaintModel, InpaintResult } from './inpaint.js';
export { parseDetectionResults, DETECTION_PROMPT, isValidDistraction } from './detect.js';
export { generateMask, createDebugVisualization } from './mask.js';
export { inpaint } from './inpaint.js';

/**
 * Options for the cleanup pipeline
 */
export interface CleanupOptions {
  /** Inpainting model to use (default: 'lama') */
  model?: InpaintModel;
  /** Save intermediate mask files */
  saveMasks?: boolean;
  /** Save debug visualizations showing detected regions */
  saveDebug?: boolean;
  /** Output directory (default: same as input) */
  outputDir?: string;
  /** Suffix for cleaned files (default: '-cleaned') */
  suffix?: string;
  /** Dry run - detect only, no inpainting */
  dryRun?: boolean;
}

/**
 * Result from cleaning a single image
 */
export interface CleanupResult {
  /** Original image path */
  inputPath: string;
  /** Cleaned image path (if not dry run) */
  outputPath?: string;
  /** Detected distractions */
  distractions: Distraction[];
  /** Whether inpainting was performed */
  inpainted: boolean;
  /** Total time in milliseconds */
  duration: number;
  /** Error if failed */
  error?: string;
}

/**
 * Summary of batch cleanup operation
 */
export interface CleanupSummary {
  /** Total images processed */
  total: number;
  /** Images with distractions found */
  withDistractions: number;
  /** Images successfully cleaned */
  cleaned: number;
  /** Images that failed */
  failed: number;
  /** Images that were already clean */
  alreadyClean: number;
  /** Individual results */
  results: CleanupResult[];
  /** Total time in milliseconds */
  duration: number;
}

/**
 * Check if Replicate is configured for inpainting
 */
export function checkConfiguration(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!isReplicateConfigured()) {
    missing.push('REPLICATE_API_TOKEN');
  }

  return {
    configured: missing.length === 0,
    missing
  };
}

/**
 * Process a single photo with pre-computed detection results
 *
 * Detection is performed by Claude Code agents before calling this function.
 *
 * @param detection - Detection result from Claude Code agent
 * @param options - Cleanup options
 */
export async function processWithDetection(
  detection: DetectionResult,
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const startTime = Date.now();
  const {
    model = 'lama',
    saveMasks = false,
    saveDebug = false,
    outputDir,
    suffix = '-cleaned',
    dryRun = false
  } = options;

  const imagePath = detection.imagePath;
  const inputDir = path.dirname(imagePath);
  const inputBase = path.basename(imagePath, path.extname(imagePath));
  const inputExt = path.extname(imagePath);
  const outDir = outputDir || inputDir;

  try {
    // Save debug visualization if requested
    if (saveDebug && detection.distractions.length > 0) {
      const debugPath = path.join(outDir, `${inputBase}-debug${inputExt}`);
      await createDebugVisualization(imagePath, detection.distractions, debugPath);
    }

    // If no distractions or dry run, we're done
    if (detection.distractions.length === 0 || dryRun) {
      return {
        inputPath: imagePath,
        distractions: detection.distractions,
        inpainted: false,
        duration: Date.now() - startTime
      };
    }

    // Stage 1: Generate mask
    const maskPath = saveMasks
      ? path.join(outDir, `${inputBase}-mask.png`)
      : undefined;

    const mask = await generateMask(imagePath, detection.distractions, {
      outputPath: maskPath
    });

    // Stage 2: Inpaint
    const outputPath = path.join(outDir, `${inputBase}${suffix}.png`);
    await inpaint(imagePath, mask, {
      model,
      outputPath
    });

    return {
      inputPath: imagePath,
      outputPath,
      distractions: detection.distractions,
      inpainted: true,
      duration: Date.now() - startTime
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`  Error: ${error}`);

    return {
      inputPath: imagePath,
      distractions: detection.distractions,
      inpainted: false,
      duration: Date.now() - startTime,
      error
    };
  }
}

/**
 * Process multiple photos with pre-computed detection results
 *
 * Detection is performed by Claude Code agents before calling this function.
 *
 * @param detections - Batch detection results from Claude Code agents
 * @param options - Cleanup options
 */
export async function processBatchWithDetections(
  detections: BatchDetectionResult,
  options: CleanupOptions = {}
): Promise<CleanupSummary> {
  const startTime = Date.now();
  const results: CleanupResult[] = [];

  let withDistractions = 0;
  let cleaned = 0;
  let failed = 0;
  let alreadyClean = 0;

  console.log(`\nProcessing ${detections.results.length} image(s)...\n`);

  for (let i = 0; i < detections.results.length; i++) {
    const detection = detections.results[i];
    console.log(`[${i + 1}/${detections.results.length}] ${path.basename(detection.imagePath)}`);

    if (detection.distractions.length > 0) {
      console.log(`  Found: ${detection.distractions.map(d => d.label).join(', ')}`);
    } else {
      console.log(`  Clean - no distractions found`);
    }

    const result = await processWithDetection(detection, options);
    results.push(result);

    if (result.error) {
      failed++;
    } else if (result.distractions.length === 0) {
      alreadyClean++;
    } else {
      withDistractions++;
      if (result.inpainted) {
        cleaned++;
      }
    }

    console.log('');
  }

  return {
    total: detections.results.length,
    withDistractions,
    cleaned,
    failed,
    alreadyClean,
    results,
    duration: Date.now() - startTime
  };
}

/**
 * Print cleanup summary to console
 */
export function printSummary(summary: CleanupSummary): void {
  console.log('='.repeat(50));
  console.log('CLEANUP SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total images:      ${summary.total}`);
  console.log(`Already clean:     ${summary.alreadyClean}`);
  console.log(`With distractions: ${summary.withDistractions}`);
  console.log(`Cleaned:           ${summary.cleaned}`);
  console.log(`Failed:            ${summary.failed}`);
  console.log(`Total time:        ${(summary.duration / 1000).toFixed(1)}s`);
  console.log('='.repeat(50));

  if (summary.failed > 0) {
    console.log('\nFailed images:');
    for (const result of summary.results) {
      if (result.error) {
        console.log(`  - ${path.basename(result.inputPath)}: ${result.error}`);
      }
    }
  }

  // Show what was removed
  const allDistractions = summary.results.flatMap(r => r.distractions);
  if (allDistractions.length > 0) {
    const counts = new Map<string, number>();
    for (const d of allDistractions) {
      counts.set(d.label, (counts.get(d.label) || 0) + 1);
    }

    console.log('\nDistractions removed:');
    for (const [label, count] of counts.entries()) {
      console.log(`  - ${label}: ${count}`);
    }
  }
}
