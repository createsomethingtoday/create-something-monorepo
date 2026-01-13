<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let canvas: HTMLCanvasElement;
	let animationFrameId: number;

	interface Star {
		x: number;
		y: number;
		z: number;
		size: number;
		brightness: number;
	}

	onMount(() => {
		if (!browser || !canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const resizeCanvas = () => {
			canvas.width = canvas.offsetWidth;
			canvas.height = canvas.offsetHeight;
		};
		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);

		const stars: Star[] = [];
		const numStars = 300;
		let rotation = 0;

		for (let i = 0; i < numStars; i++) {
			const angle = Math.random() * Math.PI * 2;
			const distance = Math.random() * 400;
			const z = Math.random() * 500;

			stars.push({
				x: Math.cos(angle) * distance,
				y: Math.sin(angle) * distance,
				z: z,
				size: Math.random() * 2 + 0.5,
				brightness: Math.random() * 0.5 + 0.5
			});
		}

		const animate = () => {
			const centerX = canvas.width / 2;
			const centerY = canvas.height / 2;
			
			ctx.fillStyle = '#000000';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			rotation += 0.001;

			stars.forEach((star) => {
				const angle = Math.atan2(star.y, star.x) + rotation;
				const distance = Math.sqrt(star.x * star.x + star.y * star.y);

				const x = centerX + Math.cos(angle) * distance;
				const y = centerY + Math.sin(angle) * distance;

				const scale = 300 / (300 + star.z);
				const size = star.size * scale;
				const opacity = star.brightness * scale;

				ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
				ctx.beginPath();
				ctx.arc(x, y, size, 0, Math.PI * 2);
				ctx.fill();

				if (star.size > 1.5) {
					const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
					gradient.addColorStop(0, 'rgba(255, 255, 255, ' + (opacity * 0.3) + ')');
					gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
					ctx.fillStyle = gradient;
					ctx.beginPath();
					ctx.arc(x, y, size * 3, 0, Math.PI * 2);
					ctx.fill();
				}
			});

			animationFrameId = requestAnimationFrame(animate);
		};

		animate();

		return () => {
			window.removeEventListener('resize', resizeCanvas);
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
		};
	});

	function handlePlayClick() {
		window.location.href = '/videos/outerfields-trailer';
	}
</script>

<section class="hero">
	<canvas bind:this={canvas} class="galaxy-canvas" />

	<div class="hero-content">
		<h1 class="hero-title">Building Outerfields: The Odyssey</h1>

		<button class="play-button" on:click={handlePlayClick} aria-label="Play trailer">
			<svg class="play-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
			</svg>
		</button>
	</div>
</section>

<style>
	.hero {
		position: relative;
		width: 100%;
		height: 100vh;
		min-height: 600px;
		max-height: 900px;
		overflow: hidden;
		background: var(--color-bg-pure);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.galaxy-canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.hero-content {
		position: relative;
		z-index: 10;
		text-align: center;
		max-width: 800px;
		padding: var(--space-lg);
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xl);
		text-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
	}

	.play-button {
		width: 120px;
		height: 120px;
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.1);
		border: 3px solid var(--color-fg-primary);
		cursor: pointer;
		transition: all var(--duration-standard) var(--ease-standard);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto;
		backdrop-filter: blur(10px);
	}

	.play-button:hover {
		transform: scale(1.1);
		background: rgba(255, 255, 255, 0.2);
		border-color: var(--color-fg-secondary);
		box-shadow: 0 0 40px rgba(255, 255, 255, 0.3);
	}

	.play-button:active {
		transform: scale(1.05);
	}

	.play-icon {
		width: 48px;
		height: 48px;
		color: var(--color-fg-primary);
		margin-left: 8px;
	}

	@media (max-width: 768px) {
		.hero {
			min-height: 500px;
			max-height: 700px;
		}

		.hero-title {
			font-size: var(--text-h1);
		}

		.play-button {
			width: 90px;
			height: 90px;
		}

		.play-icon {
			width: 36px;
			height: 36px;
		}
	}

	@media (max-width: 480px) {
		.hero {
			min-height: 400px;
			max-height: 600px;
		}

		.hero-title {
			font-size: var(--text-h2);
		}

		.play-button {
			width: 75px;
			height: 75px;
		}

		.play-icon {
			width: 30px;
			height: 30px;
		}
	}
</style>
