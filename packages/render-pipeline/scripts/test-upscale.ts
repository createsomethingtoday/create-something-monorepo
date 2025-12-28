#!/usr/bin/env tsx
/**
 * Test upscale module
 */

import { upscale } from '../src/cleanup/upscale.js';

const testImage = process.argv[2] || '/Users/micahjohnson/Desktop/Christmas 2025/DSC05563-cs-rawdenoise-color-lighting-crop-cleaned.png';

console.log(`Testing upscale on: ${testImage}`);

upscale(testImage, { scale: 2, faceEnhance: true })
  .then(path => console.log('Done:', path))
  .catch(err => console.error('Error:', err));
