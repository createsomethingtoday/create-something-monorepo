<script lang="ts">
  export type PlaybookFieldVariant =
    | 'home'
    | 'about'
    | 'services'
    | 'products'
    | 'workflows'
    | 'map'
    | 'control'
    | 'proof'
    | 'marketplace-review'
    | 'workflow-recovery'
    | 'workflow-control';

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
    ball?: Point;
    gate: { x: number; y: number; label: string };
    receipt: {
      x: number;
      y: number;
      label: string;
      state: string;
      record: string;
      evidence: string;
    };
  };

  interface Props {
    variant: PlaybookFieldVariant;
    /** Lets a route place the field as a self-contained operating study. */
    embedded?: boolean;
  }

  let { variant, embedded = false }: Props = $props();

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
      receipt: {
        x: 500,
        y: 292,
        label: 'Proof receipt',
        state: 'Attached',
        record: 'PB-01 / R1',
        evidence: 'Decision + result'
      }
    },
    about: {
      code: 'PB / ORIGIN',
      phase: 'Court vision',
      call: 'Read → Decide → Review',
      summary: 'Vision → Decision → Proof',
      description:
        'About Playbook: the operator reads the whole workflow, shares the play with an approved agent, routes judgment to a named owner, moves around ambiguity, and reviews attached proof.',
      owners: [
        { x: 148, y: 212, label: 'Operator' },
        { x: 316, y: 142, label: 'Agent' },
        { x: 470, y: 238, label: 'Decision owner' }
      ],
      constraints: [{ x: 472, y: 112, label: 'Ambiguity' }],
      routes: [
        { d: 'M 170 204 C 218 178, 256 148, 292 144', label: 'Share the play', tone: 'signal' },
        { d: 'M 338 150 C 382 166, 410 214, 446 232', label: 'Route judgment', tone: 'review' }
      ],
      ball: { x: 244, y: 164, label: 'Shared play' },
      gate: { x: 402, y: 218, label: 'Named decision' },
      receipt: {
        x: 476,
        y: 286,
        label: 'Film review',
        state: 'Attached',
        record: 'PB-00 / D3',
        evidence: 'Decision + result'
      }
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
      receipt: {
        x: 488,
        y: 284,
        label: 'Run record',
        state: 'Recorded',
        record: 'PB-02 / RUN',
        evidence: 'Installed route'
      }
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
      receipt: {
        x: 472,
        y: 304,
        label: 'Owned system',
        state: 'Owned',
        record: 'PB-03 / SYS',
        evidence: 'Client-owned'
      }
    },
    workflows: {
      code: 'PB / LIB-12',
      phase: 'Field guides',
      call: 'Read → Bound → Run → Review',
      summary: 'Signal → Decision → Proof',
      description:
        'Workflow Library Playbook: a live operating signal routes through the relevant field guide, around an untrusted shortcut, to a named decision owner and an applied proof receipt.',
      owners: [
        { x: 142, y: 202, label: 'Live signal' },
        { x: 304, y: 132, label: 'Field guide' },
        { x: 474, y: 280, label: 'Operator' }
      ],
      constraints: [{ x: 474, y: 122, label: 'Untrusted shortcut' }],
      routes: [
        { d: 'M 164 196 C 212 166, 250 140, 280 134', label: 'Read', tone: 'signal' },
        { d: 'M 328 144 C 368 180, 390 246, 450 276', label: 'Apply', tone: 'growth' }
      ],
      gate: { x: 390, y: 246, label: 'Fit / pause' },
      receipt: {
        x: 494,
        y: 282,
        label: 'Applied play',
        state: 'Inspect',
        record: 'LIB-12 / GUIDE',
        evidence: 'Owner + boundary + proof'
      }
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
      receipt: {
        x: 486,
        y: 278,
        label: 'Map approval',
        state: 'Approved',
        record: 'PB-04 / MAP',
        evidence: 'Scope + gate'
      }
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
      receipt: {
        x: 492,
        y: 282,
        label: 'Recovery proof',
        state: 'Recoverable',
        record: 'PB-05 / CTRL',
        evidence: 'Stop + recovery'
      }
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
      receipt: {
        x: 484,
        y: 286,
        label: 'Field receipt',
        state: 'Verified',
        record: 'PB-06 / FILM',
        evidence: 'Measured run'
      }
    },
    'marketplace-review': {
      code: 'PB / MR-01',
      phase: 'Review queue',
      call: 'Prepare → Review → Decide',
      summary: 'Evidence moves / judgment stays',
      description:
        'Marketplace Review Playbook: an agent prepares the evidence packet, ambiguity routes around automation, and a named reviewer keeps final approval authority with an attached decision receipt.',
      owners: [
        { x: 142, y: 202, label: 'Submission' },
        { x: 304, y: 132, label: 'Evidence agent' },
        { x: 474, y: 278, label: 'Reviewer' }
      ],
      constraints: [{ x: 474, y: 122, label: 'Exceptional case' }],
      routes: [
        { d: 'M 164 196 C 212 166, 250 140, 280 134', label: 'Prepare', tone: 'signal' },
        { d: 'M 328 142 C 364 176, 384 244, 450 274', label: 'Escalate', tone: 'review' }
      ],
      gate: { x: 392, y: 246, label: 'Human approval' },
      receipt: {
        x: 494,
        y: 282,
        label: 'Review decision',
        state: 'Human-owned',
        record: 'MR-01 / REVIEW',
        evidence: 'Packet + decision'
      }
    },
    'workflow-recovery': {
      code: 'PB / REC-01',
      phase: 'Recovery',
      call: 'Trace → Stop → Recover',
      summary: 'Failure / authority / evidence',
      description:
        'Workflow Recovery Playbook: the operator traces the last known-good run, stops unsafe retries at the authority gate, and chooses repair, replacement, or retirement with recovery proof.',
      owners: [
        { x: 144, y: 202, label: 'Last good run' },
        { x: 306, y: 132, label: 'Failure trace' },
        { x: 476, y: 280, label: 'Recovery owner' }
      ],
      constraints: [
        { x: 306, y: 278, label: 'Missing evidence' },
        { x: 478, y: 122, label: 'Unsafe retry' }
      ],
      routes: [
        { d: 'M 166 196 C 216 166, 252 140, 282 134', label: 'Trace', tone: 'signal' },
        { d: 'M 328 144 C 370 182, 392 246, 452 276', label: 'Recover', tone: 'review' }
      ],
      gate: { x: 390, y: 246, label: 'Stop / resume' },
      receipt: {
        x: 496,
        y: 282,
        label: 'Recovery plan',
        state: 'Review',
        record: 'REC-01 / PLAN',
        evidence: 'Repair / replace / stop'
      }
    },
    'workflow-control': {
      code: 'PB / CTRL-01',
      phase: 'Human control',
      call: 'Run → Wait → Stop',
      summary: 'Allowed path / named decision',
      description:
        'Workflow Control Playbook: approved work runs, ambiguous decisions wait with a complete packet, unauthorized action stops, and the client keeps the operating receipt.',
      owners: [
        { x: 142, y: 204, label: 'Signal' },
        { x: 304, y: 132, label: 'AI agent' },
        { x: 474, y: 280, label: 'Decision owner' }
      ],
      constraints: [{ x: 474, y: 122, label: 'Untrusted action' }],
      routes: [
        { d: 'M 164 198 C 212 168, 250 140, 280 134', label: 'Run', tone: 'growth' },
        { d: 'M 328 144 C 366 178, 390 246, 450 276', label: 'Wait', tone: 'review' }
      ],
      gate: { x: 390, y: 246, label: 'Decision boundary' },
      receipt: {
        x: 494,
        y: 282,
        label: 'Control receipt',
        state: 'Client-owned',
        record: 'CTRL-01 / RUN',
        evidence: 'Decision + result'
      }
    }
  };

  const play = $derived(plays[variant]);
  const arrowId = $derived(`playbook-arrow-${variant}`);
</script>

<figure
  class="playbook-field"
  class:playbook-field--embedded={embedded}
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

      {#if play.ball}
        <g class="playbook-field__ball" transform={`translate(${play.ball.x} ${play.ball.y})`}>
          <circle r="9" />
          <path d="M -8 -2 C -2 0, 2 0, 8 -2 M -2 -8 C 0 -2, 0 2, -2 8" />
          <title>{play.ball.label}</title>
        </g>
      {/if}

      <g class="playbook-field__gate" transform={`translate(${play.gate.x} ${play.gate.y})`}>
        <path class="playbook-field__gate-post" d="M -18 -24 V 24 H -10 M 18 -24 V 24 H 10" />
        <line class="playbook-field__gate-crossbar" x1="-28" y1="0" x2="28" y2="0" />
        <rect class="playbook-field__gate-decision" x="-7" y="-7" width="14" height="14" />
        <text class="playbook-field__gate-label" y="42" text-anchor="middle">Gate</text>
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
        <g
          class="playbook-field__constraint"
          transform={`translate(${constraint.x} ${constraint.y})`}
        >
          <rect class="playbook-field__constraint-frame" x="-18" y="-18" width="36" height="36" />
          <line x1="-12" y1="-12" x2="12" y2="12" />
          <line x1="12" y1="-12" x2="-12" y2="12" />
          <text y="43" text-anchor="middle">{constraint.label}</text>
        </g>
      {/each}

      <g
        class="playbook-field__receipt"
        data-proof-ticket
        transform={`translate(${play.receipt.x} ${play.receipt.y})`}
      >
        <path class="playbook-field__receipt-attachment" d="M -24 12 H 0" />
        <rect width="112" height="68" />
        <path d="M 0 17 H 112" />
        <rect class="playbook-field__receipt-state-rail" x="7" y="6" width="5" height="5" />
        <text class="playbook-field__receipt-kind" x="16" y="11">RECEIPT</text>
        <text class="playbook-field__receipt-state" x="104" y="11" text-anchor="end">
          {play.receipt.state}
        </text>
        <text class="playbook-field__receipt-record" x="8" y="31">{play.receipt.record}</text>
        <text class="playbook-field__receipt-label" x="8" y="45">{play.receipt.label}</text>
        <text class="playbook-field__receipt-evidence" x="8" y="58">
          Evidence: {play.receipt.evidence}
        </text>
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

  .playbook-field--embedded {
    position: relative;
    inset: auto;
    width: 100%;
    transform: none;
  }

  .playbook-field--embedded .playbook-field__frame {
    box-shadow: none;
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

  .playbook-field__ball circle {
    fill: var(--color-performance-pressure, #e54800);
    stroke: var(--color-performance-panel, #fff);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }

  .playbook-field__ball path {
    fill: none;
    stroke: var(--color-performance-editorial-dark, #181312);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
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

  .playbook-field__constraint-frame {
    fill: rgba(239, 140, 140, 0.08);
    stroke: var(--color-performance-risk, #ef8c8c);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }

  .playbook-field__constraint line {
    stroke: var(--color-performance-risk, #ef8c8c);
    stroke-width: 3.5;
    vector-effect: non-scaling-stroke;
  }

  .playbook-field__gate-post,
  .playbook-field__gate-crossbar {
    fill: none;
    stroke: var(--color-performance-review, #f0bd69);
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }

  .playbook-field__gate-decision {
    fill: rgba(240, 189, 105, 0.18);
    stroke: var(--color-performance-review, #f0bd69);
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }

  .playbook-field__gate .playbook-field__gate-label {
    fill: var(--color-performance-review, #f0bd69);
    font-size: 9px;
    letter-spacing: 0.08em;
  }

  .playbook-field__receipt > rect,
  .playbook-field__receipt > path:not(.playbook-field__receipt-attachment) {
    fill: rgba(117, 215, 160, 0.08);
    stroke: var(--color-performance-growth, #75d7a0);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }

  .playbook-field__receipt-attachment {
    fill: none;
    stroke: var(--color-performance-growth, #75d7a0);
    stroke-dasharray: 3 3;
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }

  .playbook-field__receipt .playbook-field__receipt-state-rail {
    fill: var(--color-performance-growth, #75d7a0);
    stroke: none;
  }

  .playbook-field text {
    fill: rgba(255, 255, 255, 0.82);
    font-family: var(--font-performance-mono);
    font-size: 12px;
    font-weight: var(--font-performance-semibold, 600);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .playbook-field__receipt .playbook-field__receipt-kind,
  .playbook-field__receipt .playbook-field__receipt-state,
  .playbook-field__receipt .playbook-field__receipt-evidence {
    fill: var(--color-performance-growth, #75d7a0);
    font-size: 8px;
    font-weight: var(--font-performance-semibold, 600);
    letter-spacing: 0.08em;
  }

  .playbook-field__receipt .playbook-field__receipt-record {
    fill: var(--color-performance-panel, #fff);
    font-size: 10px;
    font-weight: var(--font-performance-semibold, 600);
    letter-spacing: 0.06em;
  }

  .playbook-field__receipt .playbook-field__receipt-label {
    fill: rgba(255, 255, 255, 0.86);
    font-size: 9px;
    font-weight: var(--font-performance-semibold, 600);
    letter-spacing: 0.03em;
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
      position: relative;
      inset: auto;
      width: auto;
      margin: 0;
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
