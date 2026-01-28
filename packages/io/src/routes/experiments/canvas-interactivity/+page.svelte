<script lang="ts">
	/**
	 * Canvas Interactivity Showcase
	 *
	 * Demonstrates the four new canvas-based interactive components:
	 * 1. KnowledgeGraphCanvas - Force-directed graph for large datasets
	 * 2. TimelineEditor - Keyframe animation editor
	 * 3. RealtimeChart - Live-updating data visualization
	 * 4. CanvasDiagram - Exportable interactive diagrams
	 */

	import { SEO } from '@create-something/canon';
	import {
		KnowledgeGraphCanvas,
		CanvasDiagram,
		type GraphNode,
		type DiagramShape
	} from '@create-something/canon/diagrams';
	import { TimelineEditor } from '@create-something/canon/interactive';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { experiment } = data;

	// Demo data for Knowledge Graph
	const graphNodes = Array.from({ length: 50 }, (_, i) => ({
		id: `node-${i}`,
		label: `Node ${i}`,
		type: (['concept', 'entity', 'relation', 'document'] as const)[i % 4],
		weight: Math.random() * 2 + 0.5
	}));

	const graphEdges = Array.from({ length: 80 }, (_, i) => ({
		source: `node-${Math.floor(Math.random() * 50)}`,
		target: `node-${Math.floor(Math.random() * 50)}`,
		type: (['dependency', 'reference', 'contains', 'related'] as const)[i % 4]
	})).filter((e) => e.source !== e.target);

	// Demo data for Timeline Editor
	let timelineTracks = $state([
		{
			id: 'position',
			name: 'Position X',
			type: 'position' as const,
			keyframes: [
				{ id: 'kf1', frame: 0, value: 0, easing: 'ease-out' as const },
				{ id: 'kf2', frame: 30, value: 100, easing: 'ease-in-out' as const },
				{ id: 'kf3', frame: 90, value: 200, easing: 'linear' as const }
			]
		},
		{
			id: 'opacity',
			name: 'Opacity',
			type: 'opacity' as const,
			keyframes: [
				{ id: 'kf4', frame: 0, value: 0 },
				{ id: 'kf5', frame: 15, value: 1 },
				{ id: 'kf6', frame: 75, value: 1 },
				{ id: 'kf7', frame: 90, value: 0 }
			]
		},
		{
			id: 'scale',
			name: 'Scale',
			type: 'scale' as const,
			keyframes: [
				{ id: 'kf8', frame: 0, value: 0.5, easing: 'spring' as const },
				{ id: 'kf9', frame: 45, value: 1.2 },
				{ id: 'kf10', frame: 90, value: 1 }
			]
		}
	]);

	let currentFrame = $state(0);

	// Demo data for Canvas Diagram
	const diagramShapes = [
		{
			id: 'rect1',
			type: 'rect' as const,
			x: 150,
			y: 150,
			width: 120,
			height: 80,
			fill: 'var(--color-data-1)',
			cornerRadius: 8,
			draggable: true
		},
		{
			id: 'circle1',
			type: 'circle' as const,
			x: 350,
			y: 150,
			radius: 50,
			fill: 'var(--color-data-2)',
			draggable: true
		},
		{
			id: 'arrow1',
			type: 'arrow' as const,
			x: 210,
			y: 150,
			x2: 300,
			y2: 150,
			stroke: 'var(--color-fg-muted)',
			strokeWidth: 2,
			headSize: 12
		},
		{
			id: 'text1',
			type: 'text' as const,
			x: 150,
			y: 250,
			text: 'Input',
			fill: 'var(--color-fg-primary)',
			fontSize: 14
		},
		{
			id: 'text2',
			type: 'text' as const,
			x: 350,
			y: 250,
			text: 'Output',
			fill: 'var(--color-fg-primary)',
			fontSize: 14
		},
		{
			id: 'rect2',
			type: 'rect' as const,
			x: 550,
			y: 150,
			width: 100,
			height: 100,
			fill: 'var(--color-data-3)',
			rotation: 45,
			draggable: true
		},
		{
			id: 'arrow2',
			type: 'arrow' as const,
			x: 400,
			y: 150,
			x2: 490,
			y2: 150,
			stroke: 'var(--color-fg-muted)',
			strokeWidth: 2,
			headSize: 12
		}
	];

	// Selected states
	let selectedGraphNode = $state<GraphNode | null>(null);
	let selectedDiagramShape = $state<DiagramShape | null>(null);

	// Timeline event handlers
	function handleFrameChange(frame: number) {
		currentFrame = frame;
	}

	function handleKeyframeAdd(trackId: string, frame: number) {
		const track = timelineTracks.find((t) => t.id === trackId);
		if (track) {
			track.keyframes = [
				...track.keyframes,
				{ id: `kf-${Date.now()}`, frame, value: 0.5 }
			];
			timelineTracks = [...timelineTracks];
		}
	}

	function handleKeyframeMove(trackId: string, keyframeId: string, newFrame: number) {
		const track = timelineTracks.find((t) => t.id === trackId);
		if (track) {
			const kf = track.keyframes.find((k) => k.id === keyframeId);
			if (kf) {
				kf.frame = newFrame;
				timelineTracks = [...timelineTracks];
			}
		}
	}

	function handleKeyframeDelete(trackId: string, keyframeId: string) {
		const track = timelineTracks.find((t) => t.id === trackId);
		if (track) {
			track.keyframes = track.keyframes.filter((k) => k.id !== keyframeId);
			timelineTracks = [...timelineTracks];
		}
	}
</script>

<SEO
	title="{experiment.title} | Experiments | CREATE SOMETHING"
	description={experiment.description}
	keywords="canvas, interactive components, knowledge graph, timeline editor, diagrams, SvelteKit"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Experiments', url: 'https://createsomething.io/experiments' },
		{ name: 'Canvas Interactivity', url: 'https://createsomething.io/experiments/canvas-interactivity' }
	]}
/>

<div class="experiment-page">
	<header class="page-header">
		<h1>Canvas Interactivity</h1>
		<p class="subtitle">
			High-performance canvas-based interactive components for SvelteKit.
			Demonstrating force-directed graphs, animation timelines, and exportable diagrams.
		</p>
	</header>

	<section class="demo-section">
		<h2>1. Knowledge Graph Visualizer</h2>
		<p class="description">
			Force-directed graph using Barnes-Hut approximation for O(n log n) performance.
			Supports 1000+ nodes with smooth interactions. Pan, zoom, and drag nodes.
		</p>

		<div class="demo-container">
			<KnowledgeGraphCanvas
				nodes={graphNodes}
				edges={graphEdges}
				width={800}
				height={500}
				onNodeClick={(node: GraphNode | null) => (selectedGraphNode = node)}
				onNodeHover={() => {}}
			/>
		</div>

		{#if selectedGraphNode}
			<div class="selection-info">
				Selected: <strong>{selectedGraphNode.label}</strong> ({selectedGraphNode.id})
			</div>
		{/if}

		<div class="code-example">
			<pre><code>{`<KnowledgeGraphCanvas
  nodes={graphNodes}
  edges={graphEdges}
  width={800}
  height={500}
  onNodeClick={(node) => console.log(node)}
/>`}</code></pre>
		</div>
	</section>

	<section class="demo-section">
		<h2>2. Animation Timeline Editor</h2>
		<p class="description">
			Canvas-based keyframe editor for motion-studio integration.
			Double-click to add keyframes, drag to move, Delete key to remove.
			Arrow keys navigate frames.
		</p>

		<div class="demo-container">
			<TimelineEditor
				tracks={timelineTracks}
				totalFrames={120}
				fps={30}
				{currentFrame}
				onFrameChange={handleFrameChange}
				onKeyframeAdd={handleKeyframeAdd}
				onKeyframeMove={handleKeyframeMove}
				onKeyframeDelete={handleKeyframeDelete}
			/>
		</div>

		<div class="timeline-preview">
			<div class="preview-label">Preview (frame {currentFrame}):</div>
			<div
				class="preview-box"
				style="
					transform: translateX({(currentFrame / 120) * 200}px) scale({1 + (currentFrame / 120) * 0.2});
					opacity: {Math.sin((currentFrame / 120) * Math.PI)};
				"
			></div>
		</div>

		<div class="code-example">
			<pre><code>{`<TimelineEditor
  tracks={tracks}
  totalFrames={120}
  fps={30}
  currentFrame={currentFrame}
  onFrameChange={(f) => currentFrame = f}
  onKeyframeAdd={handleAdd}
/>`}</code></pre>
		</div>
	</section>

	<section class="demo-section">
		<h2>3. Interactive Canvas Diagram</h2>
		<p class="description">
			Create and export diagrams with shapes, arrows, and text.
			Supports PNG/SVG export and clipboard copy. Drag shapes to reposition.
		</p>

		<div class="demo-container">
			<CanvasDiagram
				shapes={diagramShapes}
				width={700}
				height={350}
				showGrid={true}
				gridSize={25}
				snapToGrid={true}
				onShapeSelect={(shape: DiagramShape | null) => (selectedDiagramShape = shape)}
				onShapeMove={(shape: DiagramShape, x: number, y: number) => {
					const s = diagramShapes.find((d) => d.id === shape.id);
					if (s) {
						s.x = x;
						s.y = y;
					}
				}}
			/>
		</div>

		{#if selectedDiagramShape}
			<div class="selection-info">
				Selected shape: <strong>{selectedDiagramShape.id}</strong>
			</div>
		{/if}

		<div class="code-example">
			<pre><code>{`<CanvasDiagram
  shapes={[
    { id: 'rect', type: 'rect', x: 150, y: 150, width: 120, height: 80, fill: 'blue' },
    { id: 'circle', type: 'circle', x: 350, y: 150, radius: 50, fill: 'green' },
    { id: 'arrow', type: 'arrow', x: 210, y: 150, x2: 300, y2: 150 }
  ]}
  width={700}
  height={350}
  showGrid={true}
  snapToGrid={true}
/>`}</code></pre>
		</div>
	</section>

	<section class="benefits-section">
		<h2>Why Canvas for These Components?</h2>

		<div class="benefits-grid">
			<div class="benefit-card">
				<h3>Performance</h3>
				<p>Canvas renders directly to pixels, bypassing DOM overhead. Essential for 60fps animations and large datasets.</p>
			</div>

			<div class="benefit-card">
				<h3>Fine-grained Control</h3>
				<p>Direct pixel manipulation enables custom hit-testing, spatial algorithms (quadtrees), and complex visual effects.</p>
			</div>

			<div class="benefit-card">
				<h3>Svelte 5 Reactivity</h3>
				<p>$state and $effect provide precise control over when canvas redraws happen—no stale closures or dependency arrays.</p>
			</div>

			<div class="benefit-card">
				<h3>Export Capabilities</h3>
				<p>Canvas toDataURL() and toBlob() enable PNG export, clipboard copy, and server-side rendering with node-canvas.</p>
			</div>
		</div>
	</section>
</div>

<style>
	.experiment-page {
		max-width: 900px;
		margin: 0 auto;
		padding: var(--space-xl);
	}

	.page-header {
		margin-bottom: var(--space-2xl);
	}

	h1 {
		font-size: var(--text-display-sm);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 600px;
	}

	.demo-section {
		margin-bottom: var(--space-3xl);
	}

	h2 {
		font-size: var(--text-heading-md);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.description {
		font-size: var(--text-body-md);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	.demo-container {
		margin-bottom: var(--space-md);
	}

	.selection-info {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	.code-example {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.code-example pre {
		margin: 0;
		padding: var(--space-md);
		overflow-x: auto;
	}

	.code-example code {
		font-family: 'SF Mono', 'Menlo', monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.timeline-preview {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-md);
		min-height: 80px;
	}

	.preview-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		min-width: 120px;
	}

	.preview-box {
		width: 40px;
		height: 40px;
		background: var(--color-data-1);
		border-radius: var(--radius-sm);
		transition: none;
	}

	.benefits-section {
		margin-top: var(--space-3xl);
		padding-top: var(--space-2xl);
		border-top: 1px solid var(--color-border-default);
	}

	.benefits-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
		margin-top: var(--space-lg);
	}

	.benefit-card {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.benefit-card h3 {
		font-size: var(--text-body-md);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.benefit-card p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	@media (max-width: 640px) {
		.benefits-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
