<script lang="ts">
	/**
	 * OGImage - Dynamic Open Graph Image Component
	 *
	 * Renders a 1200x630 OG image with CREATE SOMETHING branding.
	 * Uses the isometric cube mark, title, subtitle, and property indicator.
	 *
	 * Server-side: Use generateOGSVG() for static generation
	 * Client-side: Use this component for preview/editing
	 *
	 * "Good design is as little design as possible" - Dieter Rams
	 */

	import { isometricBoxPath } from '../../visual/isometric.js';
	import { colors } from '../../tokens/colors.js';
	import { typography } from '../../tokens/typography.js';
	import type { Property } from '../../analytics/types.js';
	import { CUBE_FACE_OPACITY } from '../types.js';

	// =============================================================================
	// PROPS
	// =============================================================================

	interface Props {
		/** Page title (required) */
		title: string;
		/** Optional subtitle */
		subtitle?: string;
		/** Property for styling (io, space, agency, ltd, lms) */
		property?: Property;
		/** Background variant */
		variant?: 'default' | 'dark' | 'gradient';
		/** Additional CSS classes */
		class?: string;
	}

	let {
		title,
		subtitle,
		property = 'io',
		variant = 'default',
		class: className = ''
	}: Props = $props();

	// =============================================================================
	// CONSTANTS
	// =============================================================================

	const OG_WIDTH = 1200;
	const OG_HEIGHT = 630;
	const CUBE_SIZE = 80;
	const PADDING = 80;

	/** Property display names */
	const PROPERTY_NAMES: Record<Property, string> = {
		space: 'createsomething.space',
		io: 'createsomething.io',
		agency: 'createsomething.agency',
		ltd: 'createsomething.ltd',
		lms: 'learn.createsomething.space'
	};

	/** Property taglines */
	const PROPERTY_TAGLINES: Record<Property, string> = {
		space: 'Practice',
		io: 'Research',
		agency: 'Services',
		ltd: 'Philosophy',
		lms: 'Learning'
	};

	// =============================================================================
	// DERIVED VALUES
	// =============================================================================

	const cubeX = $derived(OG_WIDTH - PADDING - CUBE_SIZE);
	const cubeY = $derived(PADDING + CUBE_SIZE / 2);
	const cubePaths = $derived(isometricBoxPath(cubeX, cubeY, CUBE_SIZE, CUBE_SIZE, CUBE_SIZE));

	// Title sizing based on length
	const titleFontSize = $derived(title.length > 50 ? 48 : title.length > 30 ? 56 : 64);
	const titleY = $derived(OG_HEIGHT / 2 - (subtitle ? 20 : 0));

	// Text processing
	const safeTitle = $derived(escapeXml(truncateText(title, 80)));
	const safeSubtitle = $derived(subtitle ? escapeXml(truncateText(subtitle, 120)) : null);

	const propertyName = $derived(PROPERTY_NAMES[property]);
	const propertyTagline = $derived(PROPERTY_TAGLINES[property]);

	// Background color based on variant
	const bgColor = $derived(
		variant === 'dark' ? colors.background.surface : colors.background.pure
	);

	// =============================================================================
	// HELPERS
	// =============================================================================

	function escapeXml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
	}

	function truncateText(text: string, maxChars: number): string {
		if (text.length <= maxChars) return text;
		return text.slice(0, maxChars - 1) + '\u2026';
	}
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 {OG_WIDTH} {OG_HEIGHT}"
	width={OG_WIDTH}
	height={OG_HEIGHT}
	class="og-image {className}"
>
	<!-- Background -->
	{#if variant === 'gradient'}
		<defs>
			<linearGradient id="og-bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color={colors.background.pure} />
				<stop offset="100%" stop-color={colors.background.subtle} />
			</linearGradient>
		</defs>
		<rect width={OG_WIDTH} height={OG_HEIGHT} fill="url(#og-bg-gradient)" />
	{:else}
		<rect width={OG_WIDTH} height={OG_HEIGHT} fill={bgColor} />
	{/if}

	<!-- Subtle grid pattern -->
	<defs>
		<pattern id="og-grid" width="40" height="40" patternUnits="userSpaceOnUse">
			<path
				d="M 40 0 L 0 0 0 40"
				fill="none"
				stroke={colors.foreground.subtle}
				stroke-width="0.5"
				stroke-opacity="0.1"
			/>
		</pattern>
	</defs>
	<rect width={OG_WIDTH} height={OG_HEIGHT} fill="url(#og-grid)" />

	<!-- Isometric Cube Mark -->
	<g class="cube-mark">
		<path
			d={cubePaths.top}
			fill={colors.foreground.primary}
			fill-opacity={CUBE_FACE_OPACITY.top}
		/>
		<path
			d={cubePaths.left}
			fill={colors.foreground.primary}
			fill-opacity={CUBE_FACE_OPACITY.left}
		/>
		<path
			d={cubePaths.right}
			fill={colors.foreground.primary}
			fill-opacity={CUBE_FACE_OPACITY.right}
		/>
	</g>

	<!-- Property branding (top left) -->
	<text
		x={PADDING}
		y={PADDING + 20}
		font-family={typography.family.mono}
		font-size="14"
		font-weight={typography.weight.medium}
		fill={colors.foreground.tertiary}
		letter-spacing={typography.tracking.wider}
	>
		{propertyName}
	</text>
	<text
		x={PADDING}
		y={PADDING + 44}
		font-family={typography.family.sans}
		font-size="12"
		fill={colors.foreground.muted}
		text-transform="uppercase"
		letter-spacing={typography.tracking.widest}
	>
		{propertyTagline}
	</text>

	<!-- Title -->
	<text
		x={PADDING}
		y={titleY}
		font-family={typography.family.sans}
		font-size={titleFontSize}
		font-weight={typography.weight.bold}
		fill={colors.foreground.primary}
		letter-spacing={typography.tracking.tight}
	>
		{safeTitle}
	</text>

	<!-- Subtitle -->
	{#if safeSubtitle}
		<text
			x={PADDING}
			y={titleY + 50}
			font-family={typography.family.sans}
			font-size="24"
			font-weight={typography.weight.regular}
			fill={colors.foreground.secondary}
		>
			{safeSubtitle}
		</text>
	{/if}

	<!-- Bottom border accent -->
	<rect
		x="0"
		y={OG_HEIGHT - 4}
		width={OG_WIDTH}
		height="4"
		fill={colors.foreground.primary}
		fill-opacity="0.1"
	/>

	<!-- CREATE SOMETHING wordmark (bottom right) -->
	<text
		x={OG_WIDTH - PADDING}
		y={OG_HEIGHT - PADDING}
		font-family={typography.family.mono}
		font-size="14"
		font-weight={typography.weight.medium}
		fill={colors.foreground.muted}
		text-anchor="end"
		letter-spacing={typography.tracking.wide}
	>
		CREATE SOMETHING
	</text>
</svg>

<style>
	.og-image {
		display: block;
		max-width: 100%;
		height: auto;
	}
</style>
