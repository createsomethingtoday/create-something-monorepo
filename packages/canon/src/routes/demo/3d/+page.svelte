<script lang="ts">
	/**
	 * 3D Brand Components Demo
	 *
	 * Preview and test the CubeMark3D and related 3D components.
	 * Note: The actual GLB model needs to be generated first using the render-pipeline.
	 */

	import { CubeMark3D } from '$lib/brand/3d/index.js';
	import CubeMark from '$lib/brand/marks/CubeMark.svelte';

	// Size options to demo
	const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

	// Track selected options
	let selectedSize = $state<(typeof sizes)[number]>('lg');
	let autoRotate = $state(true);
	let interactive = $state(false);
	let showShadows = $state(true);
	let materialVariant = $state<'glass' | 'frosted' | 'crystal'>('glass');
</script>

<svelte:head>
	<title>3D Brand Components | Canon Demo</title>
</svelte:head>

<main class="demo-page">
	<header>
		<h1>3D Brand Components</h1>
		<p class="subtitle">
			Photorealistic 3D versions of the CREATE SOMETHING brand mark
		</p>
	</header>

	<section class="comparison">
		<h2>2D vs 3D Comparison</h2>
		<div class="side-by-side">
			<div class="item">
				<CubeMark size="xl" animate animationType="pulse" />
				<span class="label">CubeMark (2D SVG)</span>
			</div>
			<div class="item">
				<CubeMark3D
					size={64}
					{autoRotate}
					{interactive}
					{showShadows}
					{materialVariant}
				/>
				<span class="label">CubeMark3D (WebGL)</span>
			</div>
		</div>
	</section>

	<section class="controls">
		<h2>Controls</h2>

		<div class="control-group">
			<label>
				Size:
				<select bind:value={selectedSize}>
					{#each sizes as size}
						<option value={size}>{size}</option>
					{/each}
				</select>
			</label>

			<label>
				Material:
				<select bind:value={materialVariant}>
					<option value="glass">Glass</option>
					<option value="frosted">Frosted</option>
					<option value="crystal">Crystal</option>
				</select>
			</label>
		</div>

		<div class="control-group">
			<label>
				<input type="checkbox" bind:checked={autoRotate} />
				Auto Rotate
			</label>

			<label>
				<input type="checkbox" bind:checked={interactive} />
				Interactive (Orbit Controls)
			</label>

			<label>
				<input type="checkbox" bind:checked={showShadows} />
				Show Shadows
			</label>
		</div>
	</section>

	<section class="showcase">
		<h2>Size Variants</h2>
		<div class="size-grid">
			{#each sizes as size}
				<div class="size-item">
					<CubeMark3D
						{size}
						autoRotate={autoRotate}
						materialVariant={materialVariant}
					/>
					<span class="label">{size}</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="materials">
		<h2>Material Variants</h2>
		<div class="material-grid">
			{#each ['glass', 'frosted', 'crystal'] as variant}
				<div class="material-item">
					<CubeMark3D
						size="lg"
						{autoRotate}
						materialVariant={variant}
					/>
					<span class="label">{variant}</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="usage">
		<h2>Usage</h2>
		<pre><code>{`<script>
  import { CubeMark3D } from '@create-something/canon/brand/3d';
</script>

<CubeMark3D />
<CubeMark3D size="lg" autoRotate={false} interactive />
<CubeMark3D materialVariant="frosted" />`}</code></pre>
	</section>

	<section class="generation">
		<h2>Generate GLB Model</h2>
		<p>
			The 3D model is generated using the render-pipeline. Run:
		</p>
		<pre><code>pnpm --filter=render-pipeline glass-cube \
  --output=./packages/canon/static/models \
  --name=glass-cube</code></pre>
		<p>
			This will generate a <code>glass-cube.glb</code> file optimized for web delivery.
		</p>
	</section>
</main>

<style>
	.demo-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: #666;
		font-size: 1.125rem;
	}

	h2 {
		font-size: 1.5rem;
		font-weight: 500;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid #eee;
		padding-bottom: 0.5rem;
	}

	section {
		margin-bottom: 4rem;
	}

	/* Comparison */
	.side-by-side {
		display: flex;
		gap: 4rem;
		justify-content: center;
		align-items: flex-end;
	}

	.item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.label {
		font-size: 0.875rem;
		color: #666;
	}

	/* Controls */
	.controls {
		background: #f9f9f9;
		padding: 1.5rem;
		border-radius: 8px;
	}

	.control-group {
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.control-group:last-child {
		margin-bottom: 0;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	select {
		padding: 0.25rem 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
	}

	/* Grids */
	.size-grid,
	.material-grid {
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.size-item,
	.material-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	/* Code */
	pre {
		background: #1e1e1e;
		color: #d4d4d4;
		padding: 1rem;
		border-radius: 8px;
		overflow-x: auto;
	}

	code {
		font-family: 'SF Mono', Monaco, 'Consolas', monospace;
		font-size: 0.875rem;
	}

	p code {
		background: #f0f0f0;
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		font-size: 0.875em;
	}
</style>
