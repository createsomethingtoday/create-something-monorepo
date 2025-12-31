<script lang="ts">
	/**
	 * SectionHeader - Consistent section title/subtitle pattern
	 *
	 * Provides standardized typography and spacing for section headers.
	 * Used within Section components for visual consistency.
	 *
	 * @example
	 * <SectionHeader
	 *   title="Features"
	 *   subtitle="Everything you need to get started"
	 * />
	 *
	 * <SectionHeader title="Pricing" align="left" />
	 */

	interface Props {
		/** Main section title */
		title: string;
		/** Optional subtitle/description */
		subtitle?: string;
		/** Text alignment */
		align?: 'left' | 'center' | 'right';
		/** Title heading level for semantics */
		level?: 'h1' | 'h2' | 'h3';
		/** Optional eyebrow/label above title */
		eyebrow?: string;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		title,
		subtitle,
		align = 'center',
		level = 'h2',
		eyebrow,
		class: className = ''
	}: Props = $props();
</script>

<header class="section-header section-header--{align} {className}">
	{#if eyebrow}
		<span class="section-header__eyebrow">{eyebrow}</span>
	{/if}

	{#if level === 'h1'}
		<h1 class="section-header__title">{title}</h1>
	{:else if level === 'h2'}
		<h2 class="section-header__title">{title}</h2>
	{:else}
		<h3 class="section-header__title">{title}</h3>
	{/if}

	{#if subtitle}
		<p class="section-header__subtitle">{subtitle}</p>
	{/if}
</header>

<style>
	.section-header {
		margin-bottom: var(--space-xl);
	}

	/* Alignment */
	.section-header--center {
		text-align: center;
	}

	.section-header--left {
		text-align: left;
	}

	.section-header--right {
		text-align: right;
	}

	/* Eyebrow */
	.section-header__eyebrow {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-sm);
	}

	/* Title */
	.section-header__title {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
		line-height: 1.2;
	}

	/* Subtitle */
	.section-header__subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: var(--space-sm) 0 0;
		line-height: 1.6;
	}

	/* Constrain subtitle width when centered */
	.section-header--center .section-header__subtitle {
		max-width: 40rem;
		margin-left: auto;
		margin-right: auto;
	}
</style>
