#!/usr/bin/env tsx
/**
 * Render Perspective Line Drawings
 *
 * Generates perspective line SVGs from floor plan data for ControlNet conditioning.
 * These provide correct 3D geometry for photorealistic rendering.
 *
 * Usage:
 *   pnpm render-perspective              # Generate all perspective SVGs
 *   pnpm render-perspective living       # Generate for specific room
 *   pnpm render-perspective --png        # Also convert to PNG for ControlNet
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import {
  initPerspectiveRenderer,
  createSceneFromPlan,
  renderToSvg,
  THRESHOLD_DWELLING_CAMERAS,
  svgToPng,
  type HeightConfig
} from '../src/index.js';
import { THRESHOLD_DWELLING } from '../data/threshold-dwelling.js';
import {
  THRESHOLD_DWELLING_SECTIONS,
  ROOM_SECTIONS
} from '../data/threshold-dwelling-sections.js';

const OUTPUT_DIR = path.resolve(
  process.cwd(),
  '../space/static/experiments/threshold-dwelling/perspectives'
);

// Height configuration from section data
const HEIGHTS: HeightConfig = {
  defaultCeiling: 10, // Average ceiling height
  zones: THRESHOLD_DWELLING_SECTIONS.sections[0]?.heightZones || [],
  wallThickness: 0.5
};

async function main() {
  const args = process.argv.slice(2);
  const convertToPng = args.includes('--png');
  const roomArg = args.find((a) => !a.startsWith('--'));

  console.log('Perspective Line Renderer');
  console.log('=========================');
  console.log(`Output dir: ${OUTPUT_DIR}`);
  console.log(`Convert to PNG: ${convertToPng}`);
  console.log();

  // Initialize the perspective renderer (sets up jsdom)
  console.log('Initializing Three.js renderer...');
  await initPerspectiveRenderer();

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Create 3D scene from floor plan
  console.log('Creating 3D scene from floor plan data...');
  const scene = createSceneFromPlan(THRESHOLD_DWELLING, HEIGHTS);

  // Filter rooms if specific room requested
  const rooms = roomArg
    ? THRESHOLD_DWELLING_CAMERAS.filter((r) => r.room === roomArg)
    : THRESHOLD_DWELLING_CAMERAS;

  if (roomArg && rooms.length === 0) {
    console.error(`Unknown room: ${roomArg}`);
    console.error(
      'Available rooms:',
      THRESHOLD_DWELLING_CAMERAS.map((r) => r.room).join(', ')
    );
    process.exit(1);
  }

  // Count total images
  const totalImages = rooms.reduce((sum, r) => sum + r.cameras.length, 0);
  console.log(`Generating ${totalImages} perspective views...`);
  console.log();

  let completed = 0;

  for (const room of rooms) {
    console.log(`\nRoom: ${room.room}`);

    for (const camera of room.cameras) {
      const key = `${room.room}-${camera.name}`;
      console.log(`  Rendering ${key} (fov: ${camera.fov || 60})...`);

      try {
        // Render to SVG
        const svgContent = await renderToSvg(scene, camera, {
          width: 1440,
          height: 1080,
          backgroundColor: '#ffffff'
        });

        // Save SVG
        const svgPath = path.join(OUTPUT_DIR, `${key}.svg`);
        await fs.writeFile(svgPath, svgContent);
        console.log(`    ✓ SVG: ${svgPath}`);

        // Optionally convert to PNG
        if (convertToPng) {
          const pngPath = path.join(OUTPUT_DIR, `${key}.png`);
          await svgToPng({
            svgContent,
            width: 1440,
            background: 'white',
            outputPath: pngPath
          });
          console.log(`    ✓ PNG: ${pngPath}`);
        }

        completed++;
      } catch (error) {
        console.error(`    ✗ Failed: ${key}`, error);
      }
    }
  }

  console.log('\n=========================');
  console.log(`Completed: ${completed}/${totalImages} perspective views`);

  if (!convertToPng) {
    console.log('\nTip: Use --png flag to also generate PNG files for ControlNet');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
