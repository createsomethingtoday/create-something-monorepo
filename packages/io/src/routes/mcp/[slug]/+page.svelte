<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { card } = $derived(data);
	let copiedSnippet = $state<string | null>(null);

	const url = $derived(`https://createsomething.io/mcp/${card.slug}`);
	const externalListings = $derived.by(() =>
		Object.entries(card.externalListings).filter((entry) => entry[1])
	);

	function formatLabel(value: string): string {
		return value.replace(/_/g, ' ');
	}

	async function copySnippet(id: string, value: string) {
		try {
			await navigator.clipboard.writeText(value);
			copiedSnippet = id;
			setTimeout(() => (copiedSnippet = null), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<svelte:head>
	<title>{card.name} | MCP Trust Card | CREATE SOMETHING</title>
	<meta name="description" content={card.description} />
	<link rel="canonical" href={url} />

	<meta property="og:type" content="article" />
	<meta property="og:url" content={url} />
	<meta property="og:title" content="{card.name} | MCP Trust Card" />
	<meta property="og:description" content={card.description} />
	<meta property="og:image" content="https://createsomething.io/og-image.png" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="{card.name} | MCP Trust Card" />
	<meta name="twitter:description" content={card.description} />
	<meta name="twitter:image" content="https://createsomething.io/og-image.png" />

	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: card.name,
		description: card.description,
		applicationCategory: 'DeveloperApplication',
		operatingSystem: 'Any',
		url,
		isAccessibleForFree: true,
		provider: {
			'@type': 'Organization',
			name: 'CREATE SOMETHING',
			url: 'https://createsomething.io'
		}
	})}<\/script>`}
</svelte:head>

<section class="back-section">
	<div class="max-w-5xl mx-auto">
		<a href="/mcp" class="back-link">Back to MCP catalog</a>
	</div>
</section>

<section class="hero">
	<div class="max-w-5xl mx-auto">
		<div class="hero-meta">
			<span>{formatLabel(card.status)}</span>
			<span>{formatLabel(card.accessModel)}</span>
			<span>{card.authModel} auth</span>
		</div>
		<h1>{card.name}</h1>
		<p>{card.description}</p>
	</div>
</section>

<section class="overview">
	<div class="max-w-5xl mx-auto">
		<div class="metric-grid">
			<div>
				<span class="metric-label">Transport</span>
				<strong>{card.transport}</strong>
			</div>
			<div>
				<span class="metric-label">Tools</span>
				<strong>{card.toolCount}</strong>
			</div>
			<div>
				<span class="metric-label">Eval status</span>
				<strong>{card.evalStatus}</strong>
			</div>
			<div>
				<span class="metric-label">Last review</span>
				<strong>{card.lastVerifiedDate}</strong>
			</div>
		</div>
	</div>
</section>

<section class="detail-section">
	<div class="max-w-5xl mx-auto split">
		<div>
			<h2>Risk Summary</h2>
			<p>{card.riskSummary}</p>
		</div>
		<div>
			<h2>Evidence</h2>
			<p>{card.evidenceSummary}</p>
			<div class="inline-meta">
				<span>{card.evidenceRef}</span>
				<span>{card.policyPack}</span>
			</div>
		</div>
	</div>
</section>

<section class="detail-section">
	<div class="max-w-5xl mx-auto">
		<h2>Install Snippets</h2>
		<div class="snippet-grid">
			{#each card.installSnippets as snippet}
				<div class="snippet">
					<div class="snippet-header">
						<div>
							<strong>{snippet.host}</strong>
							<span>{snippet.language}</span>
						</div>
						<button onclick={() => copySnippet(snippet.host, snippet.value)}>
							{copiedSnippet === snippet.host ? 'Copied' : 'Copy'}
						</button>
					</div>
					<pre><code>{snippet.value}</code></pre>
				</div>
			{/each}
		</div>
	</div>
</section>

<section class="detail-section">
	<div class="max-w-5xl mx-auto split">
		<div>
			<h2>Eval Gate</h2>
			<ul>
				<li>Suite: <code>{card.evalSuite}</code></li>
				<li>Status: <code>{card.evalStatus}</code></li>
				<li>Required checks: {card.requiredChecks.join(', ')}</li>
			</ul>
		</div>
		<div>
			<h2>Observability</h2>
			<ul>
					{#if card.observability.langfuse}
						<li>
							Langfuse:
						{card.observability.langfuse.project ?? 'declared'}
						{#if card.observability.langfuse.environment}
							/ {card.observability.langfuse.environment}
						{/if}
					</li>
				{/if}
				{#if card.runtimeObservability}
					<li>{card.runtimeObservability.provider}: {card.runtimeObservability.status}</li>
				{/if}
			</ul>
		</div>
	</div>
</section>

<section class="detail-section">
	<div class="max-w-5xl mx-auto split">
		<div>
			<h2>Limitations</h2>
			<ul>
				{#each card.limitations as limitation}
					<li>{limitation}</li>
				{/each}
			</ul>
		</div>
		<div>
			<h2>Redacted Samples</h2>
			<ul>
				{#each card.samples as sample}
					<li><code>{sample.path}</code> - {sample.title}</li>
				{/each}
			</ul>
			<p class="muted">Escalation: {card.escalation}</p>
		</div>
	</div>
</section>

<section class="detail-section">
	<div class="max-w-5xl mx-auto">
		<h2>External Listings</h2>
		{#if externalListings.length}
			<ul>
				{#each externalListings as listing}
					<li><a href={listing[1]}>{formatLabel(listing[0])}</a></li>
				{/each}
			</ul>
		{:else}
			<p class="muted">No external mirror has been published for this card yet.</p>
		{/if}
	</div>
</section>

<style>
	.back-section {
		padding: 6rem 1.5rem 1rem;
	}

	.back-link {
		color: var(--color-fg-secondary);
		text-decoration: none;
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	.hero {
		padding: 1rem 1.5rem 4rem;
	}

	.hero-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-bottom: var(--space-md);
		text-transform: capitalize;
	}

	.hero-meta span,
	.inline-meta span {
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		padding: 0.25rem 0.5rem;
	}

	h1 {
		color: var(--color-fg-primary);
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		margin: 0 0 var(--space-sm);
	}

	.hero p {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
		line-height: 1.6;
	}

	.overview,
	.detail-section {
		padding: var(--space-xl) 1.5rem;
		border-top: 1px solid var(--color-border-default);
	}

	.metric-grid,
	.split,
	.snippet-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-lg);
	}

	.metric-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.metric-grid > div,
	.snippet {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.metric-label {
		display: block;
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		margin-bottom: var(--space-xs);
	}

	h2 {
		color: var(--color-fg-primary);
		font-size: var(--text-h3);
		margin: 0 0 var(--space-sm);
	}

	p,
	li {
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.inline-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-top: var(--space-sm);
	}

	.snippet-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.snippet-header div {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.snippet-header span {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	button {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-primary);
		cursor: pointer;
		font-size: var(--text-body-sm);
		padding: 0.35rem 0.65rem;
	}

	pre {
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		margin: 0;
		overflow-x: auto;
		padding: var(--space-sm);
	}

	code {
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: var(--text-body-sm);
	}

	.muted {
		color: var(--color-fg-muted);
	}

	a {
		color: var(--color-fg-primary);
	}

	@media (max-width: 900px) {
		.metric-grid,
		.split,
		.snippet-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
