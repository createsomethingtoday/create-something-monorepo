# Canon Diagrams

Stable diagram components turn system state, comparisons, sequences, and relationships into
auditable visual artifacts. Use them when a claim needs a concrete picture of data, flow, timing,
or tradeoffs.

## Examples

```svelte
<script lang="ts">
	import {
		BarChart,
		CanvasDiagram,
		FlowDiagram,
		KnowledgeGraphCanvas,
		LineChart,
		Matrix,
		PieChart,
		Timeline
	} from '@create-something/canon/diagrams';

	const deliveryBars = {
		data: [
			{ label: 'Mapped', value: 12 },
			{ label: 'Reviewed', value: 9 },
			{ label: 'Shipped', value: 7 }
		]
	};

	const releaseFlow = {
		nodes: [
			{ id: 'map', label: 'Map', type: 'start' },
			{ id: 'review', label: 'Review', type: 'process' },
			{ id: 'ship', label: 'Ship', type: 'end' }
		],
		edges: [
			{ from: 'map', to: 'review', label: 'policy' },
			{ from: 'review', to: 'ship', label: 'receipt' }
		]
	};

	const trend = {
		series: [{ label: 'Evidence', values: [3, 5, 8, 13] }],
		labels: ['Mon', 'Tue', 'Wed', 'Thu']
	};

	const share = {
		segments: [
			{ label: 'Database', value: 40 },
			{ label: 'Automation', value: 35 },
			{ label: 'Judgment', value: 25 }
		]
	};

	const matrix = {
		rows: ['Low risk', 'High risk'],
		columns: ['Automated', 'Reviewed'],
		cells: [
			{ row: 0, column: 0, value: 'Run' },
			{ row: 1, column: 1, value: 'Approve' }
		]
	};

	const timeline = {
		events: [
			{ date: '09:00', label: 'Map' },
			{ date: '10:30', label: 'Review', highlight: true },
			{ date: '12:00', label: 'Ship' }
		]
	};

	const graph = {
		nodes: [
			{ id: 'policy', label: 'Policy' },
			{ id: 'tool', label: 'Tool' },
			{ id: 'receipt', label: 'Receipt' }
		],
		edges: [
			{ from: 'policy', to: 'tool' },
			{ from: 'tool', to: 'receipt' }
		]
	};
</script>

<BarChart data={deliveryBars} config={{ title: 'Delivery evidence' }} />
<FlowDiagram data={releaseFlow} config={{ title: 'Release flow' }} />
<LineChart data={trend} config={{ title: 'Evidence trend' }} />
<PieChart data={share} config={{ title: 'Three-tier mix' }} />
<Matrix data={matrix} config={{ title: 'Decision matrix' }} />
<Timeline data={timeline} config={{ title: 'Handoff sequence' }} />
<KnowledgeGraphCanvas data={graph} config={{ title: 'Policy graph' }} />
<CanvasDiagram width={640} height={360} title="System sketch" />
```

## Accessibility Evidence

- Pair diagram usage with nearby text summaries for screen readers and non-visual contexts.
- Keep labels short enough to remain legible at mobile widths.
- Use chart colors as reinforcement, not as the only carrier of meaning.
- Prefer `config.title` and adjacent captions so the artifact has a stable accessible name.
