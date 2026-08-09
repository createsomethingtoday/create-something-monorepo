<script lang="ts">
  export type PlaybookFieldVariant = 'home' | 'services' | 'products' | 'map' | 'control' | 'proof';

  type Point = { x: number; y: number; label: string };
  type Route = { d: string; label: string; tone?: 'signal' | 'growth' | 'review' };
  type Play = {
    code: string;
    phase: string;
    call: string;
    summary: string;
    description: string;
    owners: Point[];
    constraints: Point[];
    routes: Route[];
    gate: { x: number; y: number; label: string };
    receipt: { x: number; y: number; label: string };
  };

  interface Props {
    variant: PlaybookFieldVariant;
  }

  let { variant }: Props = $props();

  const plays: Record<PlaybookFieldVariant, Play> = {
    home: {
      code: 'PB / 01',
      phase: 'Shared playbook',
      call: 'Operator + agent',
      summary: 'Signal → Decision → Proof',
      description:
        'Shared Playbook: an operator and approved agent route changed work through a human decision gate, around ambiguity, and into an attached proof receipt.',
      owners: [
        { x: 170, y: 120, label: 'Operator' },
        { x: 310, y: 208, label: 'Agent' }
      ],
      constraints: [{ x: 462, y: 150, label: 'Ambiguity' }],
      routes: [
        { d: 'M 190 120 C 240 118, 252 188, 288 202', label: 'Delegate', tone: 'signal' },
        { d: 'M 332 208 C 394 208, 400 292, 472 292', label: 'Escalate', tone: 'review' }
      ],
      gate: { x: 384, y: 274, label: 'Human decision' },
      receipt: { x: 500, y: 292, label: 'Proof' }
    },
    services: {
      code: 'PB / 02',
      phase: 'Install',
      call: 'Map → Build → Control',
      summary: 'Define → Connect → Operate',
      description:
        'Installation Playbook: the operator defines the path in Map, Build connects only the approved route, and Control watches the live handoff and records proof.',
      owners: [
        { x: 145, y: 202, label: 'Map' },
        { x: 308, y: 202, label: 'Build' },
        { x: 486, y: 202, label: 'Control' }
      ],
      constraints: [{ x: 304, y: 102, label: 'Untrusted automation' }],
      routes: [
        { d: 'M 168 202 C 212 202, 244 202, 284 202', label: 'Approve', tone: 'signal' },
        { d: 'M 332 202 C 382 202, 414 202, 462 202', label: 'Handoff', tone: 'growth' }
      ],
      gate: { x: 222, y: 184, label: 'Approval' },
      receipt: { x: 488, y: 284, label: 'Run record' }
    },
    products: {
      code: 'PB / 03',
      phase: 'Choose a path',
      call: 'One system, three entries',
      summary: 'Map / Build / Control',
      description:
        'Product Playbook: one operator-owned definition opens three distinct paths—Map to define, Build to connect, or Control to operate with approvals and proof.',
      owners: [
        { x: 150, y: 204, label: 'Workflow' },
        { x: 350, y: 104, label: 'Map' },
        { x: 350, y: 204, label: 'Build' },
        { x: 350, y: 304, label: 'Control' }
      ],
      constraints: [{ x: 490, y: 204, label: 'AI out of reach' }],
      routes: [
        { d: 'M 172 196 C 228 170, 268 122, 328 108', label: 'Define', tone: 'signal' },
        { d: 'M 172 204 C 230 204, 274 204, 328 204', label: 'Connect', tone: 'growth' },
        { d: 'M 172 212 C 228 240, 270 288, 328 300', label: 'Operate', tone: 'review' }
      ],
      gate: { x: 244, y: 186, label: 'Choose' },
      receipt: { x: 472, y: 304, label: 'Owned system' }
    },
    map: {
      code: 'PB / 04',
      phase: 'Map',
      call: 'See the whole operation',
      summary: 'Owner / data / gate / stop',
      description:
        'Mapping Playbook: the operator sees the workflow owner, source data, decision gate, blocked action, and required proof before AI reaches a production system.',
      owners: [
        { x: 152, y: 198, label: 'Owner' },
        { x: 306, y: 116, label: 'Source' },
        { x: 466, y: 278, label: 'Proof' }
      ],
      constraints: [{ x: 466, y: 126, label: 'Ambiguity' }],
      routes: [
        { d: 'M 174 190 C 222 162, 252 132, 284 120', label: 'Input', tone: 'signal' },
        { d: 'M 326 126 C 360 152, 348 242, 442 274', label: 'Allowed path', tone: 'growth' }
      ],
      gate: { x: 350, y: 194, label: 'Decision boundary' },
      receipt: { x: 486, y: 278, label: 'Map approved' }
    },
    control: {
      code: 'PB / 05',
      phase: 'Control',
      call: 'Offense + defense',
      summary: 'Advance / review / stop / recover',
      description:
        'Control Playbook: approved work advances on offense while defense routes an exception to a human decision, stops unauthorized action, and preserves recovery proof.',
      owners: [
        { x: 142, y: 202, label: 'Signal' },
        { x: 306, y: 126, label: 'Agent' },
        { x: 470, y: 282, label: 'Operator' }
      ],
      constraints: [
        { x: 350, y: 266, label: 'Untrusted automation' },
        { x: 482, y: 124, label: 'AI out of reach' }
      ],
      routes: [
        { d: 'M 164 194 C 214 164, 250 136, 282 128', label: 'Offense', tone: 'growth' },
        { d: 'M 324 138 C 362 168, 372 248, 446 278', label: 'Defense', tone: 'review' }
      ],
      gate: { x: 386, y: 250, label: 'Review' },
      receipt: { x: 492, y: 282, label: 'Recovery proof' }
    },
    proof: {
      code: 'PB / 06',
      phase: 'Film room',
      call: 'Review the run',
      summary: 'Measured / blocked / unknown',
      description:
        'Field Report Playbook: the completed route is replayed against measured evidence, a visible blocked state, and an attached receipt so the next play can improve.',
      owners: [
        { x: 150, y: 204, label: 'Run' },
        { x: 318, y: 204, label: 'Review' },
        { x: 484, y: 204, label: 'Next play' }
      ],
      constraints: [{ x: 320, y: 104, label: 'Untrusted automation' }],
      routes: [
        { d: 'M 172 204 C 222 204, 258 204, 294 204', label: 'Replay', tone: 'signal' },
        { d: 'M 342 204 C 390 204, 424 204, 460 204', label: 'Adjust', tone: 'growth' }
      ],
      gate: { x: 246, y: 186, label: 'Evidence check' },
      receipt: { x: 484, y: 286, label: 'Receipt attached' }
    }
  };

  const play = $derived(plays[variant]);
  const arrowId = $derived(`playbook-arrow-${variant}`);
</script>

<figure
  class="playbook-field"
  data-playbook-field={variant}
  role="img"
  aria-label={play.description}
>
  <div class="playbook-field__frame">
    <header class="playbook-field__header">
      <span>{play.code}</span>
      <strong>{play.phase}</strong>
      <small>{play.call}</small>
    </header>

    <svg viewBox="0 0 640 400" aria-hidden="true">
      <defs>
        <marker id={arrowId} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" class="playbook-field__arrow" />
        </marker>
      </defs>

      <g class="playbook-field__court">
        <rect x="20" y="20" width="600" height="360" />
        <line x1="320" y1="20" x2="320" y2="380" />
        <circle cx="320" cy="200" r="60" />
        <path d="M 20 130 H 132 V 270 H 20" />
        <path d="M 620 130 H 508 V 270 H 620" />
        <path d="M 132 92 A 122 122 0 0 1 132 308" />
        <path d="M 508 92 A 122 122 0 0 0 508 308" />
      </g>

      <g class="playbook-field__routes">
        {#each play.routes as route, index}
          <path
            d={route.d}
            data-tone={route.tone ?? 'signal'}
            style={`--route-order: ${index}`}
            marker-end={`url(#${arrowId})`}
          />
          <title>{route.label}</title>
        {/each}
      </g>

      <g class="playbook-field__gate" transform={`translate(${play.gate.x} ${play.gate.y})`}>
        <rect x="-7" y="-24" width="14" height="48" />
        <line x1="-19" y1="0" x2="19" y2="0" />
        <title>{play.gate.label}</title>
      </g>

      {#each play.owners as owner}
        <g class="playbook-field__owner" transform={`translate(${owner.x} ${owner.y})`}>
          <circle r="20" />
          <circle r="11" />
          <text y="38" text-anchor="middle">{owner.label}</text>
        </g>
      {/each}

      {#each play.constraints as constraint}
        <g class="playbook-field__constraint" transform={`translate(${constraint.x} ${constraint.y})`}>
          <line x1="-14" y1="-14" x2="14" y2="14" />
          <line x1="14" y1="-14" x2="-14" y2="14" />
          <text y="38" text-anchor="middle">{constraint.label}</text>
        </g>
      {/each}

      <g class="playbook-field__receipt" transform={`translate(${play.receipt.x} ${play.receipt.y})`}>
        <rect width="90" height="54" />
        <path d="M 12 17 H 72 M 12 28 H 58 M 12 39 H 66" />
        <text x="45" y="72" text-anchor="middle">{play.receipt.label}</text>
      </g>
    </svg>

    <footer class="playbook-field__footer">
      <strong>{play.summary}</strong>
      <span>O = owner</span>
      <span>X = opposition</span>
      <span>Route = delegated work</span>
      <span>Gate = human decision</span>
      <span>Receipt = proof</span>
    </footer>
  </div>
  <figcaption class="playbook-field__caption">{play.description}</figcaption>
</figure>

<style>
  .playbook-field {
    position: absolute;
    top: 50%;
    right: max(1.25rem, calc((100vw - var(--content-width-performance, 85rem)) / 2));
    width: min(52vw, 47rem);
    margin: 0;
    color: var(--color-performance-panel, #fff);
    transform: translateY(-50%);
  }

  .playbook-field__frame {
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.42);
    background: rgba(9, 9, 9, 0.64);
    box-shadow: 0 1.5rem 5rem rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(12px);
  }

  .playbook-field__header,
  .playbook-field__footer {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.72rem 0.9rem;
    font-family: var(--font-performance-mono);
    font-size: 0.66rem;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .playbook-field__header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.24);
  }

  .playbook-field__header span,
  .playbook-field__header small {
    color: rgba(255, 255, 255, 0.62);
  }

  .playbook-field__header strong {
    margin-right: auto;
    font-weight: var(--font-performance-semibold, 600);
  }

  .playbook-field svg {
    display: block;
    width: 100%;
    height: auto;
    background:
      linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px) 0 0 / 100% 25%,
      linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px) 0 0 / 25% 100%;
  }

  .playbook-field__court > * {
    fill: none;
    stroke: rgba(255, 255, 255, 0.18);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }

  .playbook-field__routes path {
    fill: none;
    stroke: var(--color-performance-signal-soft, #a7b8ff);
    stroke-width: 3;
    stroke-linecap: square;
    stroke-dasharray: 7 7;
    vector-effect: non-scaling-stroke;
    animation: route-in 800ms var(--ease-performance-standard, ease) both;
    animation-delay: calc(var(--route-order) * 120ms + 120ms);
  }

  .playbook-field__routes path[data-tone='growth'] {
    stroke: var(--color-performance-growth, #75d7a0);
  }

  .playbook-field__routes path[data-tone='review'] {
    stroke: var(--color-performance-review, #f0bd69);
  }

  .playbook-field__arrow {
    fill: var(--color-performance-signal-soft, #a7b8ff);
  }

  .playbook-field__owner circle {
    fill: rgba(9, 9, 9, 0.88);
    stroke: var(--color-performance-panel, #fff);
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }

  .playbook-field__owner circle + circle {
    fill: var(--color-performance-signal-soft, #a7b8ff);
    stroke: none;
  }

  .playbook-field__constraint line {
    stroke: var(--color-performance-risk, #ef8c8c);
    stroke-width: 4;
    vector-effect: non-scaling-stroke;
  }

  .playbook-field__gate rect,
  .playbook-field__gate line {
    fill: rgba(240, 189, 105, 0.18);
    stroke: var(--color-performance-review, #f0bd69);
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }

  .playbook-field__receipt rect,
  .playbook-field__receipt path {
    fill: rgba(117, 215, 160, 0.08);
    stroke: var(--color-performance-growth, #75d7a0);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }

  .playbook-field text {
    fill: rgba(255, 255, 255, 0.82);
    font-family: var(--font-performance-mono);
    font-size: 12px;
    font-weight: var(--font-performance-semibold, 600);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .playbook-field__footer {
    flex-wrap: wrap;
    border-top: 1px solid rgba(255, 255, 255, 0.24);
    color: rgba(255, 255, 255, 0.58);
  }

  .playbook-field__footer strong {
    flex-basis: 100%;
    color: var(--color-performance-panel, #fff);
    font-weight: var(--font-performance-semibold, 600);
  }

  .playbook-field__caption {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @keyframes route-in {
    from {
      opacity: 0;
      stroke-dashoffset: 48;
    }
    to {
      opacity: 1;
      stroke-dashoffset: 0;
    }
  }

  @media (max-width: 47.99rem) {
    .playbook-field {
      top: auto;
      right: 0.75rem;
      bottom: 7rem;
      left: 0.75rem;
      width: auto;
      transform: none;
    }

    .playbook-field__frame {
      background: rgba(9, 9, 9, 0.88);
      backdrop-filter: none;
    }

    .playbook-field__header,
    .playbook-field__footer {
      gap: 0.5rem;
      padding: 0.58rem 0.65rem;
      font-size: 0.58rem;
    }

    .playbook-field__header small {
      display: none;
    }

    .playbook-field__footer span {
      flex: 1 1 calc(50% - 0.5rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .playbook-field__routes path {
      animation: none;
      stroke-dashoffset: 0;
    }
  }
</style>
