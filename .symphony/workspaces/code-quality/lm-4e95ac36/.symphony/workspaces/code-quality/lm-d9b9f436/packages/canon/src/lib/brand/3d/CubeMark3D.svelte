<script lang="ts">
	/**
	 * CubeMark3D - The CREATE SOMETHING 3D Glass Cube Logo Mark
	 *
	 * A photorealistic 3D version of the isometric cube brand mark,
	 * rendered with glass materials and studio lighting.
	 *
	 * "Good design is as little design as possible" - Dieter Rams
	 *
	 * @example
	 * <CubeMark3D />
	 * <CubeMark3D size="lg" autoRotate={false} interactive />
	 * <CubeMark3D materialVariant="frosted" />
	 */

	import { Canvas, T } from '@threlte/core';
	import { OrbitControls, ContactShadows } from '@threlte/extras';
	import type { CubeMark3DProps } from './types.js';
	import { BRAND_SIZE_MAP, type BrandSize } from '../types.js';
	import GlassCubeScene from './GlassCubeScene.svelte';

	// =============================================================================
	// PROPS
	// =============================================================================

	let {
		size = 'md',
		autoRotate = true,
		rotationSpeed = 0.3,
		interactive = false,
		showShadows = true,
		environment = 'studio',
		materialVariant = 'glass',
		class: className = ''
	}: CubeMark3DProps = $props();

	// =============================================================================
	// DERIVED STATE
	// =============================================================================

	// Resolve size to pixels
	const sizeInPx = $derived(typeof size === 'number' ? size : BRAND_SIZE_MAP[size as BrandSize]);

	// Check for reduced motion preference
	let prefersReducedMotion = $state(false);

	$effect(() => {
		if (typeof window !== 'undefined') {
			prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		}
	});

	// Effective auto-rotate (disabled if reduced motion)
	const effectiveAutoRotate = $derived(autoRotate && !prefersReducedMotion);
</script>

<div
	class="cube-mark-3d {className}"
	style="width: {sizeInPx}px; height: {sizeInPx}px;"
	role="img"
	aria-label="CREATE SOMETHING"
>
	<Canvas>
		<!-- Camera -->
		<T.PerspectiveCamera makeDefault position={[3, 3, 3]} fov={35}>
			{#if interactive}
				<OrbitControls enableZoom={false} enablePan={false} />
			{/if}
		</T.PerspectiveCamera>

		<!-- The Glass Cube Scene -->
		<GlassCubeScene
			autoRotate={effectiveAutoRotate}
			{rotationSpeed}
			{materialVariant}
		/>

		<!-- Contact Shadows -->
		{#if showShadows}
			<ContactShadows opacity={0.4} blur={2} position.y={-0.75} scale={3} />
		{/if}
	</Canvas>
</div>

<style>
	.cube-mark-3d {
		display: inline-block;
		position: relative;
		overflow: hidden;
		border-radius: var(--radius-sm, 4px);
	}

	.cube-mark-3d :global(canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
	}
</style>
