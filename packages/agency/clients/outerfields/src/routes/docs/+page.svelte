<script lang="ts">
	/**
	 * OUTERFIELDS Documentation
	 *
	 * Technical documentation hub for the PCN platform
	 */
	import { BookOpen, Code, Zap, Shield, Database, Globe, ArrowRight } from 'lucide-svelte';

	const sections = [
		{
			icon: Zap,
			title: 'Quick Start',
			description: 'Get your content network up and running in under 15 minutes.',
			items: ['Account setup', 'First video upload', 'Customizing your portal', 'Publishing live']
		},
		{
			icon: Code,
			title: 'API Reference',
			description: 'Complete REST API documentation for developers.',
			items: ['Authentication', 'Content endpoints', 'User management', 'Webhooks']
		},
		{
			icon: Database,
			title: 'Content Management',
			description: 'Learn how to organize, tag, and deliver your content.',
			items: ['Video encoding', 'Adaptive streaming', 'Metadata & SEO', 'Content collections']
		},
		{
			icon: Shield,
			title: 'Security & Access',
			description: 'Configure access controls and protect your content.',
			items: ['DRM protection', 'Geo-restrictions', 'Token authentication', 'Rate limiting']
		},
		{
			icon: Globe,
			title: 'CDN & Delivery',
			description: 'Global content delivery with 280+ edge locations.',
			items: ['Edge caching', 'Performance optimization', 'Analytics integration', 'Custom domains']
		}
	];
</script>

<svelte:head>
	<title>Documentation | OUTERFIELDS</title>
	<meta name="description" content="OUTERFIELDS technical documentation - API references, integration guides, and platform architecture." />
</svelte:head>

<div class="docs-page">
	<div class="docs-container">
		<header class="docs-header">
			<div class="header-icon">
				<BookOpen size={40} />
			</div>
			<h1>Documentation</h1>
			<p class="docs-subtitle">
				Everything you need to build, integrate, and scale your premium content network.
			</p>
		</header>

		<div class="search-section">
			<input type="text" placeholder="Search documentation..." class="search-input" />
		</div>

		<div class="docs-grid">
			{#each sections as section}
				<div class="doc-card">
					<div class="card-icon">
						<svelte:component this={section.icon} size={24} />
					</div>
					<h2>{section.title}</h2>
					<p class="card-description">{section.description}</p>
					<ul class="card-items">
						{#each section.items as item}
							<li>
								<a href="/docs/{section.title.toLowerCase().replace(/ /g, '-')}/{item.toLowerCase().replace(/ /g, '-')}">
									{item}
									<ArrowRight size={14} />
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<section class="help-section">
			<h2>Need Help?</h2>
			<p>Our team is here to support your integration journey.</p>
			<div class="help-actions">
				<a href="/contact" class="btn-secondary">Contact Support</a>
				<a href="https://github.com/outerfields" class="btn-outline" target="_blank" rel="noopener">
					View on GitHub
				</a>
			</div>
		</section>

		<footer class="docs-footer">
			<a href="/" class="back-link">&larr; Back to Home</a>
		</footer>
	</div>
</div>

<style>
	.docs-page {
		min-height: 100vh;
		padding: 8rem 1.5rem 4rem;
		background: var(--color-bg-pure);
	}

	.docs-container {
		max-width: 72rem;
		margin: 0 auto;
	}

	.docs-header {
		text-align: center;
		margin-bottom: 3rem;
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

	.docs-header h1 {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.75rem;
	}

	.docs-subtitle {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		margin: 0;
		max-width: 32rem;
		margin: 0 auto;
	}

	.search-section {
		max-width: 32rem;
		margin: 0 auto 3rem;
	}

	.search-input {
		width: 100%;
		padding: 1rem 1.25rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		color: var(--color-fg-primary);
		font-size: 1rem;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.search-input::placeholder {
		color: var(--color-fg-subtle);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.docs-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
		gap: 1.5rem;
		margin-bottom: 4rem;
	}

	.doc-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 1.5rem;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.doc-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		background: var(--color-bg-subtle);
		border-radius: 0.75rem;
		color: var(--color-primary);
		margin-bottom: 1rem;
	}

	.doc-card h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.card-description {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0 0 1rem;
		line-height: 1.5;
	}

	.card-items {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.card-items li {
		border-top: 1px solid var(--color-border-default);
	}

	.card-items a {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 0;
		color: var(--color-fg-secondary);
		text-decoration: none;
		font-size: 0.875rem;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.card-items a:hover {
		color: var(--color-primary);
	}

	.card-items a :global(svg) {
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.card-items a:hover :global(svg) {
		opacity: 1;
	}

	.help-section {
		text-align: center;
		padding: 3rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		margin-bottom: 3rem;
	}

	.help-section h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.help-section p {
		font-size: 1rem;
		color: var(--color-fg-muted);
		margin: 0 0 1.5rem;
	}

	.help-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-primary);
		text-decoration: none;
		font-weight: 500;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-secondary:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
	}

	.btn-outline {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-secondary);
		text-decoration: none;
		font-weight: 500;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-outline:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.docs-footer {
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

	@media (max-width: 640px) {
		.docs-page {
			padding: 6rem 1rem 3rem;
		}

		.docs-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
