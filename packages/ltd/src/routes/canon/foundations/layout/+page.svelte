<script lang="ts">
	import { CodeBlock } from '$lib/canon';

	// Container tokens
	const containerTokens = [
		{ token: '--container-sm', value: '640px', description: 'Mobile landscape' },
		{ token: '--container-md', value: '768px', description: 'Tablet portrait' },
		{ token: '--container-lg', value: '1024px', description: 'Tablet landscape' },
		{ token: '--container-xl', value: '1280px', description: 'Desktop' },
		{ token: '--container-2xl', value: '1400px', description: 'Wide desktop' },
		{ token: '--container-prose', value: '65ch', description: 'Readable text width' }
	];

	// Breakpoints (matching Tailwind)
	const breakpoints = [
		{ name: 'sm', value: '640px', description: 'Mobile landscape and up' },
		{ name: 'md', value: '768px', description: 'Tablet and up' },
		{ name: 'lg', value: '1024px', description: 'Laptop and up' },
		{ name: 'xl', value: '1280px', description: 'Desktop and up' },
		{ name: '2xl', value: '1536px', description: 'Large desktop and up' }
	];

	const layoutExample = `/* Centered container */
.container {
  max-width: var(--container-xl);
  margin-inline: auto;
  padding-inline: var(--space-md);
}

/* Prose container for articles */
.article {
  max-width: var(--container-prose);
  margin-inline: auto;
}

/* Responsive grid */
.grid {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}`;

	const gridExample = `/* CSS Grid with Canon spacing */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-md);
}

/* Flexbox layout */
.flex-row {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

/* Stack layout */
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}`;
</script>

<svelte:head>
	<title>Layout — Canon Design System</title>
	<meta name="description" content="Canon layout system: containers, breakpoints, and grid patterns." />
</svelte:head>

<!-- Header -->
<header class="page-header">
	<p class="eyebrow">Foundations</p>
	<h1>Layout</h1>
	<p class="lead">
		Container widths, breakpoints, and composition patterns for responsive layouts.
	</p>
</header>

<!-- Containers -->
<section class="section">
	<h2>Containers</h2>
	<p class="section-description">
		Maximum widths for constraining content at different scales.
	</p>

	<div class="container-demo">
		{#each containerTokens as container}
			<div class="container-row">
				<div class="container-bar" style="max-width: var({container.token})">
					<code>{container.token}</code>
				</div>
				<div class="container-meta">
					<span class="container-value">{container.value}</span>
					<span class="container-use">{container.description}</span>
				</div>
			</div>
		{/each}
	</div>

	<div class="prose-note">
		<strong>Prose width:</strong> <code>--container-prose</code> uses <code>65ch</code> (65 characters),
		the optimal line length for reading comfort. This is typography-aware, scaling with font size.
	</div>
</section>

<!-- Breakpoints -->
<section class="section">
	<h2>Breakpoints</h2>
	<p class="section-description">
		Mobile-first breakpoints aligned with Tailwind's defaults.
	</p>

	<div class="breakpoints-grid">
		{#each breakpoints as bp}
			<div class="breakpoint-item">
				<div class="breakpoint-header">
					<code>@media (min-width: {bp.value})</code>
				</div>
				<div class="breakpoint-meta">
					<span class="breakpoint-name">{bp.name}</span>
					<span class="breakpoint-use">{bp.description}</span>
				</div>
			</div>
		{/each}
	</div>

	<div class="mobile-first-note">
		<strong>Mobile-first:</strong> Start with mobile styles, then add complexity at larger breakpoints.
		This ensures fast initial load on constrained devices.
	</div>
</section>

<!-- Grid Patterns -->
<section class="section">
	<h2>Grid Patterns</h2>
	<p class="section-description">
		Common layout patterns using CSS Grid and Flexbox with Canon spacing.
	</p>

	<h3>Responsive Card Grid</h3>
	<div class="pattern-demo">
		<div class="demo-card-grid">
			<div class="demo-card">Card 1</div>
			<div class="demo-card">Card 2</div>
			<div class="demo-card">Card 3</div>
			<div class="demo-card">Card 4</div>
			<div class="demo-card">Card 5</div>
			<div class="demo-card">Card 6</div>
		</div>
	</div>

	<h3>Stack Layout</h3>
	<div class="pattern-demo">
		<div class="demo-stack">
			<div class="demo-stack-item">Item 1</div>
			<div class="demo-stack-item">Item 2</div>
			<div class="demo-stack-item">Item 3</div>
		</div>
	</div>

	<h3>Flex Row</h3>
	<div class="pattern-demo">
		<div class="demo-flex-row">
			<div class="demo-flex-item">Left</div>
			<div class="demo-flex-item grow">Center (grows)</div>
			<div class="demo-flex-item">Right</div>
		</div>
	</div>
</section>

<!-- Composition -->
<section class="section">
	<h2>Layout Composition</h2>
	<p class="section-description">
		Combine container, grid, and spacing tokens for complete layouts.
	</p>

	<CodeBlock code={layoutExample} language="css" title="layout-patterns.css" />
</section>

<!-- Grid Code -->
<section class="section">
	<h2>Grid Utilities</h2>
	<CodeBlock code={gridExample} language="css" title="grid-utilities.css" />
</section>

<!-- Guidelines -->
<section class="section">
	<h2>Guidelines</h2>

	<div class="guidelines">
		<div class="guideline">
			<h4>Use max-width, not width</h4>
			<p>Containers should shrink on smaller screens. Always <code>max-width</code>.</p>
		</div>
		<div class="guideline">
			<h4>Margin-inline for centering</h4>
			<p>Use <code>margin-inline: auto</code> to center containers horizontally.</p>
		</div>
		<div class="guideline">
			<h4>Gap over margin</h4>
			<p>Use <code>gap</code> in Grid/Flexbox instead of margins between children.</p>
		</div>
		<div class="guideline">
			<h4>Fluid grids</h4>
			<p>Prefer <code>auto-fill</code>/<code>auto-fit</code> with <code>minmax()</code> for natural responsiveness.</p>
		</div>
	</div>
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

	h4 {
		font-size: var(--text-body);
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

	p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-md);
		max-width: 65ch;
	}

	code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		background: var(--color-bg-surface);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	/* Container demo */
	.container-demo {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.container-row {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	@media (min-width: 768px) {
		.container-row {
			flex-direction: row;
			align-items: center;
			gap: var(--space-md);
		}
	}

	.container-bar {
		height: 40px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		padding: 0 var(--space-sm);
		width: 100%;
	}

	.container-bar code {
		font-size: var(--text-caption);
		background: transparent;
		padding: 0;
	}

	.container-meta {
		display: flex;
		gap: var(--space-sm);
		flex-shrink: 0;
	}

	.container-value {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.container-use {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	.prose-note,
	.mobile-first-note {
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.prose-note code,
	.mobile-first-note code {
		font-size: var(--text-caption);
	}

	/* Breakpoints grid */
	.breakpoints-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.breakpoint-item {
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.breakpoint-header {
		margin-bottom: var(--space-xs);
	}

	.breakpoint-header code {
		font-size: var(--text-caption);
		background: var(--color-bg-subtle);
	}

	.breakpoint-meta {
		display: flex;
		gap: var(--space-sm);
	}

	.breakpoint-name {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.breakpoint-use {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Pattern demos */
	.pattern-demo {
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-lg);
	}

	.demo-card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--space-sm);
	}

	.demo-card {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-align: center;
	}

	.demo-stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		max-width: 300px;
	}

	.demo-stack-item {
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.demo-flex-row {
		display: flex;
		gap: var(--space-sm);
		align-items: center;
	}

	.demo-flex-item {
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.demo-flex-item.grow {
		flex: 1;
	}

	/* Guidelines */
	.guidelines {
		display: grid;
		gap: var(--space-md);
	}

	@media (min-width: 640px) {
		.guidelines {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.guideline {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.guideline p {
		margin: 0;
		font-size: var(--text-body-sm);
	}

	.guideline code {
		font-size: var(--text-caption);
	}
</style>
