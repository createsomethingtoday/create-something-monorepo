<script lang="ts">
	import {
		createPublicAtlasCanvas,
		createPublicAtlasGraphArtifact,
		createPublicAtlasStoryArtifact,
		publicAtlasNodeWidth,
		type PublicAtlasCanvas,
		type PublicAtlasGraphArtifact,
		type PublicAtlasNodeKind,
		type PublicAtlasNode,
		type PublicAtlasStoryArtifact
	} from './headless.js';

	type PositionedNode = PublicAtlasNode & { x: number; y: number; width: number };
	type StoryEdgeLine = {
		id: string;
		path: string;
	};
	type LedgerCopy = {
		label: string;
		outcome: string;
		evidence: string;
	};

	const STORY_FLOW_SIZE = {
		width: 1320,
		height: 560
	} as const;

	const STORY_NODE_HEIGHT = 132;

	const STORY_NODE_LANES: Record<PublicAtlasNodeKind, { x: number; y: number }> = {
		actor: { x: 48, y: 214 },
		data: { x: 330, y: 214 },
		system: { x: 612, y: 84 },
		ai: { x: 612, y: 344 },
		human: { x: 930, y: 70 },
		touchpoint: { x: 930, y: 224 },
		constraint: { x: 930, y: 378 }
	};

	const STORY_NODE_ORDER: PublicAtlasNodeKind[] = [
		'actor',
		'data',
		'system',
		'ai',
		'human',
		'touchpoint',
		'constraint'
	];

	function toDomIdToken(value: string): string {
		return value
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 80) || 'workflow';
	}

	function layoutStoryNodes(sourceNodes: PublicAtlasNode[]): PositionedNode[] {
		const offsets = new Map<PublicAtlasNodeKind, number>();
		const positioned = [...sourceNodes]
			.sort((a, b) => STORY_NODE_ORDER.indexOf(a.kind) - STORY_NODE_ORDER.indexOf(b.kind))
			.map((node) => {
				const lane = STORY_NODE_LANES[node.kind];
				const offset = offsets.get(node.kind) ?? 0;
				offsets.set(node.kind, offset + 1);
				return {
					...node,
					x: node.x ?? lane.x,
					y: node.y ?? lane.y + offset * 148,
					width: Math.min(300, publicAtlasNodeWidth(node))
				};
			});

		return sourceNodes.map((node) => positioned.find((item) => item.id === node.id) ?? node) as PositionedNode[];
	}

	function createStoryEdgePath(source: PositionedNode, target: PositionedNode): string {
		const sourceCenterX = source.x + source.width / 2;
		const targetCenterX = target.x + target.width / 2;
		const sourceCenterY = source.y + STORY_NODE_HEIGHT / 2;
		const targetCenterY = target.y + STORY_NODE_HEIGHT / 2;
		const targetIsRight = target.x > source.x + source.width - 24;
		const targetIsLeft = target.x + target.width < source.x + 24;
		const targetIsBelow = target.y > source.y;

		if (targetIsRight || targetIsLeft) {
			const direction = targetIsRight ? 1 : -1;
			const x1 = targetIsRight ? source.x + source.width : source.x;
			const x2 = targetIsRight ? target.x : target.x + target.width;
			const y1 = sourceCenterY;
			const y2 = targetCenterY;
			const control = Math.max(52, Math.min(96, Math.abs(x2 - x1) * 0.34));
			return `M ${x1} ${y1} C ${x1 + direction * control} ${y1}, ${x2 - direction * control} ${y2}, ${x2} ${y2}`;
		}

		const x1 = sourceCenterX;
		const x2 = targetCenterX;
		const y1 = targetIsBelow ? source.y + STORY_NODE_HEIGHT : source.y;
		const y2 = targetIsBelow ? target.y : target.y + STORY_NODE_HEIGHT;
		const direction = targetIsBelow ? 1 : -1;
		const control = Math.max(54, Math.min(118, Math.abs(y2 - y1) * 0.44));
		return `M ${x1} ${y1} C ${x1} ${y1 + direction * control}, ${x2} ${y2 - direction * control}, ${x2} ${y2}`;
	}

	function sentenceCase(value: string): string {
		return value.charAt(0).toUpperCase() + value.slice(1);
	}

	function ledgerCopyFor(chapter: PublicAtlasStoryArtifact['chapters'][number]): LedgerCopy {
		switch (chapter.id) {
			case 'claim':
				return {
					label: 'Map',
					outcome: 'Workflow named before execution.',
					evidence: 'Owner and source packet'
				};
			case 'automation':
				return {
					label: 'Run',
					outcome: 'Clear rules move bounded work.',
					evidence: 'Allowed system path'
				};
			case 'judgment':
				return {
					label: 'Wait',
					outcome: 'Human review keeps the decision.',
					evidence: 'Approval authority'
				};
			case 'boundary':
				return {
					label: 'Stop',
					outcome: 'Unsafe approval is blocked.',
					evidence: 'Stop condition'
				};
			case 'receipt':
				return {
					label: 'Receipt',
					outcome: 'Proof lands where the team can inspect it.',
					evidence: 'Dashboard record'
				};
			case 'next-step':
				return {
					label: 'Pilot',
					outcome: 'Ready to scope the first safe run.',
					evidence: `Readiness ${chapter.proofLabel.replace(/^readiness\s+/i, '')}`
				};
			default:
				return {
					label: sentenceCase(chapter.eyebrow),
					outcome: chapter.title,
					evidence: sentenceCase(chapter.proofLabel)
				};
		}
	}

	export let canvas: PublicAtlasCanvas | undefined = undefined;
	export let starterId = 'workflow';
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
	let edgeLines: StoryEdgeLine[];

	$: sourceCanvas = canvas ?? createPublicAtlasCanvas();
	$: graph = createPublicAtlasGraphArtifact(sourceCanvas);
	$: story = createPublicAtlasStoryArtifact(sourceCanvas, graph.readiness);
	$: nodes = layoutStoryNodes(sourceCanvas.nodes);
	$: storyDomId = storyId ?? `atlas-story-${toDomIdToken(starterId)}`;
	$: titleId = `${storyDomId}-title`;
	$: arrowId = `${storyDomId}-arrow`;
	$: rendererLabel = graph.renderer.primary === 'atlas' ? 'Atlas' : graph.renderer.primary;
	$: nodeById = new Map(nodes.map((node) => [node.id, node]));
	$: edgeLines = sourceCanvas.edges.flatMap((edge) => {
		const source = nodeById.get(edge.source);
		const target = nodeById.get(edge.target);
		if (!source || !target) return [];
		return [{ id: edge.id, path: createStoryEdgePath(source, target) }];
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
			<div
				class="atlas-story__map-inner"
				style={`--atlas-story-width: ${STORY_FLOW_SIZE.width}px; --atlas-story-height: ${STORY_FLOW_SIZE.height}px;`}
			>
				<div class="atlas-story__stage atlas-story__stage--source">Source</div>
				<div class="atlas-story__stage atlas-story__stage--automation">Automation</div>
				<div class="atlas-story__stage atlas-story__stage--decision">Decision / Proof</div>
				<svg
					class="atlas-story__edges"
					viewBox={`0 0 ${STORY_FLOW_SIZE.width} ${STORY_FLOW_SIZE.height}`}
					aria-hidden="true"
				>
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
						<path d={edge.path} marker-end={`url(#${arrowId})`} />
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

		{#if compact}
			<aside class="atlas-story__ledger" aria-label="Atlas receipt ledger">
				<div class="atlas-story__ledger-summary">
					<span>{rendererLabel} readiness</span>
					<strong>{graph.readiness.score}/100</strong>
					<small>{graph.readiness.level}</small>
				</div>
				<ol class="atlas-story__ledger-list">
					{#each story.chapters as chapter}
						{@const ledger = ledgerCopyFor(chapter)}
						<li
							class={`atlas-story__ledger-row state-${chapter.state}`}
							data-motion-cue={chapter.motionCue}
							data-state={chapter.state}
						>
							<span class="atlas-story__ledger-index">{chapter.sequence}</span>
							<div class="atlas-story__ledger-copy">
								<span>{ledger.label}</span>
								<strong>{ledger.outcome}</strong>
							</div>
							<small>{ledger.evidence}</small>
						</li>
					{/each}
				</ol>
			</aside>
		{:else}
			<aside class="atlas-story__chapters" aria-label="Atlas story chapters">
				<div class="atlas-story__score">
					<span>{rendererLabel}</span>
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
		{/if}
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
	.atlas-story__ledger-copy span,
	.atlas-story__ledger-summary span,
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
		scrollbar-color: #cfcfca transparent;
		scrollbar-width: thin;
	}

	.atlas-story__map::-webkit-scrollbar {
		width: 0.45rem;
		height: 0.45rem;
	}

	.atlas-story__map::-webkit-scrollbar-track {
		background: transparent;
	}

	.atlas-story__map::-webkit-scrollbar-thumb {
		border: 2px solid transparent;
		border-radius: 999px;
		background: #cfcfca;
		background-clip: padding-box;
	}

	.atlas-story__map-inner {
		position: relative;
		width: var(--atlas-story-width);
		height: var(--atlas-story-height);
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

	.atlas-story__stage {
		position: absolute;
		top: 1rem;
		z-index: 1;
		border: 1px solid rgba(10, 14, 25, 0.08);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.82);
		color: var(--color-clear-grey, #636363);
		font-size: 0.66rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		padding: 0.26rem 0.55rem;
		text-transform: uppercase;
	}

	.atlas-story__stage--source {
		left: 3rem;
	}

	.atlas-story__stage--automation {
		left: 38rem;
	}

	.atlas-story__stage--decision {
		left: 58rem;
	}

	.atlas-story__node {
		position: absolute;
		z-index: 2;
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

	.atlas-story__ledger {
		display: grid;
		grid-template-columns: minmax(11rem, 0.2fr) minmax(0, 1fr);
		overflow: hidden;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 8px;
		background: #fdfdfc;
	}

	.atlas-story__ledger-summary {
		display: grid;
		align-content: center;
		gap: 0.2rem;
		border-right: 1px solid var(--color-clear-border, #e1e1e1);
		background: #ffffff;
		padding: 1rem;
	}

	.atlas-story__ledger-summary strong {
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 1.42rem;
		line-height: 1;
	}

	.atlas-story__ledger-summary small {
		color: var(--color-clear-grey, #636363);
		font-size: 0.78rem;
		font-weight: 700;
	}

	.atlas-story__ledger-list {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.atlas-story__ledger-row {
		position: relative;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: start;
		gap: 0.42rem 0.68rem;
		min-height: 5.15rem;
		border-left: 1px solid var(--color-clear-border, #e1e1e1);
		border-top: 1px solid var(--color-clear-border, #e1e1e1);
		background: #ffffff;
		padding: 0.7rem 0.86rem 0.74rem;
	}

	.atlas-story__ledger-row:nth-child(-n + 3) {
		border-top: 0;
	}

	.atlas-story__ledger-row::before {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 2px;
		background: #d7d7d2;
		content: '';
	}

	.atlas-story__ledger-row.state-run::before {
		background: #92b89f;
	}

	.atlas-story__ledger-row.state-wait::before {
		background: #aab0dc;
	}

	.atlas-story__ledger-row.state-stop::before {
		background: #e7a6af;
	}

	.atlas-story__ledger-index {
		display: inline-grid;
		width: 1.35rem;
		height: 1.35rem;
		align-items: center;
		justify-items: center;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 999px;
		background: #fafafa;
		color: #5f5f59;
		font-size: 0.66rem;
		font-weight: 800;
		line-height: 1;
	}

	.atlas-story__ledger-copy {
		display: grid;
		gap: 0.16rem;
		min-width: 0;
	}

	.atlas-story__ledger-copy strong {
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 0.88rem;
		letter-spacing: 0;
		line-height: 1.16;
	}

	.atlas-story__ledger-row small {
		grid-column: 2;
		color: #777770;
		font-size: 0.66rem;
		font-weight: 700;
		line-height: 1.18;
	}

	@media (max-width: 980px) {
		.atlas-story__layout {
			grid-template-columns: 1fr;
		}

		.atlas-story__ledger {
			grid-template-columns: 1fr;
		}

		.atlas-story__ledger-summary {
			border-right: 0;
			border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
		}

		.atlas-story__ledger-list {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.atlas-story__ledger-row:nth-child(-n + 3) {
			border-top: 1px solid var(--color-clear-border, #e1e1e1);
		}

		.atlas-story__ledger-row:nth-child(-n + 2) {
			border-top: 0;
		}
	}

	@media (max-width: 640px) {
		.atlas-story__map-inner {
			transform: scale(0.72);
			transform-origin: top left;
		}

		.atlas-story__map {
			max-height: 28rem;
		}

		.atlas-story__ledger-list {
			grid-template-columns: 1fr;
		}

		.atlas-story__ledger-row,
		.atlas-story__ledger-row:nth-child(-n + 2),
		.atlas-story__ledger-row:nth-child(-n + 3) {
			min-height: 0;
			border-top: 1px solid var(--color-clear-border, #e1e1e1);
		}

		.atlas-story__ledger-row:first-child {
			border-top: 0;
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
