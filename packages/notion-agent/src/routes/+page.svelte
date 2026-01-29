<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Notion Agent - Custom Notion Agents by CREATE SOMETHING</title>
</svelte:head>

<div class="landing-page">
	<!-- Hero: Tufte - Let typography do the work -->
	<section class="hero">
		<p class="hero-eyebrow">Custom Notion Agents</p>
		<h1 class="hero-title">Your prompt. Our infrastructure.</h1>
		<p class="hero-subtitle">
			Agents work while you sleep—querying databases, creating pages, archiving duplicates.
		</p>

		{#if data.user}
			<a href="/dashboard" class="cta-button">Go to Dashboard →</a>
		{:else}
			<a href="/auth" class="cta-button">Connect Notion →</a>
		{/if}
	</section>

	<!-- How it works: Tufte - Data-first, no chartjunk -->
	<section class="how-it-works">
		<h2 class="section-title">How it works</h2>
		<div class="outcomes-list">
			<div class="outcome-item">
				<span class="outcome-what">Write a prompt</span>
				<span class="outcome-result">"Find duplicates and archive them"</span>
			</div>
			<div class="outcome-item">
				<span class="outcome-what">Authorize databases</span>
				<span class="outcome-result">OAuth + encrypted tokens</span>
			</div>
			<div class="outcome-item">
				<span class="outcome-what">Schedule or trigger</span>
				<span class="outcome-result">Cron, webhook, or manual</span>
			</div>
			<div class="outcome-item">
				<span class="outcome-what">Agent executes</span>
				<span class="outcome-result">Llama 3.1 70B on Cloudflare edge</span>
			</div>
		</div>
	</section>

	<!-- Proof: Tufte - The data is the design -->
	<section class="proof">
		<p class="proof-statement">
			Agents running on Cloudflare's global edge—<br />
			<strong>6 steps to find duplicates. 451 tokens per execution.</strong>
		</p>
	</section>

	<!-- CTA: Rams - One ask -->
	<section class="cta-section">
		<h2>Ready when you are.</h2>
		{#if data.user}
			<a href="/dashboard" class="cta-button">View Your Agents →</a>
		{:else}
			<a href="/auth" class="cta-button">Connect Notion →</a>
		{/if}
	</section>

	<!-- Footer -->
	<footer class="landing-footer">
		<p>
			Built by <a href="https://createsomething.agency" target="_blank" rel="noopener">CREATE SOMETHING</a>
		</p>
	</footer>
</div>

<style>
	/* Tufte: Let whitespace and typography do the work */
	.landing-page {
		min-height: 100vh;
		background: var(--color-bg-base);
	}

	/* Hero: Centered, focused */
	.hero {
		max-width: 600px;
		margin: 0 auto;
		padding: var(--space-2xl) var(--space-xl);
		text-align: center;
	}

	.hero-eyebrow {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		line-height: var(--leading-tight);
		letter-spacing: -0.02em;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-lg);
	}

	/* Button styles from app.css (cta-button) */

	/* How it works: Tufte outcomes list */
	.how-it-works {
		max-width: 600px;
		margin: 0 auto;
		padding: var(--space-2xl) var(--space-xl);
		border-top: 1px solid var(--color-border-default);
	}

	.section-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.outcomes-list {
		max-width: 500px;
		margin: 0 auto;
	}

	.outcome-item {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.outcome-item:last-child {
		border-bottom: none;
	}

	.outcome-what {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
	}

	.outcome-result {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-align: right;
	}

	/* Proof: Data as design */
	.proof {
		padding: var(--space-2xl) var(--space-xl);
		text-align: center;
		border-top: 1px solid var(--color-border-default);
	}

	.proof-statement {
		font-size: var(--text-h2);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		max-width: 600px;
		margin: 0 auto;
	}

	.proof-statement strong {
		color: var(--color-fg-primary);
		display: block;
		margin-top: var(--space-sm);
	}

	/* CTA: Rams - one ask */
	.cta-section {
		padding: var(--space-2xl) var(--space-xl);
		text-align: center;
		border-top: 1px solid var(--color-border-default);
	}

	.cta-section h2 {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-lg);
	}

	/* Footer */
	.landing-footer {
		text-align: center;
		padding: var(--space-lg);
		border-top: 1px solid var(--color-border-subtle);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.landing-footer a {
		color: var(--color-fg-secondary);
		text-decoration: none;
	}

	.landing-footer a:hover {
		color: var(--color-fg-primary);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.hero-title {
			font-size: 2.5rem;
		}

		.outcome-item {
			flex-direction: column;
			gap: var(--space-xs);
			align-items: flex-start;
		}

		.outcome-result {
			text-align: left;
		}
	}
</style>
