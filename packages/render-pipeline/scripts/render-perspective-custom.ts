#!/usr/bin/env tsx
/**
 * Render Perspectives with Custom Projection System
 *
 * Uses pure math perspective projection - no Three.js.
 * Every calculation is explicit and auditable.
 *
 * Usage:
 *   pnpm render-custom              # Generate all perspectives
 *   pnpm render-custom living       # Generate for specific room
 *   pnpm render-custom --debug      # Show camera debug info
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import {
  generateRoom,
  renderToSvg,
  CAMERA_PRESETS,
  ROOM_CONFIGS,
  debugCamera,
  type Camera,
  type ProjectionConfig
} from '../src/perspective-projection.js';
import { svgToPng } from '../src/svg-to-png.js';

const OUTPUT_DIR = path.resolve(
  process.cwd(),
  '../space/static/experiments/threshold-dwelling/perspectives'
);

const RENDER_CONFIG: ProjectionConfig = {
  width: 1440,
  height: 1080,
  near: 0.5,
  far: 200
};

async function main() {
  const args = process.argv.slice(2);
  const debug = args.includes('--debug');
  const roomArg = args.find((a) => !a.startsWith('--'));

  console.log('Custom Perspective Projection');
  console.log('=============================');
  console.log('Pure math - no Three.js, no hidden matrices');
  console.log(`Output dir: ${OUTPUT_DIR}`);
  console.log();

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Filter rooms if specific room requested
  const availableRooms = CAMERA_PRESETS.filter((r) => r.room in ROOM_CONFIGS);
  const rooms = roomArg
    ? availableRooms.filter((r) => r.room === roomArg)
    : availableRooms;

  if (roomArg && rooms.length === 0) {
    console.error(`Unknown room: ${roomArg}`);
    console.error('Available rooms:', Object.keys(ROOM_CONFIGS).join(', '));
    process.exit(1);
  }

  // Count total images
  const totalImages = rooms.reduce((sum, r) => sum + r.cameras.length, 0);
  console.log(`Generating ${totalImages} perspective views...`);
  console.log();

  let completed = 0;

  for (const room of rooms) {
    console.log(`\nRoom: ${room.room}`);

    // Generate room geometry
    const roomConfig = ROOM_CONFIGS[room.room];
    console.log(`  Bounds: X[${roomConfig.minX}-${roomConfig.maxX}], Z[${roomConfig.minZ}-${roomConfig.maxZ}], ceiling: ${roomConfig.ceilingHeight}ft`);
    console.log(`  Glass wall south: ${roomConfig.glassWallSouth}`);

    const geometry = generateRoom(room.room);
    console.log(`  Edges: ${geometry.edges.length}`);

    for (const preset of room.cameras) {
      const key = `${room.room}-${preset.name}`;
      console.log(`\n  Camera: ${preset.name}`);
      console.log(`    Position: [${preset.position.join(', ')}] (feet)`);
      console.log(`    Target:   [${preset.position.join(', ')}] (feet)`);
      console.log(`    FOV:      ${preset.fov}°`);

      const camera: Camera = {
        position: preset.position,
        target: preset.target,
        fov: preset.fov
      };

      if (debug) {
        debugCamera(camera);
      }

      try {
        // Render to SVG
        const svgContent = renderToSvg(geometry, camera, RENDER_CONFIG);

        // Save SVG
        const svgPath = path.join(OUTPUT_DIR, `${key}.svg`);
        await fs.writeFile(svgPath, svgContent);
        console.log(`    ✓ SVG: ${svgPath}`);

        // Convert to PNG for ControlNet
        const pngPath = path.join(OUTPUT_DIR, `${key}.png`);
        await svgToPng({
          svgContent,
          width: RENDER_CONFIG.width,
          background: 'white',
          outputPath: pngPath
        });
        console.log(`    ✓ PNG: ${pngPath}`);

        completed++;
      } catch (error) {
        console.error(`    ✗ Failed: ${key}`, error);
      }
    }
  }

  console.log('\n=============================');
  console.log(`Completed: ${completed}/${totalImages} perspective views`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
