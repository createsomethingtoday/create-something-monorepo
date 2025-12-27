<script lang="ts">
	import { TokenValue, CodeBlock } from '$lib/canon';

	// Spacing tokens with phi derivation
	const spacingTokens = [
		{ token: '--space-xs', value: '0.618rem', pixels: '~10px', ratio: 'φ⁻¹', description: 'Tight gaps, inline spacing' },
		{ token: '--space-sm', value: '1rem', pixels: '16px', ratio: 'φ⁰ (base)', description: 'Default component padding' },
		{ token: '--space-md', value: '1.618rem', pixels: '~26px', ratio: 'φ¹', description: 'Section padding, gaps' },
		{ token: '--space-lg', value: '2.618rem', pixels: '~42px', ratio: 'φ²', description: 'Large sections' },
		{ token: '--space-xl', value: '4.236rem', pixels: '~68px', ratio: 'φ³', description: 'Page sections' },
		{ token: '--space-2xl', value: '6.854rem', pixels: '~110px', ratio: 'φ⁴', description: 'Hero spacing' },
		{ token: '--space-3xl', value: '11.09rem', pixels: '~177px', ratio: 'φ⁵', description: 'Major divisions' }
	];

	// Radius tokens
	const radiusTokens = [
		{ token: '--radius-sm', value: '6px', description: 'Buttons, inputs' },
		{ token: '--radius-md', value: '8px', description: 'Cards, small panels' },
		{ token: '--radius-lg', value: '12px', description: 'Dialogs, large cards' },
		{ token: '--radius-xl', value: '16px', description: 'Modals, popovers' },
		{ token: '--radius-2xl', value: '24px', description: 'Feature cards' },
		{ token: '--radius-full', value: '9999px', description: 'Circles, pills' }
	];

	const usageExample = `/* Component spacing */
.card {
  padding: var(--space-md);
  gap: var(--space-sm);
}

/* Section spacing */
.section {
  padding-block: var(--space-xl);
  margin-bottom: var(--space-2xl);
}

/* Grid gaps */
.grid {
  gap: var(--space-md);
}

/* Inline elements */
.button-icon {
  margin-right: var(--space-xs);
}`;
</script>

<svelte:head>
	<title>Spacing — Canon Design System</title>
	<meta name="description" content="Canon spacing system: golden ratio scale for margins, padding, and gaps." />
</svelte:head>

<!-- Header -->
<header class="page-header">
	<p class="eyebrow">Foundations</p>
	<h1>Spacing</h1>
	<p class="lead">
		A spacing scale built on the golden ratio (φ = 1.618), creating natural rhythm and
		proportion across all layouts.
	</p>
</header>

<!-- Philosophy -->
<section class="section">
	<h2>The Scale</h2>
	<p>
		Each step multiplies or divides by φ. Starting from 1rem (base), larger values multiply
		upward; smaller values divide downward. The result is spacing that relates harmoniously.
	</p>

	<div class="phi-scale">
		<div class="scale-formula">
			<span class="formula-item"><code>xs</code> = 1/φ</span>
			<span class="formula-arrow">→</span>
			<span class="formula-item"><code>sm</code> = 1</span>
			<span class="formula-arrow">→</span>
			<span class="formula-item"><code>md</code> = φ</span>
			<span class="formula-arrow">→</span>
			<span class="formula-item"><code>lg</code> = φ²</span>
			<span class="formula-arrow">→</span>
			<span class="formula-item">...</span>
		</div>
	</div>
</section>

<!-- Spacing Tokens -->
<section class="section">
	<h2>Spacing Tokens</h2>
	<p class="section-description">
		Use these tokens for padding, margins, gaps, and any spatial relationships.
	</p>

	<div class="spacing-grid">
		{#each spacingTokens as space}
			<div class="spacing-item">
				<div class="spacing-visual">
					<div class="spacing-box" style="width: var({space.token}); height: var({space.token})"></div>
				</div>
				<div class="spacing-info">
					<div class="spacing-header">
						<code class="spacing-token">{space.token}</code>
						<span class="spacing-ratio">{space.ratio}</span>
					</div>
					<div class="spacing-values">
						<span class="spacing-rem">{space.value}</span>
						<span class="spacing-px">{space.pixels}</span>
					</div>
					<p class="spacing-description">{space.description}</p>
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- Visual Demo -->
<section class="section">
	<h2>Visual Harmony</h2>
	<p class="section-description">
		Nested containers demonstrating the golden ratio in action. Each container's padding
		relates to the next by φ.
	</p>

	<div class="harmony-demo">
		<div class="harmony-outer">
			<span class="harmony-label">--space-xl</span>
			<div class="harmony-middle">
				<span class="harmony-label">--space-lg</span>
				<div class="harmony-inner">
					<span class="harmony-label">--space-md</span>
					<div class="harmony-core">
						<span class="harmony-label">--space-sm</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Border Radius -->
<section class="section">
	<h2>Border Radius</h2>
	<p class="section-description">
		Radius tokens use a 4px base with multipliers for consistency across UI elements.
	</p>

	<div class="radius-grid">
		{#each radiusTokens as radius}
			<div class="radius-item">
				<div class="radius-preview" style="border-radius: var({radius.token})"></div>
				<div class="radius-info">
					<code>{radius.token}</code>
					<span class="radius-value">{radius.value}</span>
					<span class="radius-use">{radius.description}</span>
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- Usage Guidelines -->
<section class="section">
	<h2>Usage Guidelines</h2>

	<div class="guidelines">
		<div class="guideline">
			<h4>Component Internals</h4>
			<p>Use <code>--space-sm</code> and <code>--space-xs</code> for internal component spacing.</p>
		</div>
		<div class="guideline">
			<h4>Between Components</h4>
			<p>Use <code>--space-md</code> and <code>--space-lg</code> for gaps between components.</p>
		</div>
		<div class="guideline">
			<h4>Page Sections</h4>
			<p>Use <code>--space-xl</code> and <code>--space-2xl</code> for major page divisions.</p>
		</div>
		<div class="guideline">
			<h4>Consistency</h4>
			<p>Prefer adjacent scale steps. Don't jump from <code>--space-xs</code> to <code>--space-xl</code>.</p>
		</div>
	</div>
</section>

<!-- Usage -->
<section class="section">
	<h2>Usage</h2>
	<CodeBlock code={usageExample} language="css" title="spacing-usage.css" />
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

	/* Phi scale */
	.phi-scale {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		margin: var(--space-lg) 0;
		overflow-x: auto;
	}

	.scale-formula {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
	}

	.formula-item code {
		color: var(--color-fg-primary);
	}

	.formula-arrow {
		color: var(--color-fg-muted);
	}

	/* Spacing grid */
	.spacing-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.spacing-item {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		align-items: center;
	}

	.spacing-visual {
		width: 120px;
		height: 120px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
	}

	.spacing-box {
		background: var(--color-fg-muted);
		border-radius: var(--radius-sm);
		max-width: 100%;
		max-height: 100%;
	}

	.spacing-info {
		flex: 1;
		min-width: 0;
	}

	.spacing-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: 4px;
	}

	.spacing-token {
		font-family: var(--font-mono);
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		background: transparent;
		padding: 0;
	}

	.spacing-ratio {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.spacing-values {
		display: flex;
		gap: var(--space-sm);
		margin-bottom: 4px;
	}

	.spacing-rem {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.spacing-px {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.spacing-description {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	/* Harmony demo */
	.harmony-demo {
		display: flex;
		justify-content: center;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.harmony-outer,
	.harmony-middle,
	.harmony-inner,
	.harmony-core {
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		position: relative;
	}

	.harmony-outer {
		padding: var(--space-xl);
		background: var(--color-bg-subtle);
	}

	.harmony-middle {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
	}

	.harmony-inner {
		padding: var(--space-md);
		background: var(--color-bg-subtle);
	}

	.harmony-core {
		padding: var(--space-sm);
		background: var(--color-fg-muted);
		min-width: 80px;
		min-height: 40px;
	}

	.harmony-label {
		position: absolute;
		top: 4px;
		left: 8px;
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.harmony-core .harmony-label {
		color: var(--color-bg-pure);
	}

	/* Radius grid */
	.radius-grid {
		display: grid;
		gap: var(--space-sm);
	}

	@media (min-width: 640px) {
		.radius-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 900px) {
		.radius-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.radius-item {
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.radius-preview {
		width: 80px;
		height: 80px;
		background: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.radius-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.radius-info code {
		font-size: var(--text-body-sm);
		background: transparent;
		padding: 0;
		color: var(--color-fg-primary);
	}

	.radius-value {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.radius-use {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
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
