<script lang="ts">
	/**
	 * Icon Component
	 *
	 * Renders SVG icons from the Canon icon system.
	 * Uses stroke-based rendering with consistent styling.
	 *
	 * Canon: The icon communicates; decoration is absent.
	 */

	import type { IconName, IconSize } from './types.js';
	import { ICON_SIZES } from './types.js';
	import { ICON_PATHS } from './paths.js';

	interface Props {
		/** Icon name from the Canon icon set */
		name: IconName;
		/** Size variant or custom pixel size */
		size?: IconSize | number;
		/** Icon color (defaults to currentColor) */
		color?: string;
		/** Stroke width */
		strokeWidth?: number;
		/** Accessible label (required for standalone icons) */
		label?: string;
		/** Additional CSS class */
		class?: string;
	}

	let {
		name,
		size = 'md',
		color = 'currentColor',
		strokeWidth = 2,
		label,
		class: className = ''
	}: Props = $props();

	// Calculate pixel size
	const pixelSize = $derived(typeof size === 'number' ? size : ICON_SIZES[size]);

	// Get the path for this icon
	const path = $derived(ICON_PATHS[name]);

	// Determine if icon is decorative or meaningful
	const isDecorative = $derived(!label);
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={pixelSize}
	height={pixelSize}
	viewBox="0 0 24 24"
	fill="none"
	stroke={color}
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class="icon icon-{name} {className}"
	aria-hidden={isDecorative ? 'true' : undefined}
	aria-label={label}
	role={isDecorative ? undefined : 'img'}
>
	<path d={path} />
</svg>

<style>
	.icon {
		display: inline-block;
		vertical-align: middle;
		flex-shrink: 0;
	}
</style>
