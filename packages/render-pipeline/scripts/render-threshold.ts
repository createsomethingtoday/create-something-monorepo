#!/usr/bin/env tsx
/**
 * Render Threshold-Dwelling Interiors
 *
 * Renders photorealistic interiors using combined plan+section conditioning.
 * The plan provides horizontal layout; the section provides vertical context.
 *
 * Usage:
 *   REPLICATE_API_TOKEN=xxx pnpm render-threshold
 *
 * Or to render a single room:
 *   REPLICATE_API_TOKEN=xxx pnpm render-threshold living
 *
 * To just export the SVG without rendering:
 *   pnpm render-threshold --svg-only
 *
 * To skip section conditioning (plan only):
 *   REPLICATE_API_TOKEN=xxx pnpm render-threshold --plan-only
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import {
  renderFromSvg,
  buildPrompt,
  isConfigured,
  THRESHOLD_DWELLING_ROOMS,
  generateFloorPlanSvg,
  generateSectionSvg,
  svgToPng,
  svgToMonochromePng,
  compositeImages
} from '../src/index.js';
import { THRESHOLD_DWELLING } from '../data/threshold-dwelling.js';
import {
  THRESHOLD_DWELLING_SECTIONS,
  ROOM_SECTIONS
} from '../data/threshold-dwelling-sections.js';

// Use process.cwd() to get monorepo root (script is run from packages/render-pipeline)
const OUTPUT_DIR = path.resolve(
  process.cwd(),
  '../space/static/experiments/threshold-dwelling/renders'
);

const SECTIONS_DIR = path.resolve(
  process.cwd(),
  '../space/static/experiments/threshold-dwelling/sections'
);

// Maximum output dimension for high-res renders
const MAX_OUTPUT_DIM = 1440;

/**
 * Calculate output dimensions based on room aspect ratio
 * Keeps 1440 as the maximum dimension, scales the other proportionally
 */
function calculateOutputDimensions(crop: [number, number, number, number]): {
  width: number;
  height: number;
} {
  const [, , cropWidth, cropHeight] = crop;
  const aspectRatio = cropWidth / cropHeight;

  if (aspectRatio >= 1) {
    // Landscape or square: width is 1440
    return {
      width: MAX_OUTPUT_DIM,
      height: Math.round(MAX_OUTPUT_DIM / aspectRatio)
    };
  } else {
    // Portrait: height is 1440
    return {
      width: Math.round(MAX_OUTPUT_DIM * aspectRatio),
      height: MAX_OUTPUT_DIM
    };
  }
}

/**
 * Get section PNG for a room
 * Returns the most relevant section based on ROOM_SECTIONS mapping
 */
async function getSectionPng(roomName: string): Promise<Buffer | null> {
  const sectionIds = ROOM_SECTIONS[roomName];
  if (!sectionIds || sectionIds.length === 0) {
    return null;
  }

  // Use the first (primary) section for this room
  const sectionId = sectionIds[0];
  const sectionPath = path.join(SECTIONS_DIR, `section-${sectionId.toLowerCase()}.png`);

  try {
    return await fs.readFile(sectionPath);
  } catch {
    console.warn(`  Warning: Section ${sectionId} not found at ${sectionPath}`);
    return null;
  }
}

/**
 * Create composite conditioning image from plan crop and section
 */
async function createConditioningImage(
  planPng: Buffer,
  sectionPng: Buffer | null,
  width: number,
  height: number
): Promise<Buffer> {
  if (!sectionPng) {
    // No section available, use plan only
    return planPng;
  }

  // Composite: plan on top (2/3), section on bottom (1/3)
  // This gives more weight to plan while including vertical context
  const compositeHeight = Math.round(height * 1.5); // Extra height for section

  return compositeImages([planPng, sectionPng], 'vertical', width, compositeHeight);
}

async function main() {
  const args = process.argv.slice(2);
  const svgOnly = args.includes('--svg-only');
  const planOnly = args.includes('--plan-only');
  const roomArg = args.find((a) => !a.startsWith('--'));

  // Generate SVG from floor plan data
  console.log('Generating floor plan SVG from data...');
  const svgContent = generateFloorPlanSvg(THRESHOLD_DWELLING);

  // Ensure output directories exist
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(SECTIONS_DIR, { recursive: true });

  // Save SVG for reference
  const svgPath = path.join(OUTPUT_DIR, 'floor-plan.svg');
  await fs.writeFile(svgPath, svgContent);
  console.log(`Saved floor plan SVG: ${svgPath}`);

  // Also export a PNG version
  const pngPath = path.join(OUTPUT_DIR, 'floor-plan.png');
  await svgToPng({
    svgContent,
    width: 1024,
    background: 'white',
    outputPath: pngPath
  });
  console.log(`Saved floor plan PNG: ${pngPath}`);

  // Generate section SVGs and PNGs
  console.log('\nGenerating section SVGs...');
  for (const section of THRESHOLD_DWELLING_SECTIONS.sections) {
    const sectionSvg = generateSectionSvg(THRESHOLD_DWELLING_SECTIONS, section.id);
    const sectionSvgPath = path.join(SECTIONS_DIR, `section-${section.id.toLowerCase()}.svg`);
    await fs.writeFile(sectionSvgPath, sectionSvg);

    const sectionPngPath = path.join(SECTIONS_DIR, `section-${section.id.toLowerCase()}.png`);
    await svgToPng({
      svgContent: sectionSvg,
      width: 1440,
      background: 'white',
      outputPath: sectionPngPath
    });
    console.log(`  ✓ Section ${section.id}`);
  }

  if (svgOnly) {
    console.log('\n--svg-only flag set, skipping rendering.');
    return;
  }

  // Check Replicate configuration
  if (!isConfigured()) {
    console.error('\nError: REPLICATE_API_TOKEN environment variable not set.');
    console.error('Get your token at https://replicate.com/account/api-tokens');
    console.error('\nTo just export SVG/PNG without rendering, use: pnpm render-threshold --svg-only');
    process.exit(1);
  }

  // Build base prompt with threshold-dwelling materials
  const basePrompt = buildPrompt({
    materials: 'threshold-dwelling',
    lighting: 'golden-hour',
    additionalDetails: 'Texas prairie landscape visible through windows'
  });

  console.log('\nThreshold-Dwelling Render Pipeline');
  console.log('===================================');
  console.log(`Output dir: ${OUTPUT_DIR}`);
  console.log(`Conditioning: ${planOnly ? 'Plan only' : 'Plan + Section (combined)'}`);
  console.log(`Base prompt: ${basePrompt.slice(0, 100)}...`);
  console.log();

  if (roomArg) {
    // Render single room
    const room = THRESHOLD_DWELLING_ROOMS.find((r) => r.name === roomArg);
    if (!room) {
      console.error(`Unknown room: ${roomArg}`);
      console.error('Available rooms:', THRESHOLD_DWELLING_ROOMS.map((r) => r.name).join(', '));
      process.exit(1);
    }

    const { width, height } = calculateOutputDimensions(room.crop);
    const sectionPng = planOnly ? null : await getSectionPng(room.name);
    console.log(
      `Rendering single room: ${room.name} (${width}x${height})${sectionPng ? ' with section' : ''}`
    );

    for (const angle of room.angles) {
      const key = `${room.name}-${angle.suffix}`;
      const prompt = angle.promptAddition ? `${basePrompt}, ${angle.promptAddition}` : basePrompt;

      console.log(`\nRendering ${key}...`);

      // Generate plan crop PNG
      const planPng = await svgToMonochromePng({
        svgContent,
        crop: room.crop,
        width: width,
        background: 'white'
      });

      // Create conditioning image (plan + section if available)
      const conditioningPng = await createConditioningImage(planPng, sectionPng, width, height);

      // Save conditioning image for debugging
      const conditioningPath = path.join(OUTPUT_DIR, `${key}-conditioning.png`);
      await fs.writeFile(conditioningPath, conditioningPng);

      const result = await renderFromSvg({
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,${conditioningPng.toString('base64')}" width="${width}" height="${height}"/></svg>`,
        prompt,
        model: 'flux-canny-pro',
        outputWidth: width,
        outputHeight: height,
        outputPath: path.join(OUTPUT_DIR, `${key}.jpg`)
      });

      console.log(`  ✓ Saved (${result.duration}ms)`);
    }
  } else {
    // Render all rooms
    console.log(`Rendering all ${THRESHOLD_DWELLING_ROOMS.length} rooms...`);
    const totalImages = THRESHOLD_DWELLING_ROOMS.reduce((sum, r) => sum + r.angles.length, 0);
    console.log(`Total images: ${totalImages}`);

    let completed = 0;
    let totalDuration = 0;

    for (const room of THRESHOLD_DWELLING_ROOMS) {
      const { width, height } = calculateOutputDimensions(room.crop);
      const sectionPng = planOnly ? null : await getSectionPng(room.name);

      // Generate plan crop PNG once per room
      const planPng = await svgToMonochromePng({
        svgContent,
        crop: room.crop,
        width: width,
        background: 'white'
      });

      // Create conditioning image (plan + section if available)
      const conditioningPng = await createConditioningImage(planPng, sectionPng, width, height);

      for (const angle of room.angles) {
        const key = `${room.name}-${angle.suffix}`;
        const prompt = angle.promptAddition ? `${basePrompt}, ${angle.promptAddition}` : basePrompt;

        console.log(
          `\nRendering ${key} [${completed + 1}/${totalImages}] (${width}x${height})${sectionPng ? ' +section' : ''}...`
        );

        try {
          // Create inline SVG with conditioning image
          const conditioningSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <image href="data:image/png;base64,${conditioningPng.toString('base64')}" width="${width}" height="${height}"/>
          </svg>`;

          const result = await renderFromSvg({
            svgContent: conditioningSvg,
            prompt,
            model: 'flux-canny-pro',
            outputWidth: width,
            outputHeight: height,
            outputPath: path.join(OUTPUT_DIR, `${key}.jpg`)
          });

          completed++;
          totalDuration += result.duration;
          console.log(`  ✓ Saved (${result.duration}ms)`);
        } catch (error) {
          console.error(`  ✗ Failed: ${key}`, error);
        }
      }
    }

    console.log('\n===================================');
    console.log(`Completed: ${completed}/${totalImages} images`);
    console.log(`Total time: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`Avg per image: ${(totalDuration / completed / 1000).toFixed(1)}s`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
