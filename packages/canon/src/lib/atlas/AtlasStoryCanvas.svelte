<script lang="ts">
	import AtlasFlow from './AtlasFlow.svelte';
	import {
		createPublicAtlasCanvas,
		createPublicAtlasGraphArtifact,
		createPublicAtlasStoryArtifact,
		type PublicAtlasCanvas,
		type PublicAtlasGraphArtifact,
		type PublicAtlasStoryArtifact
	} from './headless.js';
	import type { Viewport } from '@xyflow/svelte';

	type LedgerCopy = {
		label: string;
		outcome: string;
		evidence: string;
	};

	function toDomIdToken(value: string): string {
		return value
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 80) || 'workflow';
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
	let storyViewport: Viewport;
	let selectedChapterId = 'claim';

	$: sourceCanvas = canvas ?? createPublicAtlasCanvas();
	$: graph = createPublicAtlasGraphArtifact(sourceCanvas);
	$: story = createPublicAtlasStoryArtifact(sourceCanvas, graph.readiness);
	$: storyDomId = storyId ?? `atlas-story-${toDomIdToken(starterId)}`;
	$: titleId = `${storyDomId}-title`;
	$: rendererLabel = graph.renderer.primary === 'atlas' ? 'Atlas' : graph.renderer.primary;
	$: selectedStoryChapter =
		story.chapters.find((chapter) => chapter.id === selectedChapterId) ??
		story.chapters.find((chapter) => chapter.focusNodeIds[0]) ??
		story.chapters[0];
	$: selectedStoryNodeId = selectedStoryChapter?.focusNodeIds[0] ?? sourceCanvas.nodes[0]?.id ?? '';
	$: storyViewport = {
		x: compact ? -16 : 0,
		y: compact ? -18 : -8,
		zoom: compact ? 0.82 : 0.9
	};
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
			<AtlasFlow
				canvas={sourceCanvas}
				flowId={`${storyDomId}-flow`}
				selectedNodeId={selectedStoryNodeId}
				readOnly
				showControls={false}
				focusedNodeIds={selectedStoryChapter.focusNodeIds}
				focusedEdgeIds={selectedStoryChapter.relationshipIds}
				dimUnfocused
				initialViewport={storyViewport}
				minZoom={0.7}
				maxZoom={1.2}
			/>
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
							class:selected={chapter.id === selectedStoryChapter.id}
							data-motion-cue={chapter.motionCue}
							data-state={chapter.state}
						>
							<button type="button" onclick={() => (selectedChapterId = chapter.id)}>
								<span class="atlas-story__ledger-index">{chapter.sequence}</span>
								<div class="atlas-story__ledger-copy">
									<span>{ledger.label}</span>
									<strong>{ledger.outcome}</strong>
								</div>
								<small>{ledger.evidence}</small>
							</button>
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
						class:selected={chapter.id === selectedStoryChapter.id}
						data-motion-cue={chapter.motionCue}
						data-state={chapter.state}
					>
						<button type="button" onclick={() => (selectedChapterId = chapter.id)}>
							<span>{chapter.sequence}. {chapter.eyebrow}</span>
							<h4>{chapter.title}</h4>
							<p>{chapter.body}</p>
							<footer>
								<small>{chapter.proofLabel}</small>
							</footer>
						</button>
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
	.atlas-story__chapter button > span,
	.atlas-story__ledger-copy span,
	.atlas-story__ledger-summary span,
	.atlas-story__score span {
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-topology-label, var(--font-performance-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace));
		font-size: var(--text-performance-operator-label, 0.72rem);
		font-weight: 800;
		letter-spacing: var(--tracking-performance-operator-label, 0);
		text-transform: uppercase;
	}

	.atlas-story__copy h3 {
		margin: 0.2rem 0;
		color: var(--color-performance-ink, #090909);
		font-size: clamp(1.45rem, 2.1vw, 2.25rem);
		letter-spacing: 0;
		line-height: 1.08;
	}

	.atlas-story__copy p,
	.atlas-story__chapter p {
		margin: 0;
		color: var(--color-performance-muted, #5e6268);
		line-height: 1.45;
	}

	.atlas-story__layout {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(18rem, 0.58fr);
		gap: 1rem;
		align-items: start;
	}

	.atlas-story__map {
		height: clamp(31rem, 46vh, 38rem);
		min-height: 31rem;
		overflow: auto;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 8px;
		background:
			linear-gradient(#eeeeea 1px, transparent 1px),
			linear-gradient(90deg, #eeeeea 1px, transparent 1px),
			var(--color-performance-paper, #f3f3f0);
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

	.atlas-story__chapter h4 {
		margin: 0;
		color: var(--color-performance-ink, #090909);
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

	.atlas-story__chapters {
		display: grid;
		gap: 0.55rem;
	}

	.atlas-story__score,
	.atlas-story__chapter {
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 8px;
		background: var(--color-performance-panel, #ffffff);
		padding: 0.8rem;
	}

	.atlas-story__score {
		display: grid;
		gap: 0.2rem;
	}

	.atlas-story__score strong {
		color: var(--color-performance-ink, #090909);
		font-family: var(--font-performance-record, var(--font-performance-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace));
		font-size: 1.25rem;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.atlas-story__score small {
		color: var(--color-performance-muted, #5e6268);
		font-size: var(--text-performance-record-meta, 0.833rem);
		font-weight: 700;
	}

	.atlas-story__chapter {
		display: grid;
		gap: 0.4rem;
		padding: 0;
	}

	.atlas-story__chapter button,
	.atlas-story__ledger-row button {
		display: grid;
		width: 100%;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
	}

	.atlas-story__chapter button {
		gap: 0.4rem;
		padding: 0.8rem;
	}

	.atlas-story__chapter.selected,
	.atlas-story__ledger-row.selected {
		border-color: rgba(10, 14, 25, 0.34);
		box-shadow: inset 0 0 0 1px rgba(10, 14, 25, 0.08);
	}

	.atlas-story__chapter button:focus-visible,
	.atlas-story__ledger-row button:focus-visible {
		outline: 2px solid rgba(10, 14, 25, 0.62);
		outline-offset: 2px;
	}

	.atlas-story__chapter footer {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.atlas-story__chapter footer small {
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 999px;
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-record, var(--font-performance-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace));
		font-size: var(--text-performance-record-meta, 0.833rem);
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
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 8px;
		background: #fdfdfc;
	}

	.atlas-story__ledger-summary {
		display: grid;
		align-content: center;
		gap: 0.2rem;
		border-right: 1px solid var(--color-performance-line, #d7d7d2);
		background: #ffffff;
		padding: 1rem;
	}

	.atlas-story__ledger-summary strong {
		color: var(--color-performance-ink, #090909);
		font-family: var(--font-performance-record, var(--font-performance-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace));
		font-size: 1.42rem;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.atlas-story__ledger-summary small {
		color: var(--color-performance-muted, #5e6268);
		font-size: var(--text-performance-record-meta, 0.833rem);
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
		min-height: 5.15rem;
		border-left: 1px solid var(--color-performance-line, #d7d7d2);
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
		background: #ffffff;
	}

	.atlas-story__ledger-row button {
		grid-template-columns: auto minmax(0, 1fr);
		align-items: start;
		gap: 0.42rem 0.68rem;
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
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 999px;
		background: #fafafa;
		color: #5f5f59;
		font-family: var(--font-performance-record, var(--font-performance-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace));
		font-size: var(--text-performance-record-meta, 0.833rem);
		font-variant-numeric: tabular-nums;
		font-weight: 800;
		line-height: 1;
	}

	.atlas-story__ledger-copy {
		display: grid;
		gap: 0.16rem;
		min-width: 0;
	}

	.atlas-story__ledger-copy strong {
		color: var(--color-performance-ink, #090909);
		font-size: var(--text-performance-record, 0.913rem);
		letter-spacing: 0;
		line-height: 1.16;
	}

	.atlas-story__ledger-row small {
		grid-column: 2;
		color: #777770;
		font-size: var(--text-performance-record-meta, 0.833rem);
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
			border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
		}

		.atlas-story__ledger-list {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.atlas-story__ledger-row:nth-child(-n + 3) {
			border-top: 1px solid var(--color-performance-line, #d7d7d2);
		}

		.atlas-story__ledger-row:nth-child(-n + 2) {
			border-top: 0;
		}
	}

	@media (max-width: 640px) {
		.atlas-story__map {
			height: 28rem;
			max-height: 28rem;
		}

		.atlas-story__ledger-list {
			grid-template-columns: 1fr;
		}

		.atlas-story__ledger-row,
		.atlas-story__ledger-row:nth-child(-n + 2),
		.atlas-story__ledger-row:nth-child(-n + 3) {
			min-height: 0;
			border-top: 1px solid var(--color-performance-line, #d7d7d2);
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
