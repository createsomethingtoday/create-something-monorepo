// 3D Brand Component Types

import type { BrandSize, CubeFace } from '../types.js';

/**
 * Props for the 3D Cube Mark component
 */
export interface CubeMark3DProps {
	/** Size of the 3D canvas in pixels */
	size?: BrandSize | number;

	/** Auto-rotate the cube */
	autoRotate?: boolean;

	/** Rotation speed (radians per second) */
	rotationSpeed?: number;

	/** Enable user interaction (orbit controls) */
	interactive?: boolean;

	/** Show contact shadows */
	showShadows?: boolean;

	/** Environment preset for reflections */
	environment?: 'studio' | 'city' | 'sunset' | 'dawn' | 'night' | 'none';

	/** Material variant */
	materialVariant?: 'glass' | 'frosted' | 'crystal';

	/** Additional CSS classes */
	class?: string;
}

/**
 * Props for the Glass Cube Scene component (lower-level)
 */
export interface GlassCubeSceneProps {
	/** Auto-rotate the cube */
	autoRotate?: boolean;

	/** Rotation speed (radians per second) */
	rotationSpeed?: number;

	/** Material configuration per face */
	faceMaterials?: Partial<Record<CubeFace, GlassMaterialConfig>>;

	/** Global material overrides */
	materialOverrides?: Partial<GlassMaterialConfig>;
}

/**
 * Configuration for glass material properties
 */
export interface GlassMaterialConfig {
	/** Base color (hex) */
	color?: number;

	/** Metalness (0-1) */
	metalness?: number;

	/** Roughness (0-1) - lower = more reflective */
	roughness?: number;

	/** Transmission (0-1) - 1 = fully transparent */
	transmission?: number;

	/** Thickness for refraction calculation */
	thickness?: number;

	/** Index of Refraction (glass = 1.5) */
	ior?: number;

	/** Environment map intensity */
	envMapIntensity?: number;

	/** Clearcoat layer intensity */
	clearcoat?: number;

	/** Clearcoat roughness */
	clearcoatRoughness?: number;
}
