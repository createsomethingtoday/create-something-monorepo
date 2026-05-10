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
    control: { x: number; y: number };
    initiators: FlowNode[];
    destinations: FlowNode[];
  };

  type Pill = {
    id: string;
    label: string;
    tone: 'allow' | 'review' | 'block';
  };

  type Props = {
    eyebrow?: string;
    title?: string;
    description?: string;
    caption?: string;
    initiators?: string[];
    destinations?: string[];
    outcomes?: Pill[];
  };

  const DEFAULT_OUTCOMES: Pill[] = [
    { id: 'allow', label: 'Auto-allow', tone: 'allow' },
    { id: 'review', label: 'Approval', tone: 'review' },
    { id: 'block', label: 'Block', tone: 'block' }
  ];

  const DESKTOP_LAYOUT: FlowLayout = {
    width: 820,
    height: 470,
    hub: { x: 410, y: 148 },
    control: { x: 410, y: 300 },
    initiators: [
      { id: 'ai', name: 'AI Tool', x: 120, y: 108, curvature: 38 },
      { id: 'ops', name: 'Ops Inbox', x: 120, y: 228, curvature: 24 },
      { id: 'agent', name: 'Background Agent', x: 120, y: 348, curvature: 42 }
    ],
    destinations: [
      { id: 'crm', name: 'CRM', x: 700, y: 100, curvature: -42 },
      { id: 'erp', name: 'ERP', x: 700, y: 222, curvature: -20 },
      { id: 'workflow', name: 'Workflow Console', x: 700, y: 344, curvature: -42 }
    ]
  };

  const COMPACT_LAYOUT: FlowLayout = {
    width: 340,
    height: 690,
    hub: { x: 170, y: 182 },
    control: { x: 170, y: 364 },
    initiators: [
      { id: 'ai', name: 'AI Tool', x: 95, y: 78, curvature: 60 },
      { id: 'ops', name: 'Ops Inbox', x: 170, y: 116, curvature: 30 },
      { id: 'agent', name: 'Background Agent', x: 245, y: 78, curvature: 60 }
    ],
    destinations: [
      { id: 'crm', name: 'CRM', x: 92, y: 592, curvature: -56 },
      { id: 'erp', name: 'ERP', x: 170, y: 632, curvature: -20 },
      { id: 'workflow', name: 'Workflow Console', x: 248, y: 592, curvature: -56 }
    ]
  };

  let {
    eyebrow = 'Governed Execution',
    title = 'Governed Workflow Console',
    description = 'The tool layer routes work into a console that shows what can run automatically, what needs approval, and what stops with a reason.',
    caption = 'Safe actions run fast. Risky actions route to approval. Disallowed actions stop with a reason.',
    initiators = ['AI Tool', 'Ops Inbox', 'Background Agent'],
    destinations = ['CRM', 'ERP', 'Workflow Console'],
    outcomes = DEFAULT_OUTCOMES
  }: Props = $props();

  let containerWidth = $state(DESKTOP_LAYOUT.width);

  const isCompact = $derived(containerWidth < 720);
  const layout = $derived(isCompact ? COMPACT_LAYOUT : DESKTOP_LAYOUT);

  const flowInitiators = $derived(
    layout.initiators.map((node, index) => ({ ...node, name: initiators[index] ?? node.name }))
  );

  const flowDestinations = $derived(
    layout.destinations.map((node, index) => ({ ...node, name: destinations[index] ?? node.name }))
  );

  const primaryBeam = 'rgba(94, 234, 212, 0.92)';
  const secondaryBeam = 'rgba(96, 165, 250, 0.62)';
</script>

<div class="flow-shell">
  <div class="flow-copy">
    <span class="flow-eyebrow">{eyebrow}</span>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>

  <div class="flow-diagram" bind:clientWidth={containerWidth} class:compact={isCompact}>
    <div class="grid-box" style={`width:${layout.width}px; height:${layout.height}px;`}>
      {#each flowInitiators as initiator, index}
        <AnimatedBeam
          fromX={initiator.x}
          fromY={initiator.y}
          toX={layout.hub.x}
          toY={layout.hub.y}
          curvature={initiator.curvature}
          duration={2.8}
          delay={index * 0.25}
          pathWidth={2}
          gradientStartColor={secondaryBeam}
          gradientStopColor={primaryBeam}
        />
      {/each}

      <AnimatedBeam
        fromX={layout.hub.x}
        fromY={layout.hub.y}
        toX={layout.control.x}
        toY={layout.control.y}
        duration={2.2}
        delay={0.7}
        pathWidth={2.4}
        gradientStartColor={primaryBeam}
        gradientStopColor="rgba(255, 255, 255, 0.84)"
      />

      {#each flowDestinations as destination, index}
        <AnimatedBeam
          fromX={layout.control.x}
          fromY={layout.control.y}
          toX={destination.x}
          toY={destination.y}
          curvature={destination.curvature}
          duration={2.6}
          delay={1.15 + index * 0.2}
          pathWidth={2}
          gradientStartColor={primaryBeam}
          gradientStopColor={secondaryBeam}
        />
      {/each}

      {#each flowInitiators as initiator, index}
        <BlurFade delay={0.15 + index * 0.12}>
          <div class="node side-node" style={`left:${initiator.x}px; top:${initiator.y}px;`}>
            {initiator.name}
          </div>
        </BlurFade>
      {/each}

      <BlurFade delay={0.55}>
        <div class="node hub-node" style={`left:${layout.hub.x}px; top:${layout.hub.y}px;`}>
          <span class="node-kicker">Routes</span>
          <div class="lockup">
            <span class="node-title">Hub MCP</span>
            <span class="node-subtitle">Tenant, host, session</span>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.9}>
        <div class="node control-node" style={`left:${layout.control.x}px; top:${layout.control.y}px;`}>
          <BorderBeam size={160} duration={8} colorFrom={primaryBeam} colorTo={secondaryBeam} />
          <span class="node-kicker">Governs</span>
          <div class="lockup">
            <span class="node-title control-title">Workflow Console</span>
            <span class="node-subtitle">Reason-coded review</span>
          </div>
          <div class="pill-row">
            {#each outcomes as outcome}
              <span class={`pill ${outcome.tone}`}>{outcome.label}</span>
            {/each}
          </div>
        </div>
      </BlurFade>

      {#each flowDestinations as destination, index}
        <BlurFade delay={1.2 + index * 0.12}>
          <div class="node side-node" style={`left:${destination.x}px; top:${destination.y}px;`}>
            {destination.name}
          </div>
        </BlurFade>
      {/each}
    </div>
  </div>

  <p class="flow-caption">{caption}</p>
</div>

<style>
  .flow-shell {
    display: grid;
    gap: 1.25rem;
  }

  .flow-copy {
    display: grid;
    gap: 0.65rem;
    max-width: 42rem;
  }

  .flow-eyebrow {
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.6));
  }

  .flow-copy h3 {
    font-size: clamp(1.6rem, 2.2vw, 2.35rem);
    color: var(--color-fg-primary, #fff);
    line-height: 1.05;
    letter-spacing: var(--tracking-tight, -0.02em);
    margin: 0;
  }

  .flow-copy p,
  .flow-caption {
    color: var(--color-fg-secondary, rgba(255, 255, 255, 0.76));
    line-height: 1.7;
    margin: 0;
  }

  .flow-caption {
    font-size: 0.92rem;
  }

  .flow-diagram {
    display: flex;
    justify-content: center;
    padding: clamp(1.25rem, 2vw, 1.9rem);
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      radial-gradient(circle at top, rgba(45, 212, 191, 0.12), transparent 42%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02)),
      rgba(4, 8, 15, 0.76);
    overflow: hidden;
  }

  .grid-box {
    position: relative;
    flex: 0 0 auto;
  }

  .node {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1;
    user-select: none;
    text-align: center;
  }

  .side-node {
    min-width: 8rem;
    padding: 0.72rem 0.9rem;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(8, 12, 19, 0.9);
    color: var(--color-fg-secondary, rgba(255, 255, 255, 0.84));
    font-size: 0.84rem;
    line-height: 1.3;
    box-shadow:
      0 16px 32px rgba(0, 0, 0, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .hub-node,
  .control-node {
    gap: 0.42rem;
    border-radius: 24px;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .hub-node {
    width: 176px;
    min-height: 100px;
    padding: 1rem 1.1rem;
    border: 1px solid rgba(96, 165, 250, 0.24);
    background: rgba(8, 12, 19, 0.94);
    box-shadow:
      0 0 30px rgba(96, 165, 250, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .control-node {
    width: 208px;
    min-height: 150px;
    padding: 1rem 1rem 0.95rem;
    border: 1px solid rgba(45, 212, 191, 0.24);
    background:
      linear-gradient(180deg, rgba(10, 17, 27, 0.96), rgba(8, 10, 18, 0.92)),
      rgba(8, 12, 19, 0.96);
    box-shadow:
      0 0 42px rgba(45, 212, 191, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .lockup {
    display: grid;
    gap: 0.22rem;
  }

  .node-kicker {
    font-size: 0.63rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: rgba(255, 255, 255, 0.42);
  }

  .node-title {
    font-size: 1.45rem;
    color: var(--color-fg-primary, #fff);
    font-weight: var(--font-semibold, 600);
    letter-spacing: var(--tracking-tight, -0.015em);
  }

  .control-title {
    font-size: 1.18rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .node-subtitle {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.5));
  }

  .pill-row {
    display: flex;
    gap: 0.38rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .pill {
    padding: 0.24rem 0.52rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.04);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  .pill.allow {
    color: rgba(167, 243, 208, 0.98);
    background: rgba(6, 78, 59, 0.28);
    border-color: rgba(52, 211, 153, 0.24);
  }

  .pill.review {
    color: rgba(253, 230, 138, 0.98);
    background: rgba(120, 53, 15, 0.28);
    border-color: rgba(251, 191, 36, 0.24);
  }

  .pill.block {
    color: rgba(254, 202, 202, 0.98);
    background: rgba(127, 29, 29, 0.3);
    border-color: rgba(248, 113, 113, 0.22);
  }

  .flow-diagram.compact .side-node {
    min-width: 0;
    width: 7rem;
    font-size: 0.76rem;
    padding: 0.62rem 0.75rem;
  }

  .flow-diagram.compact .hub-node {
    width: 154px;
    min-height: 92px;
    padding: 0.86rem;
  }

  .flow-diagram.compact .control-node {
    width: 176px;
    min-height: 142px;
    padding: 0.86rem 0.8rem 0.82rem;
  }

  .flow-diagram.compact .node-title {
    font-size: 1.15rem;
  }

  .flow-diagram.compact .control-title {
    font-size: 0.98rem;
  }

  .flow-diagram.compact .node-subtitle {
    font-size: 0.66rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .flow-diagram {
      scroll-behavior: auto;
    }
  }
</style>
