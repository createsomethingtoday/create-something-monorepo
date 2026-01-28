<script lang="ts">
	/**
	 * AnimatedAsciiThumbnail
	 *
	 * Renders static ASCII art that animates on hover using shape-aware
	 * 3D ASCII rendering. Performant because animation only runs while hovered.
	 */

	interface Props {
		/** Static ASCII art to show when not animating */
		staticArt?: string;
		/** Scene type for 3D animation */
		scene?: 'donut' | 'sphere' | 'cube' | 'wave' | 'spiral';
		/** Width in characters */
		cols?: number;
		/** Height in characters */
		rows?: number;
		/** Animation speed multiplier */
		speed?: number;
	}

	let {
		staticArt = '',
		scene = 'donut',
		cols = 50,
		rows = 20,
		speed = 1
	}: Props = $props();

	// State
	let isHovering = $state(false);
	let animatedArt = $state('');
	let animationFrame: number | null = null;
	let canvas: HTMLCanvasElement | null = null;
	let startTime = 0;

	// Pre-computed character shapes (6D vectors, normalized)
	const CHARACTERS = [
		{ char: ' ', vector: [0, 0, 0, 0, 0, 0] },
		{ char: '.', vector: [0, 0, 0, 0, 0.43, 0.43] },
		{ char: ',', vector: [0, 0, 0, 0, 0.48, 0.6] },
		{ char: '-', vector: [0, 0, 0.62, 0.62, 0, 0] },
		{ char: '~', vector: [0, 0, 0.49, 0.49, 0, 0] },
		{ char: ':', vector: [0, 0, 0.36, 0.36, 0.36, 0.36] },
		{ char: ';', vector: [0, 0, 0.32, 0.32, 0.36, 0.45] },
		{ char: '!', vector: [0.72, 0.72, 0.6, 0.6, 0.48, 0.48] },
		{ char: '*', vector: [0.83, 0.83, 0.32, 0.32, 0, 0] },
		{ char: '+', vector: [0.31, 0.31, 0.71, 0.71, 0.31, 0.31] },
		{ char: '=', vector: [0, 0, 0.71, 0.71, 0.71, 0.71] },
		{ char: '^', vector: [0.49, 0.49, 0, 0, 0, 0] },
		{ char: '"', vector: [0.95, 0.95, 0, 0, 0, 0] },
		{ char: '#', vector: [1, 1, 1, 1, 1, 1] },
		{ char: '%', vector: [0.78, 1, 0.58, 0.71, 1, 0.78] },
		{ char: '@', vector: [0.81, 0.81, 0.8, 0.88, 0.81, 0.72] },
		{ char: 'o', vector: [0.23, 0.28, 0.62, 0.62, 0.62, 0.62] },
		{ char: 'O', vector: [0.72, 0.72, 0.54, 0.54, 0.72, 0.72] },
		{ char: '0', vector: [0.95, 0.95, 0.54, 0.54, 0.95, 0.95] },
		{ char: 'x', vector: [0.23, 0.23, 0.45, 0.45, 0.49, 0.49] },
		{ char: 'X', vector: [0.58, 0.58, 0.49, 0.49, 0.58, 0.58] },
		{ char: '/', vector: [0.26, 0.72, 0.45, 0.45, 0.72, 0.26] },
		{ char: '\\', vector: [0.72, 0.26, 0.45, 0.45, 0.26, 0.72] },
		{ char: '|', vector: [0.41, 0.41, 0.41, 0.41, 0.41, 0.41] },
		{ char: '_', vector: [0, 0, 0, 0, 0.76, 0.76] },
		{ char: 'T', vector: [0.81, 0.81, 0.41, 0.41, 0.41, 0.41] },
		{ char: 'L', vector: [0.54, 0.23, 0.49, 0.23, 0.76, 0.72] },
		{ char: 'J', vector: [0.28, 0.54, 0.23, 0.49, 0.58, 0.62] },
		{ char: 'Y', vector: [0.54, 0.54, 0.45, 0.45, 0.41, 0.41] },
		{ char: 'M', vector: [0.76, 0.76, 0.67, 0.67, 0.54, 0.54] },
		{ char: 'W', vector: [0.54, 0.54, 0.67, 0.67, 0.81, 0.81] },
		{ char: 'N', vector: [0.72, 0.62, 0.67, 0.67, 0.54, 0.72] },
		{ char: 'V', vector: [0.54, 0.54, 0.54, 0.54, 0.45, 0.45] },
		{ char: 'A', vector: [0.78, 0.78, 0.75, 0.75, 0.54, 0.54] },
		{ char: 'S', vector: [0.72, 0.76, 0.62, 0.67, 0.76, 0.72] },
		{ char: 'H', vector: [0.54, 0.54, 0.71, 0.71, 0.54, 0.54] },
		{ char: 'B', vector: [0.86, 0.72, 0.8, 0.71, 0.86, 0.72] },
		{ char: 'D', vector: [0.86, 0.72, 0.71, 0.54, 0.86, 0.72] },
		{ char: 'Q', vector: [0.72, 0.72, 0.54, 0.54, 0.72, 0.81] },
		{ char: '$', vector: [0.81, 0.81, 0.84, 0.84, 0.81, 0.81] }
	];

	// Find best character for a shape vector
	function findChar(v: number[]): string {
		let best = ' ';
		let bestDist = Infinity;
		for (const c of CHARACTERS) {
			let dist = 0;
			for (let i = 0; i < 6; i++) {
				const d = v[i] - c.vector[i];
				dist += d * d;
			}
			if (dist < bestDist) {
				bestDist = dist;
				best = c.char;
			}
		}
		return best;
	}

	// Apply contrast enhancement
	function enhance(v: number[], exp: number): number[] {
		const max = Math.max(...v);
		if (max === 0) return v;
		return v.map(x => Math.pow(x / max, exp) * max);
	}

	// Render a 3D scene to ASCII
	function renderScene(time: number): string {
		const cellW = 8;
		const cellH = 16;
		const w = cols * cellW;
		const h = rows * cellH;

		const lines: string[] = [];
		const t = time * speed * 0.001;

		for (let row = 0; row < rows; row++) {
			let line = '';
			for (let col = 0; col < cols; col++) {
				// Normalized coordinates
				const nx = (col / cols) * 2 - 1;
				const ny = (row / rows) * 2 - 1;

				let lightness = 0;

				switch (scene) {
					case 'donut': {
						const R = 0.5, r = 0.2;
						const d = Math.sqrt(nx * nx + ny * ny);
						const ring = Math.abs(d - R);
						if (ring <= r) {
							const hz = Math.sqrt(r * r - ring * ring);
							const angle = Math.atan2(ny, nx) + t;
							const nxr = Math.cos(angle) * ((d - R) / r);
							const nz = hz / r;
							lightness = Math.max(0, nxr * Math.sin(t * 0.5) + nz * Math.cos(t * 0.5));
						}
						break;
					}
					case 'sphere': {
						const r2 = nx * nx + ny * ny;
						if (r2 < 0.8) {
							const z = Math.sqrt(0.8 - r2);
							const rx = nx * Math.cos(t) - z * Math.sin(t);
							const rz = z * Math.cos(t);
							lightness = Math.max(0, rx * 0.3 + ny * -0.3 + rz * 0.9);
						}
						break;
					}
					case 'cube': {
						const cx = nx * Math.cos(t) - ny * Math.sin(t);
						const cy = nx * Math.sin(t) + ny * Math.cos(t);
						const size = 0.45;
						if (Math.abs(cx) <= size && Math.abs(cy) <= size) {
							const edge = Math.abs(cx) > size - 0.08 || Math.abs(cy) > size - 0.08;
							lightness = edge ? 0.9 : (cx > 0 ? 0.65 : 0.35);
						}
						break;
					}
					case 'wave': {
						const wave = Math.sin(nx * 4 + t * 2) * Math.cos(ny * 4 + t * 1.5);
						lightness = (wave + 1) * 0.5;
						break;
					}
					case 'spiral': {
						const angle = Math.atan2(ny, nx);
						const dist = Math.sqrt(nx * nx + ny * ny);
						const spiral = Math.sin(angle * 3 - dist * 10 + t * 3);
						lightness = dist < 0.9 ? (spiral + 1) * 0.5 * (1 - dist) : 0;
						break;
					}
				}

				// Simple 6D sampling (approximation for speed)
				const v = [
					lightness * 0.9, lightness * 0.9,
					lightness, lightness,
					lightness * 0.9, lightness * 0.9
				];

				// Apply contrast
				const enhanced = enhance(v, 2.5);
				line += findChar(enhanced);
			}
			lines.push(line);
		}

		return lines.join('\n');
	}

	// Animation loop
	function animate(timestamp: number) {
		if (!isHovering) return;

		const elapsed = timestamp - startTime;
		animatedArt = renderScene(elapsed);

		animationFrame = requestAnimationFrame(animate);
	}

	// Start animation on hover
	function handleMouseEnter() {
		isHovering = true;
		startTime = performance.now();
		animationFrame = requestAnimationFrame(animate);
	}

	// Stop animation on leave
	function handleMouseLeave() {
		isHovering = false;
		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
			animationFrame = null;
		}
	}

	// Cleanup on destroy
	$effect(() => {
		return () => {
			if (animationFrame) {
				cancelAnimationFrame(animationFrame);
			}
		};
	});
</script>

<div
	class="ascii-thumbnail"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	role="img"
	aria-label="Animated ASCII art thumbnail"
>
	<pre class="ascii-art">{isHovering ? animatedArt : staticArt}</pre>
</div>

<style>
	.ascii-thumbnail {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.ascii-art {
		font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
		font-size: var(--text-overline);
		line-height: 1.1;
		color: var(--color-fg-primary);
		opacity: 0.9;
		transition: opacity var(--duration-micro) var(--ease-standard);
		white-space: pre;
		user-select: none;
	}

	.ascii-thumbnail:hover .ascii-art {
		opacity: 1;
	}
</style>
