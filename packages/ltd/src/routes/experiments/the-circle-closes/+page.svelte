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

	import { TriadHealth, HermeneuticCircle } from '@create-something/components';

	let { data } = $props();

	// Principle descriptions for display
	const principleDescriptions: Record<string, { title: string; description: string }> = {
		'rams-2': {
			title: 'Useful',
			description: 'Every element serves a purpose'
		},
		'rams-4': {
			title: 'Understandable',
			description: 'Self-evident interfaces'
		},
		'rams-5': {
			title: 'Unobtrusive',
			description: 'Tools recede to background (Zuhandenheit)'
		},
		'rams-10': {
			title: 'As Little As Possible',
			description: 'Remove until it breaks'
		}
	};

	function getStatusColor(status: string): string {
		switch (status) {
			case 'corroborating':
				return '#22c55e';
			case 'refuting':
				return '#ef4444';
			default:
				return '#6b7280';
		}
	}

	function formatPercentage(value: number): string {
		return `${Math.round(value * 100)}%`;
	}
</script>

<svelte:head>
	<title>{data.experiment.title} | CREATE SOMETHING .ltd</title>
	<meta name="description" content={data.experiment.description} />
</svelte:head>

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

			{#if data.selfAuditData && data.selfAuditData.scores.overall >= 7}
				<p class="proof-verdict valid">The tool validates itself.</p>
			{:else if !data.auditData}
				<p class="proof-verdict pending">Awaiting first audit run.</p>
			{/if}
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
						{@const principle = principleDescriptions[item.principleId] || {
							title: item.principleId,
							description: ''
						}}
						<div class="evidence-card" style="--status-color: {getStatusColor(item.status)}">
							<div class="evidence-header">
								<span class="principle-id">{item.principleId}</span>
								<span class="principle-title">{principle.title}</span>
							</div>

							<div class="evidence-metrics">
								<div class="metric">
									<span class="metric-value">{item.totalExecutions}</span>
									<span class="metric-label">executions</span>
								</div>
								<div class="metric">
									<span class="metric-value">{formatPercentage(item.avgCompletionRate)}</span>
									<span class="metric-label">completion</span>
								</div>
							</div>

							<div class="evidence-status">
								<span class="status-indicator" style="background: {getStatusColor(item.status)}"
								></span>
								<span class="status-label">{item.status}</span>
							</div>

							<div class="evidence-experiments">
								{#each item.experiments as exp}
									<a href="https://createsomething.space/experiments/{exp.slug}" class="exp-link">
										{exp.title} →
									</a>
								{/each}
							</div>
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
	.experiment {
		max-width: 720px;
		margin: 0 auto;
		padding: 2rem;
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;
		color: rgba(255, 255, 255, 0.9);
	}

	/* Header */
	.header {
		margin-bottom: 4rem;
		text-align: center;
	}

	.meta {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 1rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.5);
	}

	.title {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		letter-spacing: -0.02em;
	}

	.subtitle {
		font-size: 1.25rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 1.5rem 0;
		font-style: italic;
	}

	.description {
		max-width: 600px;
		margin: 0 auto 1.5rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.7);
	}

	.tags {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.tag {
		padding: 0.25rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 100px;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
	}

	/* Three Proofs - Stacked Layout */
	.three-proofs {
		display: flex;
		flex-direction: column;
		gap: 3rem;
		margin-bottom: 4rem;
	}

	/* Proof Sections */
	.proof-section {
		background: rgba(10, 10, 10, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 2rem;
	}

	.section-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.section-number {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.3);
		font-family: 'IBM Plex Mono', monospace;
	}

	.section-description {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0 0 1.5rem 0;
		line-height: 1.5;
	}

	.proof-content {
		margin-bottom: 1rem;
	}

	.circle-container {
		display: flex;
		justify-content: center;
	}

	.proof-verdict {
		font-size: 0.875rem;
		font-style: italic;
		margin: 1rem 0 0 0;
		text-align: center;
	}

	.proof-verdict.valid {
		color: #22c55e;
	}

	.proof-verdict.pending {
		color: rgba(255, 255, 255, 0.4);
	}

	/* Evidence Grid */
	.evidence-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.evidence-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		padding: 1rem;
	}

	.evidence-header {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
		margin-bottom: 0.75rem;
	}

	.principle-id {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.principle-title {
		font-weight: 600;
		font-size: 0.875rem;
	}

	.evidence-metrics {
		display: flex;
		gap: 1.5rem;
		margin-bottom: 0.75rem;
	}

	.metric {
		display: flex;
		flex-direction: column;
	}

	.metric-value {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.metric-label {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.4);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.evidence-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.status-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.status-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--status-color);
	}

	.evidence-experiments {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.exp-link {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.5);
		text-decoration: none;
		transition: color 0.2s;
	}

	.exp-link:hover {
		color: rgba(255, 255, 255, 0.9);
	}

	.no-evidence {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
		font-style: italic;
		text-align: center;
		padding: 2rem;
	}

	/* Synthesis */
	.synthesis {
		max-width: 600px;
		margin: 0 auto 3rem;
		text-align: center;
	}

	.synthesis-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 1.5rem 0;
	}

	.synthesis-quote {
		font-style: italic;
		color: rgba(255, 255, 255, 0.7);
		margin: 0 0 1.5rem 0;
		padding: 1rem 1.5rem;
		border-left: 2px solid rgba(255, 255, 255, 0.2);
		text-align: left;
	}

	.synthesis-quote cite {
		display: block;
		margin-top: 0.75rem;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.synthesis-text {
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.6);
	}

	/* Footer */
	.experiment-footer {
		text-align: center;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.footer-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.footer-text a {
		color: rgba(255, 255, 255, 0.6);
		text-decoration: underline;
	}

	.footer-text a:hover {
		color: rgba(255, 255, 255, 0.9);
	}
</style>
