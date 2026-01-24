<script lang="ts">
	import { flip } from 'svelte/animate';
	import { componentTree, recentChanges, operations } from '$lib/stores/operations';
	import { pulse, shrink } from '$lib/transitions/pulse';
	import ElementNode from './ElementNode.svelte';
	import { Layers, RotateCcw } from 'lucide-svelte';
	
	// Canvas zoom and pan state
	let scale = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let startPan = { x: 0, y: 0 };
	
	function handleWheel(e: WheelEvent) {
		if (e.ctrlKey || e.metaKey) {
			// Zoom
			e.preventDefault();
			const delta = e.deltaY > 0 ? 0.9 : 1.1;
			scale = Math.min(Math.max(scale * delta, 0.25), 4);
		} else {
			// Pan
			panX -= e.deltaX;
			panY -= e.deltaY;
		}
	}
	
	function handleMouseDown(e: MouseEvent) {
		if (e.button === 1 || (e.button === 0 && e.altKey)) {
			// Middle click or Alt+click to pan
			isPanning = true;
			startPan = { x: e.clientX - panX, y: e.clientY - panY };
		}
	}
	
	function handleMouseMove(e: MouseEvent) {
		if (isPanning) {
			panX = e.clientX - startPan.x;
			panY = e.clientY - startPan.y;
		}
	}
	
	function handleMouseUp() {
		isPanning = false;
	}
	
	function resetView() {
		scale = 1;
		panX = 0;
		panY = 0;
	}
	
	// Keyboard shortcuts
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			resetView();
		}
	}
</script>

<svelte:window 
	onkeydown={handleKeyDown}
	onmouseup={handleMouseUp}
	onmousemove={handleMouseMove}
/>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
	class="canvas"
	onwheel={handleWheel}
	onmousedown={handleMouseDown}
	class:panning={isPanning}
	role="application"
	aria-label="Component preview canvas"
>
	<div 
		class="canvas-content"
		style:transform="translate({panX}px, {panY}px) scale({scale})"
	>
		{#if $componentTree.children && $componentTree.children.length > 0}
			{#each $componentTree.children as node (node.id)}
				<div
					class="node-wrapper"
					class:recent={$recentChanges.has(node.id)}
					animate:flip={{ duration: 300 }}
					in:pulse={{ duration: 400 }}
					out:shrink={{ duration: 200 }}
				>
					<ElementNode 
						{node} 
						isRecent={$recentChanges.has(node.id)}
						onSelect={(id) => operations.selectNode(id)}
					/>
				</div>
			{/each}
		{:else}
			<div class="empty-state">
				<div class="empty-icon">
					<Layers size={48} strokeWidth={1.5} />
				</div>
				<p>Waiting for components...</p>
				<p class="hint">Edit a .svelte file to see it appear here</p>
			</div>
		{/if}
	</div>
	
	<!-- Zoom indicator -->
	<div class="zoom-indicator">
		<button onclick={resetView} title="Reset view (Ctrl+0)">
			<RotateCcw size={12} />
			<span>{Math.round(scale * 100)}%</span>
		</button>
	</div>
</div>

<style>
	.canvas {
		flex: 1;
		overflow: hidden;
		position: relative;
		background: 
			radial-gradient(circle at center, var(--color-bg-elevated) 0%, var(--color-bg-pure) 100%),
			repeating-linear-gradient(
				0deg,
				transparent,
				transparent 39px,
				var(--color-border-default) 39px,
				var(--color-border-default) 40px
			),
			repeating-linear-gradient(
				90deg,
				transparent,
				transparent 39px,
				var(--color-border-default) 39px,
				var(--color-border-default) 40px
			);
		cursor: default;
	}
	
	.canvas.panning {
		cursor: grabbing;
	}
	
	.canvas-content {
		transform-origin: center center;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-lg);
		padding: var(--space-xl);
		min-height: 100%;
		align-items: flex-start;
		justify-content: flex-start;
	}
	
	.node-wrapper {
		position: relative;
	}
	
	.node-wrapper.recent {
		z-index: var(--z-dropdown);
	}
	
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		color: var(--color-fg-secondary);
		text-align: center;
		padding: var(--space-xl);
		width: 100%;
	}
	
	.empty-icon {
		opacity: 0.3;
		color: var(--color-info);
		animation: float 3s var(--ease-standard) infinite;
	}
	
	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-10px); }
	}
	
	.hint {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}
	
	.zoom-indicator {
		position: absolute;
		bottom: var(--space-sm);
		right: var(--space-sm);
	}
	
	.zoom-indicator button {
		display: flex;
		align-items: center;
		gap: 6px;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		font-family: var(--font-mono);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}
	
	.zoom-indicator button:hover {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		border-color: var(--color-border-emphasis);
	}
</style>
