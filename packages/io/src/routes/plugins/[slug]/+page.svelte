<script lang="ts">
	import type { PageData } from './$types';
	import { getRelatedPlugins } from '$lib/config/plugins';

	let { data }: { data: PageData } = $props();
	let { plugin } = $derived(data);
	let relatedPlugins = $derived(getRelatedPlugins(plugin.slug));

	const url = `https://createsomething.io/plugins/${plugin.slug}`;

	// CLI commands
	const marketplaceCommand = '/plugin marketplace add createsomethingtoday/claude-plugins';
	const installCommand = `/plugin install ${plugin.slug}@create-something`;

	let copiedMarketplace = $state(false);
	let copiedInstall = $state(false);
	let copiedExample = $state<number | null>(null);

	async function copyMarketplace() {
		try {
			await navigator.clipboard.writeText(marketplaceCommand);
			copiedMarketplace = true;
			setTimeout(() => (copiedMarketplace = false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	async function copyInstall() {
		try {
			await navigator.clipboard.writeText(installCommand);
			copiedInstall = true;
			setTimeout(() => (copiedInstall = false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	async function copyExample(index: number, prompt: string) {
		try {
			await navigator.clipboard.writeText(prompt);
			copiedExample = index;
			setTimeout(() => (copiedExample = null), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{plugin.name} | Plugins | CREATE SOMETHING</title>
	<meta name="description" content={plugin.description} />
	<meta name="keywords" content="{plugin.tags.join(', ')}, plugin, Claude Code" />

	<!-- Open Graph -->
	<meta property="og:type" content="article" />
	<meta property="og:url" content={url} />
	<meta property="og:title" content="{plugin.name} | CREATE SOMETHING" />
	<meta property="og:description" content={plugin.description} />
	<meta property="og:image" content="https://createsomething.io/og-image.png" />
	<meta property="og:site_name" content="CREATE SOMETHING" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={url} />
	<meta name="twitter:title" content={plugin.name} />
	<meta name="twitter:description" content={plugin.description} />
	<meta name="twitter:image" content="https://createsomething.io/og-image.png" />

	<link rel="canonical" href={url} />

	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: plugin.name,
		description: plugin.description,
		applicationCategory: 'DeveloperApplication',
		operatingSystem: 'Any',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD'
		},
		publisher: {
			'@type': 'Organization',
			name: 'CREATE SOMETHING',
			url: 'https://createsomething.io'
		}
	})}<\/script>`}
</svelte:head>

<!-- Back Navigation -->
<section class="pt-24 px-6">
	<div class="max-w-4xl mx-auto">
		<a href="/plugins" class="back-link"> ← Back to Plugins </a>
	</div>
</section>

<!-- Hero Section -->
<section class="pt-8 pb-16 px-6">
	<div class="max-w-4xl mx-auto">
		<div class="space-y-6 animate-reveal">
			<div>
				<div class="hero-meta">
					<div class="category-badge">{plugin.category}</div>
					{#if plugin.version}
						<span class="version-badge">v{plugin.version}</span>
					{/if}
					{#if plugin.lastUpdated}
						<span class="last-updated">Updated {formatDate(plugin.lastUpdated)}</span>
					{/if}
				</div>
				<h1 class="plugin-title">{plugin.name}</h1>
				<p class="plugin-description">{plugin.description}</p>
			</div>

			<!-- Tags -->
			<div class="tags">
				{#each plugin.tags as tag}
					<span class="tag">{tag}</span>
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- Features Section -->
<section class="py-16 px-6">
	<div class="max-w-4xl mx-auto">
		<div class="section-card animate-reveal" style="--delay: 1">
			<h2 class="section-title">Features</h2>
			<ul class="features-list">
				{#each plugin.features as feature}
					<li class="feature-item">{feature}</li>
				{/each}
			</ul>
		</div>
	</div>
</section>

<!-- What You Get Section -->
{#if plugin.provides}
	<section class="py-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="section-card animate-reveal" style="--delay: 1.5">
				<h2 class="section-title">What You Get</h2>
				<div class="provides-grid">
					{#if plugin.provides.commands?.length}
						<div class="provides-category">
							<h3 class="provides-label">Commands</h3>
							<div class="provides-items">
								{#each plugin.provides.commands as cmd}
									<div class="provides-item">
										<code class="provides-name">{cmd.name}</code>
										<span class="provides-desc">{cmd.description}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if plugin.provides.agents?.length}
						<div class="provides-category">
							<h3 class="provides-label">Agents</h3>
							<div class="provides-items">
								{#each plugin.provides.agents as agent}
									<div class="provides-item">
										<code class="provides-name">{agent.name}</code>
										<span class="provides-desc">{agent.description}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if plugin.provides.skills?.length}
						<div class="provides-category">
							<h3 class="provides-label">Skills</h3>
							<div class="provides-items">
								{#each plugin.provides.skills as skill}
									<div class="provides-item">
										<code class="provides-name">{skill.name}</code>
										<span class="provides-desc">{skill.description}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if plugin.provides.hooks?.length}
						<div class="provides-category">
							<h3 class="provides-label">Hooks</h3>
							<div class="provides-items">
								{#each plugin.provides.hooks as hook}
									<div class="provides-item">
										<code class="provides-name">{hook.name}</code>
										<span class="provides-desc">{hook.description}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</section>
{/if}

<!-- Installation Section -->
<section class="py-16 px-6">
	<div class="max-w-4xl mx-auto">
		<div class="section-card animate-reveal" style="--delay: 2">
			<h2 class="section-title">Installation</h2>
			<div class="installation-steps">
				<div class="step">
					<div class="step-number">1</div>
					<div class="step-content">
						<h3 class="step-title">Add the Marketplace</h3>
						<p class="step-description">Run this command in Claude Code to add the CREATE SOMETHING marketplace:</p>
						<div class="command-box">
							<code class="command-text">{marketplaceCommand}</code>
							<button class="copy-button" onclick={copyMarketplace} aria-label="Copy command">
								{#if copiedMarketplace}
									<span class="copy-success">✓</span>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
										<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
									</svg>
								{/if}
							</button>
						</div>
					</div>
				</div>

				<div class="step">
					<div class="step-number">2</div>
					<div class="step-content">
						<h3 class="step-title">Install the Plugin</h3>
						<p class="step-description">Then install this plugin:</p>
						<div class="command-box">
							<code class="command-text">{installCommand}</code>
							<button class="copy-button" onclick={copyInstall} aria-label="Copy command">
								{#if copiedInstall}
									<span class="copy-success">✓</span>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
										<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
									</svg>
								{/if}
							</button>
						</div>
					</div>
				</div>

				<div class="step">
					<div class="step-number">3</div>
					<div class="step-content">
						<h3 class="step-title">Start Using</h3>
						<p class="step-description">
							The plugin is now available. Use its skills and agents in your Claude Code sessions.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Try It Section -->
{#if plugin.examples?.length}
	<section class="py-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="section-card animate-reveal" style="--delay: 2.5">
				<h2 class="section-title">Try It</h2>
				<p class="section-subtitle">Copy these prompts to get started:</p>
				<div class="examples-list">
					{#each plugin.examples as example, i}
						<div class="example-item">
							<div class="example-content">
								<code class="example-prompt">{example.prompt}</code>
								<span class="example-desc">{example.description}</span>
							</div>
							<button
								class="copy-button"
								onclick={() => copyExample(i, example.prompt)}
								aria-label="Copy prompt"
							>
								{#if copiedExample === i}
									<span class="copy-success">✓</span>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
										<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
									</svg>
								{/if}
							</button>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>
{/if}

<!-- Related Plugins Section -->
{#if relatedPlugins.length}
	<section class="py-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="section-card animate-reveal" style="--delay: 3">
				<h2 class="section-title">Related Plugins</h2>
				<div class="related-grid">
					{#each relatedPlugins as related}
						<a href="/plugins/{related.slug}" class="related-card">
							<div class="related-category">{related.category}</div>
							<h3 class="related-name">{related.name}</h3>
							<p class="related-desc">{related.description}</p>
							<span class="related-arrow">→</span>
						</a>
					{/each}
				</div>
			</div>
		</div>
	</section>
{/if}

<style>
	/* Back Link */
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	/* Hero */
	.hero-meta {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
		margin-bottom: var(--space-sm);
	}

	.category-badge {
		display: inline-block;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		font-weight: 500;
	}

	.version-badge {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-info-muted);
		border: 1px solid var(--color-info-border);
		border-radius: var(--radius-md);
		color: var(--color-info);
		font-size: var(--text-body-sm);
		font-weight: 600;
		font-family: 'Monaco', 'Menlo', monospace;
	}

	.last-updated {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.plugin-title {
		font-size: var(--text-display);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.plugin-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	/* Tags */
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.tag {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	/* Section Card */
	.section-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	/* Features List */
	.features-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.feature-item {
		position: relative;
		padding-left: var(--space-lg);
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
		line-height: 1.6;
	}

	.feature-item::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: var(--color-success);
		font-weight: 700;
	}

	/* Provides Grid */
	.provides-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.provides-category {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.provides-label {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.provides-items {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.provides-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
	}

	.provides-name {
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		font-weight: 500;
	}

	.provides-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
	}

	/* Installation Steps */
	.installation-steps {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.step {
		display: flex;
		gap: var(--space-md);
	}

	.step-number {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		color: var(--color-fg-primary);
		font-weight: 700;
		font-size: var(--text-body);
	}

	.step-content {
		flex: 1;
	}

	.step-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.step-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin-bottom: var(--space-sm);
	}

	/* Command Box */
	.command-box {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
		margin-top: var(--space-sm);
	}

	.command-text {
		flex: 1;
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		background: none;
		padding: 0;
	}

	.copy-button {
		background: none;
		border: none;
		color: var(--color-fg-secondary);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.copy-button:hover {
		color: var(--color-fg-primary);
	}

	.copy-success {
		color: var(--color-success);
		font-weight: 600;
	}

	/* Section Subtitle */
	.section-subtitle {
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
		margin-bottom: var(--space-md);
	}

	/* Examples */
	.examples-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.example-item {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
	}

	.example-content {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
	}

	.example-prompt {
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		font-weight: 500;
	}

	.example-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Related Plugins */
	.related-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.related-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
		position: relative;
	}

	.related-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}

	.related-category {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.related-name {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.related-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.related-arrow {
		position: absolute;
		top: var(--space-md);
		right: var(--space-md);
		color: var(--color-fg-muted);
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.related-card:hover .related-arrow {
		transform: translateX(4px);
		color: var(--color-fg-primary);
	}

	/* Animation */
	.animate-reveal {
		opacity: 0;
		transform: translateY(20px);
		animation: reveal var(--duration-complex) var(--ease-standard) forwards;
		animation-delay: calc(var(--delay, 0) * 100ms);
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.plugin-title {
			font-size: var(--text-h1);
		}

		.section-card {
			padding: var(--space-md);
		}

		.command-box {
			flex-direction: column;
			align-items: stretch;
		}

		.command-text {
			word-break: break-all;
		}
	}
</style>
