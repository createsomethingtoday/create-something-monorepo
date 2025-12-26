#!/usr/bin/env tsx
/**
 * Render Threshold-Dwelling Interiors
 *
 * Demo script that renders photorealistic interiors from the
 * threshold-dwelling floor plan using ControlNet.
 *
 * Usage:
 *   REPLICATE_API_TOKEN=xxx pnpm render-threshold
 *
 * Or to render a single room:
 *   REPLICATE_API_TOKEN=xxx pnpm render-threshold living
 *
 * To just export the SVG without rendering:
 *   pnpm render-threshold --svg-only
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import {
  renderFromSvg,
  buildPrompt,
  isConfigured,
  THRESHOLD_DWELLING_ROOMS,
  generateFloorPlanSvg,
  svgToPng
} from '../src/index.js';
import { THRESHOLD_DWELLING } from '../data/threshold-dwelling.js';

// Use process.cwd() to get monorepo root (script is run from packages/render-pipeline)
const OUTPUT_DIR = path.resolve(
  process.cwd(),
  '../space/static/experiments/threshold-dwelling/renders'
);

async function main() {
  const args = process.argv.slice(2);
  const svgOnly = args.includes('--svg-only');
  const roomArg = args.find((a) => !a.startsWith('--'));

  // Generate SVG from floor plan data
  console.log('Generating floor plan SVG from data...');
  const svgContent = generateFloorPlanSvg(THRESHOLD_DWELLING);

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Save SVG for reference
  const svgPath = path.join(OUTPUT_DIR, 'floor-plan.svg');
  await fs.writeFile(svgPath, svgContent);
  console.log(`Saved floor plan SVG: ${svgPath}`);

  // Also export a PNG version
  const pngPath = path.join(OUTPUT_DIR, 'floor-plan.png');
  const pngBuffer = await svgToPng({
    svgContent,
    width: 1024,
    background: 'white',
    outputPath: pngPath
  });
  console.log(`Saved floor plan PNG: ${pngPath}`);

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

    console.log(`Rendering single room: ${room.name}`);

    for (const angle of room.angles) {
      const key = `${room.name}-${angle.suffix}`;
      const prompt = angle.promptAddition ? `${basePrompt}, ${angle.promptAddition}` : basePrompt;

      console.log(`\nRendering ${key}...`);

      const result = await renderFromSvg({
        svgContent,
        prompt,
        model: 'flux-canny-pro',
        crop: room.crop,
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
      for (const angle of room.angles) {
        const key = `${room.name}-${angle.suffix}`;
        const prompt = angle.promptAddition ? `${basePrompt}, ${angle.promptAddition}` : basePrompt;

        console.log(`\nRendering ${key} [${completed + 1}/${totalImages}]...`);

        try {
          const result = await renderFromSvg({
            svgContent,
            prompt,
            model: 'flux-canny-pro',
            crop: room.crop,
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
