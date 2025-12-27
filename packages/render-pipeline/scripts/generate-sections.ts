#!/usr/bin/env tsx
/**
 * Generate Section SVGs for Threshold-Dwelling
 *
 * Exports architectural section drawings for ControlNet conditioning.
 * These reveal vertical relationships that floor plans cannot show.
 *
 * Usage:
 *   pnpm generate-sections
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { generateSectionSvg, svgToPng } from '../src/index.js';
import { THRESHOLD_DWELLING_SECTIONS } from '../data/threshold-dwelling-sections.js';

const OUTPUT_DIR = path.resolve(
  process.cwd(),
  '../space/static/experiments/threshold-dwelling/sections'
);

async function main() {
  console.log('Generating Section SVGs for Threshold-Dwelling');
  console.log('==============================================\n');

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const sectionData = THRESHOLD_DWELLING_SECTIONS;

  for (const section of sectionData.sections) {
    console.log(`Generating Section ${section.id}...`);

    // Generate SVG
    const svgContent = generateSectionSvg(sectionData, section.id, {
      canon: false, // White background for ControlNet
      showDimensions: true,
      showHatching: false
    });

    // Save SVG
    const svgPath = path.join(OUTPUT_DIR, `section-${section.id.toLowerCase()}.svg`);
    await fs.writeFile(svgPath, svgContent);
    console.log(`  ✓ SVG: ${svgPath}`);

    // Convert to PNG for ControlNet
    const pngPath = path.join(OUTPUT_DIR, `section-${section.id.toLowerCase()}.png`);
    await svgToPng({
      svgContent,
      width: 1440,
      background: 'white',
      outputPath: pngPath
    });
    console.log(`  ✓ PNG: ${pngPath}`);

    // Also generate Canon version (for documentation)
    const canonSvg = generateSectionSvg(sectionData, section.id, {
      canon: true,
      showDimensions: true
    });
    const canonPath = path.join(OUTPUT_DIR, `section-${section.id.toLowerCase()}-canon.svg`);
    await fs.writeFile(canonPath, canonSvg);
    console.log(`  ✓ Canon: ${canonPath}`);
  }

  console.log('\n==============================================');
  console.log(`Generated ${sectionData.sections.length} sections`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
