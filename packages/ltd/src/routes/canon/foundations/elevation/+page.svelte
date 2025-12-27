<script lang="ts">
	import { CodeBlock } from '$lib/canon';

	// Shadow tokens
	const shadowTokens = [
		{ token: '--shadow-none', value: 'none', description: 'No shadow' },
		{ token: '--shadow-sm', value: '0 1px 2px 0 rgba(0, 0, 0, 0.5)', description: 'Subtle lift' },
		{ token: '--shadow-md', value: '0 4px 6px -1px rgba(0, 0, 0, 0.5)', description: 'Cards, dropdowns' },
		{ token: '--shadow-lg', value: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', description: 'Modals, popovers' },
		{ token: '--shadow-xl', value: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', description: 'Dialogs' },
		{ token: '--shadow-2xl', value: '0 25px 50px -12px rgba(0, 0, 0, 0.75)', description: 'Full-screen modals' }
	];

	// Glow tokens
	const glowTokens = [
		{ token: '--shadow-glow-sm', value: '0 0 10px rgba(255, 255, 255, 0.05)', description: 'Subtle ambient' },
		{ token: '--shadow-glow-md', value: '0 0 20px rgba(255, 255, 255, 0.1)', description: 'Highlight' },
		{ token: '--shadow-glow-lg', value: '0 0 40px rgba(255, 255, 255, 0.15)', description: 'Feature emphasis' }
	];

	// Inner shadow tokens
	const innerTokens = [
		{ token: '--shadow-inner', value: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.5)', description: 'Input fields' },
		{ token: '--shadow-inner-lg', value: 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.5)', description: 'Deep inset' }
	];

	// Z-index tokens
	const zIndexTokens = [
		{ token: '--z-base', value: '0', description: 'Default stacking' },
		{ token: '--z-dropdown', value: '10', description: 'Dropdown menus' },
		{ token: '--z-sticky', value: '20', description: 'Sticky headers' },
		{ token: '--z-fixed', value: '50', description: 'Fixed elements' },
		{ token: '--z-modal', value: '100', description: 'Modal dialogs' },
		{ token: '--z-popover', value: '200', description: 'Popovers, tooltips on modals' },
		{ token: '--z-tooltip', value: '300', description: 'Topmost tooltips' }
	];

	const usageExample = `/* Card with shadow */
.card {
  box-shadow: var(--shadow-md);
}

.card:hover {
  box-shadow: var(--shadow-lg);
}

/* Modal with overlay */
.modal-backdrop {
  z-index: var(--z-modal);
}

.modal {
  z-index: var(--z-modal);
  box-shadow: var(--shadow-xl);
}

/* Glow effect for CTAs */
.cta:hover {
  box-shadow: var(--shadow-glow-md);
}`;
</script>

<svelte:head>
	<title>Elevation — Canon Design System</title>
	<meta name="description" content="Canon elevation system: shadows, glows, and z-index for depth and layering." />
</svelte:head>

<!-- Header -->
<header class="page-header">
	<p class="eyebrow">Foundations</p>
	<h1>Elevation</h1>
	<p class="lead">
		Shadows create depth without color. Elevation establishes hierarchy through layering,
		not decoration.
	</p>
</header>

<!-- Philosophy -->
<section class="section">
	<h2>Depth Without Color</h2>
	<p>
		On a black canvas, traditional drop shadows would disappear. Canon uses increased opacity
		and subtle light glows to create the illusion of elevation. Dark theme, not flat design.
	</p>
</section>

<!-- Shadows -->
<section class="section">
	<h2>Shadows</h2>
	<p class="section-description">
		Progressive shadow scale for increasing elevation. Higher elements cast deeper shadows.
	</p>

	<div class="shadow-grid">
		{#each shadowTokens as shadow}
			<div class="shadow-item">
				<div class="shadow-preview" style="box-shadow: var({shadow.token})">
					<span class="preview-text">{shadow.token.replace('--shadow-', '')}</span>
				</div>
				<div class="shadow-info">
					<code>{shadow.token}</code>
					<span class="shadow-use">{shadow.description}</span>
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- Glows -->
<section class="section">
	<h2>Glows</h2>
	<p class="section-description">
		Light-based elevation for dark backgrounds. Use sparingly for emphasis.
	</p>

	<div class="glow-grid">
		{#each glowTokens as glow}
			<div class="glow-item">
				<div class="glow-preview" style="box-shadow: var({glow.token})">
					<span class="preview-text">{glow.token.replace('--shadow-glow-', '')}</span>
				</div>
				<div class="glow-info">
					<code>{glow.token}</code>
					<span class="glow-use">{glow.description}</span>
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- Inner Shadows -->
<section class="section">
	<h2>Inner Shadows</h2>
	<p class="section-description">
		Inset shadows for recessed elements like input fields.
	</p>

	<div class="inner-grid">
		{#each innerTokens as inner}
			<div class="inner-item">
				<div class="inner-preview" style="box-shadow: var({inner.token})">
					<span class="preview-text">{inner.token.replace('--shadow-inner', 'inner')}</span>
				</div>
				<div class="inner-info">
					<code>{inner.token}</code>
					<span class="inner-use">{inner.description}</span>
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- Z-Index -->
<section class="section">
	<h2>Z-Index Scale</h2>
	<p class="section-description">
		Predictable stacking order for layered interfaces. Never use arbitrary z-index values.
	</p>

	<div class="z-index-demo">
		<div class="z-stack">
			{#each [...zIndexTokens].reverse() as z, i}
				<div
					class="z-layer"
					style="
						z-index: var({z.token});
						transform: translateY({i * 8}px);
						opacity: {1 - i * 0.1};
					"
				>
					<code>{z.token}</code>
					<span>{z.value}</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="z-reference">
		{#each zIndexTokens as z}
			<div class="z-row">
				<code>{z.token}</code>
				<span class="z-value">{z.value}</span>
				<span class="z-use">{z.description}</span>
			</div>
		{/each}
	</div>
</section>

<!-- Elevation Example -->
<section class="section">
	<h2>Elevation in Action</h2>
	<p class="section-description">
		Interactive demo showing how shadows communicate elevation changes on hover.
	</p>

	<div class="elevation-demo">
		<div class="demo-card">
			<span class="demo-label">Hover me</span>
			<p class="demo-text">Shadow increases on hover, communicating lift.</p>
		</div>
	</div>
</section>

<!-- Usage -->
<section class="section">
	<h2>Usage</h2>
	<CodeBlock code={usageExample} language="css" title="elevation-usage.css" />
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
		color: var(--color-fg-primary);
	}

	/* Shadow grid */
	.shadow-grid {
		display: grid;
		gap: var(--space-md);
	}

	@media (min-width: 640px) {
		.shadow-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 900px) {
		.shadow-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.shadow-item {
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
	}

	.shadow-preview {
		height: 100px;
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: var(--space-sm);
	}

	.preview-text {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
	}

	.shadow-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.shadow-info code {
		font-size: var(--text-caption);
	}

	.shadow-use {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Glow grid */
	.glow-grid {
		display: grid;
		gap: var(--space-md);
	}

	@media (min-width: 768px) {
		.glow-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.glow-item {
		padding: var(--space-md);
		background: var(--color-bg-pure);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.glow-preview {
		height: 100px;
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: var(--space-sm);
	}

	.glow-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.glow-info code {
		font-size: var(--text-caption);
	}

	.glow-use {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Inner shadow grid */
	.inner-grid {
		display: grid;
		gap: var(--space-md);
	}

	@media (min-width: 640px) {
		.inner-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.inner-item {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.inner-preview {
		height: 80px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: var(--space-sm);
	}

	.inner-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.inner-info code {
		font-size: var(--text-caption);
	}

	.inner-use {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Z-index demo */
	.z-index-demo {
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-lg);
		overflow: hidden;
	}

	.z-stack {
		position: relative;
		height: 200px;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}

	.z-layer {
		position: absolute;
		width: 200px;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.z-layer code {
		font-size: var(--text-caption);
	}

	.z-layer span {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Z reference */
	.z-reference {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.z-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.z-row code {
		font-size: var(--text-caption);
		min-width: 120px;
	}

	.z-value {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		min-width: 40px;
	}

	.z-use {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	/* Elevation demo */
	.elevation-demo {
		display: flex;
		justify-content: center;
		padding: var(--space-xl);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
	}

	.demo-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
		transition: all var(--duration-standard) var(--ease-standard);
		cursor: pointer;
		max-width: 300px;
	}

	.demo-card:hover {
		box-shadow: var(--shadow-xl);
		transform: translateY(-4px);
	}

	.demo-label {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.demo-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}
</style>
