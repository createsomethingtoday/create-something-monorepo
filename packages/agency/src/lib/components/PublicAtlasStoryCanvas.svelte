<script lang="ts">
	import {
		createPublicAtlasCanvasFromStarter,
		createPublicAtlasGraphArtifact,
		createPublicAtlasStoryArtifact,
		type PublicAtlasCanvas,
		type PublicAtlasGraphArtifact,
		type PublicAtlasStoryArtifact
	} from '$lib/atlas/public';
	import PublicAtlasFlow from '$lib/components/PublicAtlasFlow.svelte';

	function toDomIdToken(value: string): string {
		return value
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 80) || 'workflow';
	}

	export let canvas: PublicAtlasCanvas | undefined = undefined;
	export let starterId = 'marketplace-review-queue';
	export let storyId: string | undefined = undefined;
	export let eyebrow = 'Atlas story canvas';
	export let title: string | undefined = undefined;
	export let description =
		'Set the workflow direction once. Atlas shows how agents can route execution while governance keeps human authority named.';
	export let compact = false;

	let sourceCanvas: PublicAtlasCanvas;
	let graph: PublicAtlasGraphArtifact;
	let story: PublicAtlasStoryArtifact;
	let selectedNodeId = '';

	$: sourceCanvas = canvas ?? createPublicAtlasCanvasFromStarter(starterId);
	$: graph = createPublicAtlasGraphArtifact(sourceCanvas);
	$: story = createPublicAtlasStoryArtifact(sourceCanvas, graph.readiness);
	$: storyDomId = storyId ?? `atlas-story-${toDomIdToken(starterId)}`;
	$: titleId = `${storyDomId}-title`;
	$: mapInstructionId = `${storyDomId}-map-instructions`;
	$: if (!sourceCanvas.nodes.some((node) => node.id === selectedNodeId)) {
		selectedNodeId = sourceCanvas.nodes[0]?.id ?? '';
	}

	function selectStoryNode(nodeId: string) {
		selectedNodeId = nodeId;
	}
</script>

<section class="atlas-story" class:compact aria-labelledby={titleId}>
	<div class="atlas-story__copy">
		<span>{eyebrow}</span>
		<h3 id={titleId}>{title ?? story.headline}</h3>
		<p>{description}</p>
	</div>

	<p class="sr-only">{story.accessibilitySummary}</p>

	<div class="atlas-story__layout">
		<div class="atlas-story__map" aria-label={story.summary} aria-describedby={mapInstructionId}>
			<p id={mapInstructionId} class="sr-only">
				Drag to pan the Atlas canvas. Pinch or use the controls to zoom. Edges stay attached
				to their source and target nodes.
			</p>
			<PublicAtlasFlow
				canvas={sourceCanvas}
				{selectedNodeId}
				readOnly
				onSelectNode={selectStoryNode}
			/>
		</div>

		<aside class="atlas-story__chapters" aria-label="Atlas story chapters">
			<div class="atlas-story__score">
				<span>Atlas graph</span>
				<strong>{graph.readiness.score}/100</strong>
				<small>{graph.readiness.level}</small>
			</div>
			{#each story.chapters as chapter}
				<article
					class={`atlas-story__chapter state-${chapter.state}`}
					data-motion-cue={chapter.motionCue}
					data-state={chapter.state}
				>
					<span>{chapter.sequence}. {chapter.eyebrow}</span>
					<h4>{chapter.title}</h4>
					<p>{chapter.body}</p>
					<footer>
						<small>{chapter.proofLabel}</small>
					</footer>
				</article>
			{/each}
		</aside>
	</div>
</section>

<style>
	.atlas-story {
		display: grid;
		gap: 1rem;
	}

	.atlas-story__copy {
		max-width: 56rem;
	}

	.atlas-story__copy > span,
	.atlas-story__chapter > span,
	.atlas-story__score span {
		color: var(--color-clear-grey, #636363);
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.atlas-story__copy h3 {
		margin: 0.2rem 0;
		color: var(--color-clear-onyx, #0a0e19);
		font-size: clamp(1.45rem, 2.1vw, 2.25rem);
		letter-spacing: 0;
		line-height: 1.08;
	}

	.atlas-story__copy p,
	.atlas-story__chapter p {
		margin: 0;
		color: var(--color-clear-grey, #636363);
		line-height: 1.45;
	}

	.atlas-story__layout {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(18rem, 0.58fr);
		gap: 1rem;
		align-items: start;
	}

	.atlas-story__map {
		min-height: clamp(25rem, 54vw, 40rem);
		overflow: hidden;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 8px;
		background: var(--color-clear-porcelain, #f9f9f9);
		box-shadow: 0 18px 44px rgba(10, 14, 25, 0.045);
	}

	.atlas-story__map :global(.public-atlas-flow) {
		min-height: clamp(25rem, 54vw, 40rem);
	}

	.atlas-story__chapters {
		display: grid;
		gap: 0.55rem;
	}

	.atlas-story__score,
	.atlas-story__chapter {
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 8px;
		background: var(--color-clear-panel, #ffffff);
		padding: 0.8rem;
	}

	.atlas-story__score {
		display: grid;
		gap: 0.2rem;
	}

	.atlas-story__score strong {
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 1.25rem;
		line-height: 1;
	}

	.atlas-story__score small {
		color: var(--color-clear-grey, #636363);
		font-size: 0.78rem;
		font-weight: 700;
	}

	.atlas-story__chapter {
		display: grid;
		gap: 0.4rem;
	}

	.atlas-story__chapter h4 {
		margin: 0;
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 0.95rem;
		letter-spacing: 0;
		line-height: 1.16;
	}

	.atlas-story__chapter.state-run {
		border-color: #cfe3d6;
		background: #f8fcf9;
	}

	.atlas-story__chapter.state-wait {
		border-color: #d9ddf5;
		background: #f8f7ff;
	}

	.atlas-story__chapter.state-stop {
		border-color: #f4cdd3;
		background: #fff7f8;
	}

	.atlas-story__chapter footer {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.atlas-story__chapter footer small {
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 999px;
		background: var(--color-clear-porcelain, #f9f9f9);
		color: var(--color-clear-grey, #636363);
		font-size: 0.68rem;
		font-weight: 700;
		padding: 0.22rem 0.45rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
	}

	.compact .atlas-story__layout {
		grid-template-columns: 1fr;
	}

	@media (max-width: 980px) {
		.atlas-story__layout {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.atlas-story__copy h3 {
			font-size: 1.4rem;
		}

		.atlas-story__map,
		.atlas-story__map :global(.public-atlas-flow) {
			min-height: 28rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.atlas-story *,
		.atlas-story *::before,
		.atlas-story *::after {
			transition-duration: 0.01ms !important;
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
		}
	}
</style>
