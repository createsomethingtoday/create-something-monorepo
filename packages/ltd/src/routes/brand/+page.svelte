<script lang="ts">
	import { browser } from '$app/environment';

	// Asset definitions
	const icons = [
		{
			name: 'Icon with Background',
			file: 'icon-with-bg.svg',
			description: '512×512 with black background'
		},
		{
			name: 'Icon Circular',
			file: 'icon-circular.svg',
			description: 'Circular variant for avatars'
		},
		{
			name: 'Icon Only',
			file: 'icon-only.svg',
			description: 'Transparent, scalable'
		}
	];

	const wordmarks = [
		{
			name: 'Wordmark White',
			file: 'wordmark-white.svg',
			description: 'For dark backgrounds',
			bg: 'dark'
		},
		{
			name: 'Wordmark Black',
			file: 'wordmark-black.svg',
			description: 'For light backgrounds',
			bg: 'light'
		}
	];

	const lockups = [
		{
			name: 'Horizontal Light',
			file: 'lockup-horizontal-light.svg',
			description: 'For dark backgrounds',
			bg: 'dark'
		},
		{
			name: 'Horizontal Dark',
			file: 'lockup-horizontal-dark.svg',
			description: 'For light backgrounds',
			bg: 'light'
		},
		{
			name: 'Stacked Light',
			file: 'lockup-stacked-light.svg',
			description: 'For dark backgrounds',
			bg: 'dark'
		},
		{
			name: 'Stacked Dark',
			file: 'lockup-stacked-dark.svg',
			description: 'For light backgrounds',
			bg: 'light'
		}
	];

	const colors = [
		{ name: 'Pure Black', value: '#000000', token: '--color-bg-pure' },
		{ name: 'Elevated', value: '#0a0a0a', token: '--color-bg-elevated' },
		{ name: 'Surface', value: '#111111', token: '--color-bg-surface' },
		{ name: 'Pure White', value: '#ffffff', token: '--color-fg-primary' }
	];

	function copyToClipboard(text: string) {
		if (browser) {
			navigator.clipboard.writeText(text);
		}
	}

	function downloadSvg(filename: string) {
		if (browser) {
			window.open(`/brand/${filename}`, '_blank');
		}
	}
</script>

<svelte:head>
	<title>Brand Assets | CREATE SOMETHING</title>
	<meta name="description" content="Official brand assets for CREATE SOMETHING. Download logos, wordmarks, and lockups." />
</svelte:head>

<main class="brand-page">
	<header class="brand-header">
		<h1 class="brand-title">Brand Assets</h1>
		<p class="brand-subtitle">
			Official assets for CREATE SOMETHING. Use responsibly.
		</p>
	</header>

	<!-- Icons Section -->
	<section class="asset-section">
		<h2 class="section-title">Icons</h2>
		<div class="asset-grid icons-grid">
			{#each icons as icon}
				<button
					class="asset-card"
					onclick={() => downloadSvg(icon.file)}
					type="button"
				>
					<div class="asset-preview dark">
						<img src="/brand/{icon.file}" alt={icon.name} class="preview-image" />
					</div>
					<div class="asset-info">
						<span class="asset-name">{icon.name}</span>
						<span class="asset-description">{icon.description}</span>
					</div>
				</button>
			{/each}
		</div>
	</section>

	<!-- Lockups Section -->
	<section class="asset-section">
		<h2 class="section-title">Lockups</h2>
		<div class="asset-grid lockups-grid">
			{#each lockups as lockup}
				<button
					class="asset-card"
					onclick={() => downloadSvg(lockup.file)}
					type="button"
				>
					<div class="asset-preview {lockup.bg}">
						<img src="/brand/{lockup.file}" alt={lockup.name} class="preview-image lockup" />
					</div>
					<div class="asset-info">
						<span class="asset-name">{lockup.name}</span>
						<span class="asset-description">{lockup.description}</span>
					</div>
				</button>
			{/each}
		</div>
	</section>

	<!-- Wordmarks Section -->
	<section class="asset-section">
		<h2 class="section-title">Wordmarks</h2>
		<div class="asset-grid wordmarks-grid">
			{#each wordmarks as wordmark}
				<button
					class="asset-card"
					onclick={() => downloadSvg(wordmark.file)}
					type="button"
				>
					<div class="asset-preview {wordmark.bg}">
						<img src="/brand/{wordmark.file}" alt={wordmark.name} class="preview-image wordmark" />
					</div>
					<div class="asset-info">
						<span class="asset-name">{wordmark.name}</span>
						<span class="asset-description">{wordmark.description}</span>
					</div>
				</button>
			{/each}
		</div>
	</section>

	<!-- Colors Section -->
	<section class="asset-section">
		<h2 class="section-title">Colors</h2>
		<div class="colors-grid">
			{#each colors as color}
				<button
					class="color-card"
					onclick={() => copyToClipboard(color.value)}
					type="button"
					title="Click to copy"
				>
					<div class="color-swatch" style="background-color: {color.value}"></div>
					<div class="color-info">
						<span class="color-name">{color.name}</span>
						<span class="color-value">{color.value}</span>
						<span class="color-token">{color.token}</span>
					</div>
				</button>
			{/each}
		</div>
	</section>

	<!-- Typography Section -->
	<section class="asset-section">
		<h2 class="section-title">Typography</h2>
		<div class="typography-grid">
			<div class="type-card">
				<span class="type-sample sans">Stack Sans Notch</span>
				<span class="type-meta">Primary · Weight 600 · Tight tracking</span>
			</div>
			<div class="type-card">
				<span class="type-sample mono">JetBrains Mono</span>
				<span class="type-meta">Code · Technical content</span>
			</div>
		</div>
	</section>

	<!-- Guidelines Section -->
	<section class="asset-section guidelines-section">
		<h2 class="section-title">Usage Guidelines</h2>
		<ul class="guidelines-list">
			<li>Match logo variant to background (light logo on dark, dark on light)</li>
			<li>Maintain clear space around the logo equal to the cube height</li>
			<li>Do not rotate, skew, or apply effects to the logo</li>
			<li>Do not change the logo colors or opacity values</li>
			<li>Do not place on busy or patterned backgrounds</li>
		</ul>
	</section>
</main>

<style>
	.brand-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
	}

	.brand-header {
		text-align: center;
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.brand-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.brand-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-muted);
	}

	.asset-section {
		margin-bottom: var(--space-2xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-lg);
	}

	.asset-grid {
		display: grid;
		gap: var(--space-md);
	}

	.icons-grid {
		grid-template-columns: repeat(3, 1fr);
	}

	.lockups-grid {
		grid-template-columns: repeat(2, 1fr);
	}

	.wordmarks-grid {
		grid-template-columns: repeat(2, 1fr);
	}

	.asset-card {
		display: flex;
		flex-direction: column;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		cursor: pointer;
		transition: border-color var(--duration-micro) var(--ease-standard);
		text-align: left;
	}

	.asset-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.asset-card:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.asset-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-xl);
		min-height: 160px;
	}

	.asset-preview.dark {
		background: var(--color-bg-pure);
	}

	.asset-preview.light {
		background: #ffffff;
	}

	.preview-image {
		max-width: 100%;
		max-height: 80px;
		object-fit: contain;
	}

	.preview-image.lockup {
		max-height: 60px;
	}

	.preview-image.wordmark {
		max-height: 32px;
	}

	.asset-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.asset-name {
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.asset-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Colors */
	.colors-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-md);
	}

	.color-card {
		display: flex;
		flex-direction: column;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		cursor: pointer;
		transition: border-color var(--duration-micro) var(--ease-standard);
		text-align: left;
	}

	.color-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.color-swatch {
		height: 80px;
		border: 1px solid var(--color-border-default);
	}

	.color-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: var(--space-sm);
	}

	.color-name {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.color-value {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}

	.color-token {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Typography */
	.typography-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	.type-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-lg);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.type-sample {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
	}

	.type-sample.sans {
		font-family: var(--font-sans);
		font-weight: var(--font-semibold);
		letter-spacing: var(--tracking-tight);
	}

	.type-sample.mono {
		font-family: var(--font-mono);
		font-weight: var(--font-regular);
	}

	.type-meta {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Guidelines */
	.guidelines-section {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.guidelines-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.guidelines-list li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		padding-left: var(--space-md);
		position: relative;
	}

	.guidelines-list li::before {
		content: '—';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.brand-page {
			padding: var(--space-lg) var(--space-md);
		}

		.icons-grid,
		.lockups-grid,
		.wordmarks-grid,
		.colors-grid,
		.typography-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
