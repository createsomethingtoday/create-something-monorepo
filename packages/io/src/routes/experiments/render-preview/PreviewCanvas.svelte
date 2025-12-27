<script lang="ts">
	interface Props {
		pngDataUrl: string;
		onCropChange?: (crop: [number, number, number, number] | null) => void;
	}

	let { pngDataUrl, onCropChange }: Props = $props();

	// Canvas state
	let canvas: HTMLCanvasElement | null = $state(null);
	let isDragging = $state(false);
	let startPoint = $state<{ x: number; y: number } | null>(null);
	let currentCrop = $state<{ x: number; y: number; width: number; height: number } | null>(null);

	// Draw the image and crop overlay
	$effect(() => {
		const canvasEl = canvas;
		if (!canvasEl || !pngDataUrl) return;

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const img = new Image();
		img.onload = () => {
			// Set canvas size to match image aspect ratio
			const containerWidth = canvasEl.parentElement?.clientWidth || 400;
			const scale = containerWidth / img.width;
			canvasEl.width = containerWidth;
			canvasEl.height = img.height * scale;

			// Draw image
			ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);

			// Draw crop overlay if exists
			if (currentCrop) {
				ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
				ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

				// Clear the crop region to show original
				ctx.clearRect(currentCrop.x, currentCrop.y, currentCrop.width, currentCrop.height);
				ctx.drawImage(
					img,
					(currentCrop.x / canvasEl.width) * img.width,
					(currentCrop.y / canvasEl.height) * img.height,
					(currentCrop.width / canvasEl.width) * img.width,
					(currentCrop.height / canvasEl.height) * img.height,
					currentCrop.x,
					currentCrop.y,
					currentCrop.width,
					currentCrop.height
				);

				// Draw crop border
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = 2;
				ctx.setLineDash([5, 5]);
				ctx.strokeRect(currentCrop.x, currentCrop.y, currentCrop.width, currentCrop.height);
			}
		};
		img.src = pngDataUrl;
	});

	function getMousePosition(event: MouseEvent): { x: number; y: number } {
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();
		return {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};
	}

	function handleMouseDown(event: MouseEvent) {
		startPoint = getMousePosition(event);
		isDragging = true;
		currentCrop = null;
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging || !startPoint) return;

		const current = getMousePosition(event);
		currentCrop = {
			x: Math.min(startPoint.x, current.x),
			y: Math.min(startPoint.y, current.y),
			width: Math.abs(current.x - startPoint.x),
			height: Math.abs(current.y - startPoint.y)
		};
	}

	function handleMouseUp() {
		if (!isDragging) return;
		isDragging = false;

		// Convert canvas coordinates to SVG viewBox coordinates
		if (currentCrop && canvas && onCropChange) {
			// This is a simplified conversion - in production you'd need the original SVG viewBox
			const scaleX = 100 / canvas.width; // Assuming 0-100 viewBox
			const scaleY = 100 / canvas.height;
			const crop: [number, number, number, number] = [
				Math.round(currentCrop.x * scaleX),
				Math.round(currentCrop.y * scaleY),
				Math.round(currentCrop.width * scaleX),
				Math.round(currentCrop.height * scaleY)
			];
			onCropChange(crop);
		}

		startPoint = null;
	}

	function clearCrop() {
		currentCrop = null;
		onCropChange?.(null);
	}
</script>

<div class="canvas-container">
	<canvas
		bind:this={canvas}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		class:dragging={isDragging}
	></canvas>

	{#if currentCrop}
		<button class="clear-crop" onclick={clearCrop}>
			Clear selection
		</button>
	{/if}
</div>

<style>
	.canvas-container {
		position: relative;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	canvas {
		display: block;
		width: 100%;
		cursor: crosshair;
	}

	canvas.dragging {
		cursor: grabbing;
	}

	.clear-crop {
		position: absolute;
		bottom: var(--space-sm);
		right: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		font-size: var(--text-caption);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.clear-crop:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}
</style>
