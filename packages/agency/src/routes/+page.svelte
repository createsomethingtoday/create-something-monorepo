<script lang="ts">
  import { Button, HeroSignalField, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import ExecutionWorkbench from '$lib/components/ExecutionWorkbench.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const services = [
    {
      name: 'Workflow System',
      description:
        'One painful workflow turned into a reliable operating path with clear rules, clean handoffs, and ownership.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped build with optional ongoing support'
    },
    {
      name: 'Trust Layer',
      description:
        'The trust layer: scoped actions, approval states, release checks, and incident loops once the workflow touches revenue or customer trust.',
      type: 'Workflow Control Plan',
      price: 'Custom',
      priceDescription: 'Monthly trust layer'
    },
    {
      name: 'Enterprise Extension',
      description:
        'Cross-system control for regulated, high-volume, or multi-team workflows where auditability and recovery matter.',
      type: 'Project + Managed',
      price: 'Custom',
      priceDescription: 'Scoped implementation with optional ongoing support'
    }
  ];

  const proofMetrics = [
    { value: 'Objects', label: 'Business reality named first', icon: 'objects' },
    { value: 'Actions', label: 'Agent capacity scoped clearly', icon: 'actions' },
    { value: 'States', label: 'Allowed / approval / blocked', icon: 'states' },
    { value: 'Receipts', label: 'Evidence for every handoff', icon: 'receipts' }
  ];

  const deliveryReceipts = [
    {
      number: '//01',
      label: 'Workflow map',
      detail: 'Objects, owners, source systems, handoffs, and known failure points.'
    },
    {
      number: '//02',
      label: 'Trust boundary',
      detail: 'What can run, what needs approval, and what must stop with a reason.'
    },
    {
      number: '//03',
      label: 'Delivery page',
      detail: 'A client-safe status surface for the live workflow, decisions, and next moves.'
    },
    {
      number: '//04',
      label: 'Private evidence',
      detail: 'Commands, pass/fail output, endpoints, deploy IDs, and rollback notes.'
    }
  ];
</script>

<SEO
  title="Workflow Trust Layer | CREATE SOMETHING .agency"
  description="Connecting tools is easy. CREATE SOMETHING makes one workflow safe to delegate with scoped actions, approval paths, evidence, and recovery."
  keywords="workflow trust layer, safe to delegate AI workflow, agent workflow controls, MCP wedge, transparent AI stack, production automation, technical operators"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
/>

<section class="hero-page">
  <div class="hero-stage">
    <HeroSignalField variant="agency" focus="right" />

    <div class="shell-inner-pad hero-layout">
      <div class="hero-copy">
        <BlurFade delay={0}>
          <span class="product-kicker hero-kicker">
            <span class="hero-kicker__desktop">{agencyCoreMessaging.categoryLabel}</span>
            <span class="hero-kicker__mobile">Reliable AI Workflow Systems</span>
          </span>
        </BlurFade>

        <BlurFade delay={0.05}>
          <h1 class="hero-title">Connecting tools is easy. Trust is the product.</h1>
        </BlurFade>

        <BlurFade delay={0.1}>
          <p class="hero-detail">
            CREATE SOMETHING makes one business workflow safe to delegate: clear objects, scoped
            actions, approval paths, evidence, and recovery when things go wrong.
          </p>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div class="hero-actions">
            <Button href={agencyCoreMessaging.workflowMappingSessionHref}
              >{agencyCoreMessaging.bookMappingSessionLabel}</Button
            >
            <Button href="#workflow-pattern" variant="secondary">See The Pattern</Button>
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <p class="hero-note">Objects named. Actions scoped. Evidence attached.</p>
        </BlurFade>
      </div>

    </div>
  </div>

  <div class="shell-inner-pad">
    <div class="metric-grid">
      {#each proofMetrics as metric, index}
        <BlurFade delay={0.25 + index * 0.05}>
          <article class="product-surface product-surface--soft metric-card">
            <div class="metric-icon" aria-hidden="true">
              {#if metric.icon === 'objects'}
                <svg class="metric-symbol metric-symbol--objects" viewBox="0 0 24 24" focusable="false">
                  <rect width="6" height="6" x="16" y="16" rx="1" />
                  <rect width="6" height="6" x="2" y="16" rx="1" />
                  <rect width="6" height="6" x="9" y="2" rx="1" />
                  <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3m-7-4V8" />
                </svg>
              {:else if metric.icon === 'actions'}
                <svg class="metric-symbol metric-symbol--actions" viewBox="0 0 24 24" focusable="false">
                  <circle cx="6" cy="19" r="3" />
                  <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
                  <circle cx="18" cy="5" r="3" />
                </svg>
              {:else if metric.icon === 'states'}
                <svg class="metric-symbol metric-symbol--states" viewBox="0 0 24 24" focusable="false">
                  <path d="M13 5h8m-8 7h8m-8 7h8M3 17l2 2l4-4M3 7l2 2l4-4" />
                </svg>
              {:else}
                <svg class="metric-symbol metric-symbol--receipts" viewBox="0 0 24 24" focusable="false">
                  <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
                  <path d="M14 2v5a1 1 0 0 0 1 1h5M9 15l2 2l4-4" />
                </svg>
              {/if}
            </div>
            <div class="metric-copy">
              <span class="metric-value">{metric.value}</span>
              <span class="metric-label">{metric.label}</span>
            </div>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="control-section" id="workflow-pattern">
  <div class="shell-inner-pad showcase-stack">
    <div class="section-lead">
      <BlurFade>
        <span class="product-kicker control-kicker">
          <span class="control-kicker__desktop">Customer recovery workflow</span>
          <span class="control-kicker__mobile">Recovery Workflow</span>
        </span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Show the business case, not an abstract agent demo.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Here the workflow is ecommerce support recovery: inspect the case, order, shipment, and
          payment state, then decide whether the action can run, needs approval, or stops.
        </p>
      </BlurFade>
    </div>

    <BlurFade delay={0.15}>
      <ExecutionWorkbench />
    </BlurFade>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad delivery-grid">
    <div class="delivery-copy">
      <BlurFade>
        <span class="product-kicker">After the call</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Leave with the operating path, not another abstract workflow diagram.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          The delivery pages set the standard for what the work becomes: a visible business model,
          a private evidence trail, and clear rules for what agents can do.
        </p>
      </BlurFade>
    </div>

    <BlurFade delay={0.15}>
      <div class="delivery-window">
        <div class="delivery-window__top" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="delivery-window__body">
          <div class="delivery-rail">
            {#each deliveryReceipts as receipt, index}
              <div class:delivery-rail__item--active={index === 0} class="delivery-rail__item">
                <div class="delivery-rail__heading">
                  <span>{receipt.number}</span>
                  <strong>{receipt.label}</strong>
                </div>
                <p>{receipt.detail}</p>
              </div>
            {/each}
          </div>

          <div class="delivery-proof" aria-label="Post-call delivery example">
            <div class="delivery-proof__intro">
              <span>// Working model</span>
              <h3>One workflow becomes visible enough to delegate.</h3>
              <p>
                The buyer sees the live path. The private notes keep the operational proof.
              </p>
            </div>
            <div class="delivery-proof__flow">
              <div class="delivery-proof__panel">
                <span class="delivery-proof__label">Client-safe</span>
                <strong>/delivery/abundance</strong>
                <p>Status, walkthrough, open decisions, and the next owner.</p>
              </div>
              <div class="delivery-proof__arrow" aria-hidden="true">-></div>
              <div class="delivery-proof__panel">
                <span class="delivery-proof__label">Private receipt</span>
                <strong>release-notes.md</strong>
                <p>Commands, endpoints, pass/fail output, deploy ID, rollback note.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BlurFade>
  </div>
</section>

<section class="cta-section">
  <div class="shell-inner-pad">
    <div class="product-surface product-surface--accent cta-panel">
      <div class="cta-trace" aria-hidden="true">
        <svg viewBox="0 0 760 260" focusable="false">
          <path class="cta-trace__line cta-trace__line--soft" d="M88 132H252C305 132 303 76 358 76H514" />
          <path class="cta-trace__line" d="M88 132H252C305 132 303 184 358 184H672" />
          <path class="cta-trace__line cta-trace__line--soft" d="M514 76C568 76 565 132 618 132H704" />
          <circle class="cta-trace__node cta-trace__node--primary" cx="88" cy="132" r="7" />
          <circle class="cta-trace__node" cx="252" cy="132" r="5" />
          <circle class="cta-trace__node cta-trace__node--review" cx="514" cy="76" r="6" />
          <circle class="cta-trace__node cta-trace__node--primary" cx="672" cy="184" r="7" />
          <circle class="cta-trace__node" cx="704" cy="132" r="5" />
        </svg>
      </div>
      <BlurFade>
        <span class="product-kicker">Start with one workflow</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>{agencyCoreMessaging.workflowCtaHeading}</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>{agencyCoreMessaging.workflowCtaDetail}</p>
      </BlurFade>
      <BlurFade delay={0.15}>
        <div class="hero-actions hero-actions--center">
          <Button href={agencyCoreMessaging.workflowMappingSessionHref}
            >{agencyCoreMessaging.bookMappingSessionLabel}</Button
          >
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<style>
  .hero-page {
    padding-top: clamp(3.5rem, 6vw, 5rem);
    padding-bottom: clamp(2rem, 4vw, 3rem);
  }

  .hero-stage {
    position: relative;
    min-height: clamp(29rem, 48vw, 35rem);
    overflow: clip;
    isolation: isolate;
  }

  .hero-stage::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      linear-gradient(
        180deg,
        rgba(3, 3, 4, 1) 0%,
        rgba(3, 3, 4, 0.86) 8%,
        rgba(3, 3, 4, 0.28) 20%,
        rgba(3, 3, 4, 0) 34%,
        rgba(3, 3, 4, 0) 66%,
        rgba(3, 3, 4, 0.32) 80%,
        rgba(3, 3, 4, 0.82) 92%,
        rgba(3, 3, 4, 1) 100%
      ),
      linear-gradient(
        90deg,
        rgba(3, 3, 4, 1) 0%,
        rgba(3, 3, 4, 0.965) 28%,
        rgba(3, 3, 4, 0.68) 52%,
        rgba(3, 3, 4, 0.18) 72%,
        rgba(3, 3, 4, 0.34) 88%,
        rgba(3, 3, 4, 0.52) 100%
      ),
      radial-gradient(
        circle at 74% 54%,
        rgba(3, 3, 4, 0) 0%,
        rgba(3, 3, 4, 0.08) 22%,
        rgba(3, 3, 4, 0.24) 58%,
        rgba(3, 3, 4, 0.46) 100%
      ),
      radial-gradient(circle at 16% 52%, rgba(3, 3, 4, 0.18) 0%, transparent 38%);
  }

  .hero-stage :global(.hero-signal-field) {
    inset: -2rem -4rem -3rem -2rem;
  }

  .hero-layout {
    position: relative;
    z-index: 2;
    display: block;
    width: 100%;
    padding-top: clamp(1.1rem, 2.5vw, 2rem);
    padding-bottom: clamp(2rem, 4vw, 3.25rem);
  }

  .hero-copy {
    display: grid;
    gap: 1.15rem;
    max-width: 47rem;
  }

  .hero-copy .product-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    width: fit-content;
    max-width: 100%;
    padding: 0.38rem 0.7rem 0.4rem;
    border: 1px solid rgba(91, 125, 255, 0.16);
    border-radius: 999px;
    background: rgba(8, 10, 14, 0.62);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.02),
      0 10px 30px rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(12px);
    letter-spacing: 0;
    line-height: 1.15;
    white-space: nowrap;
  }

  .hero-copy .product-kicker::before {
    content: '';
    width: 0.38rem;
    height: 0.38rem;
    border-radius: 999px;
    background: rgba(59, 109, 255, 0.96);
    box-shadow: 0 0 14px rgba(70, 154, 255, 0.38);
  }

  .hero-kicker__mobile {
    display: none;
  }

  .control-kicker__mobile {
    display: none;
  }

  .hero-title {
    margin: 0;
    font-size: clamp(3rem, 5vw + 1rem, 5.6rem);
    line-height: 0.96;
    letter-spacing: -0.045em;
    text-wrap: balance;
  }

  .hero-detail {
    margin: 0;
    max-width: 34rem;
    color: var(--color-fg-secondary);
    font-size: clamp(1.05rem, 1vw + 0.9rem, 1.2rem);
    line-height: 1.72;
    text-wrap: pretty;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    align-items: center;
  }

  .hero-actions--center {
    justify-content: center;
  }

  .hero-note {
    margin: 0;
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.9rem;
    margin-top: 0.35rem;
  }

  .metric-card {
    display: grid;
    grid-template-columns: 3.65rem minmax(0, 1fr);
    gap: 0.95rem;
    align-items: center;
    position: relative;
    min-height: 6.55rem;
    padding: 1rem 1.1rem;
    overflow: hidden;
  }

  .metric-card::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 4.95rem;
    width: 1.15rem;
    height: 1px;
    background: linear-gradient(90deg, rgba(225, 231, 255, 0.18), rgba(255, 255, 255, 0));
    transform: translateY(-50%);
    pointer-events: none;
  }

  .metric-icon {
    display: grid;
    place-items: center;
    position: relative;
    width: 3.45rem;
    height: 3.45rem;
    border: 1px solid rgba(225, 231, 255, 0.11);
    border-radius: 12px;
    background:
      linear-gradient(rgba(225, 231, 255, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(225, 231, 255, 0.045) 1px, transparent 1px),
      linear-gradient(180deg, rgba(255, 255, 255, 0.032), rgba(255, 255, 255, 0.012));
    background-size:
      11px 11px,
      11px 11px,
      auto;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.018),
      0 10px 22px rgba(0, 0, 0, 0.14);
  }

  .metric-icon svg {
    width: 2.25rem;
    height: 2.25rem;
    overflow: visible;
  }

  .metric-symbol {
    fill: none;
    color: rgba(232, 237, 255, 0.66);
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.18;
    vector-effect: non-scaling-stroke;
    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.08));
  }

  .metric-symbol--actions {
    color: rgba(238, 242, 255, 0.7);
  }

  .metric-symbol--states {
    color: rgba(225, 231, 255, 0.68);
  }

  .metric-symbol--receipts {
    color: rgba(226, 232, 240, 0.7);
  }

  .metric-copy {
    display: grid;
    gap: 0.32rem;
    min-width: 0;
  }

  .metric-value {
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 1.02rem;
    letter-spacing: 0;
    line-height: 1.1;
  }

  .metric-label {
    color: var(--color-fg-muted);
    font-size: 0.82rem;
    letter-spacing: 0;
    line-height: 1.38;
  }

  .control-section,
  .delivery-section,
  .cta-section {
    padding-top: 1.25rem;
    padding-bottom: clamp(3.5rem, 6vw, 5rem);
  }

  .control-section {
    scroll-margin-top: 6.5rem;
  }

  .showcase-stack {
    display: grid;
    gap: 1rem;
  }

  .section-lead {
    display: grid;
    gap: 0.85rem;
    max-width: 42rem;
    margin-bottom: 1.5rem;
  }

  .section-lead h2 {
    margin: 0;
    line-height: 1;
    text-wrap: balance;
  }

  .section-lead p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.72;
  }

  .cta-panel h2 {
    margin: 0;
    line-height: 1.02;
    text-wrap: balance;
  }

  .cta-panel p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.72;
  }

  .delivery-grid {
    display: grid;
    gap: clamp(1.1rem, 3vw, 1.75rem);
  }

  .delivery-copy {
    display: grid;
    gap: 0.85rem;
    max-width: 48rem;
  }

  .delivery-copy h2 {
    margin: 0;
    max-width: 43rem;
    line-height: 1.02;
    text-wrap: balance;
  }

  .delivery-copy p {
    margin: 0;
    max-width: 42rem;
    color: var(--color-fg-secondary);
    line-height: 1.72;
  }

  .delivery-window {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    background:
      linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
      linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.012)),
      rgba(8, 8, 10, 0.86);
    background-size:
      72px 72px,
      72px 72px,
      auto,
      auto;
    box-shadow:
      0 18px 46px rgba(0, 0, 0, 0.36),
      inset 0 0 0 1px rgba(255, 255, 255, 0.02);
    overflow: hidden;
  }

  .delivery-window__top {
    display: flex;
    gap: 0.38rem;
    align-items: center;
    height: 2.8rem;
    padding: 0 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.09);
    background: rgba(255, 255, 255, 0.025);
  }

  .delivery-window__top span {
    width: 0.52rem;
    height: 0.52rem;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 999px;
  }

  .delivery-window__body {
    display: grid;
    grid-template-columns: minmax(16rem, 0.78fr) minmax(0, 1.22fr);
    min-height: 28rem;
  }

  .delivery-rail {
    display: grid;
    grid-template-rows: repeat(4, 1fr);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }

  .delivery-rail__item {
    display: grid;
    align-content: center;
    gap: 0.5rem;
    padding: 1.05rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.18);
  }

  .delivery-rail__item:last-child {
    border-bottom: 0;
  }

  .delivery-rail__item--active {
    background: rgba(255, 255, 255, 0.055);
  }

  .delivery-rail__heading {
    display: flex;
    gap: 0.55rem;
    align-items: baseline;
    min-width: 0;
  }

  .delivery-rail__heading span,
  .delivery-proof__intro span,
  .delivery-proof__label {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .delivery-rail__heading span {
    color: rgba(145, 168, 255, 0.82);
  }

  .delivery-rail__heading strong {
    color: var(--color-fg-primary);
    font-size: 0.98rem;
    line-height: 1.15;
  }

  .delivery-rail__item p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .delivery-proof {
    display: grid;
    align-content: center;
    gap: clamp(1.2rem, 3vw, 1.8rem);
    padding: clamp(1.3rem, 3vw, 2rem);
  }

  .delivery-proof__intro {
    display: grid;
    gap: 0.55rem;
    max-width: 32rem;
  }

  .delivery-proof__intro h3 {
    margin: 0;
    font-size: clamp(1.65rem, 3vw, 2.5rem);
    line-height: 1.02;
    letter-spacing: 0;
    text-wrap: balance;
  }

  .delivery-proof__intro p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.65;
  }

  .delivery-proof__flow {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 2.6rem minmax(0, 1fr);
    gap: 1rem;
    align-items: center;
  }

  .delivery-proof__panel {
    display: grid;
    gap: 0.5rem;
    min-height: 9.7rem;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.025);
  }

  .delivery-proof__panel strong {
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 0.95rem;
    line-height: 1.3;
  }

  .delivery-proof__panel p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: 0.88rem;
    line-height: 1.48;
  }

  .delivery-proof__arrow {
    display: grid;
    place-items: center;
    width: 2.6rem;
    height: 2.6rem;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 999px;
    color: rgba(220, 228, 255, 0.72);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.028);
  }

  .cta-panel {
    display: grid;
    gap: 0.95rem;
    position: relative;
    padding: clamp(1.4rem, 3vw, 2rem);
    border-color: rgba(255, 255, 255, 0.12);
    background:
      radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.07), transparent 36%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.014)),
      rgba(8, 8, 10, 0.86);
    box-shadow:
      0 18px 42px rgba(0, 0, 0, 0.42),
      0 0 0 1px rgba(255, 255, 255, 0.03);
    overflow: hidden;
    text-align: center;
  }

  .cta-panel > :not(.cta-trace) {
    position: relative;
    z-index: 1;
  }

  .cta-trace {
    position: absolute;
    inset: 0;
    z-index: 0;
    opacity: 0.16;
    pointer-events: none;
    mask-image: radial-gradient(circle at 50% 48%, #000 0%, #000 44%, transparent 78%);
  }

  .cta-trace svg {
    width: 100%;
    height: 100%;
  }

  .cta-trace__line {
    fill: none;
    stroke: rgba(255, 255, 255, 0.2);
    stroke-linecap: round;
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }

  .cta-trace__line--soft {
    stroke: rgba(255, 255, 255, 0.1);
  }

  .cta-trace__node {
    fill: rgba(255, 255, 255, 0.18);
    stroke: rgba(255, 255, 255, 0.22);
    stroke-width: 1.5;
  }

  .cta-trace__node--primary {
    fill: rgba(255, 255, 255, 0.28);
    filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.12));
  }

  .cta-trace__node--review {
    fill: rgba(255, 255, 255, 0.22);
    stroke: rgba(255, 255, 255, 0.2);
  }

  @media (max-width: 1100px) {
    .delivery-window__body,
    .delivery-proof__flow {
      grid-template-columns: 1fr;
    }

    .delivery-rail {
      grid-template-rows: none;
      border-right: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .delivery-proof__arrow {
      width: 100%;
      height: 1.7rem;
      border-radius: 999px;
    }
  }

  @media (max-width: 768px) {
    .hero-page {
      padding-top: clamp(2.25rem, 9vw, 3.25rem);
      padding-bottom: clamp(1.75rem, 8vw, 3rem);
    }

    .hero-stage {
      min-height: auto;
    }

    .hero-stage::after {
      background:
        linear-gradient(
          180deg,
          rgba(3, 3, 4, 1) 0%,
          rgba(3, 3, 4, 0.9) 10%,
          rgba(3, 3, 4, 0.38) 22%,
          rgba(3, 3, 4, 0) 34%,
          rgba(3, 3, 4, 0) 68%,
          rgba(3, 3, 4, 0.4) 82%,
          rgba(3, 3, 4, 0.9) 94%,
          rgba(3, 3, 4, 1) 100%
        ),
        linear-gradient(
          90deg,
          rgba(3, 3, 4, 1) 0%,
          rgba(3, 3, 4, 0.972) 42%,
          rgba(3, 3, 4, 0.7) 66%,
          rgba(3, 3, 4, 0.26) 82%,
          rgba(3, 3, 4, 0.46) 100%
        ),
        radial-gradient(
          circle at 76% 56%,
          rgba(3, 3, 4, 0) 0%,
          rgba(3, 3, 4, 0.12) 24%,
          rgba(3, 3, 4, 0.34) 64%,
          rgba(3, 3, 4, 0.58) 100%
        ),
        radial-gradient(circle at 18% 42%, rgba(3, 3, 4, 0.2) 0%, transparent 36%);
    }

    .hero-stage :global(.hero-signal-field) {
      inset: 0 -2.5rem -2rem -1rem;
    }

    .hero-layout {
      padding-top: 1rem;
      padding-bottom: 2.75rem;
    }

    .metric-grid {
      grid-template-columns: 1fr;
    }

    .hero-title {
      font-size: clamp(2.6rem, 11vw, 4rem);
    }

    .hero-copy .product-kicker {
      gap: 0.38rem;
      padding: 0.34rem 0.58rem 0.36rem;
      min-height: 2rem;
      font-size: 0.72rem;
    }

    .hero-kicker__desktop {
      display: none;
    }

    .hero-kicker__mobile {
      display: inline;
    }

    .control-kicker {
      max-width: 100%;
      letter-spacing: 0.08em;
      line-height: 1.15;
      white-space: nowrap;
    }

    .control-kicker__desktop {
      display: none;
    }

    .control-kicker__mobile {
      display: inline;
    }

    .cta-panel {
      padding: 1rem;
    }

  }
</style>
