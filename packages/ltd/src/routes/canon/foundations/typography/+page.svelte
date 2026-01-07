<script lang="ts">
	import { TokenValue, CodeBlock } from '$lib/canon';

	// Type scale tokens
	const typeScale = [
		{ token: '--text-display-xl', value: 'clamp(4.236rem, 6vw + 2rem, 6.854rem)', description: 'Hero headlines', ratio: 'φ⁴ max' },
		{ token: '--text-display', value: 'clamp(2.618rem, 4vw + 1.5rem, 4.236rem)', description: 'Page titles', ratio: 'φ³ max' },
		{ token: '--text-h1', value: 'clamp(1.618rem, 3vw + 1rem, 2.618rem)', description: 'Section titles', ratio: 'φ² max' },
		{ token: '--text-h2', value: 'clamp(1.2rem, 2vw + 0.5rem, 1.618rem)', description: 'Subsection titles', ratio: 'φ¹ max' },
		{ token: '--text-h3', value: 'clamp(1.02rem, 1vw + 0.5rem, 1.2rem)', description: 'Card titles', ratio: '1.2¹ max' },
		{ token: '--text-h4', value: 'clamp(0.931rem, 0.5vw + 0.5rem, 1.095rem)', description: 'Small headings', ratio: '√1.2 max' },
		{ token: '--text-h5', value: '1rem', description: 'Base heading', ratio: 'base' },
		{ token: '--text-h6', value: '0.913rem', description: 'Smallest heading', ratio: '1/√1.2' }
	];

	const bodyScale = [
		{ token: '--text-body-lg', value: '1.095rem', description: 'Lead paragraphs', ratio: '√1.2' },
		{ token: '--text-body', value: '1rem', description: 'Body text', ratio: 'base' },
		{ token: '--text-body-sm', value: '0.913rem', description: 'Secondary text', ratio: '1/√1.2' },
		{ token: '--text-caption', value: '0.833rem', description: 'Captions, labels', ratio: '1/1.2' },
		{ token: '--text-overline', value: '0.618rem', description: 'Overlines, eyebrows', ratio: '1/φ' }
	];

	const fontFamilies = [
		{ token: '--font-sans', value: "'Stack Sans Notch', system-ui, -apple-system, sans-serif", description: 'Primary typeface' },
		{ token: '--font-mono', value: '"JetBrains Mono", "Fira Code", monospace', description: 'Code, data' },
		{ token: '--font-serif', value: 'Georgia, "Times New Roman", serif', description: 'Editorial, quotes' }
	];

	const fontWeights = [
		{ token: '--font-light', value: '300', description: 'Light emphasis' },
		{ token: '--font-regular', value: '400', description: 'Body text' },
		{ token: '--font-medium', value: '500', description: 'UI elements' },
		{ token: '--font-semibold', value: '600', description: 'Subheadings' },
		{ token: '--font-bold', value: '700', description: 'Headlines' }
	];

	const lineHeights = [
		{ token: '--leading-tight', value: '1.25', description: 'Headlines, compact' },
		{ token: '--leading-snug', value: '1.375', description: 'Subheadings' },
		{ token: '--leading-normal', value: '1.5', description: 'UI text' },
		{ token: '--leading-relaxed', value: '1.618', description: 'Body text (φ)', featured: true },
		{ token: '--leading-loose', value: '1.75', description: 'Large body text' }
	];

	const letterSpacings = [
		{ token: '--tracking-tighter', value: '-0.025em', description: 'Dense display' },
		{ token: '--tracking-tight', value: '-0.015em', description: 'Headlines' },
		{ token: '--tracking-normal', value: '0', description: 'Body text' },
		{ token: '--tracking-wide', value: '0.025em', description: 'Buttons' },
		{ token: '--tracking-wider', value: '0.05em', description: 'Small caps' },
		{ token: '--tracking-widest', value: '0.1em', description: 'Overlines' }
	];

	const usageExample = `/* Headlines */
.page-title {
  font-size: var(--text-display);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
}

/* Body text */
.article-body {
  font-size: var(--text-body);
  font-weight: var(--font-regular);
  line-height: var(--leading-relaxed);
}

/* Captions */
.image-caption {
  font-size: var(--text-caption);
  color: var(--color-fg-muted);
  letter-spacing: var(--tracking-wide);
}`;
</script>

<svelte:head>
	<title>Typography — Canon Design System</title>
	<meta name="description" content="Canon typography system: type scale, font families, weights, line heights, and letter spacing." />
</svelte:head>

<!-- Header -->
<header class="page-header">
	<p class="eyebrow">Foundations</p>
	<h1>Typography</h1>
	<p class="lead">
		Text sizes that work together naturally. We use the golden ratio (1.618) so every 
		heading and paragraph relates harmoniously—no guesswork needed.
	</p>
</header>

<!-- Philosophy -->
<section class="section">
	<h2>Why the golden ratio?</h2>
	<p>
		φ (phi) = 1.618. You'll find this ratio in nature—shells, flowers, galaxies. When 
		you multiply each text size by 1.618, the result just feels right. Your headlines 
		and body text look like they belong together.
	</p>

	<div class="phi-derivation">
		<div class="phi-formula">
			<span class="phi-symbol">φ</span>
			<span class="phi-equals">=</span>
			<span class="phi-value">1.618033...</span>
		</div>
		<div class="phi-sequence">
			<span class="sequence-item">1 × φ² = 2.618</span>
			<span class="sequence-divider">→</span>
			<span class="sequence-item">1 × φ = 1.618</span>
			<span class="sequence-divider">→</span>
			<span class="sequence-item">1</span>
			<span class="sequence-divider">→</span>
			<span class="sequence-item">1 / φ = 0.618</span>
		</div>
	</div>

	<p>
		For body text and small headings, we use a minor third (1.2) for finer steps. 
		Both ratios create progressions that feel musical—each size is in tune with the next.
	</p>
</section>

<!-- Type Scale -->
<section class="section">
	<h2>Type Scale</h2>
	<p class="section-description">
		These sizes scale smoothly from mobile to desktop using <code>clamp()</code>. 
		Pick a token and the responsive behavior is built in.
	</p>

	<h3>Display & Headings</h3>
	<div class="type-scale-demo">
		{#each typeScale as type}
			<div class="type-sample">
				<div class="sample-preview" style="font-size: var({type.token})">
					Weniger
				</div>
				<div class="sample-meta">
					<code class="sample-token">{type.token}</code>
					<span class="sample-ratio">{type.ratio}</span>
					<span class="sample-description">{type.description}</span>
				</div>
			</div>
		{/each}
	</div>

	<h3>Body & Caption</h3>
	<div class="type-scale-demo">
		{#each bodyScale as type}
			<div class="type-sample">
				<div class="sample-preview" style="font-size: var({type.token})">
					Less, but better.
				</div>
				<div class="sample-meta">
					<code class="sample-token">{type.token}</code>
					<span class="sample-ratio">{type.ratio}</span>
					<span class="sample-description">{type.description}</span>
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- Font Families -->
<section class="section">
	<h2>Font Families</h2>
	<p class="section-description">
		Three fonts with fallbacks for when they don't load. Sans for interfaces, 
		mono for code, serif for editorial moments.
	</p>

	<div class="font-families">
		<div class="font-demo">
			<div class="font-preview sans">
				The quick brown fox jumps over the lazy dog
			</div>
			<div class="font-meta">
				<code>--font-sans</code>
				<span class="font-name">Stack Sans Notch</span>
				<span class="font-use">Primary typeface</span>
			</div>
		</div>

		<div class="font-demo">
			<div class="font-preview mono">
				const φ = 1.618033988749895;
			</div>
			<div class="font-meta">
				<code>--font-mono</code>
				<span class="font-name">JetBrains Mono</span>
				<span class="font-use">Code, data tables</span>
			</div>
		</div>

		<div class="font-demo">
			<div class="font-preview serif">
				"Good design is as little design as possible."
			</div>
			<div class="font-meta">
				<code>--font-serif</code>
				<span class="font-name">Georgia</span>
				<span class="font-use">Editorial, quotes</span>
			</div>
		</div>
	</div>
</section>

<!-- Font Weights -->
<section class="section">
	<h2>Font Weights</h2>
	<p class="section-description">
		Five weights—from light to bold. That's enough range for any hierarchy without 
		overwhelming the reader.
	</p>

	<div class="weights-demo">
		{#each fontWeights as weight}
			<div class="weight-sample">
				<span class="weight-preview" style="font-weight: var({weight.token})">
					Weniger, aber besser
				</span>
				<div class="weight-meta">
					<code>{weight.token}</code>
					<span class="weight-value">{weight.value}</span>
					<span class="weight-use">{weight.description}</span>
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- Line Heights -->
<section class="section">
	<h2>Line Heights</h2>
	<p class="section-description">
		More space between lines makes text easier to read. Use <code>--leading-relaxed</code> (1.618) 
		for body text—it's the golden ratio again.
	</p>

	<div class="leading-demo">
		{#each lineHeights as leading}
			<div class="leading-sample" class:featured={leading.featured}>
				<div class="leading-preview" style="line-height: var({leading.token})">
					<p>Good design is innovative. Good design makes a product useful. Good design is aesthetic.</p>
				</div>
				<div class="leading-meta">
					<code>{leading.token}</code>
					<span class="leading-value">{leading.value}</span>
					<span class="leading-use">{leading.description}</span>
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- Letter Spacing -->
<section class="section">
	<h2>Letter Spacing</h2>
	<p class="section-description">
		Tracking adjusts horizontal rhythm for different contexts.
	</p>

	<div class="tracking-demo">
		{#each letterSpacings as tracking}
			<div class="tracking-sample">
				<span class="tracking-preview" style="letter-spacing: var({tracking.token})">
					TYPOGRAPHY
				</span>
				<div class="tracking-meta">
					<code>{tracking.token}</code>
					<span class="tracking-value">{tracking.value}</span>
					<span class="tracking-use">{tracking.description}</span>
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- Responsive Behavior -->
<section class="section">
	<h2>Responsive Typography</h2>
	<p>
		Display and heading sizes use CSS <code>clamp()</code> for fluid scaling between viewport widths.
		This ensures readability across devices without breakpoint jumps.
	</p>

	<CodeBlock
		code={`/* Fluid typography formula */
--text-display: clamp(
  2.618rem,    /* Minimum: φ² */
  4vw + 1.5rem, /* Preferred: scales with viewport */
  4.236rem     /* Maximum: φ³ */
);`}
		language="css"
		title="fluid-typography.css"
	/>

	<div class="responsive-note">
		<strong>Resize your browser</strong> to see the display text above scale fluidly.
	</div>
</section>

<!-- Usage -->
<section class="section">
	<h2>Usage</h2>
	<p class="section-description">
		Combine size, weight, height, and spacing tokens for consistent typography.
	</p>
	<CodeBlock code={usageExample} language="css" title="typography-patterns.css" />
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
		color: var(--color-fg-primary);
	}

	/* Phi derivation */
	.phi-derivation {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		margin: var(--space-lg) 0;
	}

	.phi-formula {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.phi-symbol {
		font-size: var(--text-h1);
		font-style: italic;
		color: var(--color-fg-primary);
	}

	.phi-equals {
		font-size: var(--text-h2);
		color: var(--color-fg-muted);
	}

	.phi-value {
		font-family: var(--font-mono);
		font-size: var(--text-h2);
		color: var(--color-fg-secondary);
	}

	.phi-sequence {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-xs);
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.sequence-divider {
		color: var(--color-fg-muted);
	}

	/* Type scale demo */
	.type-scale-demo {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
	}

	.type-sample {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
	}

	@media (min-width: 768px) {
		.type-sample {
			flex-direction: row;
			align-items: center;
			gap: var(--space-md);
		}
	}

	.sample-preview {
		flex: 1;
		color: var(--color-fg-primary);
		font-weight: var(--font-semibold);
		line-height: var(--leading-tight);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sample-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-sm);
		flex-shrink: 0;
	}

	.sample-token {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		background: var(--color-bg-subtle);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	.sample-ratio {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.sample-description {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	/* Font families */
	.font-families {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.font-demo {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.font-preview {
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.font-preview.sans {
		font-family: var(--font-sans);
	}

	.font-preview.mono {
		font-family: var(--font-mono);
	}

	.font-preview.serif {
		font-family: var(--font-serif);
		font-style: italic;
	}

	.font-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-sm);
	}

	.font-meta code {
		font-size: var(--text-caption);
		background: var(--color-bg-subtle);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	.font-name {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.font-use {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Weights demo */
	.weights-demo {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.weight-sample {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
	}

	@media (min-width: 640px) {
		.weight-sample {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}

	.weight-preview {
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
	}

	.weight-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-sm);
	}

	.weight-meta code {
		font-size: var(--text-caption);
		background: var(--color-bg-subtle);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	.weight-value {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.weight-use {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	/* Leading demo */
	.leading-demo {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.leading-sample {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.leading-sample.featured {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-subtle);
	}

	.leading-preview {
		margin-bottom: var(--space-sm);
	}

	.leading-preview p {
		margin: 0;
		color: var(--color-fg-primary);
		max-width: 50ch;
	}

	.leading-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.leading-meta code {
		font-size: var(--text-caption);
		background: var(--color-bg-pure);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	.leading-sample.featured .leading-meta code {
		background: var(--color-bg-surface);
	}

	.leading-value {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}

	.leading-use {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Tracking demo */
	.tracking-demo {
		display: grid;
		gap: var(--space-sm);
	}

	@media (min-width: 640px) {
		.tracking-demo {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 900px) {
		.tracking-demo {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.tracking-sample {
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
	}

	.tracking-preview {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.tracking-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-xs);
	}

	.tracking-meta code {
		font-size: var(--text-caption);
		background: var(--color-bg-subtle);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	.tracking-value {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.tracking-use {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		width: 100%;
	}

	/* Responsive note */
	.responsive-note {
		padding: var(--space-sm);
		background: var(--color-info-muted);
		border: 1px solid var(--color-info-border);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-info);
		margin-top: var(--space-md);
	}
</style>
