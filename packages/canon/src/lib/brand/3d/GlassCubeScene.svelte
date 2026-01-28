<script lang="ts">
	/**
	 * GlassCubeScene - The 3D Glass Cube Scene
	 *
	 * Renders the glass cube with physically-based materials.
	 * Must be used inside a Threlte Canvas.
	 *
	 * @example
	 * <Canvas>
	 *   <GlassCubeScene autoRotate />
	 * </Canvas>
	 */

	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import type { GlassCubeSceneProps } from './types.js';
	import { createCubeFaceMaterials, GLASS_MATERIAL_PRESETS } from './materials.js';

	// =============================================================================
	// PROPS
	// =============================================================================

	interface Props extends GlassCubeSceneProps {
		/** Material preset variant */
		materialVariant?: keyof typeof GLASS_MATERIAL_PRESETS;
	}

	let {
		autoRotate = true,
		rotationSpeed = 0.3,
		materialVariant = 'glass',
		materialOverrides = {}
	}: Props = $props();

	// =============================================================================
	// GEOMETRY & MATERIALS
	// =============================================================================

	// Create cube geometry
	const geometry = new THREE.BoxGeometry(1, 1, 1);

	// Create materials for each face
	const faceMaterials = createCubeFaceMaterials(materialVariant, materialOverrides);

	// Material array for BufferGeometry faces
	// Order: +X (right), -X (left), +Y (top), -Y (bottom), +Z (front), -Z (back)
	const materials = [
		faceMaterials.right, // +X
		faceMaterials.left, // -X
		faceMaterials.top, // +Y
		faceMaterials.top, // -Y (use top for bottom too)
		faceMaterials.right, // +Z
		faceMaterials.left // -Z
	];

	// =============================================================================
	// ROTATION ANIMATION
	// =============================================================================

	// Rotation state
	let rotationY = $state(0);

	// Isometric angle: ~35.264° for true isometric (arctan(1/√2))
	const isometricAngle = Math.atan(1 / Math.sqrt(2));

	// Animation loop
	useTask((delta) => {
		if (autoRotate) {
			rotationY += delta * rotationSpeed;
		}
	});
</script>

<!-- Cube Group with Isometric Rotation -->
<T.Group rotation.x={isometricAngle} rotation.y={rotationY}>
	<T.Mesh {geometry} material={materials} />
</T.Group>

<!-- Studio Lighting Setup -->
<T.AmbientLight intensity={0.4} />

<!-- Key light (main) -->
<T.DirectionalLight position={[5, 5, 5]} intensity={1} castShadow />

<!-- Fill light (softer, opposite side) -->
<T.DirectionalLight position={[-3, 3, -3]} intensity={0.4} />

<!-- Rim light (edge definition) -->
<T.DirectionalLight position={[0, -2, 5]} intensity={0.3} />
