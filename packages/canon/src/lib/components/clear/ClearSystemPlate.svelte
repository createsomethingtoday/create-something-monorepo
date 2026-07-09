<script lang="ts">
	export type ClearSystemPlateTone = 'neutral' | 'signal' | 'success' | 'warning' | 'dark';

	export interface ClearSystemPlateMetaItem {
		label: string;
		value: string;
	}

	export interface ClearSystemPlateMetric {
		label: string;
		value: string;
		detail?: string;
		tone?: ClearSystemPlateTone;
	}

	export interface ClearSystemPlateNode {
		id: string;
		x: number;
		y: number;
		size?: number;
		label?: string;
		tone?: ClearSystemPlateTone;
		active?: boolean;
	}

	export interface ClearSystemPlateEdge {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
		tone?: ClearSystemPlateTone;
	}

	export interface ClearSystemPlateLayer {
		label: string;
		detail?: string;
		tone?: ClearSystemPlateTone;
	}

	export interface ClearSystemPlatePanelRow {
		label: string;
		value: string;
		tone?: ClearSystemPlateTone;
	}

	export interface ClearSystemPlatePanel {
		eyebrow?: string;
		title: string;
		detail?: string;
		metric?: string;
		rows?: ClearSystemPlatePanelRow[];
		tone?: ClearSystemPlateTone;
	}

	export interface ClearSystemPlateReviewItem {
		label: string;
		status: string;
		detail?: string;
		tone?: ClearSystemPlateTone;
	}

	interface Props {
		eyebrow?: string;
		title: string;
		description?: string;
		plateId?: string;
		plateMeta?: string;
		graphLabel?: string;
		nodes?: ClearSystemPlateNode[];
		edges?: ClearSystemPlateEdge[];
		layers?: ClearSystemPlateLayer[];
		metrics?: ClearSystemPlateMetric[];
		panels?: ClearSystemPlatePanel[];
		reviewItems?: ClearSystemPlateReviewItem[];
		metaItems?: ClearSystemPlateMetaItem[];
		footnote?: string;
		ariaLabel?: string;
	}

	let {
		eyebrow,
		title,
		description,
		plateId = 'SYSTEM PLATE',
		plateMeta = 'CLEAR SYSTEM PRESENTATION',
		graphLabel = 'Graph view',
		nodes = [],
		edges = [],
		layers = [],
		metrics = [],
		panels = [],
		reviewItems = [],
		metaItems = [],
		footnote,
		ariaLabel = title
	}: Props = $props();

	const defaultNodes: ClearSystemPlateNode[] = [
		{ id: 'a', x: 18, y: 26, size: 4, tone: 'dark' },
		{ id: 'b', x: 30, y: 35, size: 7, tone: 'signal', active: true },
		{ id: 'c', x: 45, y: 22, size: 5, tone: 'dark' },
		{ id: 'd', x: 62, y: 34, size: 8, tone: 'success', active: true },
		{ id: 'e', x: 76, y: 22, size: 4, tone: 'neutral' },
		{ id: 'f', x: 22, y: 58, size: 5, tone: 'neutral' },
		{ id: 'g', x: 42, y: 62, size: 8, tone: 'dark' },
		{ id: 'h', x: 60, y: 72, size: 5, tone: 'warning' },
		{ id: 'i', x: 82, y: 62, size: 6, tone: 'signal' }
	];

	const defaultEdges: ClearSystemPlateEdge[] = [
		{ x1: 18, y1: 26, x2: 30, y2: 35 },
		{ x1: 30, y1: 35, x2: 45, y2: 22 },
		{ x1: 45, y1: 22, x2: 62, y2: 34, tone: 'signal' },
		{ x1: 62, y1: 34, x2: 76, y2: 22 },
		{ x1: 30, y1: 35, x2: 22, y2: 58 },
		{ x1: 22, y1: 58, x2: 42, y2: 62 },
		{ x1: 42, y1: 62, x2: 60, y2: 72, tone: 'warning' },
		{ x1: 60, y1: 72, x2: 82, y2: 62, tone: 'signal' },
		{ x1: 62, y1: 34, x2: 42, y2: 62, tone: 'success' }
	];

	const visibleNodes = $derived(nodes.length ? nodes : defaultNodes);
	const visibleEdges = $derived(edges.length ? edges : defaultEdges);
</script>

<section class="clear-system-plate" aria-label={ariaLabel}>
	<header class="clear-system-plate__header">
		<div>
			<span>{plateId}</span>
			<strong>{plateMeta}</strong>
		</div>
		{#if eyebrow}
			<p>{eyebrow}</p>
		{/if}
	</header>

	<div class="clear-system-plate__layout">
		<div class="clear-system-plate__copy">
			<h3>{title}</h3>
			{#if description}
				<p>{description}</p>
			{/if}

			{#if metaItems.length}
				<div class="clear-system-plate__meta" aria-label="System plate metadata">
					{#each metaItems as item}
						<span>
							<small>{item.label}</small>
							<strong>{item.value}</strong>
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<div class="clear-system-plate__canvas" aria-label={graphLabel}>
			<div class="clear-system-plate__canvas-bar">
				<span>{graphLabel}</span>
				<strong>60 FPS inspection</strong>
			</div>

			<svg viewBox="0 8 100 66" role="img" aria-label="Relationship graph plate">
				<defs>
					<pattern id="clear-system-plate-grid" width="4" height="4" patternUnits="userSpaceOnUse">
						<path d="M 4 0 L 0 0 0 4" fill="none" stroke="currentColor" stroke-width="0.08" />
					</pattern>
				</defs>
				<rect width="100" height="80" fill="url(#clear-system-plate-grid)" opacity="0.5" />
				{#each visibleEdges as edge}
					<line
						class={`clear-system-plate__edge clear-system-plate__edge--${edge.tone ?? 'neutral'}`}
						x1={edge.x1}
						y1={edge.y1}
						x2={edge.x2}
						y2={edge.y2}
					/>
				{/each}
				{#each visibleNodes as node}
					<circle
						class={`clear-system-plate__node clear-system-plate__node--${node.tone ?? 'neutral'}`}
						class:clear-system-plate__node--active={node.active}
						cx={node.x}
						cy={node.y}
						r={node.size ?? 4}
					/>
					{#if node.label}
						<text x={node.x + 3.8} y={node.y - 2.7}>{node.label}</text>
					{/if}
				{/each}
			</svg>

			{#if metrics.length}
				<div class="clear-system-plate__metrics" aria-label="System plate metrics">
					{#each metrics as metric}
						<div class={`clear-system-plate__metric clear-system-plate__metric--${metric.tone ?? 'neutral'}`}>
							<strong>{metric.value}</strong>
							<span>{metric.label}</span>
							{#if metric.detail}
								<small>{metric.detail}</small>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="clear-system-plate__rail">
			{#if layers.length}
				<section class="clear-system-plate__layers" aria-label="System layers">
					<div class="clear-system-plate__rail-heading">
						<span>Layers</span>
						<strong>Substrate stack</strong>
					</div>
					<div class="clear-system-plate__layer-stack">
						{#each layers as layer}
							<div class={`clear-system-plate__layer clear-system-plate__layer--${layer.tone ?? 'neutral'}`}>
								<strong>{layer.label}</strong>
								{#if layer.detail}
									<span>{layer.detail}</span>
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/if}

			{#each panels as panel}
				<section
					class={`clear-system-plate__panel clear-system-plate__panel--${panel.tone ?? 'neutral'}`}
					aria-label={panel.title}
				>
					{#if panel.eyebrow || panel.metric}
						<div class="clear-system-plate__panel-meta">
							{#if panel.eyebrow}
								<span>{panel.eyebrow}</span>
							{/if}
							{#if panel.metric}
								<strong>{panel.metric}</strong>
							{/if}
						</div>
					{/if}
					<h4>{panel.title}</h4>
					{#if panel.detail}
						<p>{panel.detail}</p>
					{/if}
					{#if panel.rows?.length}
						<div class="clear-system-plate__rows">
							{#each panel.rows as row}
								<div class={`clear-system-plate__row clear-system-plate__row--${row.tone ?? 'neutral'}`}>
									<span>{row.label}</span>
									<strong>{row.value}</strong>
								</div>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	</div>

	{#if reviewItems.length || footnote}
		<footer class="clear-system-plate__footer">
			{#if reviewItems.length}
				<div class="clear-system-plate__review" aria-label="Human review lane">
					{#each reviewItems as item}
						<article class={`clear-system-plate__review-item clear-system-plate__review-item--${item.tone ?? 'neutral'}`}>
							<span>{item.status}</span>
							<strong>{item.label}</strong>
							{#if item.detail}
								<p>{item.detail}</p>
							{/if}
						</article>
					{/each}
				</div>
			{/if}

			{#if footnote}
				<p>{footnote}</p>
			{/if}
		</footer>
	{/if}
</section>

<style>
	.clear-system-plate {
		overflow: hidden;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background:
			linear-gradient(90deg, rgb(10 14 25 / 0.035) 1px, transparent 1px) 0 0 / 2rem 2rem,
			linear-gradient(180deg, var(--color-clear-panel, #ffffff) 0%, #fbfbfb 100%);
		color: var(--color-clear-onyx, #0a0e19);
	}

	.clear-system-plate__header,
	.clear-system-plate__footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.72rem 0.88rem;
		border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
	}

	.clear-system-plate__header div {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		align-items: baseline;
	}

	.clear-system-plate__header span,
	.clear-system-plate__header strong,
	.clear-system-plate__header p,
	.clear-system-plate__canvas-bar span,
	.clear-system-plate__canvas-bar strong,
	.clear-system-plate__metric span,
	.clear-system-plate__metric small,
	.clear-system-plate__meta small,
	.clear-system-plate__rail-heading span,
	.clear-system-plate__panel-meta span,
	.clear-system-plate__row span,
	.clear-system-plate__review-item span {
		color: var(--color-clear-grey, #636363);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		font-weight: var(--font-medium);
		letter-spacing: 0;
		line-height: 1.18;
		text-transform: uppercase;
	}

	.clear-system-plate__header strong,
	.clear-system-plate__canvas-bar strong,
	.clear-system-plate__panel-meta strong {
		color: var(--color-clear-onyx, #0a0e19);
	}

	.clear-system-plate__header p {
		margin: 0;
		text-align: right;
	}

	.clear-system-plate__layout {
		display: grid;
		grid-template-columns: minmax(14rem, 0.42fr) minmax(0, 1fr) minmax(17rem, 0.43fr);
		min-height: clamp(29rem, 58vw, 33rem);
	}

	.clear-system-plate__copy,
	.clear-system-plate__rail {
		padding: clamp(1rem, 2vw, 1.25rem);
	}

	.clear-system-plate__copy {
		display: grid;
		align-content: start;
		gap: 0.9rem;
		border-right: 1px solid var(--color-clear-border, #e1e1e1);
	}

	.clear-system-plate__copy h3 {
		margin: 0;
		max-width: 10.5ch;
		color: var(--color-clear-onyx, #0a0e19);
		font-size: clamp(2.35rem, 4.3vw, 4.05rem);
		font-weight: var(--font-medium);
		letter-spacing: 0;
		line-height: 1;
		text-wrap: balance;
	}

	.clear-system-plate__copy p,
	.clear-system-plate__panel p,
	.clear-system-plate__footer > p,
	.clear-system-plate__review-item p {
		margin: 0;
		color: var(--color-clear-grey, #636363);
		font-size: 0.88rem;
		line-height: 1.5;
		text-wrap: pretty;
	}

	.clear-system-plate__meta {
		display: grid;
		gap: 0.5rem;
		margin-top: 0.3rem;
	}

	.clear-system-plate__meta span {
		display: grid;
		gap: 0.22rem;
		padding-top: 0.65rem;
		border-top: 1px solid var(--color-clear-border, #e1e1e1);
	}

	.clear-system-plate__meta strong {
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 0.92rem;
		font-weight: var(--font-medium);
		line-height: 1.25;
	}

	.clear-system-plate__canvas {
		display: grid;
		grid-template-rows: auto 1fr auto;
		min-width: 0;
		background:
			radial-gradient(circle at 52% 52%, rgb(0 72 255 / 0.075), transparent 34%),
			var(--color-clear-panel, #ffffff);
	}

	.clear-system-plate__canvas-bar,
	.clear-system-plate__rail-heading,
	.clear-system-plate__panel-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.clear-system-plate__canvas-bar {
		padding: 0.72rem 0.88rem;
		border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
	}

	.clear-system-plate__canvas svg {
		width: 100%;
		min-height: 20rem;
		height: 100%;
		color: rgb(10 14 25 / 0.42);
	}

	.clear-system-plate__edge {
		stroke: rgb(10 14 25 / 0.28);
		stroke-width: 0.34;
	}

	.clear-system-plate__edge--signal {
		stroke: var(--color-clear-cobalt, #0048ff);
	}

	.clear-system-plate__edge--success {
		stroke: #2d8f43;
	}

	.clear-system-plate__edge--warning {
		stroke: #b07100;
	}

	.clear-system-plate__node {
		fill: #ffffff;
		stroke: rgb(10 14 25 / 0.55);
		stroke-width: 0.5;
	}

	.clear-system-plate__node--dark {
		fill: var(--color-clear-onyx, #0a0e19);
	}

	.clear-system-plate__node--signal {
		fill: var(--color-clear-cobalt, #0048ff);
		stroke: var(--color-clear-cobalt, #0048ff);
	}

	.clear-system-plate__node--success {
		fill: #2d8f43;
		stroke: #2d8f43;
	}

	.clear-system-plate__node--warning {
		fill: #d79300;
		stroke: #b07100;
	}

	.clear-system-plate__node--active {
		stroke: #ffffff;
		stroke-width: 1.2;
		filter: drop-shadow(0 0 0.18rem rgb(0 72 255 / 0.32));
	}

	.clear-system-plate text {
		fill: var(--color-clear-grey, #636363);
		font-family: var(--font-mono);
		font-size: 2.3px;
		font-weight: 500;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.clear-system-plate__metrics {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		border-top: 1px solid var(--color-clear-border, #e1e1e1);
		background: rgb(255 255 255 / 0.78);
	}

	.clear-system-plate__metric {
		display: grid;
		gap: 0.16rem;
		min-height: 4.15rem;
		align-content: center;
		padding: 0.58rem 0.68rem;
		border-right: 1px solid var(--color-clear-border, #e1e1e1);
	}

	.clear-system-plate__metric:last-child {
		border-right: 0;
	}

	.clear-system-plate__metric strong {
		color: var(--color-clear-onyx, #0a0e19);
		font-family: var(--font-mono);
		font-size: 0.92rem;
		font-weight: var(--font-medium);
		line-height: 1.1;
	}

	.clear-system-plate__rail {
		display: grid;
		align-content: start;
		gap: 0.72rem;
		border-left: 1px solid var(--color-clear-border, #e1e1e1);
		background: rgb(249 249 249 / 0.72);
	}

	.clear-system-plate__layers,
	.clear-system-plate__panel {
		display: grid;
		gap: 0.66rem;
		padding: 0.72rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: rgb(255 255 255 / 0.82);
	}

	.clear-system-plate__layer-stack {
		display: grid;
		gap: 0.45rem;
		perspective: 60rem;
	}

	.clear-system-plate__layer {
		display: grid;
		gap: 0.12rem;
		min-height: 2.35rem;
		padding: 0.46rem 0.58rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		background: #ffffff;
		transform: skewX(-7deg);
	}

	.clear-system-plate__layer strong,
	.clear-system-plate__layer span {
		display: block;
		transform: skewX(10deg);
	}

	.clear-system-plate__layer strong,
	.clear-system-plate__panel h4,
	.clear-system-plate__row strong,
	.clear-system-plate__review-item strong {
		margin: 0;
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 0.92rem;
		font-weight: var(--font-medium);
		line-height: 1.22;
	}

	.clear-system-plate__layer span {
		color: var(--color-clear-grey, #636363);
		font-size: 0.74rem;
		line-height: 1.25;
	}

	.clear-system-plate__panel h4 {
		font-size: 0.98rem;
	}

	.clear-system-plate__rows {
		display: grid;
		border-top: 1px solid var(--color-clear-border, #e1e1e1);
	}

	.clear-system-plate__row {
		display: flex;
		justify-content: space-between;
		gap: 0.7rem;
		padding: 0.42rem 0;
		border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
	}

	.clear-system-plate__row:last-child {
		border-bottom: 0;
	}

	.clear-system-plate__footer {
		border-top: 1px solid var(--color-clear-border, #e1e1e1);
		border-bottom: 0;
		align-items: stretch;
	}

	.clear-system-plate__review {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.6rem;
		width: 100%;
	}

	.clear-system-plate__review-item {
		display: grid;
		gap: 0.28rem;
		min-height: 5.5rem;
		padding: 0.72rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-panel, #ffffff);
	}

	.clear-system-plate__metric--signal strong,
	.clear-system-plate__row--signal strong,
	.clear-system-plate__review-item--signal span {
		color: var(--color-clear-cobalt, #0048ff);
	}

	.clear-system-plate__metric--success strong,
	.clear-system-plate__row--success strong,
	.clear-system-plate__review-item--success span {
		color: #2d8f43;
	}

	.clear-system-plate__metric--warning strong,
	.clear-system-plate__row--warning strong,
	.clear-system-plate__review-item--warning span {
		color: #9a6200;
	}

	@media (max-width: 1080px) {
		.clear-system-plate__layout {
			grid-template-columns: 1fr;
		}

		.clear-system-plate__copy,
		.clear-system-plate__rail {
			border-right: 0;
			border-left: 0;
		}

		.clear-system-plate__copy {
			border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
		}

		.clear-system-plate__copy h3 {
			max-width: 16ch;
			font-size: clamp(2.2rem, 9vw, 3.4rem);
		}

		.clear-system-plate__rail {
			border-top: 1px solid var(--color-clear-border, #e1e1e1);
		}
	}

	@media (max-width: 720px) {
		.clear-system-plate__header,
		.clear-system-plate__footer {
			align-items: stretch;
			flex-direction: column;
		}

		.clear-system-plate__header p {
			text-align: left;
		}

		.clear-system-plate__metrics,
		.clear-system-plate__review {
			grid-template-columns: 1fr;
		}

		.clear-system-plate__metric {
			border-right: 0;
			border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
		}

		.clear-system-plate__metric:last-child {
			border-bottom: 0;
		}
	}
</style>
