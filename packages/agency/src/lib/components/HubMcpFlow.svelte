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
    policy: { x: number; y: number };
    initiators: FlowNode[];
    services: FlowNode[];
  };

  const decisionStates = [
    { id: 'allow', label: 'Allow', tone: 'allow' },
    { id: 'review', label: 'Review', tone: 'review' },
    { id: 'block', label: 'Block', tone: 'block' }
  ] as const;

  const DESKTOP_LAYOUT: FlowLayout = {
    width: 800,
    height: 430,
    hub: { x: 400, y: 150 },
    policy: { x: 400, y: 275 },
    initiators: [
      { id: 'ai', name: 'Client LLM', x: 110, y: 110, curvature: 36 },
      { id: 'slack', name: 'Slack Agent', x: 110, y: 320, curvature: 44 }
    ],
    services: [
      { id: 'notion', name: 'Notion Sync', x: 690, y: 90, curvature: -46 },
      { id: 'db', name: 'Cloudflare D1', x: 690, y: 215, curvature: -24 },
      { id: 'custom', name: 'Custom Workflow', x: 690, y: 340, curvature: -46 }
    ]
  };

  const COMPACT_LAYOUT: FlowLayout = {
    width: 320,
    height: 610,
    hub: { x: 160, y: 188 },
    policy: { x: 160, y: 332 },
    initiators: [
      { id: 'ai', name: 'Client LLM', x: 96, y: 78, curvature: 52 },
      { id: 'slack', name: 'Slack Agent', x: 224, y: 78, curvature: 52 }
    ],
    services: [
      { id: 'notion', name: 'Notion Sync', x: 92, y: 504, curvature: -50 },
      { id: 'db', name: 'Cloudflare D1', x: 160, y: 568, curvature: -24 },
      { id: 'custom', name: 'Custom Workflow', x: 228, y: 504, curvature: -50 }
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

    <!-- Hub to Policy -->
    <AnimatedBeam
      fromX={layout.hub.x}
      fromY={layout.hub.y}
      toX={layout.policy.x}
      toY={layout.policy.y}
      duration={2}
      delay={0.9}
      pathWidth={2.25}
      gradientStartColor={primaryBeam}
      gradientStopColor="rgba(255, 255, 255, 0.8)"
    />

    <!-- Policy to Services -->
    {#each layout.services as serv, i}
      <AnimatedBeam
        fromX={layout.policy.x}
        fromY={layout.policy.y}
        toX={serv.x}
        toY={serv.y}
        curvature={serv.curvature}
        duration={2.6}
        delay={1.45 + i * 0.3}
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
    <BlurFade delay={0.8}>
      <div class="node hub-node" style="left: {layout.hub.x}px; top: {layout.hub.y}px;">
        <div class="flow-kicker">Routes</div>
        <div class="hub-lockup">
          <span class="hub-title">Hub MCP</span>
          <span class="hub-sub">Tenant, alias, proxy</span>
        </div>
      </div>
    </BlurFade>

    <BlurFade delay={1.15}>
      <div class="node policy-node" style="left: {layout.policy.x}px; top: {layout.policy.y}px;">
        <BorderBeam size={150} duration={8} colorFrom={primaryBeam} colorTo={secondaryBeam} />
        <div class="flow-kicker">Decides</div>
        <div class="hub-lockup">
          <span class="policy-title">Control Layer</span>
          <span class="hub-sub">Trust boundary</span>
        </div>
        <div class="decision-row">
          {#each decisionStates as decision}
            <span class="decision-pill {decision.tone}">{decision.label}</span>
          {/each}
        </div>
      </div>
    </BlurFade>

    <!-- Target Services (Column 3) -->
    {#each layout.services as serv, i}
      <BlurFade delay={1.55 + i * 0.16}>
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
    width: 168px;
    min-height: 96px;
    padding: 1rem 1.25rem;
    background: rgba(10, 10, 12, 0.92);
    border: 1px solid rgba(96, 165, 250, 0.22);
    border-radius: var(--radius-2xl, 24px);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow:
      0 0 30px rgba(96, 165, 250, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    text-align: center;
    flex-direction: column;
    gap: 0.4rem;
  }

  .policy-node {
    width: 188px;
    min-height: 132px;
    padding: 1rem 1rem 0.95rem;
    background:
      linear-gradient(180deg, rgba(11, 15, 26, 0.96), rgba(9, 11, 16, 0.94)),
      rgba(10, 10, 12, 0.95);
    border: 1px solid rgba(96, 165, 250, 0.26);
    border-radius: var(--radius-2xl, 24px);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    box-shadow:
      0 0 44px rgba(96, 165, 250, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
    text-align: center;
    flex-direction: column;
    gap: 0.55rem;
  }

  .flow-kicker {
    font-size: 0.625rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.38);
  }

  .policy-title {
    font-weight: var(--font-bold, 700);
    font-size: 1.25rem;
    color: var(--color-fg-primary, #ffffff);
    letter-spacing: 0.12em;
    text-transform: uppercase;
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

  .decision-row {
    display: flex;
    justify-content: center;
    gap: 0.38rem;
    flex-wrap: wrap;
  }

  .decision-pill {
    padding: 0.26rem 0.52rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.64rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: rgba(255, 255, 255, 0.04);
  }

  .decision-pill.allow {
    color: rgba(110, 231, 183, 0.96);
    border-color: rgba(52, 211, 153, 0.26);
    background: rgba(6, 78, 59, 0.26);
  }

  .decision-pill.review {
    color: rgba(253, 224, 71, 0.95);
    border-color: rgba(250, 204, 21, 0.22);
    background: rgba(113, 63, 18, 0.22);
  }

  .decision-pill.block {
    color: rgba(251, 146, 146, 0.95);
    border-color: rgba(248, 113, 113, 0.22);
    background: rgba(127, 29, 29, 0.22);
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
    width: 148px;
    min-height: 90px;
    padding: 0.85rem 0.9rem;
  }

  .mcp-viz-container.compact .policy-node {
    width: 166px;
    min-height: 124px;
    padding: 0.85rem 0.85rem 0.8rem;
  }

  .mcp-viz-container.compact .hub-title {
    font-size: 1.2rem;
  }

  .mcp-viz-container.compact .policy-title {
    font-size: 1rem;
    letter-spacing: 0.1em;
  }

  .mcp-viz-container.compact .hub-sub {
    font-size: 0.7rem;
  }

  .mcp-viz-container.compact .decision-row {
    gap: 0.3rem;
  }

  .mcp-viz-container.compact .decision-pill {
    font-size: 0.58rem;
    padding: 0.22rem 0.45rem;
  }
</style>
