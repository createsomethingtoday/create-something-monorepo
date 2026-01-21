<script lang="ts">
	/**
	 * ASCII Renderer Experiment
	 *
	 * Shape-aware ASCII rendering with 6D character matching
	 * and contrast enhancement. Based on Alex Harri's technique.
	 *
	 * @see https://alexharri.com/blog/ascii-rendering
	 */
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();
	const { experiment } = data;

	// Renderer configuration
	let cellWidth = $state(8);
	let cellHeight = $state(16);
	let globalContrast = $state(2.0);
	let directionalContrast = $state(3.0);
	let samplesPerCircle = $state(12);

	// Animation state
	let scene = $state<'sphere' | 'cube' | 'donut'>('donut');
	let animating = $state(true);
	let rotationX = $state(0.3);
	let rotationY = $state(0);
	let rotationZ = $state(0);
	let frameCount = $state(0);

	// Render dimensions
	let width = $state(640);
	let height = $state(400);

	// Output
	let asciiOutput = $state('');
	let cols = $state(0);
	let rows = $state(0);
	let renderTime = $state(0);

	// Canvas references
	let sourceCanvas: HTMLCanvasElement | null = $state(null);
	let animationFrame: number | null = null;

	// Image upload
	let uploadedImage: HTMLImageElement | null = $state(null);
	let mode = $state<'3d' | 'image'>('3d');

	// ========== Inline ASCII Renderer Implementation ==========
	// (Included inline to avoid build dependency issues during development)

	type ShapeVector = [number, number, number, number, number, number];
	type ExternalVector = [number, number, number, number, number, number, number, number, number, number];

	interface CharacterShape {
		char: string;
		vector: ShapeVector;
	}

	// Pre-computed shape vectors for ASCII 95 characters (normalized)
	const CHARACTERS: CharacterShape[] = [
		{ char: ' ', vector: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0] },
		{ char: '!', vector: [0.72, 0.72, 0.6, 0.6, 0.48, 0.48] },
		{ char: '"', vector: [0.95, 0.95, 0.0, 0.0, 0.0, 0.0] },
		{ char: '#', vector: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0] },
		{ char: '$', vector: [0.81, 0.81, 0.84, 0.84, 0.81, 0.81] },
		{ char: '%', vector: [0.78, 1.0, 0.58, 0.71, 1.0, 0.78] },
		{ char: '&', vector: [0.9, 0.66, 0.71, 0.8, 0.81, 0.81] },
		{ char: "'", vector: [0.55, 0.55, 0.0, 0.0, 0.0, 0.0] },
		{ char: '(', vector: [0.6, 0.38, 0.49, 0.23, 0.6, 0.38] },
		{ char: ')', vector: [0.38, 0.6, 0.23, 0.49, 0.38, 0.6] },
		{ char: '*', vector: [0.83, 0.83, 0.32, 0.32, 0.0, 0.0] },
		{ char: '+', vector: [0.31, 0.31, 0.71, 0.71, 0.31, 0.31] },
		{ char: ',', vector: [0.0, 0.0, 0.0, 0.0, 0.48, 0.6] },
		{ char: '-', vector: [0.0, 0.0, 0.62, 0.62, 0.0, 0.0] },
		{ char: '.', vector: [0.0, 0.0, 0.0, 0.0, 0.43, 0.43] },
		{ char: '/', vector: [0.26, 0.72, 0.45, 0.45, 0.72, 0.26] },
		{ char: '0', vector: [0.95, 0.95, 0.54, 0.54, 0.95, 0.95] },
		{ char: '1', vector: [0.6, 0.6, 0.41, 0.41, 0.83, 0.83] },
		{ char: '2', vector: [0.9, 0.9, 0.58, 0.71, 1.0, 1.0] },
		{ char: '3', vector: [0.9, 0.9, 0.54, 0.71, 0.9, 0.95] },
		{ char: '4', vector: [0.72, 0.78, 0.71, 0.71, 0.31, 0.78] },
		{ char: '5', vector: [1.0, 0.9, 0.71, 0.54, 0.9, 0.95] },
		{ char: '6', vector: [0.9, 0.83, 0.71, 0.62, 0.95, 0.95] },
		{ char: '7', vector: [0.95, 0.95, 0.32, 0.54, 0.32, 0.49] },
		{ char: '8', vector: [0.95, 0.95, 0.71, 0.71, 0.95, 0.95] },
		{ char: '9', vector: [0.95, 0.95, 0.62, 0.71, 0.83, 0.9] },
		{ char: ':', vector: [0.0, 0.0, 0.36, 0.36, 0.36, 0.36] },
		{ char: ';', vector: [0.0, 0.0, 0.32, 0.32, 0.36, 0.45] },
		{ char: '<', vector: [0.26, 0.6, 0.49, 0.28, 0.26, 0.6] },
		{ char: '=', vector: [0.0, 0.0, 0.71, 0.71, 0.71, 0.71] },
		{ char: '>', vector: [0.6, 0.26, 0.28, 0.49, 0.6, 0.26] },
		{ char: '?', vector: [0.83, 0.9, 0.32, 0.54, 0.32, 0.32] },
		{ char: '@', vector: [0.81, 0.81, 0.8, 0.88, 0.81, 0.72] },
		{ char: 'A', vector: [0.78, 0.78, 0.75, 0.75, 0.54, 0.54] },
		{ char: 'B', vector: [0.86, 0.72, 0.8, 0.71, 0.86, 0.72] },
		{ char: 'C', vector: [0.72, 0.72, 0.54, 0.28, 0.72, 0.72] },
		{ char: 'D', vector: [0.86, 0.72, 0.71, 0.54, 0.86, 0.72] },
		{ char: 'E', vector: [0.81, 0.72, 0.71, 0.54, 0.81, 0.72] },
		{ char: 'F', vector: [0.81, 0.72, 0.71, 0.54, 0.54, 0.23] },
		{ char: 'G', vector: [0.72, 0.72, 0.54, 0.62, 0.76, 0.76] },
		{ char: 'H', vector: [0.54, 0.54, 0.71, 0.71, 0.54, 0.54] },
		{ char: 'I', vector: [0.76, 0.76, 0.41, 0.41, 0.76, 0.76] },
		{ char: 'J', vector: [0.28, 0.54, 0.23, 0.49, 0.58, 0.62] },
		{ char: 'K', vector: [0.54, 0.62, 0.71, 0.45, 0.54, 0.62] },
		{ char: 'L', vector: [0.54, 0.23, 0.49, 0.23, 0.76, 0.72] },
		{ char: 'M', vector: [0.76, 0.76, 0.67, 0.67, 0.54, 0.54] },
		{ char: 'N', vector: [0.72, 0.62, 0.67, 0.67, 0.54, 0.72] },
		{ char: 'O', vector: [0.72, 0.72, 0.54, 0.54, 0.72, 0.72] },
		{ char: 'P', vector: [0.86, 0.72, 0.71, 0.62, 0.54, 0.23] },
		{ char: 'Q', vector: [0.72, 0.72, 0.54, 0.54, 0.72, 0.81] },
		{ char: 'R', vector: [0.86, 0.72, 0.71, 0.62, 0.54, 0.62] },
		{ char: 'S', vector: [0.72, 0.76, 0.62, 0.67, 0.76, 0.72] },
		{ char: 'T', vector: [0.81, 0.81, 0.41, 0.41, 0.41, 0.41] },
		{ char: 'U', vector: [0.54, 0.54, 0.54, 0.54, 0.72, 0.72] },
		{ char: 'V', vector: [0.54, 0.54, 0.54, 0.54, 0.45, 0.45] },
		{ char: 'W', vector: [0.54, 0.54, 0.67, 0.67, 0.81, 0.81] },
		{ char: 'X', vector: [0.58, 0.58, 0.49, 0.49, 0.58, 0.58] },
		{ char: 'Y', vector: [0.54, 0.54, 0.45, 0.45, 0.41, 0.41] },
		{ char: 'Z', vector: [0.76, 0.76, 0.45, 0.54, 0.76, 0.76] },
		{ char: '[', vector: [0.54, 0.32, 0.49, 0.23, 0.54, 0.32] },
		{ char: '\\', vector: [0.72, 0.26, 0.45, 0.45, 0.26, 0.72] },
		{ char: ']', vector: [0.32, 0.54, 0.23, 0.49, 0.32, 0.54] },
		{ char: '^', vector: [0.49, 0.49, 0.0, 0.0, 0.0, 0.0] },
		{ char: '_', vector: [0.0, 0.0, 0.0, 0.0, 0.76, 0.76] },
		{ char: '`', vector: [0.41, 0.23, 0.0, 0.0, 0.0, 0.0] },
		{ char: 'a', vector: [0.19, 0.32, 0.62, 0.67, 0.67, 0.71] },
		{ char: 'b', vector: [0.54, 0.28, 0.71, 0.62, 0.71, 0.67] },
		{ char: 'c', vector: [0.19, 0.28, 0.54, 0.28, 0.58, 0.54] },
		{ char: 'd', vector: [0.28, 0.54, 0.62, 0.71, 0.67, 0.71] },
		{ char: 'e', vector: [0.19, 0.28, 0.67, 0.67, 0.58, 0.54] },
		{ char: 'f', vector: [0.45, 0.54, 0.62, 0.45, 0.49, 0.28] },
		{ char: 'g', vector: [0.28, 0.36, 0.67, 0.71, 0.67, 0.71] },
		{ char: 'h', vector: [0.54, 0.28, 0.67, 0.62, 0.49, 0.54] },
		{ char: 'i', vector: [0.32, 0.32, 0.32, 0.32, 0.54, 0.54] },
		{ char: 'j', vector: [0.28, 0.41, 0.23, 0.41, 0.49, 0.58] },
		{ char: 'k', vector: [0.54, 0.28, 0.62, 0.45, 0.49, 0.58] },
		{ char: 'l', vector: [0.45, 0.32, 0.41, 0.32, 0.49, 0.54] },
		{ char: 'm', vector: [0.23, 0.23, 0.75, 0.75, 0.54, 0.54] },
		{ char: 'n', vector: [0.23, 0.23, 0.67, 0.62, 0.49, 0.54] },
		{ char: 'o', vector: [0.23, 0.28, 0.62, 0.62, 0.62, 0.62] },
		{ char: 'p', vector: [0.28, 0.32, 0.71, 0.62, 0.62, 0.28] },
		{ char: 'q', vector: [0.32, 0.28, 0.62, 0.71, 0.28, 0.62] },
		{ char: 'r', vector: [0.23, 0.28, 0.58, 0.41, 0.45, 0.23] },
		{ char: 's', vector: [0.23, 0.36, 0.54, 0.54, 0.54, 0.54] },
		{ char: 't', vector: [0.45, 0.32, 0.62, 0.41, 0.41, 0.54] },
		{ char: 'u', vector: [0.23, 0.23, 0.54, 0.54, 0.62, 0.67] },
		{ char: 'v', vector: [0.23, 0.23, 0.49, 0.49, 0.41, 0.41] },
		{ char: 'w', vector: [0.23, 0.23, 0.62, 0.62, 0.67, 0.67] },
		{ char: 'x', vector: [0.23, 0.23, 0.45, 0.45, 0.49, 0.49] },
		{ char: 'y', vector: [0.23, 0.23, 0.54, 0.54, 0.54, 0.67] },
		{ char: 'z', vector: [0.23, 0.28, 0.41, 0.49, 0.58, 0.54] },
		{ char: '{', vector: [0.36, 0.41, 0.49, 0.28, 0.36, 0.41] },
		{ char: '|', vector: [0.41, 0.41, 0.41, 0.41, 0.41, 0.41] },
		{ char: '}', vector: [0.41, 0.36, 0.28, 0.49, 0.41, 0.36] },
		{ char: '~', vector: [0.0, 0.0, 0.49, 0.49, 0.0, 0.0] },
	];

	// 6 sampling circles in staggered 2x3 arrangement
	const SAMPLING_CIRCLES = [
		{ cx: 0.28, cy: 0.2, radius: 0.22 },
		{ cx: 0.72, cy: 0.13, radius: 0.22 },
		{ cx: 0.28, cy: 0.5, radius: 0.22 },
		{ cx: 0.72, cy: 0.5, radius: 0.22 },
		{ cx: 0.28, cy: 0.8, radius: 0.22 },
		{ cx: 0.72, cy: 0.87, radius: 0.22 },
	];

	// External circles for directional contrast
	const EXTERNAL_CIRCLES = [
		{ cx: 0.28, cy: -0.15, radius: 0.18 },
		{ cx: 0.72, cy: -0.15, radius: 0.18 },
		{ cx: -0.1, cy: 0.2, radius: 0.18 },
		{ cx: 1.1, cy: 0.13, radius: 0.18 },
		{ cx: -0.1, cy: 0.5, radius: 0.18 },
		{ cx: 1.1, cy: 0.5, radius: 0.18 },
		{ cx: -0.1, cy: 0.8, radius: 0.18 },
		{ cx: 1.1, cy: 0.87, radius: 0.18 },
		{ cx: 0.28, cy: 1.15, radius: 0.18 },
		{ cx: 0.72, cy: 1.15, radius: 0.18 },
	];

	const AFFECTING_INDICES = [
		[0, 1, 2, 4],
		[0, 1, 3, 5],
		[2, 4, 6],
		[3, 5, 7],
		[4, 6, 8, 9],
		[5, 7, 8, 9],
	];

	function distanceSquared(a: ShapeVector, b: ShapeVector): number {
		let sum = 0;
		for (let i = 0; i < 6; i++) {
			const diff = a[i] - b[i];
			sum += diff * diff;
		}
		return sum;
	}

	function findBestCharacter(vector: ShapeVector): string {
		let bestChar = ' ';
		let bestDist = Infinity;

		for (const { char, vector: charVector } of CHARACTERS) {
			const dist = distanceSquared(charVector, vector);
			if (dist < bestDist) {
				bestDist = dist;
				bestChar = char;
			}
		}

		return bestChar;
	}

	function generateSamplePoints(cx: number, cy: number, radius: number, count: number) {
		const points: { x: number; y: number }[] = [];
		const goldenAngle = Math.PI * (3 - Math.sqrt(5));

		for (let i = 0; i < count; i++) {
			const r = radius * Math.sqrt((i + 0.5) / count);
			const theta = i * goldenAngle;
			points.push({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) });
		}
		return points;
	}

	function sampleCircle(
		imageData: ImageData,
		cellX: number,
		cellY: number,
		cellW: number,
		cellH: number,
		circle: { cx: number; cy: number; radius: number },
		samples: number
	): number {
		const cx = cellX + circle.cx * cellW;
		const cy = cellY + circle.cy * cellH;
		const radius = circle.radius * Math.min(cellW, cellH);
		const points = generateSamplePoints(cx, cy, radius, samples);

		let sum = 0;
		for (const { x, y } of points) {
			const px = Math.max(0, Math.min(imageData.width - 1, Math.round(x)));
			const py = Math.max(0, Math.min(imageData.height - 1, Math.round(y)));
			const idx = (py * imageData.width + px) * 4;
			const r = imageData.data[idx];
			const g = imageData.data[idx + 1];
			const b = imageData.data[idx + 2];
			sum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
		}

		return sum / samples;
	}

	function applyGlobalContrast(vector: ShapeVector, exponent: number): ShapeVector {
		if (exponent <= 1) return [...vector] as ShapeVector;
		const maxValue = Math.max(...vector);
		if (maxValue === 0) return [...vector] as ShapeVector;

		return vector.map((v) => {
			const normalized = v / maxValue;
			const enhanced = Math.pow(normalized, exponent);
			return enhanced * maxValue;
		}) as ShapeVector;
	}

	function applyDirectionalContrast(
		internal: ShapeVector,
		external: ExternalVector,
		exponent: number
	): ShapeVector {
		if (exponent <= 1) return [...internal] as ShapeVector;

		return internal.map((value, i) => {
			let maxExternal = value;
			for (const extIdx of AFFECTING_INDICES[i]) {
				maxExternal = Math.max(maxExternal, external[extIdx]);
			}
			if (maxExternal === 0) return value;
			const normalized = value / maxExternal;
			const enhanced = Math.pow(normalized, exponent);
			return enhanced * maxExternal;
		}) as ShapeVector;
	}

	function renderAscii(imageData: ImageData): { chars: string[][]; cols: number; rows: number } {
		const cols = Math.floor(imageData.width / cellWidth);
		const rows = Math.floor(imageData.height / cellHeight);
		const chars: string[][] = [];

		for (let row = 0; row < rows; row++) {
			const rowChars: string[] = [];
			for (let col = 0; col < cols; col++) {
				const cellX = col * cellWidth;
				const cellY = row * cellHeight;

				// Sample internal vector
				let internal: ShapeVector = [0, 0, 0, 0, 0, 0];
				for (let i = 0; i < 6; i++) {
					internal[i] = sampleCircle(
						imageData,
						cellX,
						cellY,
						cellWidth,
						cellHeight,
						SAMPLING_CIRCLES[i],
						samplesPerCircle
					);
				}

				// Sample external for directional contrast
				if (directionalContrast > 1) {
					const external: ExternalVector = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
					for (let i = 0; i < 10; i++) {
						external[i] = sampleCircle(
							imageData,
							cellX,
							cellY,
							cellWidth,
							cellHeight,
							EXTERNAL_CIRCLES[i],
							Math.max(6, samplesPerCircle - 4)
						);
					}
					internal = applyDirectionalContrast(internal, external, directionalContrast);
				}

				// Apply global contrast
				if (globalContrast > 1) {
					internal = applyGlobalContrast(internal, globalContrast);
				}

				rowChars.push(findBestCharacter(internal));
			}
			chars.push(rowChars);
		}

		return { chars, cols, rows };
	}

	// ========== 3D Scene Rendering ==========

	function render3DScene() {
		if (!sourceCanvas) return;
		const ctx = sourceCanvas.getContext('2d');
		if (!ctx) return;

		const w = width;
		const h = height;
		sourceCanvas.width = w;
		sourceCanvas.height = h;

		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, w, h);

		const imageData = ctx.createImageData(w, h);

		for (let py = 0; py < h; py++) {
			for (let px = 0; px < w; px++) {
				const x = (px / w) * 2 - 1;
				const y = (py / h) * 2 - 1;

				let lightness = 0;

				if (scene === 'sphere') {
					const r2 = x * x + y * y;
					if (r2 < 0.8) {
						const z = Math.sqrt(0.8 - r2);
						const nx = x * Math.cos(rotationY) - z * Math.sin(rotationY);
						const ny = y * Math.cos(rotationX) - z * Math.sin(rotationX);
						const nz = z * Math.cos(rotationY) * Math.cos(rotationX);
						lightness = Math.max(0, nx * 0.3 + ny * -0.3 + nz * 0.9);
					}
				} else if (scene === 'cube') {
					const cx = x * Math.cos(rotationY) - y * Math.sin(rotationY);
					const cy = x * Math.sin(rotationY) + y * Math.cos(rotationY);
					const size = 0.5;
					if (Math.abs(cx) <= size && Math.abs(cy) <= size) {
						const edgeX = Math.abs(cx) > size - 0.05;
						const edgeY = Math.abs(cy) > size - 0.05;
						if (edgeX || edgeY) {
							lightness = 0.9;
						} else {
							lightness = cx > 0 ? 0.6 : 0.4;
						}
					}
				} else if (scene === 'donut') {
					const R = 0.5;
					const r = 0.2;
					const d = Math.sqrt(x * x + y * y);
					const ring = Math.abs(d - R);
					if (ring <= r) {
						const hval = Math.sqrt(r * r - ring * ring);
						const angle = Math.atan2(y, x) + rotationZ;
						const nx = Math.cos(angle) * ((d - R) / r);
						const nz = hval / r;
						lightness = Math.max(0, nx * Math.sin(rotationY) + nz * Math.cos(rotationY));
					}
				}

				const idx = (py * w + px) * 4;
				const value = Math.floor(lightness * 255);
				imageData.data[idx] = value;
				imageData.data[idx + 1] = value;
				imageData.data[idx + 2] = value;
				imageData.data[idx + 3] = 255;
			}
		}

		ctx.putImageData(imageData, 0, 0);
		return imageData;
	}

	function renderUploadedImage() {
		if (!sourceCanvas || !uploadedImage) return;
		const ctx = sourceCanvas.getContext('2d');
		if (!ctx) return;

		// Fit image to canvas while maintaining aspect ratio
		const scale = Math.min(width / uploadedImage.width, height / uploadedImage.height);
		const w = Math.floor(uploadedImage.width * scale);
		const h = Math.floor(uploadedImage.height * scale);

		sourceCanvas.width = w;
		sourceCanvas.height = h;
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, w, h);
		ctx.drawImage(uploadedImage, 0, 0, w, h);

		return ctx.getImageData(0, 0, w, h);
	}

	function renderFrame() {
		const start = performance.now();

		let imageData: ImageData | undefined;
		if (mode === 'image' && uploadedImage) {
			imageData = renderUploadedImage();
		} else {
			imageData = render3DScene();
		}

		if (imageData) {
			const result = renderAscii(imageData);
			asciiOutput = result.chars.map((row) => row.join('')).join('\n');
			cols = result.cols;
			rows = result.rows;
		}

		renderTime = performance.now() - start;

		if (animating && mode === '3d') {
			rotationY += 0.02;
			frameCount++;
			animationFrame = requestAnimationFrame(renderFrame);
		}
	}

	function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const img = new Image();
		img.onload = () => {
			uploadedImage = img;
			mode = 'image';
			animating = false;
			renderFrame();
		};
		img.src = URL.createObjectURL(file);
	}

	function switchTo3D() {
		mode = '3d';
		animating = true;
		renderFrame();
	}

	onMount(() => {
		renderFrame();

		return () => {
			if (animationFrame) {
				cancelAnimationFrame(animationFrame);
			}
		};
	});

	// Reactivity for settings changes
	$effect(() => {
		// Dependencies
		void cellWidth;
		void cellHeight;
		void globalContrast;
		void directionalContrast;
		void samplesPerCircle;
		void scene;

		if (!animating && sourceCanvas) {
			renderFrame();
		}
	});
</script>

<svelte:head>
	<title>{experiment.title} | Experiments</title>
	<meta name="description" content={experiment.description} />
</svelte:head>

<div class="experiment-page">
	<header class="page-header">
		<h1>Shape-Aware ASCII Renderer</h1>
		<p class="subtitle">
			6D character matching with contrast enhancement for high-quality ASCII art.
			Based on <a href="https://alexharri.com/blog/ascii-rendering" target="_blank" rel="noopener"
				>Alex Harri's technique</a
			>.
		</p>
	</header>

	<section class="demo-section">
		<div class="demo-container">
			<div class="ascii-output">
				<pre>{asciiOutput}</pre>
			</div>

			<div class="hidden-canvas">
				<canvas bind:this={sourceCanvas}></canvas>
			</div>
		</div>

		<div class="stats">
			<span>{cols}×{rows} characters</span>
			<span>{renderTime.toFixed(1)}ms render time</span>
			{#if mode === '3d' && animating}
				<span>Frame: {frameCount}</span>
			{/if}
		</div>
	</section>

	<section class="controls-section">
		<h2>Scene</h2>
		<div class="scene-buttons">
			<button class:active={mode === '3d' && scene === 'donut'} onclick={() => { scene = 'donut'; switchTo3D(); }}>
				Donut
			</button>
			<button class:active={mode === '3d' && scene === 'sphere'} onclick={() => { scene = 'sphere'; switchTo3D(); }}>
				Sphere
			</button>
			<button class:active={mode === '3d' && scene === 'cube'} onclick={() => { scene = 'cube'; switchTo3D(); }}>
				Cube
			</button>
			<label class="upload-button">
				Upload Image
				<input type="file" accept="image/*" onchange={handleFileUpload} />
			</label>
		</div>

		{#if mode === '3d'}
			<div class="animation-control">
				<button onclick={() => { animating = !animating; if (animating) renderFrame(); }}>
					{animating ? 'Pause' : 'Play'} Animation
				</button>
			</div>
		{/if}

		<h2>Contrast Enhancement</h2>
		<div class="slider-group">
			<label>
				<span>Global Contrast: {globalContrast.toFixed(1)}</span>
				<input type="range" min="1" max="5" step="0.1" bind:value={globalContrast} />
			</label>
			<label>
				<span>Directional Contrast: {directionalContrast.toFixed(1)}</span>
				<input type="range" min="1" max="6" step="0.1" bind:value={directionalContrast} />
			</label>
		</div>

		<h2>Cell Size</h2>
		<div class="slider-group">
			<label>
				<span>Cell Width: {cellWidth}px</span>
				<input type="range" min="4" max="16" step="1" bind:value={cellWidth} />
			</label>
			<label>
				<span>Cell Height: {cellHeight}px</span>
				<input type="range" min="8" max="32" step="1" bind:value={cellHeight} />
			</label>
		</div>

		<h2>Quality</h2>
		<div class="slider-group">
			<label>
				<span>Samples/Circle: {samplesPerCircle}</span>
				<input type="range" min="4" max="24" step="2" bind:value={samplesPerCircle} />
			</label>
		</div>
	</section>

	<section class="technique-section">
		<h2>How It Works</h2>

		<div class="technique-grid">
			<div class="technique-card">
				<h3>6D Shape Vectors</h3>
				<p>
					Each ASCII character is represented as a 6D vector capturing how it fills its cell.
					Six sampling circles in a staggered 2×3 grid measure density at different positions.
				</p>
			</div>

			<div class="technique-card">
				<h3>Nearest Neighbor Matching</h3>
				<p>
					For each cell in the image, we sample a 6D vector and find the character whose
					pre-computed shape vector is closest in Euclidean distance.
				</p>
			</div>

			<div class="technique-card">
				<h3>Global Contrast</h3>
				<p>
					Normalizes the sampling vector to [0,1], applies an exponent to crunch darker values,
					then denormalizes. Exaggerates shape differences for better character picks.
				</p>
			</div>

			<div class="technique-card">
				<h3>Directional Contrast</h3>
				<p>
					External sampling circles detect edges by reaching into neighboring cells.
					When a neighbor is lighter, it pushes the internal value down, sharpening boundaries.
				</p>
			</div>
		</div>
	</section>
</div>

<style>
	.experiment-page {
		max-width: 1000px;
		margin: 0 auto;
		padding: var(--space-xl);
	}

	.page-header {
		margin-bottom: var(--space-2xl);
	}

	h1 {
		font-size: var(--text-display-sm);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.subtitle a {
		color: var(--color-focus);
		text-decoration: none;
	}

	.subtitle a:hover {
		text-decoration: underline;
	}

	h2 {
		font-size: var(--text-heading-sm);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		margin-top: var(--space-lg);
	}

	.demo-section {
		margin-bottom: var(--space-xl);
	}

	.demo-container {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.ascii-output {
		padding: var(--space-md);
		overflow: auto;
		max-height: 600px;
	}

	.ascii-output pre {
		font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
		font-size: 10px;
		line-height: 1.0;
		color: var(--color-fg-primary);
		margin: 0;
		white-space: pre;
	}

	.hidden-canvas {
		display: none;
	}

	.stats {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-surface);
		border-top: 1px solid var(--color-border-default);
	}

	.controls-section {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.controls-section h2:first-child {
		margin-top: 0;
	}

	.scene-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.scene-buttons button,
	.upload-button {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		font-size: var(--text-body-sm);
	}

	.scene-buttons button:hover,
	.upload-button:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.scene-buttons button.active {
		background: var(--color-focus);
		border-color: var(--color-focus);
		color: white;
	}

	.upload-button {
		display: inline-block;
	}

	.upload-button input {
		display: none;
	}

	.animation-control {
		margin-top: var(--space-sm);
	}

	.animation-control button {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		cursor: pointer;
		font-size: var(--text-caption);
	}

	.slider-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.slider-group label {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.slider-group label span {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.slider-group input[type='range'] {
		width: 100%;
		max-width: 300px;
	}

	.technique-section {
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-xl);
	}

	.technique-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	.technique-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
	}

	.technique-card h3 {
		font-size: var(--text-body-md);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.technique-card p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: 1.5;
	}

	@media (max-width: 640px) {
		.technique-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
