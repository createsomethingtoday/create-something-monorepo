#!/usr/bin/env npx tsx
/**
 * Glass Cube Generation Script
 *
 * Generates a 3D glass cube asset through the full pipeline:
 * Text → Image → 3D → Optimized GLB
 *
 * Usage:
 *   pnpm --filter=render-pipeline glass-cube
 *   pnpm --filter=render-pipeline glass-cube --variant=dark
 *   pnpm --filter=render-pipeline glass-cube --output=./custom-output
 *
 * Environment:
 *   REPLICATE_API_TOKEN - Required for image and mesh generation
 *   MESHY_API_KEY - Optional, for Meshy provider
 */

import { generateGlassCube } from '../src/glass-cube/pipeline.js';
import type { ReferenceVariant } from '../src/glass-cube/generate-reference.js';
import type { MeshProvider } from '../src/glass-cube/image-to-3d.js';

// Parse CLI arguments
const args = process.argv.slice(2);

function getArg(name: string, defaultValue: string): string {
	const arg = args.find((a) => a.startsWith(`--${name}=`));
	return arg ? arg.split('=')[1] : defaultValue;
}

function hasFlag(name: string): boolean {
	return args.includes(`--${name}`);
}

// Configuration
const variant = getArg('variant', 'hero') as ReferenceVariant;
const provider = getArg('provider', 'replicate-trellis') as MeshProvider;
const outputDir = getArg('output', './output/glass-cube');
const outputName = getArg('name', 'glass-cube');
const keepIntermediate = hasFlag('keep');

// Help
if (hasFlag('help') || hasFlag('h')) {
	console.log(`
Glass Cube Generation Pipeline

Usage:
  pnpm --filter=render-pipeline glass-cube [options]

Options:
  --variant=<type>     Reference image variant (hero|dark|abstract|minimal)
                       Default: hero

  --provider=<type>    3D conversion provider (replicate-trellis|replicate-hunyuan|meshy)
                       Default: replicate-trellis

  --output=<path>      Output directory
                       Default: ./output/glass-cube

  --name=<string>      Output filename (without extension)
                       Default: glass-cube

  --keep               Keep intermediate files (raw mesh, etc.)

  --help, -h           Show this help message

Environment Variables:
  REPLICATE_API_TOKEN  Required for image and mesh generation
  MESHY_API_KEY        Optional, required if using --provider=meshy

Examples:
  # Generate with defaults
  pnpm --filter=render-pipeline glass-cube

  # Dark variant with Hunyuan
  pnpm --filter=render-pipeline glass-cube --variant=dark --provider=replicate-hunyuan

  # Custom output location
  pnpm --filter=render-pipeline glass-cube --output=../canon/static/models --name=cube-mark
`);
	process.exit(0);
}

// Validate environment
if (!process.env.REPLICATE_API_TOKEN) {
	console.error('Error: REPLICATE_API_TOKEN environment variable is required');
	console.error('Set it with: export REPLICATE_API_TOKEN=your_token_here');
	process.exit(1);
}

// Run pipeline
console.log('\n');

generateGlassCube({
	variant,
	meshProvider: provider,
	outputDir,
	outputName,
	keepIntermediate,
	optimize: {
		draco: true,
		textureFormat: 'webp',
		textureSize: 512,
		dedup: true
	}
})
	.then((result) => {
		console.log('Pipeline completed successfully!');
		console.log(`GLB: ${result.glbPath}`);
		console.log(`Image: ${result.imagePath}`);
		process.exit(0);
	})
	.catch((error) => {
		console.error('Pipeline failed:', error);
		process.exit(1);
	});
