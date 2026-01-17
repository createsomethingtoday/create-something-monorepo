<script lang="ts">
	/**
	 * TimelineEditor - Interactive keyframe animation editor
	 *
	 * Canvas-based timeline editor for motion-studio integration.
	 * Supports keyframe editing, scrubbing, and track management.
	 */

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
	let containerWidth = $state(800);
	let isDraggingScrubber = $state(false);
	let isDraggingKeyframe = $state(false);
	let dragKeyframe: { trackId: string; keyframeId: string } | null = $state(null);
	let hoveredKeyframe: { trackId: string; keyframeId: string } | null = $state(null);
	let scrollX = $state(0);
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

	// Resolve CSS custom properties
	function resolveColors() {
		if (typeof window === 'undefined') return;
		const styles = getComputedStyle(document.documentElement);
		const get = (prop: string, fallback: string) =>
			styles.getPropertyValue(prop).trim() || fallback;

		colors = {
			bgPure: get('--color-bg-pure', '#0a0a0a'),
			bgSurface: get('--color-bg-surface', '#141414'),
			bgElevated: get('--color-bg-elevated', '#1a1a1a'),
			fgPrimary: get('--color-fg-primary', '#ffffff'),
			fgSecondary: get('--color-fg-secondary', '#888888'),
			fgMuted: get('--color-fg-muted', '#666666'),
			borderDefault: get('--color-border-default', '#333333'),
			borderEmphasis: get('--color-border-emphasis', '#4f46e5'),
			error: get('--color-error', '#ef4444')
		};
	}

	// Calculate visible area
	const pixelsPerFrame = $derived((containerWidth - layout.trackLabelWidth) / (totalFrames / zoom));
	const timelineWidth = $derived(totalFrames * pixelsPerFrame);
	const canvasHeight = $derived(layout.rulerHeight + tracks.length * layout.trackHeight);

	// Frame to X position
	function frameToX(frame: number): number {
		return layout.trackLabelWidth + frame * pixelsPerFrame - scrollX;
	}

	// X position to frame
	function xToFrame(x: number): number {
		return Math.round((x - layout.trackLabelWidth + scrollX) / pixelsPerFrame);
	}

	// Resolve colors on mount
	$effect(() => {
		resolveColors();
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
		canvasEl.width = containerWidth * dpr;
		canvasEl.height = canvasHeight * dpr;
		ctx.scale(dpr, dpr);

		// Clear
		ctx.fillStyle = colors.bgPure;
		ctx.fillRect(0, 0, containerWidth, canvasHeight);

		// Draw track labels background
		ctx.fillStyle = colors.bgSurface;
		ctx.fillRect(0, 0, layout.trackLabelWidth, canvasHeight);

		// Draw ruler
		ctx.fillStyle = colors.bgElevated;
		ctx.fillRect(layout.trackLabelWidth, 0, containerWidth - layout.trackLabelWidth, layout.rulerHeight);

		// Draw ruler ticks and labels
		const majorTickInterval = Math.max(1, Math.floor(fps / zoom));
		const minorTickInterval = Math.max(1, Math.floor(majorTickInterval / 5));

		ctx.strokeStyle = colors.borderDefault;
		ctx.fillStyle = colors.fgMuted;
		ctx.font = '10px system-ui, sans-serif';
		ctx.textAlign = 'center';

		for (let frame = 0; frame <= totalFrames; frame += minorTickInterval) {
			const x = frameToX(frame);
			if (x < layout.trackLabelWidth || x > containerWidth) continue;

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
			ctx.fillRect(layout.trackLabelWidth, y, containerWidth - layout.trackLabelWidth, layout.trackHeight);

			// Track label
			ctx.fillStyle = colors.bgSurface;
			ctx.fillRect(0, y, layout.trackLabelWidth, layout.trackHeight);

			ctx.strokeStyle = colors.borderDefault;
			ctx.beginPath();
			ctx.moveTo(0, y + layout.trackHeight);
			ctx.lineTo(containerWidth, y + layout.trackHeight);
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
				if (x2 > layout.trackLabelWidth && x1 < containerWidth) {
					drawEasingCurve(ctx, x1, y, x2, kf.easing ?? 'linear');
				}
			}

			// Draw keyframes
			for (const keyframe of track.keyframes) {
				const x = frameToX(keyframe.frame);
				if (x < layout.trackLabelWidth - layout.keyframeRadius || x > containerWidth + layout.keyframeRadius) continue;

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
		if (scrubberX >= layout.trackLabelWidth && scrubberX <= containerWidth) {
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
				const frame = xToFrame(x);
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
		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (hoveredKeyframe) {
				onKeyframeDelete?.(hoveredKeyframe.trackId, hoveredKeyframe.keyframeId);
				hoveredKeyframe = null;
			}
		}

		// Arrow keys for frame navigation
		if (e.key === 'ArrowLeft') {
			onFrameChange?.(Math.max(0, currentFrame - 1));
		} else if (e.key === 'ArrowRight') {
			onFrameChange?.(Math.min(totalFrames, currentFrame + 1));
		}
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();

		if (e.ctrlKey || e.metaKey) {
			// Zoom
			const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
			zoom = Math.max(0.1, Math.min(10, zoom * zoomDelta));
		} else {
			// Scroll
			scrollX = Math.max(0, Math.min(timelineWidth - containerWidth + layout.trackLabelWidth, scrollX + e.deltaX));
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
			<button onclick={() => (zoom = Math.max(0.1, zoom * 0.8))} title="Zoom out">−</button>
			<span class="zoom-level">{Math.round(zoom * 100)}%</span>
			<button onclick={() => (zoom = Math.min(10, zoom * 1.25))} title="Zoom in">+</button>
		</div>
	</div>

	<canvas
		bind:this={canvas}
		style="width: {containerWidth}px; height: {canvasHeight}px;"
		onmousemove={handleMouseMove}
		onmousedown={handleMouseDown}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		onwheel={handleWheel}
		class:scrubbing={isDraggingScrubber}
		class:dragging-keyframe={isDraggingKeyframe}
	></canvas>
</div>

<style>
	.timeline-editor {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		outline: none;
	}

	.timeline-editor:focus {
		border-color: var(--color-focus);
	}

	.toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border-bottom: 1px solid var(--color-border-default);
	}

	.time-display {
		font-family: 'SF Mono', 'Menlo', monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.current-time {
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	.separator {
		color: var(--color-fg-muted);
		margin: 0 var(--space-xs);
	}

	.zoom-controls {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.zoom-controls button {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		cursor: pointer;
		font-size: 14px;
		font-weight: 600;
	}

	.zoom-controls button:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.zoom-level {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		min-width: 40px;
		text-align: center;
	}

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
</style>
