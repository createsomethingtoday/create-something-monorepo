<script lang="ts">
	import { onMount } from 'svelte';

	// Placeholder for 3D background
	// This can be enhanced with Three.js later if needed
	let canvasRef: HTMLCanvasElement;
	let animationId: number;

	onMount(() => {
		if (!canvasRef) return;

		const ctx = canvasRef.getContext('2d');
		if (!ctx) return;

		// Get Canon colors from CSS custom properties
		const styles = getComputedStyle(document.documentElement);
		const bgColor = styles.getPropertyValue('--color-bg-pure').trim() || '#000000';
		const fgColor = styles.getPropertyValue('--color-fg-muted').trim() || 'rgba(255, 255, 255, 0.46)';

		// Simple animated background
		const particles: { x: number; y: number; vx: number; vy: number }[] = [];
		const particleCount = 100;

		for (let i = 0; i < particleCount; i++) {
			particles.push({
				x: Math.random() * canvasRef.width,
				y: Math.random() * canvasRef.height,
				vx: (Math.random() - 0.5) * 0.5,
				vy: (Math.random() - 0.5) * 0.5
			});
		}

		function animate() {
			if (!ctx || !canvasRef) return;

			// Use Canon bg-pure with low opacity for trail effect
			ctx.fillStyle = bgColor.startsWith('#') ? `${bgColor}0d` : 'rgba(0, 0, 0, 0.05)';
			ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);

			// Use Canon fg-muted for particles
			ctx.fillStyle = fgColor;
			particles.forEach((p) => {
				p.x += p.vx;
				p.y += p.vy;

				if (p.x < 0 || p.x > canvasRef.width) p.vx *= -1;
				if (p.y < 0 || p.y > canvasRef.height) p.vy *= -1;

				ctx.beginPath();
				ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
				ctx.fill();
			});

			animationId = requestAnimationFrame(animate);
		}

		// Resize canvas
		const resize = () => {
			canvasRef.width = window.innerWidth;
			canvasRef.height = window.innerHeight;
		};

		resize();
		window.addEventListener('resize', resize);
		animate();

		return () => {
			window.removeEventListener('resize', resize);
			if (animationId) cancelAnimationFrame(animationId);
		};
	});
</script>

<canvas
	bind:this={canvasRef}
	class="canvas-bg fixed inset-0 w-full h-full pointer-events-none opacity-20 z-0"
/>

<style>
	.canvas-bg {
		background: var(--color-bg-pure);
	}
</style>
