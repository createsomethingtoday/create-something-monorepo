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
  createRoomScene,
  renderToSvg,
  THRESHOLD_DWELLING_CAMERAS,
  ROOM_BOUNDS,
  svgToPng,
  type HeightConfig
} from '../src/index.js';
import {
  THRESHOLD_DWELLING_SECTIONS
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

  // Filter rooms if specific room requested
  // Only include rooms that have defined bounds
  const availableRooms = THRESHOLD_DWELLING_CAMERAS.filter(
    (r) => r.room in ROOM_BOUNDS
  );
  const rooms = roomArg
    ? availableRooms.filter((r) => r.room === roomArg)
    : availableRooms;

  if (roomArg && rooms.length === 0) {
    console.error(`Unknown room: ${roomArg}`);
    console.error(
      'Available rooms:',
      availableRooms.map((r) => r.room).join(', ')
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

    // Create room-specific 3D scene (focused view, not entire building)
    console.log(`  Creating 3D scene for ${room.room}...`);
    const scene = createRoomScene(room.room, HEIGHTS);

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
