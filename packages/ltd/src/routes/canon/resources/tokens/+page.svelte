<script lang="ts">
	import { CodeBlock } from '$lib/canon';

	const allTokensExample = `/* Canon Design Tokens - Full Reference */

/* ═══════════════════════════════════════════════════════
   COLORS
   ═══════════════════════════════════════════════════════ */

/* Backgrounds */
--color-bg-pure: #000000;
--color-bg-elevated: #0a0a0a;
--color-bg-surface: #111111;
--color-bg-subtle: #1a1a1a;

/* Foregrounds */
--color-fg-primary: #ffffff;                    /* 21:1 */
--color-fg-secondary: rgba(255, 255, 255, 0.8); /* 16.6:1 */
--color-fg-tertiary: rgba(255, 255, 255, 0.6);  /* 12.24:1 */
--color-fg-muted: rgba(255, 255, 255, 0.46);    /* 4.56:1 AA */
--color-fg-subtle: rgba(255, 255, 255, 0.2);    /* 2.05:1 */

/* Borders */
--color-border-default: rgba(255, 255, 255, 0.1);
--color-border-emphasis: rgba(255, 255, 255, 0.2);
--color-border-strong: rgba(255, 255, 255, 0.3);

/* Interactive */
--color-hover: rgba(255, 255, 255, 0.05);
--color-active: rgba(255, 255, 255, 0.1);
--color-focus: rgba(255, 255, 255, 0.5);        /* 5.28:1 */

/* Semantic */
--color-success: #44aa44;                       /* 7.08:1 */
--color-success-muted: rgba(68, 170, 68, 0.2);
--color-success-border: rgba(68, 170, 68, 0.3);

--color-error: #d44d4d;                         /* 4.97:1 */
--color-error-muted: rgba(212, 77, 77, 0.2);
--color-error-border: rgba(212, 77, 77, 0.3);

--color-warning: #aa8844;                       /* 6.31:1 */
--color-warning-muted: rgba(170, 136, 68, 0.2);
--color-warning-border: rgba(170, 136, 68, 0.3);

--color-info: #5082b9;                          /* 5.23:1 */
--color-info-muted: rgba(80, 130, 185, 0.2);
--color-info-border: rgba(80, 130, 185, 0.3);

/* Overlays */
--color-overlay: rgba(0, 0, 0, 0.5);
--color-overlay-heavy: rgba(0, 0, 0, 0.7);

/* Data Visualization */
--color-data-1: #60a5fa;
--color-data-1-muted: rgba(96, 165, 250, 0.2);
--color-data-2: #22c55e;
--color-data-2-muted: rgba(34, 197, 94, 0.2);
--color-data-3: #c084fc;
--color-data-3-muted: rgba(192, 132, 252, 0.2);
--color-data-4: #fbbf24;
--color-data-4-muted: rgba(251, 191, 36, 0.2);
--color-data-5: #f472b6;
--color-data-5-muted: rgba(244, 114, 182, 0.2);
--color-data-6: #facc15;
--color-data-6-muted: rgba(250, 204, 21, 0.2);

/* Rank */
--color-rank-gold: #ca8a04;
--color-rank-gold-muted: rgba(202, 138, 4, 0.2);
--color-rank-bronze: #c2410c;
--color-rank-bronze-muted: rgba(194, 65, 12, 0.2);`;

	const spacingTokens = `/* ═══════════════════════════════════════════════════════
   SPACING (Golden Ratio φ = 1.618)
   ═══════════════════════════════════════════════════════ */

--space-xs: 0.5rem;     /* 8px */
--space-sm: 1rem;       /* 16px */
--space-md: 1.618rem;   /* ~26px */
--space-lg: 2.618rem;   /* ~42px */
--space-xl: 4.236rem;   /* ~68px */
--space-2xl: 6.854rem;  /* ~110px */`;

	const typographyTokens = `/* ═══════════════════════════════════════════════════════
   TYPOGRAPHY
   ═══════════════════════════════════════════════════════ */

/* Font Families */
--font-sans: system-ui, -apple-system, sans-serif;
--font-mono: ui-monospace, 'SF Mono', monospace;

/* Font Sizes (Fluid) */
--text-display-xl: clamp(3.5rem, 5vw + 2rem, 7rem);
--text-display: clamp(2.5rem, 4vw + 1.5rem, 5rem);
--text-h1: clamp(2rem, 3vw + 1rem, 3.5rem);
--text-h2: clamp(1.5rem, 2vw + 0.75rem, 2.25rem);
--text-h3: clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem);
--text-body-lg: 1.125rem;   /* 18px */
--text-body: 1rem;          /* 16px */
--text-body-sm: 0.875rem;   /* 14px */
--text-caption: 0.75rem;    /* 12px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;

/* Letter Spacing */
--tracking-tighter: -0.05em;
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
--tracking-wider: 0.05em;
--tracking-widest: 0.1em;`;

	const layoutTokens = `/* ═══════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════ */

/* Border Radius */
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.5);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.5);
--shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.5);

/* Z-Index */
--z-base: 0;
--z-dropdown: 100;
--z-sticky: 200;
--z-fixed: 300;
--z-modal-backdrop: 400;
--z-modal: 500;
--z-popover: 600;
--z-tooltip: 700;

/* Breakpoints (for reference, use in media queries) */
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;`;

	const motionTokens = `/* ═══════════════════════════════════════════════════════
   MOTION
   ═══════════════════════════════════════════════════════ */

/* Durations */
--duration-micro: 200ms;    /* Hover, toggles */
--duration-standard: 300ms; /* Modals, transitions */
--duration-complex: 500ms;  /* Orchestrated sequences */

/* Easing */
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);`;

	const tokenCategories = [
		{ name: 'Colors', count: 45, href: '/canon/foundations/colors' },
		{ name: 'Typography', count: 18, href: '/canon/foundations/typography' },
		{ name: 'Spacing', count: 6, href: '/canon/foundations/spacing' },
		{ name: 'Layout', count: 15, href: '/canon/foundations/layout' },
		{ name: 'Motion', count: 4, href: '/canon/foundations/motion' }
	];
</script>

<svelte:head>
	<title>Token Reference — Canon Design System</title>
	<meta name="description" content="Complete reference of all Canon design tokens. CSS custom properties for colors, typography, spacing, and more." />
</svelte:head>

<header class="page-header">
	<p class="eyebrow">Resources</p>
	<h1>Token Reference</h1>
	<p class="lead">
		Complete list of Canon's CSS custom properties. Copy tokens directly
		or download the full token file.
	</p>
</header>

<section class="section">
	<h2>Overview</h2>
	<p class="section-description">
		Canon provides {tokenCategories.reduce((sum, cat) => sum + cat.count, 0)} design tokens
		across five categories.
	</p>

	<div class="category-grid">
		{#each tokenCategories as category}
			<a href={category.href} class="category-card">
				<h3>{category.name}</h3>
				<span class="token-count">{category.count} tokens</span>
			</a>
		{/each}
	</div>
</section>

<section class="section">
	<h2>Download</h2>
	<p class="section-description">
		Get the token files for use in your project.
	</p>

	<div class="download-grid">
		<div class="download-card">
			<h3>CSS Tokens</h3>
			<p>Raw CSS custom properties. Import directly into your stylesheet.</p>
			<code>@import '@create-something/components/styles/tokens.css';</code>
		</div>

		<div class="download-card">
			<h3>Full Canon</h3>
			<p>Tokens plus base styles and utility classes.</p>
			<code>@import '@create-something/components/styles/canon.css';</code>
		</div>
	</div>
</section>

<section class="section">
	<h2>Color Tokens</h2>
	<p class="section-description">
		Background, foreground, border, semantic, and data visualization colors.
		Contrast ratios are measured against <code>--color-bg-pure</code>.
	</p>

	<CodeBlock code={allTokensExample} language="css" title="colors.css" />
</section>

<section class="section">
	<h2>Spacing Tokens</h2>
	<p class="section-description">
		Spacing scale based on the golden ratio (1.618). Creates natural visual rhythm.
	</p>

	<CodeBlock code={spacingTokens} language="css" title="spacing.css" />

	<div class="spacing-visual">
		<div class="space-sample xs"><span>xs</span></div>
		<div class="space-sample sm"><span>sm</span></div>
		<div class="space-sample md"><span>md</span></div>
		<div class="space-sample lg"><span>lg</span></div>
		<div class="space-sample xl"><span>xl</span></div>
	</div>
</section>

<section class="section">
	<h2>Typography Tokens</h2>
	<p class="section-description">
		Fluid font sizes, weights, line heights, and letter spacing.
	</p>

	<CodeBlock code={typographyTokens} language="css" title="typography.css" />
</section>

<section class="section">
	<h2>Layout Tokens</h2>
	<p class="section-description">
		Border radius, shadows, z-index scale, and breakpoints.
	</p>

	<CodeBlock code={layoutTokens} language="css" title="layout.css" />
</section>

<section class="section">
	<h2>Motion Tokens</h2>
	<p class="section-description">
		Animation durations and easing curve for consistent motion.
	</p>

	<CodeBlock code={motionTokens} language="css" title="motion.css" />
</section>

<section class="section">
	<h2>Usage Pattern</h2>
	<p class="section-description">
		Always use tokens via CSS custom properties. Never hardcode values.
	</p>

	<div class="usage-comparison">
		<div class="usage-card wrong">
			<h3>Avoid</h3>
			<pre><code>background: #111111;
color: rgba(255, 255, 255, 0.8);
border-radius: 12px;
padding: 16px;</code></pre>
		</div>

		<div class="usage-card right">
			<h3>Prefer</h3>
			<pre><code>background: var(--color-bg-surface);
color: var(--color-fg-secondary);
border-radius: var(--radius-lg);
padding: var(--space-sm);</code></pre>
		</div>
	</div>
</section>

<style>
	.page-header {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.eyebrow {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	h1 {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		max-width: 65ch;
	}

	.section {
		margin-bottom: var(--space-2xl);
	}

	h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.section-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
		max-width: 65ch;
	}

	.section-description code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		background: var(--color-bg-surface);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	/* Category grid */
	.category-grid {
		display: grid;
		gap: var(--space-sm);
	}

	@media (min-width: 640px) {
		.category-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.category-grid {
			grid-template-columns: repeat(5, 1fr);
		}
	}

	.category-card {
		display: block;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.category-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
	}

	.category-card:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.category-card h3 {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.token-count {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Download grid */
	.download-grid {
		display: grid;
		gap: var(--space-md);
	}

	@media (min-width: 640px) {
		.download-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.download-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.download-card h3 {
		font-size: var(--text-body);
		margin-bottom: var(--space-xs);
	}

	.download-card p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm) 0;
	}

	.download-card code {
		display: block;
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		background: var(--color-bg-pure);
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		overflow-x: auto;
	}

	/* Spacing visual */
	.spacing-visual {
		display: flex;
		gap: var(--space-sm);
		align-items: flex-end;
		margin-top: var(--space-lg);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.space-sample {
		background: var(--color-border-emphasis);
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.space-sample span {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.space-sample.xs {
		width: var(--space-xs);
		height: var(--space-xs);
	}

	.space-sample.sm {
		width: var(--space-sm);
		height: var(--space-sm);
	}

	.space-sample.md {
		width: var(--space-md);
		height: var(--space-md);
	}

	.space-sample.lg {
		width: var(--space-lg);
		height: var(--space-lg);
	}

	.space-sample.xl {
		width: var(--space-xl);
		height: var(--space-xl);
	}

	/* Usage comparison */
	.usage-comparison {
		display: grid;
		gap: var(--space-md);
	}

	@media (min-width: 640px) {
		.usage-comparison {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.usage-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.usage-card.wrong {
		border-left: 3px solid var(--color-error);
	}

	.usage-card.right {
		border-left: 3px solid var(--color-success);
	}

	.usage-card.wrong h3 {
		color: var(--color-error);
	}

	.usage-card.right h3 {
		color: var(--color-success);
	}

	.usage-card h3 {
		font-size: var(--text-body);
		margin-bottom: var(--space-sm);
	}

	.usage-card pre {
		margin: 0;
		background: var(--color-bg-pure);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		overflow-x: auto;
	}

	.usage-card code {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}
</style>
