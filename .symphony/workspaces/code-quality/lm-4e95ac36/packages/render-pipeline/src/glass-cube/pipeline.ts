/**
 * Full Glass Cube Pipeline - DISABLED
 *
 * Replicate integration has been disabled due to runaway costs ($700+).
 * This pipeline will throw errors if called.
 *
 * Disabled: 2026-01-25
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { generateReferenceImage, type ReferenceVariant } from './generate-reference.js';
import { imageToMesh, type MeshProvider } from './image-to-3d.js';
import { optimizeMesh, verifyMesh, type OptimizeOptions } from './optimize.js';

/**
 * Pipeline options
 */
export interface GlassCubePipelineOptions {
	/** Reference image variant */
	variant?: ReferenceVariant;

	/** Custom prompt (overrides variant) */
	customPrompt?: string;

	/** 3D conversion provider */
	meshProvider?: MeshProvider;

	/** Output directory */
	outputDir: string;

	/** Output filename (without extension) */
	outputName?: string;

	/** Optimization settings */
	optimize?: OptimizeOptions;

	/** Keep intermediate files */
	keepIntermediate?: boolean;
}

/**
 * Pipeline result
 */
export interface GlassCubePipelineResult {
	/** Path to final optimized GLB */
	glbPath: string;

	/** Path to reference image */
	imagePath: string;

	/** File sizes */
	sizes: {
		image: number;
		rawMesh: number;
		optimizedMesh: number;
		reduction: number;
	};

	/** Mesh stats */
	meshStats?: {
		triangles?: number;
		textures?: number;
	};

	/** Total pipeline duration in ms */
	duration: number;
}

/**
 * Run the complete glass cube generation pipeline
 */
export async function generateGlassCube(
	options: GlassCubePipelineOptions
): Promise<GlassCubePipelineResult> {
	const {
		variant = 'hero',
		customPrompt,
		meshProvider = 'replicate-trellis',
		outputDir,
		outputName = 'glass-cube',
		optimize,
		keepIntermediate = false
	} = options;

	const startTime = Date.now();

	console.log('═══════════════════════════════════════════════════════════');
	console.log('   Glass Cube 3D Pipeline');
	console.log('═══════════════════════════════════════════════════════════');
	console.log(`   Variant: ${variant}`);
	console.log(`   Provider: ${meshProvider}`);
	console.log(`   Output: ${outputDir}/${outputName}.glb`);
	console.log('═══════════════════════════════════════════════════════════\n');

	// Ensure output directory exists
	await fs.mkdir(outputDir, { recursive: true });

	// File paths
	const imagePath = path.join(outputDir, `${outputName}-reference.png`);
	const rawMeshPath = path.join(outputDir, `${outputName}-raw.glb`);
	const optimizedMeshPath = path.join(outputDir, `${outputName}.glb`);

	// ==========================================================================
	// Phase 1: Generate Reference Image
	// ==========================================================================
	console.log('Phase 1: Text-to-Image');
	console.log('───────────────────────────────────────────────────────────');

	const imageResult = await generateReferenceImage({
		variant,
		customPrompt,
		outputPath: imagePath
	});

	const imageSize = (await fs.stat(imagePath)).size;
	console.log('');

	// ==========================================================================
	// Phase 2: Convert to 3D Mesh
	// ==========================================================================
	console.log('Phase 2: Image-to-3D');
	console.log('───────────────────────────────────────────────────────────');

	const meshResult = await imageToMesh({
		image: imageResult.url, // Use URL for better compatibility
		provider: meshProvider,
		outputPath: rawMeshPath
	});

	const rawMeshSize = (await fs.stat(rawMeshPath)).size;
	console.log('');

	// ==========================================================================
	// Phase 3: Optimize Mesh
	// ==========================================================================
	console.log('Phase 3: Optimization');
	console.log('───────────────────────────────────────────────────────────');

	const optimizeResult = await optimizeMesh({
		inputPath: rawMeshPath,
		outputPath: optimizedMeshPath,
		optimize
	});

	console.log('');

	// ==========================================================================
	// Phase 4: Verify
	// ==========================================================================
	console.log('Phase 4: Verification');
	console.log('───────────────────────────────────────────────────────────');

	const verification = await verifyMesh(optimizedMeshPath);

	if (!verification.valid) {
		console.log(`   ⚠️  Verification warning: ${verification.error}`);
	} else {
		console.log(`   ✅ Mesh is valid`);
		if (verification.triangles) {
			console.log(`   Triangles: ${verification.triangles.toLocaleString()}`);
		}
		if (verification.textures) {
			console.log(`   Textures: ${verification.textures}`);
		}
	}

	console.log('');

	// ==========================================================================
	// Cleanup
	// ==========================================================================
	if (!keepIntermediate) {
		try {
			await fs.unlink(rawMeshPath);
			console.log(`   Cleaned up: ${rawMeshPath}`);
		} catch {
			// Ignore cleanup errors
		}
	}

	const duration = Date.now() - startTime;

	// ==========================================================================
	// Summary
	// ==========================================================================
	console.log('═══════════════════════════════════════════════════════════');
	console.log('   Pipeline Complete');
	console.log('═══════════════════════════════════════════════════════════');
	console.log(`   Duration: ${(duration / 1000).toFixed(1)}s`);
	console.log(`   Output: ${optimizedMeshPath}`);
	console.log(`   Size: ${formatBytes(optimizeResult.outputSize)}`);
	console.log(`   Reduction: ${optimizeResult.reduction.toFixed(1)}%`);
	console.log('═══════════════════════════════════════════════════════════\n');

	return {
		glbPath: optimizedMeshPath,
		imagePath,
		sizes: {
			image: imageSize,
			rawMesh: rawMeshSize,
			optimizedMesh: optimizeResult.outputSize,
			reduction: optimizeResult.reduction
		},
		meshStats: {
			triangles: verification.triangles,
			textures: verification.textures
		},
		duration
	};
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
