<script lang="ts">
	import Icon from '../../icons/Icon.svelte';
	import type { ArtifactVisualSummary as ArtifactVisualSummaryData } from '../../types/paper.js';

	interface Props {
		visual: ArtifactVisualSummaryData;
	}

	let { visual }: Props = $props();

	const kindLabel: Record<ArtifactVisualSummaryData['kind'], string> = {
		'state-strip': 'State model',
		'layer-stack': 'Layer model',
		'boundary-matrix': 'Boundary model',
		flow: 'Flow model',
		'proof-card': 'Proof model'
	};

	const layoutClass = $derived(`visual-${visual.kind}`);
</script>

<section class="artifact-visual-summary {layoutClass}" aria-labelledby="artifact-visual-title">
	<div class="visual-copy">
		<p class="visual-kicker">{kindLabel[visual.kind]}</p>
		<h2 id="artifact-visual-title">{visual.title}</h2>
		{#if visual.caption}
			<p class="visual-caption">{visual.caption}</p>
		{/if}
	</div>

	<div class="visual-nodes" role="list">
		{#each visual.nodes as node, index}
			<div class="visual-node tone-{node.tone || 'neutral'}" role="listitem">
				<div class="node-mark" aria-hidden="true">
					{#if node.icon}
						<Icon name={node.icon} size="sm" strokeWidth={1.75} />
					{:else}
						<span>{index + 1}</span>
					{/if}
				</div>
				<div class="node-copy">
					<p class="node-label">{node.label}</p>
					{#if node.detail}
						<p class="node-detail">{node.detail}</p>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</section>

<style>
	.artifact-visual-summary {
		margin-top: 2rem;
		padding: 1.25rem;
		background: var(--color-performance-bg-pure);
		border: 1px solid var(--color-performance-border-default);
		border-radius: var(--radius-performance-scale-lg);
	}

	.visual-copy {
		max-width: 42rem;
		margin-bottom: 1rem;
	}

	.visual-kicker {
		margin: 0 0 0.45rem;
		color: var(--color-performance-fg-tertiary);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	h2 {
		margin: 0;
		color: var(--color-performance-fg-primary);
		font-size: clamp(1.2rem, 2vw, 1.55rem);
		line-height: 1.2;
	}

	.visual-caption {
		margin: 0.65rem 0 0;
		max-width: 40rem;
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-sm);
		line-height: 1.65;
	}

	.visual-nodes {
		display: grid;
		gap: 0.75rem;
	}

	.visual-state-strip .visual-nodes,
	.visual-flow .visual-nodes {
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
	}

	.visual-layer-stack .visual-nodes,
	.visual-proof-card .visual-nodes {
		grid-template-columns: 1fr;
	}

	.visual-boundary-matrix .visual-nodes {
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
	}

	.visual-node {
		position: relative;
		display: flex;
		gap: 0.8rem;
		min-width: 0;
		padding: 0.85rem;
		background: var(--color-performance-bg-subtle);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-performance-scale-md);
	}

	.visual-state-strip .visual-node:not(:last-child)::after,
	.visual-flow .visual-node:not(:last-child)::after {
		content: '';
		position: absolute;
		top: 50%;
		right: -0.75rem;
		width: 0.75rem;
		height: 1px;
		background: var(--color-performance-border-emphasis);
		transform: translateY(-50%);
	}

	.node-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		width: 2rem;
		height: 2rem;
		color: var(--color-performance-fg-secondary);
		background: var(--color-performance-bg-pure);
		border: 1px solid var(--color-performance-border-default);
		border-radius: var(--radius-performance-scale-sm);
		font-family: monospace;
		font-size: 0.78rem;
	}

	.node-copy {
		min-width: 0;
	}

	.node-label {
		margin: 0;
		color: var(--color-performance-fg-primary);
		font-weight: 650;
		line-height: 1.3;
	}

	.node-detail {
		margin: 0.35rem 0 0;
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body-sm);
		line-height: 1.5;
	}

	.tone-run .node-mark {
		color: var(--color-performance-success);
	}

	.tone-wait .node-mark {
		color: var(--color-performance-warning);
	}

	.tone-stop .node-mark {
		color: var(--color-performance-error);
	}

	.tone-receipt .node-mark {
		color: var(--color-performance-fg-primary);
	}

	@media (max-width: 768px) {
		.artifact-visual-summary {
			padding: 1rem;
		}

		.visual-state-strip .visual-nodes,
		.visual-flow .visual-nodes,
		.visual-boundary-matrix .visual-nodes {
			grid-template-columns: 1fr;
		}

		.visual-state-strip .visual-node:not(:last-child)::after,
		.visual-flow .visual-node:not(:last-child)::after {
			top: auto;
			right: auto;
			left: 1.85rem;
			bottom: -0.75rem;
			width: 1px;
			height: 0.75rem;
		}
	}
</style>
