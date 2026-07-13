<script lang="ts">
	const surfaces = [
		{
			title: 'Published Site',
			subtitle: 'Runtime truth',
			points: ['SEO + metadata', 'Accessibility + structure', 'Public behavior'],
			accent: '#c47a16'
		},
		{
			title: 'Designer State',
			subtitle: 'Authoring truth',
			points: ['Pages + components', 'Classes + breakpoints', 'CMS + assets'],
			accent: '#0f766e'
		},
		{
			title: 'Policy Snapshot',
			subtitle: 'Governance truth',
			points: ['Guidelines + rubric', 'Fetch time + hash', 'Derived policy version'],
			accent: '#2563eb'
		}
	];

	const phases = ['Precheck', 'Designer', 'Published', 'Normalize'];
	const resultStates = ['Pass', 'Fail', 'Manual', 'Partial'];
</script>

<section class="architecture-shell" aria-labelledby="review-architecture-title">
	<div class="copy-block">
		<p class="eyebrow">Architecture View</p>
		<h2 id="review-architecture-title">
			Three surfaces converge into one governed review artifact.
		</h2>
		<p class="summary">
			The analyzer only lands when runtime evidence, authoring metadata, and policy versioning
			meet in one observable system.
		</p>
	</div>

	<div class="diagram-grid" aria-hidden="true">
		{#each surfaces as surface, index}
			<article
				class="surface-card"
				style={`--accent:${surface.accent}; --delay:${index * 0.14}s; grid-row:${index + 1};`}
			>
				<p class="surface-title">{surface.title}</p>
				<h3>{surface.subtitle}</h3>
				<ul>
					{#each surface.points as point}
						<li>{point}</li>
					{/each}
				</ul>
			</article>

			<div
				class="flow-lane"
				style={`--accent:${surface.accent}; --delay:${index * 0.14 + 0.24}s; grid-row:${index + 1};`}
			>
				<span class="flow-line"></span>
				<span class="flow-signal"></span>
			</div>
		{/each}

		<aside class="artifact-card">
			<p class="artifact-kicker">Analyzer MCP</p>
			<h3>Unified review artifact</h3>
			<p class="artifact-copy">
				One report can explain evidence source, queue phase, policy version, and where human
				review still owns the boundary.
			</p>

			<div class="phase-row">
				{#each phases as phase}
					<span class="phase-pill">{phase}</span>
				{/each}
			</div>

			<div class="result-grid">
				{#each resultStates as state}
					<span class="result-chip">{state}</span>
				{/each}
			</div>
		</aside>
	</div>
</section>

<style>
	.architecture-shell {
		max-width: 72rem;
		margin: 0 auto;
		padding: 0 1.5rem 1rem;
	}

	.copy-block {
		max-width: 42rem;
		margin-bottom: 2rem;
	}

	.eyebrow {
		margin: 0 0 0.75rem;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-performance-fg-tertiary);
	}

	h2 {
		margin: 0 0 0.85rem;
		font-size: clamp(1.75rem, 3vw, 2.5rem);
		line-height: 1.1;
		color: var(--color-performance-fg-primary);
	}

	.summary {
		margin: 0;
		max-width: 38rem;
		color: var(--color-performance-fg-secondary);
		font-size: 1.05rem;
		line-height: 1.7;
	}

	.diagram-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 7rem minmax(20rem, 1.12fr);
		grid-template-rows: repeat(3, minmax(0, 1fr));
		gap: 1rem 1.25rem;
		align-items: stretch;
	}

	.surface-card,
	.artifact-card {
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--color-performance-bg-subtle) 70%, transparent), transparent),
			var(--color-performance-bg-pure);
		border: 1px solid var(--color-performance-border-default);
		border-radius: 1.25rem;
		opacity: 0;
		transform: translateY(14px);
		animation: card-enter 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
		animation-delay: var(--delay, 0s);
	}

	.surface-card {
		padding: 1.15rem 1.2rem 1.25rem;
		border-left: 3px solid var(--accent);
		box-shadow: 0 18px 32px -28px color-mix(in srgb, var(--accent) 38%, transparent);
	}

	.surface-title,
	.artifact-kicker {
		margin: 0 0 0.55rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-performance-fg-tertiary);
	}

	.surface-card h3,
	.artifact-card h3 {
		margin: 0 0 0.7rem;
		font-size: 1.15rem;
		color: var(--color-performance-fg-primary);
	}

	.surface-card ul {
		margin: 0;
		padding-left: 1rem;
		color: var(--color-performance-fg-secondary);
	}

	.surface-card li {
		margin: 0.35rem 0 0;
		line-height: 1.5;
	}

	.flow-lane {
		position: relative;
		display: flex;
		align-items: center;
	}

	.flow-line {
		width: 100%;
		height: 1px;
		background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 10%, transparent));
		transform: scaleX(0);
		transform-origin: left center;
		animation: lane-enter 0.55s ease forwards;
		animation-delay: var(--delay, 0s);
	}

	.flow-signal {
		position: absolute;
		left: 0;
		width: 0.8rem;
		height: 0.8rem;
		border-radius: 999px;
		background: var(--accent);
		opacity: 0;
		transform: translateX(-0.2rem);
		animation: signal-run 2.8s linear infinite;
		animation-delay: calc(var(--delay, 0s) + 0.35s);
	}

	.artifact-card {
		grid-column: 3;
		grid-row: 1 / 4;
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 1.6rem;
		overflow: hidden;
	}

	.artifact-card::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle at top left, rgba(15, 118, 110, 0.12), transparent 45%),
			radial-gradient(circle at bottom right, rgba(37, 99, 235, 0.12), transparent 52%);
		pointer-events: none;
	}

	.artifact-copy {
		position: relative;
		margin: 0 0 1rem;
		color: var(--color-performance-fg-secondary);
		line-height: 1.65;
	}

	.phase-row,
	.result-grid {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.phase-row {
		margin-bottom: 1rem;
	}

	.phase-pill,
	.result-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.45rem 0.8rem;
		border-radius: 999px;
		font-size: 0.8rem;
		font-weight: 600;
	}

	.phase-pill {
		background: color-mix(in srgb, var(--color-performance-bg-subtle) 82%, transparent);
		color: var(--color-performance-fg-secondary);
		border: 1px solid var(--color-performance-border-default);
	}

	.result-chip {
		background: var(--color-performance-bg-pure);
		color: var(--color-performance-fg-primary);
		border: 1px solid var(--color-performance-border-default);
	}

	@keyframes card-enter {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes lane-enter {
		to {
			transform: scaleX(1);
		}
	}

	@keyframes signal-run {
		0% {
			opacity: 0;
			transform: translateX(-0.2rem);
		}

		10% {
			opacity: 1;
		}

		82% {
			opacity: 1;
			transform: translateX(calc(100% - 0.8rem));
		}

		100% {
			opacity: 0;
			transform: translateX(calc(100% - 0.8rem));
		}
	}

	@media (max-width: 960px) {
		.diagram-grid {
			grid-template-columns: 1fr;
			grid-template-rows: none;
		}

		.flow-lane {
			display: none;
		}

		.artifact-card {
			grid-column: auto;
			grid-row: auto;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.surface-card,
		.artifact-card {
			opacity: 1;
			transform: none;
			animation: none;
		}

		.flow-line {
			transform: scaleX(1);
			animation: none;
		}

		.flow-signal {
			display: none;
		}
	}
</style>
