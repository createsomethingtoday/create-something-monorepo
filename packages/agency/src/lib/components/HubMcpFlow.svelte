<script lang="ts">
  import { AnimatedBeam, BlurFade, BorderBeam } from '@create-something/canon/magicui';

  type FlowNode = {
    id: string;
    name: string;
    x: number;
    y: number;
    curvature: number;
  };

  type FlowLayout = {
    width: number;
    height: number;
    hub: { x: number; y: number };
    initiators: FlowNode[];
    services: FlowNode[];
  };

  const DESKTOP_LAYOUT: FlowLayout = {
    width: 800,
    height: 400,
    hub: { x: 400, y: 200 },
    initiators: [
      { id: 'ai', name: 'Client LLM', x: 100, y: 100, curvature: 40 },
      { id: 'slack', name: 'Slack Agent', x: 100, y: 300, curvature: 40 }
    ],
    services: [
      { id: 'notion', name: 'Notion Sync', x: 700, y: 80, curvature: -40 },
      { id: 'db', name: 'Cloudflare D1', x: 700, y: 200, curvature: -40 },
      { id: 'custom', name: 'Custom Workflow', x: 700, y: 320, curvature: -40 }
    ]
  };

  const COMPACT_LAYOUT: FlowLayout = {
    width: 320,
    height: 520,
    hub: { x: 160, y: 240 },
    initiators: [
      { id: 'ai', name: 'Client LLM', x: 96, y: 88, curvature: 44 },
      { id: 'slack', name: 'Slack Agent', x: 224, y: 136, curvature: 44 }
    ],
    services: [
      { id: 'notion', name: 'Notion Sync', x: 92, y: 394, curvature: -44 },
      { id: 'db', name: 'Cloudflare D1', x: 160, y: 468, curvature: -24 },
      { id: 'custom', name: 'Custom Workflow', x: 228, y: 394, curvature: -44 }
    ]
  };

  let containerWidth = $state(DESKTOP_LAYOUT.width);

  const isCompact = $derived(containerWidth < 700);
  const layout = $derived(isCompact ? COMPACT_LAYOUT : DESKTOP_LAYOUT);

  // Theme colors fitting canon/agency
  const primaryBeam = 'rgba(96, 165, 250, 0.9)'; // Blue
  const secondaryBeam = 'rgba(167, 139, 250, 0.4)'; // Purple
</script>

<div class="mcp-viz-container" bind:clientWidth={containerWidth} class:compact={isCompact}>
  <div class="mcp-grid-box" style="width: {layout.width}px; height: {layout.height}px;">
    <!-- 1. The Animated Beams -->

    <!-- Left to Center (Initiators to Hub) -->
    {#each layout.initiators as init, i}
      <AnimatedBeam
        fromX={init.x}
        fromY={init.y}
        toX={layout.hub.x}
        toY={layout.hub.y}
        curvature={init.curvature}
        duration={3}
        delay={i * 0.5}
        pathWidth={2}
        gradientStartColor={secondaryBeam}
        gradientStopColor={primaryBeam}
      />
    {/each}

    <!-- Center to Right (Hub to Services) -->
    {#each layout.services as serv, i}
      <AnimatedBeam
        fromX={layout.hub.x}
        fromY={layout.hub.y}
        toX={serv.x}
        toY={serv.y}
        curvature={serv.curvature}
        duration={3}
        delay={1.5 + i * 0.4}
        pathWidth={2}
        gradientStartColor={primaryBeam}
        gradientStopColor={secondaryBeam}
      />
    {/each}

    <!-- 2. The Nodes Rendering -->

    <!-- Initiators (Column 1) -->
    {#each layout.initiators as init, i}
      <BlurFade delay={0.2 + i * 0.2}>
        <div class="node initiator-node" style="left: {init.x}px; top: {init.y}px;">
          {init.name}
        </div>
      </BlurFade>
    {/each}

    <!-- Central Hub MCP (Column 2) -->
    <BlurFade delay={1}>
      <div class="node hub-node" style="left: {layout.hub.x}px; top: {layout.hub.y}px;">
        <BorderBeam size={120} duration={8} colorFrom={primaryBeam} colorTo={secondaryBeam} />
        <div class="hub-lockup">
          <span class="hub-title">Hub MCP</span>
          <span class="hub-sub">Policy OS</span>
        </div>
      </div>
    </BlurFade>

    <!-- Target Services (Column 3) -->
    {#each layout.services as serv, i}
      <BlurFade delay={1.5 + i * 0.2}>
        <div class="node service-node" style="left: {serv.x}px; top: {serv.y}px;">
          {serv.name}
        </div>
      </BlurFade>
    {/each}
  </div>
</div>

<style>
  .mcp-viz-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--space-8, 3rem) 0;
    background: radial-gradient(ellipse at center, rgba(30, 30, 40, 0.2) 0%, transparent 70%);
    border-radius: var(--radius-2xl, 24px);
    overflow: hidden;
    width: 100%;
    border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05));
  }

  .mcp-grid-box {
    position: relative;
    width: 100%;
    flex: 0 0 auto;
  }

  /* Base node styles */
  .node {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    /* Ensure text isn't selectable so it acts like a graphic */
    user-select: none;
  }

  /* Common styles for end-nodes */
  .initiator-node,
  .service-node {
    background: rgba(15, 15, 20, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
    border-radius: var(--radius-lg, 8px);
    font-family: var(--font-mono, monospace);
    font-size: var(--text-body-sm, 0.875rem);
    color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    white-space: nowrap;
  }

  /* Central Node */
  .hub-node {
    width: 140px;
    height: 140px;
    background: rgba(10, 10, 12, 0.95);
    border: 1px solid rgba(96, 165, 250, 0.3);
    border-radius: var(--radius-2xl, 24px);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow:
      0 0 40px rgba(96, 165, 250, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    text-align: center;
  }

  .hub-lockup {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .hub-title {
    font-weight: var(--font-bold, 700);
    font-size: var(--text-h3, 1.5rem);
    color: var(--color-fg-primary, #ffffff);
    letter-spacing: var(--tracking-tight, -0.015em);
  }

  .hub-sub {
    font-size: var(--text-caption, 0.75rem);
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .mcp-viz-container.compact {
    padding: var(--space-6, 2rem) var(--space-3, 0.75rem);
  }

  .mcp-viz-container.compact .initiator-node,
  .mcp-viz-container.compact .service-node {
    padding: 0.5rem 0.875rem;
    font-size: 0.8125rem;
    white-space: normal;
    line-height: 1.25;
    text-align: center;
    max-width: 8.5rem;
  }

  .mcp-viz-container.compact .hub-node {
    width: 132px;
    height: 132px;
  }

  .mcp-viz-container.compact .hub-title {
    font-size: 1.375rem;
  }
</style>
