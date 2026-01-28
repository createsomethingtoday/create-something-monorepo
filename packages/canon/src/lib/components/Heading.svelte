<script lang="ts">
	/**
	 * Heading Component
	 *
	 * Fluid typography using clamp() for smooth scaling across viewports.
	 * Follows CREATE SOMETHING standards for "less, but better" aesthetic.
	 *
	 * @see /STANDARDS.md - Section 1.1 Typography
	 */

	type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
	type FluidScale = 'canonical' | 'custom';

	interface Props {
		level: HeadingLevel;
		fluidScale?: FluidScale;
		min?: string;
		max?: string;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		level,
		fluidScale = 'canonical',
		min,
		max,
		class: className = '',
		children
	}: Props = $props();

	// Canonical fluid scales from STANDARDS.md
	const canonicalScales: Record<HeadingLevel, string> = {
		1: 'clamp(3.5rem, 9vw, 7rem)', // 56px → 112px
		2: 'clamp(2rem, 5vw, 3.5rem)', // 32px → 56px
		3: 'clamp(1.5rem, 3vw, 2.25rem)', // 24px → 36px
		4: 'clamp(1.25rem, 2.5vw, 1.75rem)', // 20px → 28px
		5: 'clamp(1.125rem, 2vw, 1.5rem)', // 18px → 24px
		6: 'clamp(1rem, 1.5vw, 1.25rem)' // 16px → 20px
	};

	const fontSize =
		fluidScale === 'canonical'
			? canonicalScales[level]
			: min && max
				? `clamp(${min}, 5vw, ${max})`
				: canonicalScales[level];

	const letterSpacing = level <= 2 ? '-0.025em' : level <= 4 ? '-0.02em' : '-0.015em';

	const baseStyles = `font-weight: 700; line-height: 1.2; letter-spacing: ${letterSpacing}; font-size: ${fontSize};`;
</script>

<svelte:element this={`h${level}`} class={className} style={baseStyles}>
	{#if children}
		{@render children()}
	{/if}
</svelte:element>
