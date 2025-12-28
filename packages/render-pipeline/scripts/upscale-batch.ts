#!/usr/bin/env tsx
/**
 * Batch upscale cleaned images
 */

import { upscaleBatch } from '../src/cleanup/upscale.js';
import * as fs from 'fs/promises';
import * as path from 'path';

async function main() {
  const dir = process.argv[2] || '/Users/micahjohnson/Desktop/Christmas 2025';

  // Find all *-cleaned.png files
  const files = await fs.readdir(dir);
  const cleanedFiles = files
    .filter(f => f.endsWith('-cleaned.png'))
    .map(f => path.join(dir, f));

  console.log(`Found ${cleanedFiles.length} cleaned images to upscale\n`);

  if (cleanedFiles.length === 0) {
    console.log('No cleaned images found.');
    return;
  }

  const results = await upscaleBatch(cleanedFiles, {
    scale: 2,
    faceEnhance: true
  });

  console.log(`\nUpscaled ${results.length} images`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
