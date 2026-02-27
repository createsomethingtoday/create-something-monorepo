<script lang="ts">
  import { AnimatedBeam, BlurFade, BorderBeam } from '@create-something/canon/magicui';

  // Define SVG coordinate space for accurate path routing that scales responsively
  const SVG_WIDTH = 800;
  const SVG_HEIGHT = 400;

  // Central Hub coordinates
  const hubX = 400;
  const hubY = 200;

  // Column 1: Initiators
  const initiators = [
    { id: 'ai', name: 'Client LLM', x: 100, y: 100 },
    { id: 'slack', name: 'Slack Agent', x: 100, y: 300 }
  ];

  // Column 3: Target Services
  const services = [
    { id: 'notion', name: 'Notion Sync', x: 700, y: 80 },
    { id: 'db', name: 'Cloudflare D1', x: 700, y: 200 },
    { id: 'custom', name: 'Custom Workflow', x: 700, y: 320 }
  ];

  // Theme colors fitting canon/agency
  const primaryBeam = 'rgba(96, 165, 250, 0.9)'; // Blue
  const secondaryBeam = 'rgba(167, 139, 250, 0.4)'; // Purple
</script>

<div class="mcp-viz-container">
  <div class="mcp-grid-box" style="width: {SVG_WIDTH}px; height: {SVG_HEIGHT}px;">
    <!-- 1. The Animated Beams -->

    <!-- Left to Center (Initiators to Hub) -->
    {#each initiators as init, i}
      <AnimatedBeam
        fromX={init.x}
        fromY={init.y}
        toX={hubX}
        toY={hubY}
        curvature={40}
        duration={3}
        delay={i * 0.5}
        pathWidth={2}
        gradientStartColor={secondaryBeam}
        gradientStopColor={primaryBeam}
      />
    {/each}

    <!-- Center to Right (Hub to Services) -->
    {#each services as serv, i}
      <AnimatedBeam
        fromX={hubX}
        fromY={hubY}
        toX={serv.x}
        toY={serv.y}
        curvature={-40}
        duration={3}
        delay={1.5 + i * 0.4}
        pathWidth={2}
        gradientStartColor={primaryBeam}
        gradientStopColor={secondaryBeam}
      />
    {/each}

    <!-- 2. The Nodes Rendering -->

    <!-- Initiators (Column 1) -->
    {#each initiators as init, i}
      <BlurFade delay={0.2 + i * 0.2}>
        <div class="node initiator-node" style="left: {init.x}px; top: {init.y}px;">
          {init.name}
        </div>
      </BlurFade>
    {/each}

    <!-- Central Hub MCP (Column 2) -->
    <BlurFade delay={1}>
      <div class="node hub-node" style="left: {hubX}px; top: {hubY}px;">
        <BorderBeam size={120} duration={8} colorFrom={primaryBeam} colorTo={secondaryBeam} />
        <div class="hub-lockup">
          <span class="hub-title">Hub MCP</span>
          <span class="hub-sub">Constraint Layer</span>
        </div>
      </div>
    </BlurFade>

    <!-- Target Services (Column 3) -->
    {#each services as serv, i}
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
    /* Scale appropriately on smaller screens while retaining exact SVG beam coordinates */
    transform: scale(min(1, calc((100vw - 3rem) / 850)));
    transform-origin: center;
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
</style>
