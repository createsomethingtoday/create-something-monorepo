/**
 * GLB Mesh Optimization
 *
 * Optimize 3D meshes for web delivery using gltf-transform.
 * Applies Draco compression, texture optimization, and mesh simplification.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Optimization options
 */
export interface OptimizeOptions {
	/** Enable Draco geometry compression */
	draco?: boolean;

	/** Texture compression format */
	textureFormat?: 'webp' | 'avif' | 'ktx2' | 'none';

	/** Maximum texture dimension */
	textureSize?: number;

	/** Mesh simplification ratio (0-1, lower = more simplified) */
	simplifyRatio?: number;

	/** Remove unused data */
	dedup?: boolean;
}

const DEFAULT_OPTIONS: OptimizeOptions = {
	draco: true,
	textureFormat: 'webp',
	textureSize: 512,
	simplifyRatio: 0.5,
	dedup: true
};

/**
 * Optimize a GLB mesh for web delivery
 *
 * Note: This uses gltf-transform CLI for simplicity.
 * For programmatic use, install @gltf-transform/core and @gltf-transform/functions.
 */
export async function optimizeMesh(options: {
	inputPath: string;
	outputPath: string;
	optimize?: OptimizeOptions;
}): Promise<{ inputSize: number; outputSize: number; reduction: number }> {
	const { inputPath, outputPath, optimize = DEFAULT_OPTIONS } = options;
	const opts = { ...DEFAULT_OPTIONS, ...optimize };

	console.log(`⚡ Optimizing mesh...`);
	console.log(`   Input: ${inputPath}`);

	// Ensure input exists
	const inputStats = await fs.stat(inputPath);
	const inputSize = inputStats.size;
	console.log(`   Input size: ${formatBytes(inputSize)}`);

	// Ensure output directory exists
	await fs.mkdir(path.dirname(outputPath), { recursive: true });

	// Build gltf-transform command
	const args: string[] = ['optimize', inputPath, outputPath];

	if (opts.draco) {
		args.push('--compress', 'draco');
	}

	if (opts.textureFormat && opts.textureFormat !== 'none') {
		args.push('--texture-compress', opts.textureFormat);
	}

	if (opts.textureSize) {
		args.push('--texture-resize', opts.textureSize.toString());
	}

	if (opts.dedup) {
		args.push('--dedup');
	}

	// Note: Simplification requires meshoptimizer which needs separate setup
	// For now, we rely on Draco compression which is most impactful

	console.log(`   Command: gltf-transform ${args.join(' ')}`);

	// Execute gltf-transform
	const { execSync } = await import('child_process');

	try {
		execSync(`npx gltf-transform ${args.join(' ')}`, {
			stdio: 'pipe',
			encoding: 'utf-8'
		});
	} catch (error) {
		// If gltf-transform fails, try without some options
		console.log(`   Warning: Full optimization failed, trying basic compression...`);

		const basicArgs = ['optimize', inputPath, outputPath, '--compress', 'draco'];
		execSync(`npx gltf-transform ${basicArgs.join(' ')}`, {
			stdio: 'pipe',
			encoding: 'utf-8'
		});
	}

	// Get output size
	const outputStats = await fs.stat(outputPath);
	const outputSize = outputStats.size;
	const reduction = ((inputSize - outputSize) / inputSize) * 100;

	console.log(`   Output size: ${formatBytes(outputSize)}`);
	console.log(`   Reduction: ${reduction.toFixed(1)}%`);
	console.log(`   ✅ Optimization complete`);

	return { inputSize, outputSize, reduction };
}

/**
 * Format bytes as human-readable string
 */
function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Verify mesh can be loaded and rendered
 */
export async function verifyMesh(filePath: string): Promise<{
	valid: boolean;
	triangles?: number;
	textures?: number;
	error?: string;
}> {
	try {
		// Use gltf-transform inspect for validation
		const { execSync } = await import('child_process');

		const output = execSync(`npx gltf-transform inspect ${filePath}`, {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe']
		});

		// Parse basic stats from output
		const triangleMatch = output.match(/triangles:\s*(\d+)/i);
		const textureMatch = output.match(/textures:\s*(\d+)/i);

		return {
			valid: true,
			triangles: triangleMatch ? parseInt(triangleMatch[1]) : undefined,
			textures: textureMatch ? parseInt(textureMatch[1]) : undefined
		};
	} catch (error) {
		return {
			valid: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}
