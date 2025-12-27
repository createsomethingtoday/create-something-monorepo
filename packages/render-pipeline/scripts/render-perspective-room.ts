#!/usr/bin/env tsx
/**
 * Render Room with Perspective Conditioning
 *
 * Uses pre-generated perspective line PNGs as ControlNet conditioning
 * for photorealistic interior rendering.
 *
 * Usage:
 *   REPLICATE_API_TOKEN=xxx pnpm render-perspective-room living
 *   REPLICATE_API_TOKEN=xxx pnpm render-perspective-room --all
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import {
  render,
  buildPrompt,
  isConfigured,
  THRESHOLD_DWELLING_CAMERAS
} from '../src/index.js';

const PERSPECTIVES_DIR = path.resolve(
  process.cwd(),
  '../space/static/experiments/threshold-dwelling/perspectives'
);

const RENDERS_DIR = path.resolve(
  process.cwd(),
  '../space/static/experiments/threshold-dwelling/renders'
);

async function main() {
  const args = process.argv.slice(2);
  const renderAll = args.includes('--all');
  const roomArg = args.find((a) => !a.startsWith('--'));

  if (!isConfigured()) {
    console.error('Error: REPLICATE_API_TOKEN environment variable not set.');
    console.error('Get your token at https://replicate.com/account/api-tokens');
    process.exit(1);
  }

  // Build base prompt with threshold-dwelling materials
  const basePrompt = buildPrompt({
    materials: 'threshold-dwelling',
    lighting: 'golden-hour',
    additionalDetails: 'Texas prairie landscape visible through windows, photorealistic interior'
  });

  console.log('Perspective-Conditioned Render Pipeline');
  console.log('=======================================');
  console.log(`Perspectives dir: ${PERSPECTIVES_DIR}`);
  console.log(`Output dir: ${RENDERS_DIR}`);
  console.log(`Base prompt: ${basePrompt.slice(0, 80)}...`);
  console.log();

  // Ensure output directory exists
  await fs.mkdir(RENDERS_DIR, { recursive: true });

  // Filter rooms
  const rooms = renderAll
    ? THRESHOLD_DWELLING_CAMERAS
    : roomArg
      ? THRESHOLD_DWELLING_CAMERAS.filter((r) => r.room === roomArg)
      : [];

  if (!renderAll && rooms.length === 0) {
    console.error(`Usage: pnpm render-perspective-room <room> or --all`);
    console.error('Available rooms:', THRESHOLD_DWELLING_CAMERAS.map((r) => r.room).join(', '));
    process.exit(1);
  }

  // Count total images
  const totalImages = rooms.reduce((sum, r) => sum + r.cameras.length, 0);
  console.log(`Rendering ${totalImages} images...`);
  console.log();

  let completed = 0;
  let totalDuration = 0;

  for (const room of rooms) {
    console.log(`\nRoom: ${room.room}`);

    for (const camera of room.cameras) {
      const key = `${room.room}-${camera.name}`;
      const perspectivePath = path.join(PERSPECTIVES_DIR, `${key}.png`);
      const outputPath = path.join(RENDERS_DIR, `${key}-perspective.jpg`);

      // Check if perspective PNG exists
      try {
        await fs.access(perspectivePath);
      } catch {
        console.log(`  Skipping ${key}: perspective PNG not found`);
        continue;
      }

      // Build prompt with camera description
      const prompt = camera.description
        ? `${basePrompt}, ${camera.description}`
        : basePrompt;

      console.log(`  Rendering ${key}...`);
      console.log(`    Conditioning: ${perspectivePath}`);
      console.log(`    Prompt: ${prompt.slice(0, 60)}...`);

      try {
        // Read perspective PNG
        const conditioningImage = await fs.readFile(perspectivePath);

        // Render with ControlNet
        const result = await render({
          image: conditioningImage,
          prompt,
          model: 'flux-canny-pro',
          conditioningScale: 0.85, // Slightly lower to allow more creative interpretation
          outputWidth: 1440,
          outputHeight: 1080,
          outputPath
        });

        completed++;
        totalDuration += result.duration;
        console.log(`    ✓ Saved: ${outputPath} (${result.duration}ms)`);
      } catch (error) {
        console.error(`    ✗ Failed: ${key}`, error);
      }
    }
  }

  console.log('\n=======================================');
  console.log(`Completed: ${completed}/${totalImages} images`);
  if (completed > 0) {
    console.log(`Total time: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`Avg per image: ${(totalDuration / completed / 1000).toFixed(1)}s`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
