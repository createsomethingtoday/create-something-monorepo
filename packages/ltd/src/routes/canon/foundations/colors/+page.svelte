<script lang="ts">
	import { TokenSwatch, CodeBlock } from '$lib/canon';

	// Color token data organized by category
	const backgroundColors = [
		{ token: '--color-bg-pure', value: '#000000', description: 'Pure black canvas' },
		{ token: '--color-bg-elevated', value: '#0a0a0a', description: 'Slightly elevated surface' },
		{ token: '--color-bg-surface', value: '#111111', description: 'Card and panel backgrounds' },
		{ token: '--color-bg-subtle', value: '#1a1a1a', description: 'Subtle background distinction' }
	];

	const foregroundColors = [
		{ token: '--color-fg-primary', value: '#ffffff', description: 'Headlines, primary text', contrast: 21 },
		{ token: '--color-fg-secondary', value: 'rgba(255, 255, 255, 0.8)', description: 'Body text', contrast: 16.6 },
		{ token: '--color-fg-tertiary', value: 'rgba(255, 255, 255, 0.6)', description: 'Secondary content', contrast: 12.24 },
		{ token: '--color-fg-muted', value: 'rgba(255, 255, 255, 0.46)', description: 'Captions, labels', contrast: 4.56 },
		{ token: '--color-fg-subtle', value: 'rgba(255, 255, 255, 0.2)', description: 'Disabled, decorative', contrast: 2.05 }
	];

	const borderColors = [
		{ token: '--color-border-default', value: 'rgba(255, 255, 255, 0.1)', description: 'Subtle separation' },
		{ token: '--color-border-emphasis', value: 'rgba(255, 255, 255, 0.2)', description: 'Moderate emphasis' },
		{ token: '--color-border-strong', value: 'rgba(255, 255, 255, 0.3)', description: 'Strong separation' }
	];

	const semanticColors = [
		{ token: '--color-success', value: '#44aa44', description: 'Positive actions, confirmations', contrast: 7.08 },
		{ token: '--color-error', value: '#d44d4d', description: 'Errors, destructive actions', contrast: 4.97 },
		{ token: '--color-warning', value: '#aa8844', description: 'Cautions, attention needed', contrast: 6.31 },
		{ token: '--color-info', value: '#5082b9', description: 'Informational, links', contrast: 5.23 }
	];

	const interactiveColors = [
		{ token: '--color-hover', value: 'rgba(255, 255, 255, 0.05)', description: 'Hover state overlay' },
		{ token: '--color-active', value: 'rgba(255, 255, 255, 0.1)', description: 'Active/pressed state' },
		{ token: '--color-focus', value: 'rgba(255, 255, 255, 0.5)', description: 'Focus ring color', contrast: 5.28 }
	];

	const dataVizColors = [
		{ token: '--color-data-1', value: '#60a5fa', description: 'Blue - primary data' },
		{ token: '--color-data-2', value: '#22c55e', description: 'Green - secondary data' },
		{ token: '--color-data-3', value: '#c084fc', description: 'Purple - tertiary data' },
		{ token: '--color-data-4', value: '#fbbf24', description: 'Amber - quaternary data' },
		{ token: '--color-data-5', value: '#f472b6', description: 'Pink - quinary data' },
		{ token: '--color-data-6', value: '#facc15', description: 'Yellow - senary data' }
	];

	const overlayColors = [
		{ token: '--color-overlay', value: 'rgba(0, 0, 0, 0.5)', description: 'Modal backdrop' },
		{ token: '--color-overlay-heavy', value: 'rgba(0, 0, 0, 0.7)', description: 'Heavy overlay' }
	];

	const usageExample = `/* Background usage */
.card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
}

/* Text usage */
.heading {
  color: var(--color-fg-primary);
}

.caption {
  color: var(--color-fg-muted);
}

/* Semantic usage */
.error-message {
  color: var(--color-error);
  background: var(--color-error-muted);
}`;
</script>

<svelte:head>
	<title>Colors — Canon Design System</title>
	<meta name="description" content="Canon color tokens: backgrounds, foregrounds, semantic colors, and data visualization palette." />
</svelte:head>

<!-- Header -->
<header class="page-header">
	<p class="eyebrow">Foundations</p>
	<h1>Colors</h1>
	<p class="lead">
		Every color you need, ready to copy. Black and white for structure. 
		Opacity for hierarchy. Semantic colors when something needs attention.
	</p>
</header>

<!-- Philosophy -->
<section class="section">
	<h2>Why so few colors?</h2>
	<p>
		More colors mean more decisions. We use black and white as the foundation, then adjust 
		opacity to create hierarchy—no need to pick new shades. When you need to show success, 
		error, or a warning, semantic colors do the work.
	</p>
	<blockquote class="philosophy-quote">
		"Color communicates. Decoration distracts."
	</blockquote>
</section>

<!-- Backgrounds -->
<section class="section">
	<h2>Backgrounds</h2>
	<p class="section-description">
		Four levels from pure black to subtle grey. Stack them to create depth—like layers of paper.
	</p>
	<div class="token-grid">
		{#each backgroundColors as color}
			<TokenSwatch token={color.token} value={color.value} description={color.description} />
		{/each}
	</div>
</section>

<!-- Foregrounds -->
<section class="section">
	<h2>Foregrounds</h2>
	<p class="section-description">
		Five text colors, all white at different opacities. Use brighter for headlines, 
		dimmer for captions. Contrast ratios shown help you stay accessible.
	</p>
	<div class="token-grid">
		{#each foregroundColors as color}
			<TokenSwatch
				token={color.token}
				value={color.value}
				description={color.description}
				isForeground={true}
				contrastRatio={color.contrast}
			/>
		{/each}
	</div>
	<div class="note">
		<strong>WCAG Compliance:</strong> <code>--color-fg-muted</code> (4.56:1) meets AA for normal text.
		<code>--color-fg-subtle</code> should only be used for decorative elements.
	</div>
</section>

<!-- Borders -->
<section class="section">
	<h2>Borders</h2>
	<p class="section-description">
		Three border levels for separation and emphasis.
	</p>
	<div class="token-grid">
		{#each borderColors as color}
			<TokenSwatch token={color.token} value={color.value} description={color.description} />
		{/each}
	</div>
</section>

<!-- Semantic Colors -->
<section class="section">
	<h2>Semantic Colors</h2>
	<p class="section-description">
		Four colors that mean something: success, error, warning, info. Each comes with 
		<code>-muted</code> and <code>-border</code> variants for backgrounds and outlines.
	</p>
	<div class="token-grid">
		{#each semanticColors as color}
			<TokenSwatch
				token={color.token}
				value={color.value}
				description={color.description}
				contrastRatio={color.contrast}
			/>
		{/each}
	</div>

	<h3>Semantic Variants</h3>
	<div class="semantic-demo">
		<div class="semantic-card success">
			<span class="semantic-label">Success</span>
			<code>--color-success-muted</code> + <code>--color-success-border</code>
		</div>
		<div class="semantic-card error">
			<span class="semantic-label">Error</span>
			<code>--color-error-muted</code> + <code>--color-error-border</code>
		</div>
		<div class="semantic-card warning">
			<span class="semantic-label">Warning</span>
			<code>--color-warning-muted</code> + <code>--color-warning-border</code>
		</div>
		<div class="semantic-card info">
			<span class="semantic-label">Info</span>
			<code>--color-info-muted</code> + <code>--color-info-border</code>
		</div>
	</div>
</section>

<!-- Interactive States -->
<section class="section">
	<h2>Interactive States</h2>
	<p class="section-description">
		Overlay colors for hover, active, and focus states.
	</p>
	<div class="token-grid">
		{#each interactiveColors as color}
			<TokenSwatch
				token={color.token}
				value={color.value}
				description={color.description}
				contrastRatio={color.contrast}
			/>
		{/each}
	</div>

	<div class="interactive-demo">
		<button class="demo-button">Hover me</button>
	</div>
</section>

<!-- Data Visualization -->
<section class="section">
	<h2>Data Visualization</h2>
	<p class="section-description">
		Six distinct colors for charts and graphs. They're designed to look different even 
		to colorblind users. Use <code>-muted</code> variants for area fills.
	</p>
	<div class="token-grid">
		{#each dataVizColors as color}
			<TokenSwatch token={color.token} value={color.value} description={color.description} />
		{/each}
	</div>
</section>

<!-- Overlays -->
<section class="section">
	<h2>Overlays</h2>
	<p class="section-description">
		Backdrop colors for modals, dialogs, and drawers.
	</p>
	<div class="token-grid token-grid-sm">
		{#each overlayColors as color}
			<TokenSwatch token={color.token} value={color.value} description={color.description} />
		{/each}
	</div>
</section>

<!-- Usage -->
<section class="section">
	<h2>How to use</h2>
	<p class="section-description">
		Copy the token names into your CSS. Never hardcode hex values—tokens let you 
		change the whole palette later without hunting through files.
	</p>
	<CodeBlock code={usageExample} language="css" title="colors.css" />
</section>

<style>
	/* Page header */
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

	/* Sections */
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
		margin-top: var(--space-lg);
		margin-bottom: var(--space-sm);
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

	/* Philosophy quote */
	.philosophy-quote {
		font-size: var(--text-h3);
		font-style: italic;
		color: var(--color-fg-secondary);
		border-left: 2px solid var(--color-border-emphasis);
		padding-left: var(--space-md);
		margin: var(--space-lg) 0;
	}

	/* Token grid */
	.token-grid {
		display: grid;
		gap: var(--space-sm);
	}

	@media (min-width: 640px) {
		.token-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.token-grid-sm {
		max-width: 600px;
	}

	/* Note */
	.note {
		margin-top: var(--space-md);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.note code {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
	}

	/* Semantic demo */
	.semantic-demo {
		display: grid;
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}

	@media (min-width: 640px) {
		.semantic-demo {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.semantic-card {
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		border: 1px solid;
	}

	.semantic-card.success {
		background: var(--color-success-muted);
		border-color: var(--color-success-border);
	}

	.semantic-card.error {
		background: var(--color-error-muted);
		border-color: var(--color-error-border);
	}

	.semantic-card.warning {
		background: var(--color-warning-muted);
		border-color: var(--color-warning-border);
	}

	.semantic-card.info {
		background: var(--color-info-muted);
		border-color: var(--color-info-border);
	}

	.semantic-label {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		margin-bottom: 4px;
	}

	.success .semantic-label { color: var(--color-success); }
	.error .semantic-label { color: var(--color-error); }
	.warning .semantic-label { color: var(--color-warning); }
	.info .semantic-label { color: var(--color-info); }

	.semantic-card code {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Interactive demo */
	.interactive-demo {
		margin-top: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		display: flex;
		justify-content: center;
	}

	.demo-button {
		padding: var(--space-xs) var(--space-md);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.demo-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.demo-button:active {
		background: var(--color-active);
	}

	.demo-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
