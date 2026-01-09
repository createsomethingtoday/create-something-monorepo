<script lang="ts">
	/**
	 * OUTERFIELDS Design Guidelines
	 *
	 * Typography, color palettes, and accessibility standards
	 */
	import { Palette, Type, Accessibility, Layout, Sparkles } from 'lucide-svelte';

	const colors = [
		{ name: 'Primary', value: '#7c2bee', usage: 'CTAs, active states, brand accent' },
		{ name: 'Background', value: '#000000', usage: 'Page backgrounds' },
		{ name: 'Surface', value: '#111111', usage: 'Cards, elevated elements' },
		{ name: 'Subtle', value: '#1a1a1a', usage: 'Secondary surfaces' },
		{ name: 'Text Primary', value: '#ffffff', usage: 'Headlines, primary text' },
		{ name: 'Text Muted', value: 'rgba(255,255,255,0.46)', usage: 'Secondary text, captions' },
		{ name: 'Border', value: 'rgba(255,255,255,0.1)', usage: 'Dividers, card borders' },
		{ name: 'Success', value: '#44aa44', usage: 'Success states, confirmations' },
		{ name: 'Error', value: '#d44d4d', usage: 'Error states, warnings' }
	];

	const typography = [
		{ name: 'Display', size: 'clamp(2.5rem, 4vw + 1.5rem, 5rem)', weight: '700', usage: 'Hero headlines' },
		{ name: 'H1', size: 'clamp(2rem, 3vw + 1rem, 3.5rem)', weight: '700', usage: 'Page titles' },
		{ name: 'H2', size: 'clamp(1.5rem, 2vw + 0.75rem, 2.25rem)', weight: '600', usage: 'Section headers' },
		{ name: 'H3', size: 'clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem)', weight: '600', usage: 'Card titles' },
		{ name: 'Body', size: '1rem', weight: '400', usage: 'Paragraphs, general text' },
		{ name: 'Small', size: '0.875rem', weight: '400', usage: 'Captions, metadata' }
	];
</script>

<svelte:head>
	<title>Design Guidelines | OUTERFIELDS</title>
	<meta name="description" content="OUTERFIELDS design system - typography, colors, and accessibility standards for the platform." />
</svelte:head>

<div class="design-page">
	<div class="design-container">
		<header class="design-header">
			<div class="header-icon">
				<Palette size={40} />
			</div>
			<h1>Design Guidelines</h1>
			<p class="design-subtitle">
				Typography, color palettes, and accessibility standards for building consistent experiences.
			</p>
		</header>

		<section class="design-section">
			<div class="section-header">
				<Sparkles size={24} />
				<h2>Brand Principles</h2>
			</div>
			<div class="principles-grid">
				<div class="principle-card">
					<h3>Premium</h3>
					<p>Every element should feel considered and intentional. No clutter, no noise.</p>
				</div>
				<div class="principle-card">
					<h3>Accessible</h3>
					<p>WCAG AA compliant. High contrast ratios. Readable at any size.</p>
				</div>
				<div class="principle-card">
					<h3>Immersive</h3>
					<p>Content takes center stage. Interface fades into the background.</p>
				</div>
			</div>
		</section>

		<section class="design-section">
			<div class="section-header">
				<Palette size={24} />
				<h2>Color Palette</h2>
			</div>
			<div class="colors-grid">
				{#each colors as color}
					<div class="color-card">
						<div class="color-swatch" style="background: {color.value}"></div>
						<div class="color-info">
							<span class="color-name">{color.name}</span>
							<code class="color-value">{color.value}</code>
							<span class="color-usage">{color.usage}</span>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="design-section">
			<div class="section-header">
				<Type size={24} />
				<h2>Typography</h2>
			</div>
			<div class="typography-list">
				{#each typography as type}
					<div class="type-row">
						<div class="type-preview" style="font-size: {type.size}; font-weight: {type.weight}">
							{type.name}
						</div>
						<div class="type-info">
							<code>{type.size}</code>
							<span class="type-weight">Weight: {type.weight}</span>
							<span class="type-usage">{type.usage}</span>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="design-section">
			<div class="section-header">
				<Layout size={24} />
				<h2>Spacing</h2>
			</div>
			<p class="section-description">
				Spacing follows the golden ratio (φ = 1.618) for harmonious proportions.
			</p>
			<div class="spacing-grid">
				<div class="spacing-item">
					<div class="spacing-visual" style="width: 0.5rem; height: 0.5rem"></div>
					<code>--space-xs</code>
					<span>0.5rem (8px)</span>
				</div>
				<div class="spacing-item">
					<div class="spacing-visual" style="width: 1rem; height: 1rem"></div>
					<code>--space-sm</code>
					<span>1rem (16px)</span>
				</div>
				<div class="spacing-item">
					<div class="spacing-visual" style="width: 1.618rem; height: 1.618rem"></div>
					<code>--space-md</code>
					<span>1.618rem (26px)</span>
				</div>
				<div class="spacing-item">
					<div class="spacing-visual" style="width: 2.618rem; height: 2.618rem"></div>
					<code>--space-lg</code>
					<span>2.618rem (42px)</span>
				</div>
				<div class="spacing-item">
					<div class="spacing-visual" style="width: 4.236rem; height: 4.236rem"></div>
					<code>--space-xl</code>
					<span>4.236rem (68px)</span>
				</div>
			</div>
		</section>

		<section class="design-section">
			<div class="section-header">
				<Accessibility size={24} />
				<h2>Accessibility</h2>
			</div>
			<div class="accessibility-grid">
				<div class="a11y-card">
					<h3>Color Contrast</h3>
					<p>All text meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text).</p>
				</div>
				<div class="a11y-card">
					<h3>Focus States</h3>
					<p>Visible focus indicators on all interactive elements for keyboard navigation.</p>
				</div>
				<div class="a11y-card">
					<h3>Motion</h3>
					<p>Respects prefers-reduced-motion. All animations can be disabled.</p>
				</div>
				<div class="a11y-card">
					<h3>Screen Readers</h3>
					<p>Semantic HTML, ARIA labels, and proper heading hierarchy throughout.</p>
				</div>
			</div>
		</section>

		<footer class="design-footer">
			<a href="/" class="back-link">&larr; Back to Home</a>
		</footer>
	</div>
</div>

<style>
	.design-page {
		min-height: 100vh;
		padding: 8rem 1.5rem 4rem;
		background: var(--color-bg-pure);
	}

	.design-container {
		max-width: 64rem;
		margin: 0 auto;
	}

	.design-header {
		text-align: center;
		margin-bottom: 4rem;
	}

	.header-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 5rem;
		height: 5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		color: var(--color-primary);
		margin-bottom: 1.5rem;
	}

	.design-header h1 {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.75rem;
	}

	.design-subtitle {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		margin: 0;
		max-width: 32rem;
		margin: 0 auto;
	}

	.design-section {
		margin-bottom: 4rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.section-header :global(svg) {
		color: var(--color-primary);
	}

	.section-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.section-description {
		color: var(--color-fg-muted);
		margin: 0 0 1.5rem;
	}

	.principles-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.principle-card {
		padding: 1.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
	}

	.principle-card h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.principle-card p {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
		line-height: 1.5;
	}

	.colors-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: 1rem;
	}

	.color-card {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
	}

	.color-swatch {
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border-default);
		flex-shrink: 0;
	}

	.color-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.color-name {
		font-weight: 600;
		color: var(--color-fg-primary);
		font-size: 0.875rem;
	}

	.color-value {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		width: fit-content;
	}

	.color-usage {
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
	}

	.typography-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.type-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
	}

	.type-preview {
		color: var(--color-fg-primary);
		line-height: 1.2;
	}

	.type-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.75rem;
	}

	.type-info code {
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}

	.type-weight {
		color: var(--color-fg-subtle);
	}

	.type-usage {
		color: var(--color-fg-muted);
	}

	.spacing-grid {
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.spacing-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.spacing-visual {
		background: var(--color-primary);
		border-radius: 0.25rem;
	}

	.spacing-item code {
		font-size: 0.75rem;
		color: var(--color-fg-secondary);
	}

	.spacing-item span {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.accessibility-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.a11y-card {
		padding: 1.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
	}

	.a11y-card h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.a11y-card p {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
		line-height: 1.5;
	}

	.design-footer {
		margin-top: 4rem;
		padding-top: 2rem;
		border-top: 1px solid var(--color-border-default);
	}

	.back-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-primary);
	}

	@media (max-width: 768px) {
		.principles-grid {
			grid-template-columns: 1fr;
		}

		.accessibility-grid {
			grid-template-columns: 1fr;
		}

		.type-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.type-info {
			flex-wrap: wrap;
		}
	}

	@media (max-width: 640px) {
		.design-page {
			padding: 6rem 1rem 3rem;
		}
	}
</style>
