<script lang="ts">
	/**
	 * LiquidGlassIcon - Icon container that sits "on" liquid glass
	 *
	 * Uses double-blur technique for Chrome nested blur compatibility:
	 * - Primary blur layer (z-index: -1) provides main glass effect
	 * - Secondary blur layer (z-index: -2) adds perceived depth
	 * - Container has NO backdrop-filter (prevents Chrome flattening)
	 *
	 * @see https://havn.blog/2024/03/14/chromium-and-nested.html
	 *
	 * @example
	 * <LiquidGlass>
	 *   <div class="flex gap-4">
	 *     <LiquidGlassIcon size="md">Zo</LiquidGlassIcon>
	 *     <LiquidGlassIcon size="md" variant="deep">No</LiquidGlassIcon>
	 *   </div>
	 * </LiquidGlass>
	 */

	type Size = 'sm' | 'md' | 'lg';
	type Variant = 'standard' | 'deep';
	type Shape = 'square' | 'pill';

	interface Props {
		/** Icon container size */
		size?: Size;
		/** Style variant - 'deep' uses Aurora-style multi-layer glass */
		variant?: Variant;
		/** Shape override - defaults to 'square' for standard, 'pill' for deep */
		shape?: Shape;
		/** Additional CSS classes */
		class?: string;
		/** Children content (icon, text, or component) */
		children?: import('svelte').Snippet;
	}

	let {
		size = 'md',
		variant = 'standard',
		shape,
		class: className = '',
		children
	}: Props = $props();

	// Size dimensions
	const sizeMap: Record<Size, { width: string; height: string; fontSize: string }> = {
		sm: { width: '2.5rem', height: '2.5rem', fontSize: '0.75rem' },
		md: { width: '3rem', height: '3rem', fontSize: '0.875rem' },
		lg: { width: '4rem', height: '4rem', fontSize: '1rem' }
	};

	const dims = $derived(sizeMap[size]);
	const isDeep = $derived(variant === 'deep');
	const effectiveShape = $derived(shape ?? (isDeep ? 'pill' : 'square'));
</script>

<div
	class="liquid-glass-icon variant-{variant} shape-{effectiveShape} {className}"
	style:width={dims.width}
	style:height={dims.height}
	style:font-size={dims.fontSize}
>
	<!-- Primary blur layer (z-index: -1) - main glass effect -->
	<div class="blur-layer blur-primary" class:deep={isDeep} aria-hidden="true"></div>

	<!-- Secondary blur layer (z-index: -2) - extra depth via double-blur -->
	<div class="blur-layer blur-secondary" class:deep={isDeep} aria-hidden="true"></div>

	<!-- Deep glass highlight overlay - creates domed surface illusion -->
	{#if isDeep}
		<div class="highlight-overlay" aria-hidden="true"></div>
	{/if}

	<!-- Content wrapper -->
	<span class="content">
		{@render children?.()}
	</span>
</div>

<style>
	.liquid-glass-icon {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		/* Visual styles WITHOUT backdrop-filter (applied to blur layers instead) */
		background-color: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.18);
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.4),
			inset 0 1px 0 rgba(255, 255, 255, 0.12);
		color: white;
		font-weight: 500;
		/* NO backdrop-filter on container - prevents Chrome flattening */
		backdrop-filter: none;
		transition: all var(--duration-performance-standard, 300ms) var(--ease-performance-standard);
		overflow: visible; /* Allow blur to extend slightly */
	}

	/* Shape variants */
	.liquid-glass-icon.shape-square {
		border-radius: var(--radius-performance-scale-md, 8px);
	}

	.liquid-glass-icon.shape-pill {
		border-radius: var(--radius-performance-scale-full, 9999px);
	}

	/* Deep variant styling */
	.liquid-glass-icon.variant-deep {
		background-color: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.22);
		box-shadow:
			0 6px 20px rgba(0, 0, 0, 0.5),
			0 2px 8px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.15),
			inset 0 -1px 0 rgba(0, 0, 0, 0.2);
	}

	/* Blur layers - the actual glass effect */
	.blur-layer {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
	}

	/* Primary blur - main glass effect */
	.blur-primary {
		z-index: -1;
		background-color: rgba(255, 255, 255, 0.06);
		backdrop-filter: blur(16px) saturate(1.2);
	}

	.blur-primary.deep {
		background-color: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(24px) saturate(1.5);
	}

	/* Secondary blur - adds perceived depth (double-blur technique) */
	.blur-secondary {
		z-index: -2;
		background-color: rgba(255, 255, 255, 0.03);
		backdrop-filter: blur(20px);
	}

	.blur-secondary.deep {
		background-color: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(32px);
	}

	/* Deep glass highlight - creates domed surface illusion */
	.highlight-overlay {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.15) 0%,
			rgba(255, 255, 255, 0.05) 40%,
			transparent 70%
		);
		pointer-events: none;
	}

	/* Content positioning */
	.content {
		position: relative;
		z-index: 1;
	}

	/* Hover states */
	.liquid-glass-icon:hover {
		background-color: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.28);
		transform: translateY(-2px);
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.5),
			inset 0 1px 0 rgba(255, 255, 255, 0.18);
	}

	.liquid-glass-icon.variant-deep:hover {
		background-color: rgba(255, 255, 255, 0.14);
		border-color: rgba(255, 255, 255, 0.32);
		box-shadow:
			0 10px 28px rgba(0, 0, 0, 0.6),
			0 4px 12px rgba(0, 0, 0, 0.4),
			inset 0 1px 0 rgba(255, 255, 255, 0.2),
			inset 0 -1px 0 rgba(0, 0, 0, 0.25);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.liquid-glass-icon {
			transition: none;
		}

		.liquid-glass-icon:hover {
			transform: none;
		}
	}

	/* Reduced transparency fallback */
	@media (prefers-reduced-transparency: reduce) {
		.blur-primary,
		.blur-secondary {
			backdrop-filter: none;
		}

		.liquid-glass-icon {
			background-color: rgba(30, 30, 30, 0.95);
		}
	}
</style>
