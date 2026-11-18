<script lang="ts">
	/**
	 * TimelineEditor - Interactive keyframe animation editor
	 *
	 * Canvas-based timeline editor for motion-studio integration.
	 * Supports keyframe editing, scrubbing, and track management.
	 */
	import { onMount } from 'svelte';

	interface Keyframe {
		id: string;
		frame: number;
		value: number;
		easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';
	}

	interface Track {
		id: string;
		name: string;
		type: 'position' | 'opacity' | 'scale' | 'rotation' | 'custom';
		keyframes: Keyframe[];
		color?: string;
		collapsed?: boolean;
	}

	interface Props {
		tracks: Track[];
		totalFrames?: number;
		fps?: number;
		currentFrame?: number;
		onFrameChange?: (frame: number) => void;
		onKeyframeAdd?: (trackId: string, frame: number) => void;
		onKeyframeMove?: (trackId: string, keyframeId: string, newFrame: number) => void;
		onKeyframeDelete?: (trackId: string, keyframeId: string) => void;
		onTrackToggle?: (trackId: string, collapsed: boolean) => void;
	}

	let {
		tracks,
		totalFrames = 300,
		fps = 30,
		currentFrame = 0,
		onFrameChange,
		onKeyframeAdd,
		onKeyframeMove,
		onKeyframeDelete,
		onTrackToggle
	}: Props = $props();

	// Canvas and state
	let canvas: HTMLCanvasElement | null = $state(null);
	let owner: HTMLDivElement;
	let containerWidth = $state(800);
	let isDraggingScrubber = $state(false);
	let isDraggingKeyframe = $state(false);
	let dragKeyframe: { trackId: string; keyframeId: string } | null = $state(null);
	let hoveredKeyframe: { trackId: string; keyframeId: string } | null = $state(null);
	let viewport: HTMLDivElement;
	let zoom = $state(1);

	// Layout constants
	const layout = {
		trackHeight: 36,
		trackLabelWidth: 140,
		rulerHeight: 28,
		keyframeRadius: 6,
		scrubberWidth: 2
	};

	// Track type colors (already hex - works in canvas)
	const trackColors: Record<string, string> = {
		position: '#6366f1',
		opacity: '#22c55e',
		scale: '#f59e0b',
		rotation: '#ec4899',
		custom: '#8b5cf6'
	};

	// Resolved colors (populated on mount)
	let colors = $state({
		bgPure: '#0a0a0a',
		bgSurface: '#141414',
		bgElevated: '#1a1a1a',
		fgPrimary: '#ffffff',
		fgSecondary: '#888888',
		fgMuted: '#666666',
		borderDefault: '#333333',
		borderEmphasis: '#4f46e5',
		error: '#ef4444'
	});

	// Resolve through an inherited CSS color property: custom properties may be
	// aliases or modern color expressions which Canvas fillStyle cannot consume.
	function resolveColors() {
		if (!owner) return;
		const probe = document.createElement('span');
		probe.hidden = true;
		owner.append(probe);
		const get = (prop: string, fallback: string) => {
			probe.style.color = `var(${prop}, ${fallback})`;
			return getComputedStyle(probe).color || fallback;
		};
		const next = {
			bgPure: get('--color-performance-bg-pure', '#000000'),
			bgSurface: get('--color-performance-bg-surface', '#111111'),
			bgElevated: get('--color-performance-bg-elevated', '#1a1a1a'),
			fgPrimary: get('--color-performance-fg-primary', '#f2f2f2'),
			fgSecondary: get('--color-performance-fg-secondary', '#888888'),
			fgMuted: get('--color-performance-fg-muted', '#666666'),
			borderDefault: get('--color-performance-border-default', '#333333'),
			borderEmphasis: get('--color-performance-border-emphasis', '#4f46e5'),
			error: get('--color-performance-error', '#ef4444')
		};
		probe.remove();
		colors = next;
	}

	// Keep a usable two-dimensional surface even inside a narrow owning panel.
	// Native scrolling moves the canvas itself, so pointer coordinates and drawing
	// share the same origin at every scroll offset and zoom level.
	const usableWidth = $derived(Math.max(140, containerWidth - layout.trackLabelWidth));
	const pixelsPerFrame = $derived(usableWidth / (totalFrames / zoom));
	const canvasWidth = $derived(layout.trackLabelWidth + usableWidth * Math.max(1, zoom));
	const canvasHeight = $derived(layout.rulerHeight + tracks.length * layout.trackHeight);

	// Frame to X position
	function frameToX(frame: number): number {
		return layout.trackLabelWidth + frame * pixelsPerFrame;
	}

	// X position to frame
	function xToFrame(x: number): number {
		return Math.round((x - layout.trackLabelWidth) / pixelsPerFrame);
	}

	// Observe only this editor's ancestor attributes, never the document subtree.
	// Batch theme changes, and release both observer and queued work on teardown.
	onMount(() => {
		resolveColors();
		let queued = 0;
		const refresh = () => {
			if (!queued) queued = requestAnimationFrame(() => { queued = 0; resolveColors(); });
		};
		const observer = new MutationObserver(refresh);
		for (let element: Element | null = owner; element; element = element.parentElement) {
			observer.observe(element, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
		}
		const preference = matchMedia('(prefers-color-scheme: light)');
		preference.addEventListener('change', refresh);
		return () => {
			observer.disconnect();
			preference.removeEventListener('change', refresh);
			cancelAnimationFrame(queued);
		};
	});

	// Draw easing curve preview
	function drawEasingCurve(
		ctx: CanvasRenderingContext2D,
		x1: number,
		y: number,
		x2: number,
		easing: string
	) {
		const height = layout.trackHeight * 0.3;
		const midY = y + layout.trackHeight / 2;

		ctx.beginPath();
		ctx.strokeStyle = colors.borderEmphasis;
		ctx.lineWidth = 1;
		ctx.globalAlpha = 0.5;

		// Draw bezier curve based on easing
		ctx.moveTo(x1, midY);

		switch (easing) {
			case 'ease-in':
				ctx.bezierCurveTo(x1 + (x2 - x1) * 0.42, midY, x2, midY - height, x2, midY);
				break;
			case 'ease-out':
				ctx.bezierCurveTo(x1, midY - height, x1 + (x2 - x1) * 0.58, midY, x2, midY);
				break;
			case 'ease-in-out':
				ctx.bezierCurveTo(
					x1 + (x2 - x1) * 0.42,
					midY,
					x1 + (x2 - x1) * 0.58,
					midY - height,
					x2,
					midY
				);
				break;
			case 'spring':
				// Simple spring approximation
				const cp1x = x1 + (x2 - x1) * 0.3;
				const cp2x = x1 + (x2 - x1) * 0.7;
				ctx.bezierCurveTo(cp1x, midY - height * 1.2, cp2x, midY + height * 0.2, x2, midY);
				break;
			default:
				ctx.lineTo(x2, midY);
		}

		ctx.stroke();
		ctx.globalAlpha = 1;
	}

	// Render timeline
	$effect(() => {
		const canvasEl = canvas;
		if (!canvasEl) return;

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		canvasEl.width = canvasWidth * dpr;
		canvasEl.height = canvasHeight * dpr;
		ctx.scale(dpr, dpr);

		// Clear
		ctx.fillStyle = colors.bgPure;
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		// Draw track labels background
		ctx.fillStyle = colors.bgSurface;
		ctx.fillRect(0, 0, layout.trackLabelWidth, canvasHeight);

		// Draw ruler
		ctx.fillStyle = colors.bgElevated;
		ctx.fillRect(layout.trackLabelWidth, 0, canvasWidth - layout.trackLabelWidth, layout.rulerHeight);

		// Draw ruler ticks and labels
		const majorTickInterval = Math.max(1, Math.floor(fps / zoom));
		const minorTickInterval = Math.max(1, Math.floor(majorTickInterval / 5));

		ctx.strokeStyle = colors.borderDefault;
		ctx.fillStyle = colors.fgMuted;
		ctx.font = '10px system-ui, sans-serif';
		ctx.textAlign = 'center';

		for (let frame = 0; frame <= totalFrames; frame += minorTickInterval) {
			const x = frameToX(frame);
			if (x < layout.trackLabelWidth || x > canvasWidth) continue;

			const isMajor = frame % majorTickInterval === 0;

			ctx.beginPath();
			ctx.moveTo(x, isMajor ? layout.rulerHeight - 16 : layout.rulerHeight - 8);
			ctx.lineTo(x, layout.rulerHeight);
			ctx.stroke();

			if (isMajor) {
				const seconds = (frame / fps).toFixed(1);
				ctx.fillText(`${seconds}s`, x, layout.rulerHeight - 18);
			}
		}

		// Draw tracks
		tracks.forEach((track, index) => {
			const y = layout.rulerHeight + index * layout.trackHeight;

			// Track background (alternating)
			ctx.fillStyle = index % 2 === 0 ? colors.bgPure : colors.bgSurface;
			ctx.fillRect(layout.trackLabelWidth, y, canvasWidth - layout.trackLabelWidth, layout.trackHeight);

			// Track label
			ctx.fillStyle = colors.bgSurface;
			ctx.fillRect(0, y, layout.trackLabelWidth, layout.trackHeight);

			ctx.strokeStyle = colors.borderDefault;
			ctx.beginPath();
			ctx.moveTo(0, y + layout.trackHeight);
			ctx.lineTo(canvasWidth, y + layout.trackHeight);
			ctx.stroke();

			// Track name
			ctx.fillStyle = colors.fgSecondary;
			ctx.font = '12px system-ui, sans-serif';
			ctx.textAlign = 'left';
			ctx.fillText(track.name, 12, y + layout.trackHeight / 2 + 4);

			// Track type indicator
			ctx.fillStyle = track.color ?? trackColors[track.type] ?? trackColors.custom;
			ctx.fillRect(layout.trackLabelWidth - 4, y + 8, 4, layout.trackHeight - 16);

			// Draw easing curves between keyframes
			const sortedKeyframes = [...track.keyframes].sort((a, b) => a.frame - b.frame);
			for (let i = 0; i < sortedKeyframes.length - 1; i++) {
				const kf = sortedKeyframes[i];
				const nextKf = sortedKeyframes[i + 1];
				const x1 = frameToX(kf.frame);
				const x2 = frameToX(nextKf.frame);
				if (x2 > layout.trackLabelWidth && x1 < canvasWidth) {
					drawEasingCurve(ctx, x1, y, x2, kf.easing ?? 'linear');
				}
			}

			// Draw keyframes
			for (const keyframe of track.keyframes) {
				const x = frameToX(keyframe.frame);
				if (x < layout.trackLabelWidth - layout.keyframeRadius || x > canvasWidth + layout.keyframeRadius) continue;

				const isHovered =
					hoveredKeyframe?.trackId === track.id && hoveredKeyframe?.keyframeId === keyframe.id;
				const isDragged =
					dragKeyframe?.trackId === track.id && dragKeyframe?.keyframeId === keyframe.id;

				// Keyframe diamond
				ctx.save();
				ctx.translate(x, y + layout.trackHeight / 2);
				ctx.rotate(Math.PI / 4);

				const size = layout.keyframeRadius * (isHovered || isDragged ? 1.3 : 1);
				ctx.fillStyle = track.color ?? trackColors[track.type] ?? trackColors.custom;
				ctx.fillRect(-size / 2, -size / 2, size, size);

				if (isHovered || isDragged) {
					ctx.strokeStyle = colors.fgPrimary;
					ctx.lineWidth = 2;
					ctx.strokeRect(-size / 2, -size / 2, size, size);
				}

				ctx.restore();
			}
		});

		// Draw scrubber
		const scrubberX = frameToX(currentFrame);
		if (scrubberX >= layout.trackLabelWidth && scrubberX <= canvasWidth) {
			// Scrubber line
			ctx.strokeStyle = colors.error;
			ctx.lineWidth = layout.scrubberWidth;
			ctx.beginPath();
			ctx.moveTo(scrubberX, layout.rulerHeight);
			ctx.lineTo(scrubberX, canvasHeight);
			ctx.stroke();

			// Scrubber head
			ctx.fillStyle = colors.error;
			ctx.beginPath();
			ctx.moveTo(scrubberX - 6, 0);
			ctx.lineTo(scrubberX + 6, 0);
			ctx.lineTo(scrubberX + 6, layout.rulerHeight - 8);
			ctx.lineTo(scrubberX, layout.rulerHeight);
			ctx.lineTo(scrubberX - 6, layout.rulerHeight - 8);
			ctx.closePath();
			ctx.fill();

			// Current time label
			ctx.fillStyle = colors.bgPure;
			ctx.font = '10px system-ui, sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(`${currentFrame}`, scrubberX, layout.rulerHeight - 12);
		}
	});

	// Hit testing
	function getKeyframeAtPosition(
		x: number,
		y: number
	): { trackId: string; keyframeId: string } | null {
		const trackIndex = Math.floor((y - layout.rulerHeight) / layout.trackHeight);
		if (trackIndex < 0 || trackIndex >= tracks.length) return null;

		const track = tracks[trackIndex];
		const frame = xToFrame(x);

		for (const keyframe of track.keyframes) {
			if (Math.abs(keyframe.frame - frame) <= 2) {
				return { trackId: track.id, keyframeId: keyframe.id };
			}
		}
		return null;
	}

	function handleMouseMove(e: MouseEvent) {
		const rect = canvas!.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (isDraggingScrubber) {
			const frame = Math.max(0, Math.min(totalFrames, xToFrame(x)));
			onFrameChange?.(frame);
			return;
		}

		if (isDraggingKeyframe && dragKeyframe) {
			const frame = Math.max(0, Math.min(totalFrames, xToFrame(x)));
			onKeyframeMove?.(dragKeyframe.trackId, dragKeyframe.keyframeId, frame);
			return;
		}

		// Update hover state
		hoveredKeyframe = getKeyframeAtPosition(x, y);
	}

	function handleMouseDown(e: MouseEvent) {
		const rect = canvas!.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		// Check if clicking on ruler (scrubber area)
		if (y < layout.rulerHeight && x > layout.trackLabelWidth) {
			isDraggingScrubber = true;
			const frame = Math.max(0, Math.min(totalFrames, xToFrame(x)));
			onFrameChange?.(frame);
			return;
		}

		// Check if clicking on keyframe
		const keyframe = getKeyframeAtPosition(x, y);
		if (keyframe) {
			isDraggingKeyframe = true;
			dragKeyframe = keyframe;
			return;
		}

		// Double-click to add keyframe
		if (e.detail === 2 && x > layout.trackLabelWidth) {
			const trackIndex = Math.floor((y - layout.rulerHeight) / layout.trackHeight);
			if (trackIndex >= 0 && trackIndex < tracks.length) {
				const frame = Math.max(0, Math.min(totalFrames, xToFrame(x)));
				onKeyframeAdd?.(tracks[trackIndex].id, frame);
			}
		}
	}

	function handleMouseUp() {
		isDraggingScrubber = false;
		isDraggingKeyframe = false;
		dragKeyframe = null;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
			e.preventDefault();
			viewport.scrollLeft += (e.key === 'ArrowRight' ? 1 : -1) * Math.max(44, usableWidth / 4);
			return;
		}

		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (hoveredKeyframe) {
				onKeyframeDelete?.(hoveredKeyframe.trackId, hoveredKeyframe.keyframeId);
				hoveredKeyframe = null;
			}
		}

		// Arrow keys for frame navigation
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			onFrameChange?.(Math.max(0, currentFrame - 1));
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			onFrameChange?.(Math.min(totalFrames, currentFrame + 1));
		}
	}

	function handleWheel(e: WheelEvent) {
		if (e.ctrlKey || e.metaKey) {
			e.preventDefault();
			const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
			zoom = Math.max(0.1, Math.min(10, zoom * zoomDelta));
		} else if (e.shiftKey && !e.deltaX) {
			// Shift-wheel also reaches the native horizontal surface on mice.
			e.preventDefault();
			viewport.scrollLeft += e.deltaY;
		}
	}

	// Format time display
	function formatTime(frame: number): string {
		const seconds = frame / fps;
		const mins = Math.floor(seconds / 60);
		const secs = (seconds % 60).toFixed(2);
		return mins > 0 ? `${mins}:${secs.padStart(5, '0')}` : `${secs}s`;
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="timeline-editor"
	bind:this={owner}
	bind:clientWidth={containerWidth}
	onkeydown={handleKeyDown}
	tabindex="0"
	role="application"
	aria-label="Timeline editor"
>
	<div class="toolbar">
		<div class="time-display">
			<span class="current-time">{formatTime(currentFrame)}</span>
			<span class="separator">/</span>
			<span class="total-time">{formatTime(totalFrames)}</span>
		</div>

		<div class="zoom-controls">
			<button type="button" onclick={() => (zoom = Math.max(0.1, zoom * 0.8))} aria-label="Zoom out" title="Zoom out">−</button>
			<span class="zoom-level">{Math.round(zoom * 100)}%</span>
			<button type="button" onclick={() => (zoom = Math.min(10, zoom * 1.25))} aria-label="Zoom in" title="Zoom in">+</button>
		</div>
	</div>

	<div class="canvas-viewport" bind:this={viewport} tabindex="0" role="region" aria-label="Scrollable timeline canvas; Shift and arrow keys scroll horizontally">
	<canvas
		bind:this={canvas}
		style="width: {canvasWidth}px; height: {canvasHeight}px;"
		onmousemove={handleMouseMove}
		onmousedown={handleMouseDown}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		onwheel={handleWheel}
		class:scrubbing={isDraggingScrubber}
		class:dragging-keyframe={isDraggingKeyframe}
		aria-label="Animation keyframes; use the focused editor arrow keys to navigate frames"
	></canvas>
	</div>
	<noscript><p>Timeline preview requires JavaScript for scrubbing and zoom.</p></noscript>
	<details class="track-summary"><summary>Track and keyframe summary</summary>
		<ul>{#each tracks as track}<li>{track.name}: frames {track.keyframes.map((keyframe) => keyframe.frame).join(', ') || 'none'}</li>{/each}</ul>
	</details>
</div>

<style>
	.timeline-editor {
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-lg);
		min-width: 0;
		max-width: 100%;
	}

	.timeline-editor:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 3px;
	}

	.toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
	}

	.time-display {
		font-family: 'SF Mono', 'Menlo', monospace;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}

	.current-time {
		color: var(--color-performance-fg-primary);
		font-weight: 600;
	}

	.separator {
		color: var(--color-performance-fg-muted);
		margin: 0 var(--space-performance-xs);
	}

	.zoom-controls {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
	}

	.zoom-controls button {
		box-sizing: border-box;
		border: 1px solid var(--color-performance-line-strong);
		background: var(--color-performance-panel);
		font-family: var(--font-performance-interface, inherit);
		width: 44px;
		height: 44px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-performance-scale-sm);
		color: var(--color-performance-fg-secondary);
		cursor: pointer;
		font-size: 14px;
		font-weight: 600;
	}

	.zoom-controls button:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: -3px; }
	.track-summary { padding: .5rem; color: var(--color-performance-fg-secondary); font-size: .875rem; }
	.track-summary summary { cursor: pointer; min-height: 44px; display: flex; align-items: center; }
	.toolbar { flex-wrap: wrap; gap: .5rem; }

	.zoom-controls button:hover {
		background: var(--color-performance-hover);
		color: var(--color-performance-fg-primary);
	}

	.zoom-level {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		min-width: 40px;
		text-align: center;
	}

	.canvas-viewport { max-width: 100%; overflow-x: auto; border-radius: var(--radius-performance-scale-sm); }
	.canvas-viewport:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: -2px; }

	canvas {
		display: block;
		cursor: default;
	}

	canvas.scrubbing {
		cursor: ew-resize;
	}

	canvas.dragging-keyframe {
		cursor: grabbing;
	}

 /* Essential DOM controls reflow independently of the two-dimensional canvas. */
 .toolbar, .time-display, .zoom-controls, .track-summary { min-width: 0; overflow-wrap: anywhere; }
 .time-display { display: flex; flex-wrap: wrap; align-items: baseline; max-width: 100%; }
 .time-display > * { min-width: 0; max-width: 100%; }
 .toolbar { padding-inline: min(var(--space-performance-sm), 5%); }
 .zoom-controls { flex-wrap: wrap; max-width: 100%; }
 .zoom-controls button { min-width: 44px; min-height: 44px; width: auto; height: auto; padding: .4rem; }
 .track-summary ul { padding-inline-start: 1em; }

</style>
