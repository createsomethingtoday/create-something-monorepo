<script lang="ts">
	import {
		createPublicAtlasCanvasFromStarter,
		createPublicAtlasGraphArtifact,
		createPublicAtlasStoryArtifact,
		layoutPublicAtlasNodes,
		type PublicAtlasCanvas,
		type PublicAtlasGraphArtifact,
		type PublicAtlasNode,
		type PublicAtlasStoryArtifact
	} from '$lib/atlas/public';

	type PositionedNode = PublicAtlasNode & { x: number; y: number; width: number };

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
		'The same Atlas graph can teach the workflow to a person and preserve the typed contract an agent needs to act safely.';
	export let compact = false;

	let sourceCanvas: PublicAtlasCanvas;
	let graph: PublicAtlasGraphArtifact;
	let story: PublicAtlasStoryArtifact;
	let nodes: PositionedNode[];

	$: sourceCanvas = canvas ?? createPublicAtlasCanvasFromStarter(starterId);
	$: graph = createPublicAtlasGraphArtifact(sourceCanvas);
	$: story = createPublicAtlasStoryArtifact(sourceCanvas, graph.readiness);
	$: nodes = layoutPublicAtlasNodes(sourceCanvas.nodes) as PositionedNode[];
	$: storyDomId = storyId ?? `atlas-story-${toDomIdToken(starterId)}`;
	$: titleId = `${storyDomId}-title`;
	$: arrowId = `${storyDomId}-arrow`;
	$: nodeById = new Map(nodes.map((node) => [node.id, node]));
	$: edgeLines = sourceCanvas.edges.flatMap((edge) => {
		const source = nodeById.get(edge.source);
		const target = nodeById.get(edge.target);
		if (!source || !target) return [];
		return [
			{
				...edge,
				x1: source.x + source.width,
				y1: source.y + 58,
				x2: target.x,
				y2: target.y + 58
			}
		];
	});
</script>

<section class="atlas-story" class:compact aria-labelledby={titleId}>
	<div class="atlas-story__copy">
		<span>{eyebrow}</span>
		<h3 id={titleId}>{title ?? story.headline}</h3>
		<p>{description}</p>
	</div>

	<p class="sr-only">{story.accessibilitySummary}</p>

	<div class="atlas-story__layout">
		<div class="atlas-story__map" aria-label={story.summary}>
			<div class="atlas-story__map-inner">
				<svg class="atlas-story__edges" viewBox="0 0 1450 650" aria-hidden="true">
					<defs>
						<marker
							id={arrowId}
							markerHeight="9"
							markerWidth="9"
							orient="auto"
							refX="8"
							refY="4.5"
						>
							<path d="M0,0 L9,4.5 L0,9 Z" />
						</marker>
					</defs>
					{#each edgeLines as edge}
						<path
							d={`M ${edge.x1} ${edge.y1} C ${edge.x1 + 56} ${edge.y1}, ${edge.x2 - 56} ${edge.y2}, ${edge.x2} ${edge.y2}`}
							marker-end={`url(#${arrowId})`}
						/>
					{/each}
				</svg>

				{#each nodes as node}
					<article
						class={`atlas-story__node status-${node.status}`}
						style={`left: ${node.x}px; top: ${node.y}px; width: ${node.width}px;`}
					>
						<header>
							<span>{node.kind}</span>
							<strong>{node.status}</strong>
						</header>
						<h4>{node.label}</h4>
						{#if node.owner}
							<p class="owner">{node.owner}</p>
						{/if}
						<p>{node.notes}</p>
					</article>
				{/each}
			</div>
		</div>

		<aside class="atlas-story__chapters" aria-label="Atlas story chapters">
			<div class="atlas-story__score">
				<span>{graph.renderer.primary}</span>
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
	.atlas-story__node header span,
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
	.atlas-story__chapter p,
	.atlas-story__node p {
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
		overflow: auto;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 8px;
		background:
			linear-gradient(#eeeeea 1px, transparent 1px),
			linear-gradient(90deg, #eeeeea 1px, transparent 1px),
			var(--color-clear-porcelain, #f9f9f9);
		background-size: 32px 32px;
		box-shadow: 0 18px 44px rgba(10, 14, 25, 0.045);
	}

	.atlas-story__map-inner {
		position: relative;
		width: 1450px;
		height: 650px;
	}

	.atlas-story__edges {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.atlas-story__edges path {
		fill: none;
		stroke: #a7a7a0;
		stroke-width: 1.2;
	}

	.atlas-story__edges marker path {
		fill: #a7a7a0;
	}

	.atlas-story__node {
		position: absolute;
		display: grid;
		gap: 0.35rem;
		min-height: 7.2rem;
		border: 1px solid rgba(10, 14, 25, 0.1);
		border-radius: 7px;
		background: #ffffff;
		box-shadow: 0 14px 28px rgba(10, 14, 25, 0.055);
		padding: 0.72rem;
	}

	.atlas-story__node header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.atlas-story__node header strong {
		border-radius: 999px;
		background: rgba(10, 14, 25, 0.05);
		color: #6d6d66;
		font-size: 0.66rem;
		padding: 0.22rem 0.45rem;
		text-transform: uppercase;
	}

	.atlas-story__node h4,
	.atlas-story__chapter h4 {
		margin: 0;
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 0.95rem;
		letter-spacing: 0;
		line-height: 1.16;
	}

	.atlas-story__node .owner {
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 0.76rem;
		font-weight: 700;
	}

	.atlas-story__node.status-run,
	.atlas-story__chapter.state-run {
		border-color: #cfe3d6;
		background: #f8fcf9;
	}

	.atlas-story__node.status-wait,
	.atlas-story__chapter.state-wait {
		border-color: #d9ddf5;
		background: #f8f7ff;
	}

	.atlas-story__node.status-stop,
	.atlas-story__chapter.state-stop {
		border-color: #f4cdd3;
		background: #fff7f8;
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
		.atlas-story__map-inner {
			width: 980px;
			transform: scale(0.68);
			transform-origin: top left;
		}

		.atlas-story__map {
			max-height: 29rem;
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
