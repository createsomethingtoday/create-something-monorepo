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
		labelPosition?: 'left' | 'right' | 'above' | 'below';
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

	const graphParticles = [
		[19, 34, 0.34],
		[22, 37, 0.24],
		[25, 32, 0.28],
		[27, 45, 0.2],
		[33, 28, 0.26],
		[36, 34, 0.22],
		[39, 40, 0.3],
		[42, 32, 0.22],
		[45, 46, 0.24],
		[50, 38, 0.3],
		[52, 52, 0.24],
		[55, 42, 0.26],
		[61, 36, 0.22],
		[64, 44, 0.34],
		[68, 39, 0.22],
		[72, 47, 0.24],
		[76, 52, 0.2],
		[80, 42, 0.28],
		[84, 55, 0.22],
		[30, 55, 0.18],
		[34, 60, 0.22],
		[38, 57, 0.2],
		[47, 61, 0.24],
		[54, 63, 0.18],
		[59, 58, 0.22],
		[67, 60, 0.2],
		[73, 64, 0.18]
	] as const;

	const edgePath = (edge: ClearSystemPlateEdge) => {
		const dx = edge.x2 - edge.x1;
		const dy = edge.y2 - edge.y1;
		const length = Math.hypot(dx, dy) || 1;
		const bend = Math.min(3.2, length * 0.08);
		const midX = (edge.x1 + edge.x2) / 2 - (dy / length) * bend;
		const midY = (edge.y1 + edge.y2) / 2 + (dx / length) * bend;
		return `M ${edge.x1} ${edge.y1} Q ${midX.toFixed(2)} ${midY.toFixed(2)} ${edge.x2} ${edge.y2}`;
	};

	const nodeRadius = (node: ClearSystemPlateNode) => node.size ?? 4;
	const labelWidth = (node: ClearSystemPlateNode) => Math.max(7.4, (node.label?.length ?? 0) * 1.12 + 3.2);
	const labelX = (node: ClearSystemPlateNode) => {
		const radius = nodeRadius(node);
		const width = labelWidth(node);
		if (node.labelPosition === 'left') return node.x - radius - width - 1.4;
		if (node.labelPosition === 'above' || node.labelPosition === 'below') return node.x - width / 2;
		if (node.labelPosition === 'right') return node.x + radius + 1.4;
		return node.x > 72 ? node.x - radius - width - 1.4 : node.x + radius + 1.4;
	};
	const labelY = (node: ClearSystemPlateNode) => {
		const radius = nodeRadius(node);
		if (node.labelPosition === 'above') return node.y - radius - 5.2;
		if (node.labelPosition === 'below') return node.y + radius + 1.1;
		return node.y - radius - 1.7;
	};
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
				<rect class="clear-system-plate__viewport" x="11" y="18" width="78" height="51" rx="1.1" />
				<g class="clear-system-plate__instrumentation" aria-hidden="true">
					<path d="M 15 20 H 27" />
					<path d="M 15 20 V 27" />
					<path d="M 83 67 H 70" />
					<path d="M 83 67 V 60" />
					<path d="M 14.5 57 H 18.5" />
					<path d="M 14.5 45 H 18.5" />
					<path d="M 14.5 33 H 18.5" />
					<path d="M 31 68 V 64" />
					<path d="M 47 68 V 64" />
					<path d="M 63 68 V 64" />
					<path d="M 79 68 V 64" />
					<text x="15" y="17.2">scan window / 04</text>
					<text x="69.5" y="72.6">frame 016ms</text>
				</g>
				<path class="clear-system-plate__plane" d="M 12 61 C 27 53 43 52 58 56 S 75 62 88 55" />
				<g class="clear-system-plate__particles" aria-hidden="true">
					{#each graphParticles as particle}
						<circle cx={particle[0]} cy={particle[1]} r={particle[2]} />
					{/each}
				</g>
				{#each visibleEdges as edge}
					<path
						class={`clear-system-plate__edge clear-system-plate__edge--${edge.tone ?? 'neutral'}`}
						d={edgePath(edge)}
					/>
				{/each}
				{#each visibleNodes as node}
					{@const radius = nodeRadius(node)}
					{#if node.active}
						<circle class="clear-system-plate__node-halo" cx={node.x} cy={node.y} r={radius + 3.2} />
						<rect
							class="clear-system-plate__selection"
							x={node.x - radius - 2.2}
							y={node.y - radius - 2.2}
							width={(radius + 2.2) * 2}
							height={(radius + 2.2) * 2}
							rx="1.2"
						/>
					{/if}
					<circle
						class={`clear-system-plate__node clear-system-plate__node--${node.tone ?? 'neutral'}`}
						class:clear-system-plate__node--active={node.active}
						cx={node.x}
						cy={node.y}
						r={radius}
					/>
					<circle class="clear-system-plate__node-core" cx={node.x} cy={node.y} r={Math.max(0.55, radius * 0.16)} />
				{/each}
				<g class="clear-system-plate__labels">
					{#each visibleNodes as node}
					{#if node.label}
						{@const chipX = labelX(node)}
						{@const chipY = labelY(node)}
						<g class="clear-system-plate__label">
							<rect x={chipX} y={chipY} width={labelWidth(node)} height="4.4" rx="0.7" />
							<text x={chipX + 1.6} y={chipY + 2.95}>{node.label}</text>
						</g>
					{/if}
					{/each}
				</g>
				<g class="clear-system-plate__trace" aria-hidden="true">
					<path d="M 13.5 70.5 H 31.5 L 35.2 67.2 H 51.5 L 55.8 70.5 H 86.5" />
					<text x="14.2" y="67.8">query path // records -> topology -> canvas</text>
				</g>
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

	.clear-system-plate__viewport {
		fill: rgb(255 255 255 / 0.18);
		stroke: rgb(10 14 25 / 0.2);
		stroke-width: 0.18;
	}

	.clear-system-plate__instrumentation path {
		fill: none;
		stroke: rgb(10 14 25 / 0.22);
		stroke-width: 0.16;
		stroke-linecap: square;
	}

	.clear-system-plate__instrumentation text {
		fill: rgb(10 14 25 / 0.48);
		font-size: 1.28px;
	}

	.clear-system-plate__plane {
		fill: none;
		stroke: rgb(0 72 255 / 0.09);
		stroke-width: 5.4;
		stroke-linecap: round;
	}

	.clear-system-plate__particles circle {
		fill: rgb(10 14 25 / 0.22);
	}

	.clear-system-plate__edge {
		fill: none;
		stroke: rgb(10 14 25 / 0.24);
		stroke-width: 0.36;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.clear-system-plate__edge--signal {
		stroke: rgb(0 72 255 / 0.78);
		stroke-width: 0.44;
	}

	.clear-system-plate__edge--success {
		stroke: rgb(45 143 67 / 0.7);
		stroke-width: 0.42;
	}

	.clear-system-plate__edge--warning {
		stroke: rgb(176 113 0 / 0.68);
		stroke-width: 0.42;
	}

	.clear-system-plate__node-halo {
		fill: rgb(0 72 255 / 0.06);
		stroke: rgb(0 72 255 / 0.18);
		stroke-width: 0.22;
	}

	.clear-system-plate__selection {
		fill: none;
		stroke: rgb(10 14 25 / 0.32);
		stroke-width: 0.2;
		stroke-dasharray: 1.1 0.9;
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
		fill: rgb(0 72 255 / 0.92);
		stroke: rgb(0 72 255 / 0.92);
	}

	.clear-system-plate__node--success {
		fill: rgb(45 143 67 / 0.92);
		stroke: rgb(45 143 67 / 0.92);
	}

	.clear-system-plate__node--warning {
		fill: rgb(215 147 0 / 0.9);
		stroke: rgb(176 113 0 / 0.9);
	}

	.clear-system-plate__node--active {
		stroke: #ffffff;
		stroke-width: 0.92;
		filter: drop-shadow(0 0 0.14rem rgb(0 72 255 / 0.28));
	}

	.clear-system-plate__node-core {
		fill: rgb(255 255 255 / 0.72);
		pointer-events: none;
	}

	.clear-system-plate__label rect {
		fill: rgb(255 255 255 / 0.76);
		stroke: rgb(10 14 25 / 0.16);
		stroke-width: 0.12;
	}

	.clear-system-plate text {
		fill: var(--color-clear-grey, #636363);
		font-family: var(--font-mono);
		font-size: 1.74px;
		font-weight: 500;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.clear-system-plate__label text {
		fill: rgb(10 14 25 / 0.62);
		font-size: 1.62px;
	}

	.clear-system-plate__trace path {
		fill: none;
		stroke: rgb(10 14 25 / 0.2);
		stroke-width: 0.24;
	}

	.clear-system-plate__trace text {
		fill: rgb(10 14 25 / 0.46);
		font-size: 1.35px;
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
