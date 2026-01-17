<script lang="ts">
	/**
	 * CanvasDiagram - Interactive canvas-based diagram with export
	 *
	 * Base component for building exportable diagrams with canvas.
	 * Supports PNG/SVG export, annotations, and interactive elements.
	 */

	type ShapeType = 'rect' | 'circle' | 'line' | 'arrow' | 'text' | 'path' | 'image';

	interface BaseShape {
		id: string;
		type: ShapeType;
		x: number;
		y: number;
		fill?: string;
		stroke?: string;
		strokeWidth?: number;
		opacity?: number;
		rotation?: number;
		selectable?: boolean;
		draggable?: boolean;
	}

	interface RectShape extends BaseShape {
		type: 'rect';
		width: number;
		height: number;
		cornerRadius?: number;
	}

	interface CircleShape extends BaseShape {
		type: 'circle';
		radius: number;
	}

	interface LineShape extends BaseShape {
		type: 'line';
		x2: number;
		y2: number;
		dash?: number[];
	}

	interface ArrowShape extends BaseShape {
		type: 'arrow';
		x2: number;
		y2: number;
		headSize?: number;
	}

	interface TextShape extends BaseShape {
		type: 'text';
		text: string;
		fontSize?: number;
		fontFamily?: string;
		fontWeight?: string;
		textAlign?: CanvasTextAlign;
	}

	interface PathShape extends BaseShape {
		type: 'path';
		path: string; // SVG path data
	}

	interface ImageShape extends BaseShape {
		type: 'image';
		src: string;
		width: number;
		height: number;
	}

	type Shape =
		| RectShape
		| CircleShape
		| LineShape
		| ArrowShape
		| TextShape
		| PathShape
		| ImageShape;

	interface Props {
		shapes: Shape[];
		width?: number;
		height?: number;
		background?: string;
		gridSize?: number;
		showGrid?: boolean;
		snapToGrid?: boolean;
		onShapeSelect?: (shape: Shape | null) => void;
		onShapeMove?: (shape: Shape, x: number, y: number) => void;
		onShapeClick?: (shape: Shape) => void;
	}

	let {
		shapes,
		width = 800,
		height = 600,
		background = 'var(--color-bg-pure, #0a0a0a)',
		gridSize = 20,
		showGrid = false,
		snapToGrid = false,
		onShapeSelect,
		onShapeMove,
		onShapeClick
	}: Props = $props();

	// State
	let canvas: HTMLCanvasElement | null = $state(null);
	let selectedShape: Shape | null = $state(null);
	let hoveredShape: Shape | null = $state(null);
	let isDragging = $state(false);
	let dragOffset = $state({ x: 0, y: 0 });
	let loadedImages = $state<Map<string, HTMLImageElement>>(new Map());

	// Cached computed styles
	let computedStyles: CSSStyleDeclaration | null = $state(null);

	// Resolved colors for canvas (CSS vars don't work in canvas)
	let resolvedBg = $state('#0a0a0a');
	let resolvedBorder = $state('#333333');
	let resolvedFocus = $state('#6366f1');

	// Resolve CSS custom properties
	function resolveColor(color: string | undefined): string {
		if (!color) return 'transparent';
		if (color.startsWith('var(')) {
			// Try to resolve from computed styles
			if (computedStyles) {
				const match = color.match(/var\(([^,)]+)/);
				if (match) {
					const resolved = computedStyles.getPropertyValue(match[1]).trim();
					if (resolved) return resolved;
				}
			}
			// Fall back to extracting fallback value
			const fallbackMatch = color.match(/var\([^,]+,\s*([^)]+)\)/);
			return fallbackMatch ? fallbackMatch[1].trim() : '#000';
		}
		return color;
	}

	// Initialize computed styles on mount
	$effect(() => {
		if (typeof window !== 'undefined') {
			computedStyles = getComputedStyle(document.documentElement);
			const get = (prop: string, fallback: string) =>
				computedStyles?.getPropertyValue(prop).trim() || fallback;
			
			resolvedBg = get('--color-bg-pure', '#0a0a0a');
			resolvedBorder = get('--color-border-default', '#333333');
			resolvedFocus = get('--color-focus', '#6366f1');
		}
	});

	// Load images
	$effect(() => {
		const imageShapes = shapes.filter((s): s is ImageShape => s.type === 'image');
		for (const shape of imageShapes) {
			if (!loadedImages.has(shape.src)) {
				const img = new Image();
				img.src = shape.src;
				img.onload = () => {
					loadedImages = new Map(loadedImages).set(shape.src, img);
				};
			}
		}
	});

	// Draw a shape
	function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
		ctx.save();

		// Apply transform
		ctx.translate(shape.x, shape.y);
		if (shape.rotation) {
			ctx.rotate((shape.rotation * Math.PI) / 180);
		}
		if (shape.opacity !== undefined) {
			ctx.globalAlpha = shape.opacity;
		}

		// Set styles
		ctx.fillStyle = resolveColor(shape.fill);
		ctx.strokeStyle = resolveColor(shape.stroke);
		ctx.lineWidth = shape.strokeWidth ?? 1;

		switch (shape.type) {
			case 'rect': {
				const r = shape.cornerRadius ?? 0;
				if (r > 0) {
					ctx.beginPath();
					ctx.roundRect(-shape.width / 2, -shape.height / 2, shape.width, shape.height, r);
					if (shape.fill) ctx.fill();
					if (shape.stroke) ctx.stroke();
				} else {
					if (shape.fill) ctx.fillRect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
					if (shape.stroke) ctx.strokeRect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
				}
				break;
			}

			case 'circle': {
				ctx.beginPath();
				ctx.arc(0, 0, shape.radius, 0, Math.PI * 2);
				if (shape.fill) ctx.fill();
				if (shape.stroke) ctx.stroke();
				break;
			}

			case 'line': {
				ctx.beginPath();
				if (shape.dash) ctx.setLineDash(shape.dash);
				ctx.moveTo(0, 0);
				ctx.lineTo(shape.x2 - shape.x, shape.y2 - shape.y);
				ctx.stroke();
				break;
			}

			case 'arrow': {
				const dx = shape.x2 - shape.x;
				const dy = shape.y2 - shape.y;
				const angle = Math.atan2(dy, dx);
				const headSize = shape.headSize ?? 10;

				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(dx, dy);
				ctx.stroke();

				// Arrow head
				ctx.beginPath();
				ctx.moveTo(dx, dy);
				ctx.lineTo(
					dx - headSize * Math.cos(angle - Math.PI / 6),
					dy - headSize * Math.sin(angle - Math.PI / 6)
				);
				ctx.moveTo(dx, dy);
				ctx.lineTo(
					dx - headSize * Math.cos(angle + Math.PI / 6),
					dy - headSize * Math.sin(angle + Math.PI / 6)
				);
				ctx.stroke();
				break;
			}

			case 'text': {
				ctx.font = `${shape.fontWeight ?? 'normal'} ${shape.fontSize ?? 14}px ${shape.fontFamily ?? 'system-ui, sans-serif'}`;
				ctx.textAlign = shape.textAlign ?? 'center';
				ctx.textBaseline = 'middle';
				if (shape.fill) {
					ctx.fillText(shape.text, 0, 0);
				}
				if (shape.stroke) {
					ctx.strokeText(shape.text, 0, 0);
				}
				break;
			}

			case 'path': {
				const path = new Path2D(shape.path);
				if (shape.fill) ctx.fill(path);
				if (shape.stroke) ctx.stroke(path);
				break;
			}

			case 'image': {
				const img = loadedImages.get(shape.src);
				if (img) {
					ctx.drawImage(img, -shape.width / 2, -shape.height / 2, shape.width, shape.height);
				}
				break;
			}
		}

		// Draw selection indicator
		if (selectedShape?.id === shape.id) {
			ctx.strokeStyle = resolvedFocus;
			ctx.lineWidth = 2;
			ctx.setLineDash([4, 4]);

			const bounds = getShapeBounds(shape);
			ctx.strokeRect(
				-bounds.width / 2 - 4,
				-bounds.height / 2 - 4,
				bounds.width + 8,
				bounds.height + 8
			);
		}

		ctx.restore();
	}

	// Get shape bounds for hit testing
	function getShapeBounds(shape: Shape): { width: number; height: number } {
		switch (shape.type) {
			case 'rect':
			case 'image':
				return { width: shape.width, height: shape.height };
			case 'circle':
				return { width: shape.radius * 2, height: shape.radius * 2 };
			case 'line':
			case 'arrow':
				return {
					width: Math.abs(shape.x2 - shape.x),
					height: Math.abs(shape.y2 - shape.y)
				};
			case 'text':
				return { width: 100, height: 20 }; // Approximate
			case 'path':
				return { width: 50, height: 50 }; // Approximate
			default:
				return { width: 0, height: 0 };
		}
	}

	// Hit testing
	function hitTest(x: number, y: number): Shape | null {
		// Iterate in reverse for top-to-bottom z-order
		for (let i = shapes.length - 1; i >= 0; i--) {
			const shape = shapes[i];
			if (shape.selectable === false) continue;

			const bounds = getShapeBounds(shape);
			const halfW = bounds.width / 2;
			const halfH = bounds.height / 2;

			if (
				x >= shape.x - halfW &&
				x <= shape.x + halfW &&
				y >= shape.y - halfH &&
				y <= shape.y + halfH
			) {
				return shape;
			}
		}
		return null;
	}

	// Render
	$effect(() => {
		const canvasEl = canvas;
		if (!canvasEl) return;

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		canvasEl.width = width * dpr;
		canvasEl.height = height * dpr;
		ctx.scale(dpr, dpr);

		// Background
		ctx.fillStyle = resolveColor(background);
		ctx.fillRect(0, 0, width, height);

		// Grid
		if (showGrid) {
			ctx.strokeStyle = resolvedBorder;
			ctx.lineWidth = 0.5;

			for (let x = 0; x <= width; x += gridSize) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, height);
				ctx.stroke();
			}

			for (let y = 0; y <= height; y += gridSize) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(width, y);
				ctx.stroke();
			}
		}

		// Draw shapes
		for (const shape of shapes) {
			drawShape(ctx, shape);
		}
	});

	// Event handlers
	function handleMouseMove(e: MouseEvent) {
		const rect = canvas!.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (isDragging && selectedShape && selectedShape.draggable !== false) {
			let newX = x - dragOffset.x;
			let newY = y - dragOffset.y;

			if (snapToGrid) {
				newX = Math.round(newX / gridSize) * gridSize;
				newY = Math.round(newY / gridSize) * gridSize;
			}

			onShapeMove?.(selectedShape, newX, newY);
			return;
		}

		const shape = hitTest(x, y);
		hoveredShape = shape;
	}

	function handleMouseDown(e: MouseEvent) {
		const rect = canvas!.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const shape = hitTest(x, y);
		selectedShape = shape;
		onShapeSelect?.(shape);

		if (shape && shape.draggable !== false) {
			isDragging = true;
			dragOffset = { x: x - shape.x, y: y - shape.y };
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleClick(e: MouseEvent) {
		if (selectedShape) {
			onShapeClick?.(selectedShape);
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			selectedShape = null;
			onShapeSelect?.(null);
		}
	}

	// Export functions
	export function exportToPng(filename: string = 'diagram.png'): void {
		if (!canvas) return;

		const link = document.createElement('a');
		link.download = filename;
		link.href = canvas.toDataURL('image/png');
		link.click();
	}

	export function exportToSvg(filename: string = 'diagram.svg'): string {
		let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
		svg += `<rect width="100%" height="100%" fill="${resolveColor(background)}"/>`;

		for (const shape of shapes) {
			const transform = `translate(${shape.x}, ${shape.y})${shape.rotation ? ` rotate(${shape.rotation})` : ''}`;
			const style = `fill:${resolveColor(shape.fill) || 'none'};stroke:${resolveColor(shape.stroke) || 'none'};stroke-width:${shape.strokeWidth || 1};opacity:${shape.opacity ?? 1}`;

			switch (shape.type) {
				case 'rect': {
					const rx = shape.cornerRadius ?? 0;
					svg += `<rect x="${-shape.width / 2}" y="${-shape.height / 2}" width="${shape.width}" height="${shape.height}" rx="${rx}" transform="${transform}" style="${style}"/>`;
					break;
				}
				case 'circle':
					svg += `<circle cx="0" cy="0" r="${shape.radius}" transform="${transform}" style="${style}"/>`;
					break;
				case 'line':
					svg += `<line x1="0" y1="0" x2="${shape.x2 - shape.x}" y2="${shape.y2 - shape.y}" transform="${transform}" style="${style}"/>`;
					break;
				case 'text':
					svg += `<text x="0" y="0" transform="${transform}" style="${style};font-size:${shape.fontSize ?? 14}px;font-family:${shape.fontFamily ?? 'system-ui'};text-anchor:middle;dominant-baseline:middle">${shape.text}</text>`;
					break;
				case 'path':
					svg += `<path d="${shape.path}" transform="${transform}" style="${style}"/>`;
					break;
			}
		}

		svg += '</svg>';

		if (filename) {
			const blob = new Blob([svg], { type: 'image/svg+xml' });
			const link = document.createElement('a');
			link.download = filename;
			link.href = URL.createObjectURL(blob);
			link.click();
		}

		return svg;
	}

	export function getDataUrl(): string {
		return canvas?.toDataURL('image/png') ?? '';
	}

	export function copyToClipboard(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!canvas) {
				reject(new Error('Canvas not available'));
				return;
			}

			canvas.toBlob((blob) => {
				if (blob) {
					navigator.clipboard
						.write([new ClipboardItem({ 'image/png': blob })])
						.then(resolve)
						.catch(reject);
				} else {
					reject(new Error('Failed to create blob'));
				}
			});
		});
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="canvas-diagram"
	onkeydown={handleKeyDown}
	tabindex="0"
	role="application"
	aria-label="Interactive diagram"
>
	<canvas
		bind:this={canvas}
		style="width: {width}px; height: {height}px;"
		onmousemove={handleMouseMove}
		onmousedown={handleMouseDown}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		onclick={handleClick}
		class:dragging={isDragging}
		class:hovering={hoveredShape !== null}
	></canvas>

	<div class="toolbar">
		<button onclick={() => exportToPng()} title="Export as PNG">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7 10 12 15 17 10" />
				<line x1="12" y1="15" x2="12" y2="3" />
			</svg>
			PNG
		</button>
		<button onclick={() => exportToSvg()} title="Export as SVG">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7 10 12 15 17 10" />
				<line x1="12" y1="15" x2="12" y2="3" />
			</svg>
			SVG
		</button>
		<button onclick={() => copyToClipboard()} title="Copy to clipboard">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
				<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
			</svg>
			Copy
		</button>
	</div>
</div>

<style>
	.canvas-diagram {
		position: relative;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		outline: none;
	}

	.canvas-diagram:focus {
		border-color: var(--color-focus);
	}

	canvas {
		display: block;
		cursor: default;
	}

	canvas.hovering {
		cursor: pointer;
	}

	canvas.dragging {
		cursor: grabbing;
	}

	.toolbar {
		position: absolute;
		bottom: var(--space-sm);
		right: var(--space-sm);
		display: flex;
		gap: var(--space-xs);
	}

	.toolbar button {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		font-size: var(--text-caption);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.toolbar button:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}
</style>
