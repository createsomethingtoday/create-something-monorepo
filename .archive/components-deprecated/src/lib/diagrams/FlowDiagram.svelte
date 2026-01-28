<script lang="ts">
  import type { DiagramConfig, FlowDiagramData, FlowNode, FlowEdge } from './types.js';
  import { theme, getAccentColor } from './theme.js';

  interface Props {
    data: FlowDiagramData;
    config?: DiagramConfig;
  }

  let { data, config = {} }: Props = $props();

  const {
    width = 800,
    height = 400,
    title,
    subtitle,
    property = 'io',
    branded = false,
  } = config;

  const { nodes, edges, direction = 'horizontal' } = data;

  // Layout constants
  const NODE_WIDTH = 140;
  const NODE_HEIGHT = 60;
  const PADDING = 42;

  // Calculate node positions
  function layoutNodes(nodes: FlowNode[]): (FlowNode & { x: number; y: number })[] {
    const count = nodes.length;
    const isHorizontal = direction === 'horizontal';

    return nodes.map((node, i) => {
      const positions = isHorizontal
        ? distribute(PADDING + NODE_WIDTH / 2, width - PADDING - NODE_WIDTH / 2, count)
        : distribute(PADDING + NODE_HEIGHT / 2 + 60, height - PADDING - NODE_HEIGHT / 2, count);

      return {
        ...node,
        x: isHorizontal ? positions[i] : width / 2,
        y: isHorizontal ? height / 2 : positions[i],
      };
    });
  }

  function distribute(start: number, end: number, count: number): number[] {
    if (count === 1) return [(start + end) / 2];
    const step = (end - start) / (count - 1);
    return Array.from({ length: count }, (_, i) => start + i * step);
  }

  // Get connection points for edges
  function getEdgePath(edge: FlowEdge, layoutedNodes: (FlowNode & { x: number; y: number })[]) {
    const fromNode = layoutedNodes.find((n) => n.id === edge.from);
    const toNode = layoutedNodes.find((n) => n.id === edge.to);
    if (!fromNode || !toNode) return null;

    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;

    let x1: number, y1: number, x2: number, y2: number;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      x1 = fromNode.x + (dx > 0 ? NODE_WIDTH / 2 : -NODE_WIDTH / 2);
      y1 = fromNode.y;
      x2 = toNode.x + (dx > 0 ? -NODE_WIDTH / 2 : NODE_WIDTH / 2);
      y2 = toNode.y;
    } else {
      // Vertical connection
      x1 = fromNode.x;
      y1 = fromNode.y + (dy > 0 ? NODE_HEIGHT / 2 : -NODE_HEIGHT / 2);
      x2 = toNode.x;
      y2 = toNode.y + (dy > 0 ? -NODE_HEIGHT / 2 : NODE_HEIGHT / 2);
    }

    return { x1, y1, x2, y2, label: edge.label, style: edge.style };
  }

  // Shape path generators
  function getDiamondPath(x: number, y: number, w: number, h: number): string {
    const hw = w / 2;
    const hh = h / 2;
    return `M${x},${y - hh} L${x + hw},${y} L${x},${y + hh} L${x - hw},${y} Z`;
  }

  $effect(() => {
    layoutedNodes = layoutNodes(nodes);
  });

  let layoutedNodes = $state(layoutNodes(nodes));
  const accentColor = getAccentColor(property);
</script>

<svg
  {width}
  {height}
  viewBox="0 0 {width} {height}"
  class="diagram flow-diagram"
  xmlns="http://www.w3.org/2000/svg"
>
  <!-- Background -->
  <rect {width} {height} class="bg" />

  <!-- Arrow marker -->
  <defs>
    <marker
      id="arrow-{property}"
      markerWidth="8"
      markerHeight="8"
      refX="7"
      refY="4"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <path d="M0,0 L0,8 L8,4 z" class="arrow-head" />
    </marker>
  </defs>

  <!-- Title -->
  {#if title}
    <text x={width / 2} y={PADDING} class="title" text-anchor="middle">{title}</text>
  {/if}

  {#if subtitle}
    <text x={width / 2} y={PADDING + 24} class="subtitle" text-anchor="middle">{subtitle}</text>
  {/if}

  <!-- Edges -->
  {#each edges as edge}
    {@const path = getEdgePath(edge, layoutedNodes)}
    {#if path}
      <line
        x1={path.x1}
        y1={path.y1}
        x2={path.x2}
        y2={path.y2}
        class="edge"
        class:dashed={edge.style === 'dashed'}
        class:dotted={edge.style === 'dotted'}
        marker-end="url(#arrow-{property})"
      />
      {#if path.label}
        <text
          x={(path.x1 + path.x2) / 2}
          y={(path.y1 + path.y2) / 2 - 8}
          class="edge-label"
          text-anchor="middle"
        >
          {path.label}
        </text>
      {/if}
    {/if}
  {/each}

  <!-- Nodes -->
  {#each layoutedNodes as node}
    <g class="node">
      {#if node.shape === 'circle'}
        <circle cx={node.x} cy={node.y} r={Math.min(NODE_WIDTH, NODE_HEIGHT) / 2} class="node-shape" />
      {:else if node.shape === 'diamond'}
        <path d={getDiamondPath(node.x, node.y, NODE_WIDTH, NODE_HEIGHT)} class="node-shape" />
      {:else if node.shape === 'cylinder'}
        <ellipse cx={node.x} cy={node.y - NODE_HEIGHT / 2 + 8} rx={NODE_WIDTH / 2} ry={8} class="node-shape" />
        <rect
          x={node.x - NODE_WIDTH / 2}
          y={node.y - NODE_HEIGHT / 2 + 8}
          width={NODE_WIDTH}
          height={NODE_HEIGHT - 16}
          class="node-shape cylinder-body"
        />
        <ellipse cx={node.x} cy={node.y + NODE_HEIGHT / 2 - 8} rx={NODE_WIDTH / 2} ry={8} class="node-shape" />
      {:else}
        <rect
          x={node.x - NODE_WIDTH / 2}
          y={node.y - NODE_HEIGHT / 2}
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx="8"
          class="node-shape"
        />
      {/if}

      <text x={node.x} y={node.sublabel ? node.y - 6 : node.y} class="node-label" text-anchor="middle" dominant-baseline="middle">
        {node.label}
      </text>

      {#if node.sublabel}
        <text x={node.x} y={node.y + 10} class="node-sublabel" text-anchor="middle" dominant-baseline="middle">
          {node.sublabel}
        </text>
      {/if}
    </g>
  {/each}

  <!-- Branding -->
  {#if branded}
    <text x={width - PADDING} y={height - 12} class="branding" text-anchor="end">
      createsomething.{property}
    </text>
  {/if}
</svg>

<style>
  .diagram {
    font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  }

  .bg {
    fill: var(--color-bg-pure, #000000);
  }

  .title {
    fill: var(--color-fg-primary, #ffffff);
    font-size: var(--text-h2, 1.5rem);
    font-weight: 600;
  }

  .subtitle {
    fill: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-body-sm, 0.875rem);
  }

  .edge {
    stroke: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
    stroke-width: 1.5;
    fill: none;
  }

  .edge.dashed {
    stroke-dasharray: 8, 4;
  }

  .edge.dotted {
    stroke-dasharray: 2, 4;
  }

  .edge-label {
    fill: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-caption, 0.75rem);
  }

  .arrow-head {
    fill: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
  }

  .node-shape {
    fill: var(--color-bg-subtle, #1a1a1a);
    stroke: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
    stroke-width: 1.5;
  }

  .cylinder-body {
    stroke: none;
  }

  .node-label {
    fill: var(--color-fg-primary, #ffffff);
    font-size: var(--text-body-sm, 0.875rem);
    font-weight: 500;
  }

  .node-sublabel {
    fill: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-caption, 0.75rem);
  }

  .branding {
    fill: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
    font-size: var(--text-caption, 0.75rem);
  }
</style>
