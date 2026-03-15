<script lang="ts">
	/**
	 * LiquidGlassIcon - Icon container that sits "on" liquid glass
	 *
	 * Used within LiquidGlass components to display integration icons,
	 * service logos, or other visual elements that appear to float
	 * on the glass surface.
	 *
	 * @example
	 * <LiquidGlass>
	 *   <div class="flex gap-4">
	 *     <LiquidGlassIcon size="md">Zo</LiquidGlassIcon>
	 *     <LiquidGlassIcon size="md">No</LiquidGlassIcon>
	 *     <LiquidGlassIcon size="md">Sl</LiquidGlassIcon>
	 *   </div>
	 * </LiquidGlass>
	 */

	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		/** Icon container size */
		size?: Size;
		/** Additional CSS classes */
		class?: string;
		/** Children content (icon, text, or component) */
		children?: import('svelte').Snippet;
	}

	let { size = 'md', class: className = '', children }: Props = $props();

	// Size dimensions
	const sizeMap: Record<Size, { width: string; height: string; fontSize: string }> = {
		sm: { width: '2.5rem', height: '2.5rem', fontSize: '0.75rem' },
		md: { width: '3rem', height: '3rem', fontSize: '0.875rem' },
		lg: { width: '4rem', height: '4rem', fontSize: '1rem' }
	};

	const dims = $derived(sizeMap[size]);
</script>

<div
	class="liquid-glass-icon {className}"
	style:width={dims.width}
	style:height={dims.height}
	style:font-size={dims.fontSize}
>
	{@render children?.()}
</div>

<style>
	.liquid-glass-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: var(--radius-md, 8px);
		box-shadow:
			0 4px 12px rgba(0, 0, 0, 0.4),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		color: white;
		font-weight: 500;
		transition: all var(--duration-standard, 300ms) var(--ease-standard);
	}

	.liquid-glass-icon:hover {
		background-color: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.25);
		transform: translateY(-2px);
		box-shadow:
			0 6px 16px rgba(0, 0, 0, 0.5),
			inset 0 1px 0 rgba(255, 255, 255, 0.15);
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
</style>
