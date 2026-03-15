/**
 * Doc Generator Pipeline
 * Orchestrates screenshot analysis, image processing, and documentation generation
 *
 * Flow: Screenshots → Claude (analyze UI) → Sharp (crop/highlight) → Markdown + Images
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import type {
  DocGenOptions,
  DocGenResult,
  ScreenshotAnalysis,
  ProcessedScreenshot,
  GeneratedImage,
  BatchAnalysis,
} from './types.js';
import { cropPrimaryElements, copyScreenshot } from './crop.js';
import { highlightScreenshot } from './highlight.js';
import { writeDocumentation } from './generate.js';

// Re-export types and utilities
export * from './types.js';
export * from './crop.js';
export * from './highlight.js';
export * from './generate.js';

/**
 * Process a single screenshot with its analysis
 */
export async function processScreenshot(
  analysis: ScreenshotAnalysis,
  options: DocGenOptions
): Promise<ProcessedScreenshot> {
  const outputDir = options.outputDir || './docs';
  const imagesDir = path.join(outputDir, 'images');

  const images: GeneratedImage[] = [];

  // 1. Copy full screenshot with numbered name
  const fullImage = await copyScreenshot(analysis.imagePath, imagesDir, analysis.userFlowStep);
  images.push(fullImage);

  // 2. Generate annotated version with highlights
  if (analysis.elements.length > 0) {
    try {
      const annotated = await highlightScreenshot(analysis.imagePath, analysis.elements, {
        outputDir: imagesDir,
        showLabels: true,
      });
      images.push(annotated);
    } catch (error) {
      console.warn(`Warning: Could not create annotated image for ${analysis.imagePath}:`, error);
    }
  }

  // 3. Generate cropped images for primary elements
  if (!options.skipCrops) {
    const crops = await cropPrimaryElements(analysis.imagePath, analysis.elements, {
      outputDir: imagesDir,
      padding: 0.15,
      minWidth: 100,
      maxWidth: 600,
    });
    images.push(...crops);
  }

  return {
    analysis,
    images,
  };
}

/**
 * Process multiple screenshots from batch analysis
 */
export async function processScreenshots(
  analyses: ScreenshotAnalysis[],
  options: DocGenOptions
): Promise<ProcessedScreenshot[]> {
  const results: ProcessedScreenshot[] = [];

  // Sort by user flow step
  const sorted = [...analyses].sort((a, b) => a.userFlowStep - b.userFlowStep);

  for (const analysis of sorted) {
    const result = await processScreenshot(analysis, options);
    results.push(result);
  }

  return results;
}

/**
 * Generate documentation from pre-analyzed screenshots
 *
 * Use this when you have already analyzed screenshots with Claude
 * and have ScreenshotAnalysis objects ready.
 */
export async function generateDocs(
  batchAnalysis: BatchAnalysis,
  options: DocGenOptions
): Promise<DocGenResult> {
  const startTime = Date.now();
  const { title, screenshots } = batchAnalysis;

  // Process all screenshots
  const processedScreenshots = await processScreenshots(screenshots, options);

  // Generate documentation files
  const { markdownPath, htmlPath } = await writeDocumentation(
    title,
    processedScreenshots,
    options
  );

  // Count total images
  const imageCount = processedScreenshots.reduce((sum, s) => sum + s.images.length, 0);

  return {
    title,
    markdownPath,
    htmlPath,
    screenshots: processedScreenshots,
    imageCount,
    duration: Date.now() - startTime,
  };
}

/**
 * Validate that screenshot files exist
 */
export async function validateScreenshots(paths: string[]): Promise<string[]> {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const p of paths) {
    try {
      await fs.access(p);
      valid.push(p);
    } catch {
      invalid.push(p);
    }
  }

  if (invalid.length > 0) {
    console.warn(`Warning: ${invalid.length} screenshot(s) not found:`, invalid);
  }

  return valid;
}

/**
 * Get all image files from a directory
 */
export async function getScreenshotsFromDirectory(dir: string): Promise<string[]> {
  const files = await fs.readdir(dir);
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

  return files
    .filter((f) => imageExtensions.includes(path.extname(f).toLowerCase()))
    .map((f) => path.join(dir, f))
    .sort();
}

/**
 * Example usage for manual documentation generation:
 *
 * ```typescript
 * import { generateDocs } from './docs';
 *
 * // After analyzing screenshots with Claude, you have:
 * const batchAnalysis = {
 *   title: "Admin Guide",
 *   screenshots: [
 *     {
 *       imagePath: "/path/to/screenshot.png",
 *       pageTitle: "Dashboard",
 *       description: "Main dashboard view",
 *       userFlowStep: 1,
 *       elements: [
 *         {
 *           x: 0.1, y: 0.2, width: 0.3, height: 0.1,
 *           label: "Connect Button",
 *           description: "Click to connect service",
 *           importance: "primary",
 *           action: "Click to begin setup"
 *         }
 *       ],
 *       nextAction: "Connect your accounts"
 *     }
 *   ]
 * };
 *
 * const result = await generateDocs(batchAnalysis, {
 *   title: "Admin Guide",
 *   outputDir: "./docs",
 *   animate: true
 * });
 *
 * console.log(`Generated ${result.imageCount} images in ${result.duration}ms`);
 * ```
 */
