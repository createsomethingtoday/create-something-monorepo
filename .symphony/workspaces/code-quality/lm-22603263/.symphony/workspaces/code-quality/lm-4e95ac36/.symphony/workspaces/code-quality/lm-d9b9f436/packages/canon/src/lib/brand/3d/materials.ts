// Glass Material Utilities for 3D Brand Components
//
// Maps the Canon cube face semantics to physical glass properties:
// - Top (Creation): Most transparent, brightest reflections
// - Left (Understanding): Medium transmission
// - Right (Foundation): Most solid, deepest refraction

import * as THREE from 'three';
import type { CubeFace } from '../types.js';
import { CUBE_FACE_OPACITY } from '../types.js';
import type { GlassMaterialConfig } from './types.js';

/**
 * Preset material configurations
 */
export const GLASS_MATERIAL_PRESETS = {
	/** Clean transparent glass */
	glass: {
		metalness: 0,
		roughness: 0.05,
		ior: 1.5,
		clearcoat: 1,
		clearcoatRoughness: 0.1
	},

	/** Frosted/diffuse glass */
	frosted: {
		metalness: 0,
		roughness: 0.3,
		ior: 1.45,
		clearcoat: 0.5,
		clearcoatRoughness: 0.3
	},

	/** Crystal-like with higher refraction */
	crystal: {
		metalness: 0.1,
		roughness: 0.02,
		ior: 2.0, // Diamond-like
		clearcoat: 1,
		clearcoatRoughness: 0.05
	}
} as const;

/**
 * Map Canon face opacity to glass transmission
 * Lower opacity = higher transmission (more see-through)
 */
function opacityToTransmission(face: CubeFace): number {
	const opacity = CUBE_FACE_OPACITY[face];
	// Invert and scale: 1.0 opacity -> 0.85 transmission (still some glass effect)
	// 0.3 opacity -> 0.65 transmission (more solid)
	return 0.5 + (1 - opacity) * 0.35;
}

/**
 * Create a MeshPhysicalMaterial for a specific cube face
 */
export function createGlassMaterial(
	face: CubeFace,
	config: Partial<GlassMaterialConfig> = {},
	preset: keyof typeof GLASS_MATERIAL_PRESETS = 'glass'
): THREE.MeshPhysicalMaterial {
	const basePreset = GLASS_MATERIAL_PRESETS[preset];
	const transmission = opacityToTransmission(face);

	return new THREE.MeshPhysicalMaterial({
		color: config.color ?? 0xffffff,
		metalness: config.metalness ?? basePreset.metalness,
		roughness: config.roughness ?? basePreset.roughness,
		transmission: config.transmission ?? transmission,
		thickness: config.thickness ?? 0.5,
		ior: config.ior ?? basePreset.ior,
		transparent: true,
		opacity: 1,
		envMapIntensity: config.envMapIntensity ?? 1.5,
		clearcoat: config.clearcoat ?? basePreset.clearcoat,
		clearcoatRoughness: config.clearcoatRoughness ?? basePreset.clearcoatRoughness,
		side: THREE.DoubleSide
	});
}

/**
 * Create all three face materials
 */
export function createCubeFaceMaterials(
	preset: keyof typeof GLASS_MATERIAL_PRESETS = 'glass',
	overrides: Partial<GlassMaterialConfig> = {}
): Record<CubeFace, THREE.MeshPhysicalMaterial> {
	return {
		top: createGlassMaterial('top', overrides, preset),
		left: createGlassMaterial('left', overrides, preset),
		right: createGlassMaterial('right', overrides, preset)
	};
}
