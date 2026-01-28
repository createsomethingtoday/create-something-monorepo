<script lang="ts">
	/**
	 * The Circle Closes
	 *
	 * A unified experiment demonstrating all three arcs of the hermeneutic circle:
	 * 1. Self-Audit: The codebase measures itself against its own philosophy
	 * 2. Visibility: The connections between properties become visible
	 * 3. Feedback: Evidence from practice informs the canon
	 *
	 * "The tool reveals its own concealment."
	 */

	import { TriadHealth, HermeneuticCircle, IsometricAssembly, SEO } from '@create-something/canon';

	let { data } = $props();

	// Domain URLs for experiment links
	const domainUrls: Record<string, string> = {
		space: 'https://createsomething.space',
		io: 'https://createsomething.io',
		agency: 'https://createsomething.agency'
	};

	function getStatusColor(status: string): string {
		switch (status) {
			case 'corroborating':
				return 'var(--color-success)';
			case 'refuting':
				return 'var(--color-error)';
			default:
				return 'var(--color-fg-muted)';
		}
	}

</script>

<SEO
	title={data.experiment.title}
	description={data.experiment.description}
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Experiments', url: 'https://createsomething.ltd/experiments' },
		{ name: 'The Circle Closes', url: 'https://createsomething.ltd/experiments/the-circle-closes' }
	]}
/>

<article class="experiment">
	<header class="header">
		<div class="meta">
			<span class="category">{data.experiment.category}</span>
			<span class="reading-time">{data.experiment.reading_time_minutes} min read</span>
		</div>

		<h1 class="title">{data.experiment.title}</h1>
		<p class="subtitle">{data.experiment.subtitle}</p>

		<p class="description">{data.experiment.description}</p>

		<div class="tags">
			{#each data.experiment.tags as tag}
				<span class="tag">{tag}</span>
			{/each}
		</div>

		<!-- Visual Canon: Isometric Assembly -->
		<div class="visual-canon">
			<IsometricAssembly
				animateOnScroll={true}
				title="Parts become whole"
				size={320}
			/>
		</div>

		<!-- ASCII Art (fallback/alternative) -->
		<details class="ascii-details">
			<summary class="ascii-toggle">View ASCII diagram</summary>
			<pre class="ascii-art">{`
       ┌─────────────────────────────────────────────────────┐
       │                                                     │
       │            .ltd ◄──────────────────┐                │
       │          (Philosophy)              │                │
       │              │                     │                │
       │              ▼                     │                │
       │            .io                     │                │
       │          (Research)            feedback             │
       │              │                     │                │
       │              ▼                     │                │
       │          .space                    │                │
       │         (Practice)                 │                │
       │              │                     │                │
       │              ▼                     │                │
       │          .agency ──────────────────┘                │
       │         (Services)                                  │
       │                                                     │
       │         The hermeneutic circle closes               │
       │         when practice informs philosophy            │
       │                                                     │
       └─────────────────────────────────────────────────────┘
`}</pre>
		</details>
	</header>

	<div class="three-proofs">
		<!-- Section 1: Self-Audit -->
		<section class="proof-section" id="self-audit">
			<h2 class="section-title">
				<span class="section-number">01</span>
				Self-Audit
			</h2>
			<p class="section-description">
				The codebase measures itself against its own philosophy. The Subtractive Triad applied
				recursively: DRY, Rams, Heidegger.
			</p>

			<div class="proof-content">
				<TriadHealth
					data={data.auditData}
					selfAuditData={data.selfAuditData}
					loading={!data.auditData}
				/>
			</div>
		</section>

		<!-- Section 2: Visibility -->
		<section class="proof-section" id="visibility">
			<h2 class="section-title">
				<span class="section-number">02</span>
				Visibility
			</h2>
			<p class="section-description">
				The hermeneutic circle rendered. Four properties, their connections, their gaps. What is
				concealed becomes visible.
			</p>

			<div class="proof-content circle-container">
				<HermeneuticCircle
					state={data.circleState}
					loading={!data.circleState}
					interactive={true}
					showGaps={true}
				/>
			</div>

			{#if data.circleState}
				{@const gaps = data.circleState.edges.filter((e) => e.strength === 0)}
				{#if gaps.length === 0}
					<p class="proof-verdict valid">The circle closes.</p>
				{:else}
					<p class="proof-verdict pending">
						{gaps.length} connection{gaps.length > 1 ? 's' : ''} awaiting.
					</p>
				{/if}
			{/if}
		</section>

		<!-- Section 3: Feedback -->
		<section class="proof-section" id="feedback">
			<h2 class="section-title">
				<span class="section-number">03</span>
				Feedback
			</h2>
			<p class="section-description">
				Practice informs philosophy. Experiments declare which principles they test; evidence
				accumulates through execution.
			</p>

			<div class="proof-content evidence-grid">
				{#if data.evidence.length > 0}
					{#each data.evidence as item}
						<div class="evidence-card" style="--status-color: {getStatusColor(item.status)}">
							<div class="evidence-header">
								<span class="master-name">{item.masterName}</span>
								<span class="principle-title">{item.principleTitle}</span>
							</div>

							<div class="evidence-metrics">
								<div class="metric">
									<span class="metric-value">{item.evidenceCount}</span>
									<span class="metric-label">experiment{item.evidenceCount !== 1 ? 's' : ''}</span>
								</div>
							</div>

							<div class="evidence-status">
								<span class="status-indicator" style="background: {getStatusColor(item.status)}"
								></span>
								<span class="status-label">{item.status}</span>
							</div>

							{#if item.experiments.length > 0}
								<div class="evidence-experiments">
									{#each item.experiments as exp}
										<a href="{domainUrls[exp.domain]}/experiments/{exp.slug}" class="exp-link">
											{exp.title} →
										</a>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				{:else}
					<p class="no-evidence">
						Evidence collection awaiting experiment executions. Practice to generate data.
					</p>
				{/if}
			</div>

			{#if data.evidence.length > 0}
				{@const corroborating = data.evidence.filter((e) => e.status === 'corroborating')}
				{#if corroborating.length > 0}
					<p class="proof-verdict valid">
						{corroborating.length} principle{corroborating.length > 1 ? 's' : ''} corroborated by practice.
					</p>
				{/if}
			{/if}
		</section>
	</div>

	<!-- Synthesis -->
	<section class="synthesis">
		<h2 class="synthesis-title">The Circle</h2>
		<blockquote class="synthesis-quote">
			"We understand parts through the whole, and the whole through its parts. Understanding is
			never complete but always in motion."
			<cite>— Martin Heidegger, Being and Time</cite>
		</blockquote>

		<p class="synthesis-text">
			This experiment is itself part of the circle—an experiment on .ltd that demonstrates how .ltd
			connects to .space, .io, and .agency. The tool reveals its own concealment by measuring
			itself, visualizing itself, and accumulating evidence about itself. Meta-hermeneutic.
		</p>
	</section>

	<footer class="experiment-footer">
		<p class="footer-text">
			Part of <a href="https://createsomething.ltd/ethos">The Canon</a> at CREATE SOMETHING.
		</p>
	</footer>
</article>

<style>
	/* ==========================================================================
	   The Circle Closes - Canon Design Tokens
	   All styles derive from shared Canon tokens
	   ========================================================================== */

	.experiment {
		max-width: 720px;
		margin: 0 auto;
		padding: var(--space-lg);
		font-family: var(--font-sans);
		color: var(--color-fg-secondary);
	}

	/* Header */
	.header {
		margin-bottom: var(--space-xl);
		text-align: center;
	}

	/* Visual Canon */
	.visual-canon {
		margin: var(--space-lg) auto;
		display: flex;
		justify-content: center;
	}

	.ascii-details {
		margin: var(--space-sm) auto;
		max-width: fit-content;
	}

	.ascii-toggle {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		cursor: pointer;
		text-align: center;
		padding: var(--space-xs) var(--space-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.ascii-toggle:hover {
		color: var(--color-fg-tertiary);
	}

	.ascii-art {
		margin: var(--space-sm) auto 0;
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-family: var(--font-mono);
		font-size: 0.65rem;
		line-height: 1.3;
		color: var(--color-fg-tertiary);
		overflow-x: auto;
		white-space: pre;
		text-align: left;
	}

	.meta {
		display: flex;
		gap: var(--space-sm);
		justify-content: center;
		margin-bottom: var(--space-sm);
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		color: var(--color-fg-muted);
	}

	.title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		margin: 0 auto var(--space-xs) auto;
		letter-spacing: var(--tracking-tight);
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-md) 0;
		font-style: italic;
	}

	.description {
		max-width: 600px;
		margin: 0 auto var(--space-md);
		line-height: var(--leading-relaxed);
		color: var(--color-fg-secondary);
	}

	.tags {
		display: flex;
		gap: var(--space-xs);
		justify-content: center;
		flex-wrap: wrap;
	}

	.tag {
		padding: 0.25rem 0.75rem;
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	/* Three Proofs - Stacked Layout */
	.three-proofs {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	/* Proof Sections */
	.proof-section {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.section-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		margin: 0 0 var(--space-xs) 0;
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.75rem;
	}

	.section-number {
		font-size: var(--text-body-sm);
		color: var(--color-fg-subtle);
		font-family: var(--font-mono);
	}

	.section-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0 0 var(--space-md) 0;
		line-height: var(--leading-normal);
		text-align: center;
	}

	.proof-content {
		margin-bottom: var(--space-sm);
	}

	.circle-container {
		display: flex;
		justify-content: center;
	}

	.proof-verdict {
		font-size: var(--text-body-sm);
		font-style: italic;
		margin: var(--space-sm) 0 0 0;
		text-align: center;
	}

	.proof-verdict.valid {
		color: var(--color-success);
	}

	.proof-verdict.pending {
		color: var(--color-fg-muted);
	}

	/* Evidence Grid */
	.evidence-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.evidence-card {
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
	}

	.evidence-header {
		display: flex;
		gap: var(--space-xs);
		align-items: baseline;
		margin-bottom: 0.75rem;
	}

	.master-name {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		color: var(--color-fg-muted);
	}

	.principle-title {
		font-weight: var(--font-semibold);
		font-size: var(--text-body-sm);
	}

	.evidence-metrics {
		display: flex;
		gap: var(--space-md);
		margin-bottom: 0.75rem;
	}

	.metric {
		display: flex;
		flex-direction: column;
	}

	.metric-value {
		font-family: var(--font-mono);
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
	}

	.metric-label {
		font-size: 0.7rem;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
	}

	.evidence-status {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: 0.75rem;
	}

	.status-indicator {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
	}

	.status-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		color: var(--status-color);
	}

	.evidence-experiments {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.exp-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.exp-link:hover {
		color: var(--color-fg-primary);
	}

	.no-evidence {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: italic;
		text-align: center;
		padding: var(--space-lg);
	}

	/* Synthesis */
	.synthesis {
		max-width: 600px;
		margin: 0 auto var(--space-lg);
		text-align: center;
	}

	.synthesis-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		margin: 0 0 var(--space-md) 0;
	}

	.synthesis-quote {
		font-style: italic;
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-md) 0;
		padding: var(--space-sm) var(--space-md);
		border-left: 2px solid var(--color-border-emphasis);
		text-align: left;
	}

	.synthesis-quote cite {
		display: block;
		margin-top: 0.75rem;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.synthesis-text {
		line-height: var(--leading-loose);
		color: var(--color-fg-tertiary);
	}

	/* Footer */
	.experiment-footer {
		text-align: center;
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-text a {
		color: var(--color-fg-tertiary);
		text-decoration: underline;
	}

	.footer-text a:hover {
		color: var(--color-fg-primary);
	}
</style>
